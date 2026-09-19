import { NextResponse } from 'next/server';
import { createFlynetOAuth, getFlynetConfig } from '@/lib/flynet';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Handle explicit OAuth errors from consent screen (never reflect provider detail)
  if (error) {
    console.error('[BlackPalate OAuth provider error]:', error, errorDescription);
    return NextResponse.redirect(
      new URL('/?error=oauth_provider_error', req.url)
    );
  }

  // Safe handler before OAuth / missing code
  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=missing_authorization_code', req.url)
    );
  }

  // Retrieve code_verifier and state from HttpOnly cookies
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, decodeURIComponent(v || '')];
    })
  );

  const storedVerifier = cookies['bp_oauth_verifier'];
  const storedState = cookies['bp_oauth_state'];

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/?error=invalid_oauth_state', req.url)
    );
  }

  if (!storedVerifier) {
    return NextResponse.redirect(
      new URL('/?error=missing_pkce_verifier', req.url)
    );
  }

  const config = getFlynetConfig();
  if (!config.clientSecret) {
    return NextResponse.redirect(
      new URL('/?error=server_missing_client_secret', req.url)
    );
  }

  try {
    const oauth = createFlynetOAuth();
    const tokens = await oauth.exchangeCode({
      code,
      codeVerifier: storedVerifier,
    });

    const response = NextResponse.redirect(new URL('/?oauth_success=true', req.url));

    // Token-Mediating Backend Pattern:
    // 1. Refresh token lives in HttpOnly secure cookie scoped to /api/auth
    if (tokens.refresh_token) {
      response.cookies.set('bp_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 30 * 24 * 3600, // 30 days
      });
    }

    // 2. Short-lived session token (cookie for SSR, in-memory on client)
    response.cookies.set('bp_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expires_in || 3600,
    });

    // Clean up one-time PKCE verifier cookies
    response.cookies.delete('bp_oauth_verifier');
    response.cookies.delete('bp_oauth_state');

    return response;
  } catch (err: any) {
    console.error('[BlackPalate OAuth token exchange failed]:', err);
    return NextResponse.redirect(
      new URL('/?error=oauth_failed', req.url)
    );
  }
}
