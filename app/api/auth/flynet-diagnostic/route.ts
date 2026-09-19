import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth/session-cookies';
import {
  flynetMemberFetch,
  FLYNET_MEMBER_PATHS,
  getFlynetMemberApiBaseUrl,
} from '@/lib/flynet-member';
import { getFlynetConfig } from '@/lib/flynet';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  const accessToken = getCookie(cookieHeader, ACCESS_COOKIE_NAME);
  const refreshToken = getCookie(cookieHeader, REFRESH_COOKIE_NAME);
  const endpoint = `${getFlynetMemberApiBaseUrl()}${FLYNET_MEMBER_PATHS.profile}`;

  const result = accessToken
    ? await flynetMemberFetch<Record<string, unknown>>(accessToken, FLYNET_MEMBER_PATHS.profile)
    : null;

  return NextResponse.json(
    {
      accessCookiePresent: Boolean(accessToken),
      refreshCookiePresent: Boolean(refreshToken),
      environment: getFlynetConfig().environment,
      endpoint,
      status: result?.status ?? null,
      authError: result?.authError ?? 'unknown',
      bodyPresent: result?.bodyPresent ?? false,
      profileResolved: Boolean(
        result?.ok &&
          result.data &&
          typeof result.data.id === 'string' &&
          result.data.id.length > 0
      ),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        Vary: 'Cookie',
      },
    }
  );
}
