import { NextResponse } from 'next/server';
import { createFlynetOAuth, getFlynetConfig } from '@/lib/flynet';
import { getCookie } from '@/lib/cookies';
import {
  OAUTH_PENDING_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  oauthPendingCookieOptions,
} from '@/lib/auth/session-cookies';
import { logOAuthFailure, logOAuthPhase } from '@/lib/auth/oauth-diagnostics';

function failureRedirect(
  req: Request,
  error: string,
  code: Parameters<typeof logOAuthFailure>[1],
  detail?: unknown
) {
  logOAuthFailure('callback', code, detail);
  return NextResponse.redirect(new URL(`/?error=${error}`, req.url));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  logOAuthPhase('callback_received');
  logOAuthPhase('code_present', { present: Boolean(code) });

  if (providerError) {
    return failureRedirect(req, 'oauth_provider_error', 'OAUTH_PROVIDER_ERROR');
  }

  if (!code) {
    return failureRedirect(req, 'missing_authorization_code', 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }

  const cookieHeader = req.headers.get('cookie');
  const storedVerifier = getCookie(cookieHeader, OAUTH_VERIFIER_COOKIE);
  const storedState = getCookie(cookieHeader, OAUTH_STATE_COOKIE);

  logOAuthPhase('state_cookie_present', { present: Boolean(storedState) });
  if (!storedState || !state || storedState !== state) {
    logOAuthPhase('state_valid', { valid: false });
    return failureRedirect(req, 'invalid_oauth_state', 'OAUTH_STATE_INVALID');
  }
  logOAuthPhase('state_valid', { valid: true });

  logOAuthPhase('verifier_present', { present: Boolean(storedVerifier) });
  if (!storedVerifier) {
    return failureRedirect(req, 'missing_pkce_verifier', 'PKCE_VERIFIER_MISSING');
  }

  const config = getFlynetConfig();
  if (!config.clientSecret) {
    return failureRedirect(req, 'server_missing_client_secret', 'OAUTH_TOKEN_EXCHANGE_FAILED');
  }

  try {
    logOAuthPhase('exchange_started', { environment: config.environment });
    const oauth = createFlynetOAuth();
    const tokens = await oauth.exchangeCode({
      code,
      codeVerifier: storedVerifier,
    });
    if (!tokens.access_token) throw new Error('OAuth exchange returned no access token');
    logOAuthPhase('exchange_succeeded', { refreshTokenSupplied: Boolean(tokens.refresh_token) });

    // The callback writes one short-lived, HttpOnly handoff cookie. The session
    // route then fans access, refresh, and cleanup cookies across one-cookie
    // redirects because Vercel may fold duplicate Set-Cookie headers.
    const response = NextResponse.redirect(new URL('/api/auth/session?step=access', req.url));
    response.cookies.set(
      OAUTH_PENDING_COOKIE,
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        expires_in: tokens.expires_in,
      }),
      oauthPendingCookieOptions(process.env.NODE_ENV === 'production')
    );
    return response;
  } catch (err: unknown) {
    return failureRedirect(req, 'oauth_failed', 'OAUTH_TOKEN_EXCHANGE_FAILED', err);
  }
}
