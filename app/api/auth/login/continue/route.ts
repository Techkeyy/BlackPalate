import { NextResponse } from 'next/server';
import { safeError } from '@/lib/api-errors';
import { getFlynetConfig } from '@/lib/flynet';
import { getCookie } from '@/lib/cookies';
import { logOAuthFailure, logOAuthPhase } from '@/lib/auth/oauth-diagnostics';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  oauthTransientCookieOptions,
} from '@/lib/auth/session-cookies';

function validAuthorizeUrl(rawUrl: string, state: string): boolean {
  try {
    const config = getFlynetConfig();
    const target = new URL(rawUrl);
    const expected = new URL(`${config.audience}/oauth/authorize`);
    return (
      target.origin === expected.origin &&
      target.pathname === expected.pathname &&
      target.searchParams.get('response_type') === 'code' &&
      target.searchParams.get('client_id') === config.clientId &&
      target.searchParams.get('redirect_uri') === config.redirectUri &&
      target.searchParams.get('scope') === config.scopes.join(' ') &&
      target.searchParams.get('audience') === config.audience &&
      target.searchParams.get('state') === state &&
      Boolean(target.searchParams.get('code_challenge')) &&
      target.searchParams.get('code_challenge_method') === 'S256'
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get('state');
  const authorizeUrl = url.searchParams.get('authorize_url');
  const verifier = getCookie(req.headers.get('cookie'), OAUTH_VERIFIER_COOKIE);

  logOAuthPhase('verifier_present', { present: Boolean(verifier) });
  if (!verifier) {
    logOAuthFailure('authorization_continue', 'PKCE_VERIFIER_MISSING');
    return NextResponse.redirect(new URL('/?error=missing_pkce_verifier', req.url));
  }

  if (!state || !authorizeUrl || !validAuthorizeUrl(authorizeUrl, state)) {
    logOAuthFailure('authorization_continue', 'OAUTH_STATE_INVALID');
    return NextResponse.redirect(new URL('/?error=invalid_oauth_state', req.url));
  }

  try {
    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(
      OAUTH_STATE_COOKIE,
      state,
      oauthTransientCookieOptions(process.env.NODE_ENV === 'production')
    );
    logOAuthPhase('state_cookie_written', { path: '/', httpOnly: true });
    return response;
  } catch (err: unknown) {
    logOAuthFailure('authorization_continue', 'OAUTH_SESSION_COOKIE_WRITE_FAILED', err);
    return safeError(500, 'SERVICE_TEMPORARY');
  }
}
