import { NextResponse } from 'next/server';
import { createFlynetOAuth, getFlynetConfig } from '@/lib/flynet';
import { getCookie } from '@/lib/cookies';
import {
  flynetLoginCookies,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_STATE_COOKIE,
} from '@/lib/auth/session-cookies';

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

  // Retrieve code_verifier and state from HttpOnly cookies (robust parser:
  // values may legitimately contain '=' and must never be truncated).
  const cookieHeader = req.headers.get('cookie') || '';
  const storedVerifier = getCookie(cookieHeader, OAUTH_VERIFIER_COOKIE);
  const storedState = getCookie(cookieHeader, OAUTH_STATE_COOKIE);

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

    // Token-Mediating Backend Pattern via the single session-cookie source of
    // truth: access token on Path '/' (product routes consume it), refresh
    // token scoped to /api/auth. HttpOnly is never weakened.
    const isProd = process.env.NODE_ENV === 'production';
    const { access, refresh } = flynetLoginCookies(
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      },
      isProd
    );
    response.cookies.set(access.name, access.value, access.options as any);
    if (refresh) {
      response.cookies.set(refresh.name, refresh.value, refresh.options as any);
    }

    // Clean up one-time PKCE verifier cookies
    response.cookies.delete(OAUTH_VERIFIER_COOKIE);
    response.cookies.delete(OAUTH_STATE_COOKIE);

    return response;
  } catch (err: any) {
    console.error('[BlackPalate OAuth token exchange failed]:', err);
    return NextResponse.redirect(
      new URL('/?error=oauth_failed', req.url)
    );
  }
}
