import { NextResponse } from 'next/server';
import { createFlynetOAuth } from '@/lib/flynet';
import { getCookie } from '@/lib/cookies';
import { db } from '@/lib/db/repository';
import { resolveRequestIdentity, type RequestIdentity } from '@/lib/auth/resolve';
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

async function resolveWithRefresh(req: Request): Promise<{
  identity: RequestIdentity;
  refreshedCookies: RefreshedCookies | null;
}> {
  let identity = await resolveRequestIdentity(req);
  const cookieHeader = req.headers.get('cookie');
  const accessCookiePresent = Boolean(getCookie(cookieHeader, ACCESS_COOKIE_NAME));
  const refreshToken = getCookie(cookieHeader, REFRESH_COOKIE_NAME);
  let refreshAttempted = false;
  let refreshSucceeded = false;
  let refreshedCookies: RefreshedCookies | null = null;

  // Refresh only after the raw member profile request proves the access token
  // is invalid. Valid profiles and scope/provider failures must not rotate it.
  if (!identity.authenticated && identity.failure === 'invalid_token' && refreshToken) {
    refreshAttempted = true;
    try {
      const tokens = await createFlynetOAuth().refresh({ refreshToken });
      const cookies = flynetLoginCookies(tokens, process.env.NODE_ENV === 'production');
      const headers = new Headers(req.headers);
      headers.set('cookie', replaceAccessCookie(cookieHeader, cookies.access.value));
      const refreshedIdentity = await resolveRequestIdentity(new Request(req, { headers }));
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

function responseWithSessionCookies(
  body: Record<string, unknown>,
  refreshedCookies: RefreshedCookies | null
) {
  const response = NextResponse.json(body, {
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
      profile: identity.profile,
      checkIns: identity.checkIns,
      checkInsPagination: null,
    },
    refreshedCookies
  );
}
