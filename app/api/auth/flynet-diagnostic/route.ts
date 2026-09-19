import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth/session-cookies';

const MEMBER_PROFILE_ENDPOINT = 'https://api.blackbird.xyz/flynet/v1/users/me';

type AuthErrorKind = 'invalid_token' | 'insufficient_scope' | 'none' | 'unknown';

function parseAuthError(header: string | null): AuthErrorKind {
  if (!header) return 'none';
  const match = header.match(/(?:^|,|\s)error\s*=\s*"?(invalid_token|insufficient_scope)"?/i);
  if (!match) return 'unknown';
  return match[1].toLowerCase() as AuthErrorKind;
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  const accessToken = getCookie(cookieHeader, ACCESS_COOKIE_NAME);
  const refreshToken = getCookie(cookieHeader, REFRESH_COOKIE_NAME);

  let status: number | null = null;
  let authError: AuthErrorKind = 'unknown';
  let bodyPresent = false;
  let profileResolved = false;

  if (accessToken) {
    try {
      const response = await fetch(MEMBER_PROFILE_ENDPOINT, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });

      status = response.status;
      authError = response.ok ? 'none' : parseAuthError(response.headers.get('www-authenticate'));

      // Read as text first. 401/403 responses may have an empty or non-JSON body.
      const body = await response.text();
      bodyPresent = body.length > 0;

      if (response.status === 200 && bodyPresent) {
        try {
          const profile = JSON.parse(body) as { id?: unknown; object?: unknown };
          profileResolved = Boolean(
            profile &&
              typeof profile === 'object' &&
              typeof profile.id === 'string' &&
              profile.id.length > 0
          );
        } catch {
          profileResolved = false;
        }
      }
    } catch {
      status = null;
      authError = 'unknown';
      bodyPresent = false;
      profileResolved = false;
    }
  } else {
    authError = 'unknown';
  }

  return NextResponse.json(
    {
      accessCookiePresent: Boolean(accessToken),
      refreshCookiePresent: Boolean(refreshToken),
      environment: 'production',
      endpoint: MEMBER_PROFILE_ENDPOINT,
      status,
      authError,
      bodyPresent,
      profileResolved,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        Vary: 'Cookie',
      },
    }
  );
}
