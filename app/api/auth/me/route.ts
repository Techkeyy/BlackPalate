import { NextResponse } from 'next/server';
import { createFlynetOAuth } from '@/lib/flynet';
import { getCookie } from '@/lib/cookies';
import { db } from '@/lib/db/repository';
import { getAuthenticatedOperator, resolveOrCreateFlynetDinerUser } from '@/lib/auth';
import type { RequestIdentity } from '@/lib/auth/resolve';
import {
  flynetMemberFetch,
  extractFlynetCheckIns,
  FLYNET_MEMBER_PATHS,
} from '@/lib/flynet-member';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  flynetLoginCookies,
} from '@/lib/auth/session-cookies';
import { logOAuthPhase } from '@/lib/auth/oauth-diagnostics';

export const dynamic = 'force-dynamic';

type RefreshedCookies = ReturnType<typeof flynetLoginCookies>;

function replaceAccessCookie(header: string | null, accessToken: string): string {
  const parts = (header || '')
    .split(';')
    .map(part => part.trim())
    .filter(part => part && !part.startsWith(`${ACCESS_COOKIE_NAME}=`));
  parts.push(`${ACCESS_COOKIE_NAME}=${encodeURIComponent(accessToken)}`);
  return parts.join('; ');
}

/**
 * The diagnostic route proved this exact cookie read and raw member request.
 * Keep the diner path deliberately direct until the older resolver abstraction
 * is no longer on the critical authentication path.
 */
async function resolveDirectDinerIdentity(req: Request): Promise<RequestIdentity> {
  const cookieHeader = req.headers.get('cookie');
  const accessToken = getCookie(cookieHeader, ACCESS_COOKIE_NAME);

  if (!accessToken) {
    return { authenticated: false, failure: 'missing_access_token' };
  }

  const profileResult = await flynetMemberFetch<Record<string, unknown>>(
    accessToken,
    FLYNET_MEMBER_PATHS.profile
  );

  if (!profileResult.ok) {
    return {
      authenticated: false,
      failure: profileResult.failure,
      upstreamStatus: profileResult.status,
    };
  }

  const profile = profileResult.data;
  const flynetId =
    profile && typeof profile === 'object' && typeof profile.id === 'string'
      ? profile.id
      : null;

  if (!flynetId) {
    return {
      authenticated: false,
      failure: 'provider_unavailable',
      upstreamStatus: 200,
    };
  }

  const checkInsResult = await flynetMemberFetch<unknown>(
    accessToken,
    FLYNET_MEMBER_PATHS.checkIns
  );
  const checkIns = checkInsResult.ok ? extractFlynetCheckIns(checkInsResult.data) : [];

  let user;
  try {
    // profile.id is the only Flynet field required for diner identity.
    user = await resolveOrCreateFlynetDinerUser({ id: flynetId });
  } catch {
    return {
      authenticated: false,
      failure: 'internal_user_resolution_failed',
      upstreamStatus: null,
    };
  }

  return {
    authenticated: true,
    role: 'DINER',
    user,
    flynetUserId: flynetId,
    dinerName: user.displayName,
    profile,
    checkIns,
  };
}

async function resolveIdentityDirect(req: Request): Promise<RequestIdentity> {
  let operator = null;
  try {
    operator = await getAuthenticatedOperator(req);
  } catch {
    operator = null;
  }

  // A valid Neon session has precedence. An absent/invalid Neon session must
  // fall through to the proven Flynet member path.
  if (operator) {
    return {
      authenticated: true,
      role: 'RESTAURANT',
      user: operator.user,
      neonAuthUserId: operator.neonAuthUserId,
      memberships: operator.memberships,
    };
  }

  return resolveDirectDinerIdentity(req);
}

async function resolveWithRefresh(req: Request): Promise<{
  identity: RequestIdentity;
  refreshedCookies: RefreshedCookies | null;
}> {
  let identity = await resolveIdentityDirect(req);
  const cookieHeader = req.headers.get('cookie');
  const accessCookiePresent = Boolean(getCookie(cookieHeader, ACCESS_COOKIE_NAME));
  const refreshToken = getCookie(cookieHeader, REFRESH_COOKIE_NAME);
  let refreshAttempted = false;
  let refreshSucceeded = false;
  let refreshedCookies: RefreshedCookies | null = null;

  // Preserve the existing refresh behavior; only an explicitly invalid raw
  // access token may trigger it.
  if (!identity.authenticated && identity.failure === 'invalid_token' && refreshToken) {
    refreshAttempted = true;
    try {
      const tokens = await createFlynetOAuth().refresh({ refreshToken });
      const cookies = flynetLoginCookies(tokens, process.env.NODE_ENV === 'production');
      const headers = new Headers(req.headers);
      headers.set('cookie', replaceAccessCookie(cookieHeader, cookies.access.value));
      const refreshedIdentity = await resolveIdentityDirect(new Request(req, { headers }));
      if (refreshedIdentity.authenticated) {
        identity = refreshedIdentity;
        refreshedCookies = cookies;
        refreshSucceeded = true;
      }
    } catch {
      // Keep the original safe unauthenticated result.
    }
  }

  logOAuthPhase('session_resolution', {
    accessCookiePresent,
    refreshCookiePresent: Boolean(refreshToken),
    refreshAttempted,
    refreshSucceeded,
    authenticated: identity.authenticated,
    role: identity.authenticated ? identity.role : 'NONE',
    failure: identity.authenticated ? 'none' : identity.failure || 'unknown',
    status: identity.authenticated ? 200 : identity.upstreamStatus ?? 0,
  });

  return { identity, refreshedCookies };
}

function sanitizeFlynetProfile(profile: unknown): Record<string, string | null> {
  const source = profile && typeof profile === 'object' ? profile as Record<string, unknown> : {};
  return {
    id: typeof source.id === 'string' ? source.id : null,
    first_name: typeof source.first_name === 'string' ? source.first_name : null,
    last_name: typeof source.last_name === 'string' ? source.last_name : null,
    avatar: typeof source.avatar === 'string' ? source.avatar : null,
    account_status: typeof source.account_status === 'string' ? source.account_status : null,
  };
}

function responseWithSessionCookies(
  body: Record<string, unknown>,
  refreshedCookies: RefreshedCookies | null,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      Vary: 'Cookie',
    },
  });
  if (refreshedCookies) {
    response.cookies.set(
      refreshedCookies.access.name,
      refreshedCookies.access.value,
      refreshedCookies.access.options as any
    );
    if (refreshedCookies.refresh) {
      response.cookies.set(
        refreshedCookies.refresh.name,
        refreshedCookies.refresh.value,
        refreshedCookies.refresh.options as any
      );
    }
  }
  return response;
}

export async function GET(req: Request) {
  const { identity, refreshedCookies } = await resolveWithRefresh(req);

  if (!identity.authenticated) {
    if (identity.failure === 'internal_user_resolution_failed') {
      return responseWithSessionCookies(
        {
          authenticated: false,
          role: null,
          user: null,
          error: 'INTERNAL_USER_RESOLUTION_FAILED',
        },
        refreshedCookies,
        500
      );
    }

    return responseWithSessionCookies(
      {
        authenticated: false,
        role: null,
        user: null,
      },
      refreshedCookies
    );
  }

  if (identity.role === 'RESTAURANT') {
    const restaurants = await Promise.all(
      identity.memberships.map(m => db.getRestaurantById(m.restaurantId))
    );
    return responseWithSessionCookies(
      {
        authenticated: true,
        role: 'RESTAURANT',
        user: identity.user,
        memberships: identity.memberships,
        workspaces: restaurants.filter(Boolean),
      },
      refreshedCookies
    );
  }

  return responseWithSessionCookies(
    {
      authenticated: true,
      role: 'DINER',
      user: identity.user,
      profile: sanitizeFlynetProfile(identity.profile),
      checkIns: identity.checkIns,
      checkInsPagination: null,
    },
    refreshedCookies
  );
}

