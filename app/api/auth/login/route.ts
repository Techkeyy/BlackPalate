import { NextResponse } from 'next/server';
import { createFlynetOAuth, getFlynetConfig } from '@/lib/flynet';

export async function GET() {
  const config = getFlynetConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_FLYNET_CLIENT_ID is not configured in server environment.' },
      { status: 400 }
    );
  }

  try {
    const oauth = createFlynetOAuth();
    const { url, state, codeVerifier } = await oauth.getAuthorizeUrl();

    const response = NextResponse.redirect(url);

    // Stash state and code_verifier in short-lived HttpOnly cookies for PKCE handshake
    response.cookies.set('bp_oauth_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    response.cookies.set('bp_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate Flynet authorization URL' },
      { status: 500 }
    );
  }
}
