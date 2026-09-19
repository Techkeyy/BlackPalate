import { NextResponse } from 'next/server';
import { createFlynetOAuth } from '@/lib/flynet';
import { safeError } from '@/lib/api-errors';
import { getCookie } from '@/lib/cookies';
import { REFRESH_COOKIE_NAME } from '@/lib/auth/session-cookies';

export async function POST(req: Request) {
  const refreshToken = getCookie(req.headers.get('cookie'), REFRESH_COOKIE_NAME);

  if (!refreshToken) {
    return safeError(401, 'UNAUTHORIZED', 'refresh without token');
  }

  try {
    const oauth = createFlynetOAuth();
    const tokens = await oauth.refresh({ refreshToken });

    const res = NextResponse.json({
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
      scope: tokens.scope,
    });

    // Rotate refresh token cookie
    if (tokens.refresh_token) {
      res.cookies.set('bp_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 30 * 24 * 3600,
      });
    }

    return res;
  } catch (err: any) {
    return safeError(401, 'UNAUTHORIZED', err);
  }
}

