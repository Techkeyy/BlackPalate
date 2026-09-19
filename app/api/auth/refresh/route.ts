import { NextResponse } from 'next/server';
import { createFlynetOAuth } from '@/lib/flynet';

export async function POST(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, decodeURIComponent(v || '')];
    })
  );

  const refreshToken = cookies['bp_refresh_token'];

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'No refresh token available.' },
      { status: 401 }
    );
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
    return NextResponse.json(
      { error: err.message || 'Token refresh failed' },
      { status: 401 }
    );
  }
}
