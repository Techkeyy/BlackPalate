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
type RestaurantIdentity = Extract<RequestIdentity, { role: 'RESTAURANT' }>;
type DinerIdentity = Extract<RequestIdentity, { role: 'DINER' }>;

type DualIdentityResolution = {
  restaurant: RestaurantIdentity | null;
  diner: RequestIdentity;
};

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

async function resolveIdentityDirect(req: Request): Promise<DualIdentityResolution> {
  let operator = null;
  try {
    operator = await getAuthenticatedOperator(req);
  } catch {
    operator = null;
  }

  const diner = await resolveDirectDinerIdentity(req);
  return {
    restaurant: operator
      ? {
          authenticated: true,
          role: 'RESTAURANT',
          user: operator.user,
          neonAuthUserId: operator.neonAuthUserId,
          memberships: operator.memberships,
        }
      : null,
    diner,
  };
}

async function resolveWithRefresh(req: Request): Promise<{
  identities: DualIdentityResolution;
  refreshedCookies: RefreshedCookies | null;
}> {
  let identities = await resolveIdentityDirect(req);
  const cookieHeader = req.headers.get('cookie');
  const accessCookiePresent = Boolean(getCookie(cookieHeader, ACCESS_COOKIE_NAME));
  const refreshToken = getCookie(cookieHeader, REFRESH_COOKIE_NAME);
  let refreshAttempted = false;
  let refreshSucceeded = false;
  let refreshedCookies: RefreshedCookies | null = null;

  // Preserve the existing refresh behavior; only an explicitly invalid raw
  // access token may trigger it.
  if (!identities.diner.authenticated && identities.diner.failure === 'invalid_token' && refreshToken) {
    refreshAttempted = true;
    try {
      const tokens = await createFlynetOAuth().refresh({ refreshToken });
      const cookies = flynetLoginCookies(tokens, process.env.NODE_ENV === 'production');
      const headers = new Headers(req.headers);
      headers.set('cookie', replaceAccessCookie(cookieHeader, cookies.access.value));
      const refreshedIdentities = await resolveIdentityDirect(new Request(req, { headers }));
      if (refreshedIdentities.diner.authenticated) {
        identities = refreshedIdentities;
        refreshedCookies = cookies;
        refreshSucceeded = true;
      }
    } catch {
      // Keep the original safe unauthenticated result.
    }
  }

  const dinerAuthenticated = identities.diner.authenticated;
  const restaurantAuthenticated = Boolean(identities.restaurant);
  const resolvedRole = restaurantAuthenticated && dinerAuthenticated
    ? 'BOTH'
    : restaurantAuthenticated
      ? 'RESTAURANT'
      : dinerAuthenticated
        ? 'DINER'
        : 'NONE';

  logOAuthPhase('session_resolution', {
    accessCookiePresent,
    refreshCookiePresent: Boolean(refreshToken),
    refreshAttempted,
    refreshSucceeded,
    authenticated: restaurantAuthenticated || dinerAuthenticated,
    role: resolvedRole,
    failure: dinerAuthenticated || restaurantAuthenticated ? 'none' : identities.diner.failure || 'unknown',
    status: dinerAuthenticated || restaurantAuthenticated ? 200 : identities.diner.upstreamStatus ?? 0,
  });

  return { identities, refreshedCookies };
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
  const { identities, refreshedCookies } = await resolveWithRefresh(req);
  const diner = identities.diner.authenticated
    ? identities.diner as DinerIdentity
    : null;
  const restaurant = identities.restaurant;

  if (!restaurant && !diner) {
    if (!identities.diner.authenticated && identities.diner.failure === 'internal_user_resolution_failed') {
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

  const restaurants = restaurant
    ? await Promise.all(restaurant.memberships.map(m => db.getRestaurantById(m.restaurantId)))
    : [];
  const workspaces = restaurants.filter(Boolean);
  const activeRole = restaurant ? 'RESTAURANT' : 'DINER';
  const capabilityIdentities: Record<string, unknown> = {};

  if (diner) {
    capabilityIdentities.diner = {
      authenticated: true,
      user: diner.user,
      profile: sanitizeFlynetProfile(diner.profile),
      checkIns: diner.checkIns,
      checkInsPagination: null,
    };
  }

  if (restaurant) {
    capabilityIdentities.restaurant = {
      authenticated: true,
      user: restaurant.user,
      memberships: restaurant.memberships,
      workspaces,
    };
  }

  return responseWithSessionCookies(
    {
      authenticated: true,
      // Backwards-compatible top-level fields describe the current default
      // context; `identities` is authoritative when both sessions exist.
      role: activeRole,
      activeRole,
      user: activeRole === 'RESTAURANT' ? restaurant?.user : diner?.user,
      identities: capabilityIdentities,
      ...(restaurant
        ? {
            memberships: restaurant.memberships,
            workspaces,
          }
        : {}),
      ...(diner
        ? {
            profile: sanitizeFlynetProfile(diner.profile),
            checkIns: diner.checkIns,
            checkInsPagination: null,
          }
        : {}),
    },
    refreshedCookies
  );
}
