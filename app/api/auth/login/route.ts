import { NextResponse } from 'next/server';
import { createFlynetOAuth, getFlynetConfig } from '@/lib/flynet';
import { safeError } from '@/lib/api-errors';
import { logOAuthFailure, logOAuthPhase } from '@/lib/auth/oauth-diagnostics';
import {
  OAUTH_VERIFIER_COOKIE,
  oauthTransientCookieOptions,
} from '@/lib/auth/session-cookies';

export async function GET(req: Request) {
  const config = getFlynetConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: 'Blackbird sign-in is not available yet. Please try again later.' },
      { status: 400 }
    );
  }

  try {
    const oauth = createFlynetOAuth();
    const { url, state, codeVerifier } = await oauth.getAuthorizeUrl();

    // Vercel can fold multiple Set-Cookie headers into one invalid comma-delimited
    // header. Write one transient cookie per redirect hop so browsers receive
    // both values as distinct cookies.
    const continuation = new URL('/api/auth/login/continue', req.url);
    continuation.searchParams.set('state', state);
    continuation.searchParams.set('authorize_url', url);
    const response = NextResponse.redirect(continuation);

    response.cookies.set(
      OAUTH_VERIFIER_COOKIE,
      codeVerifier,
      oauthTransientCookieOptions(process.env.NODE_ENV === 'production')
    );
    logOAuthPhase('verifier_cookie_written', { path: '/', httpOnly: true });
    return response;
  } catch (err: unknown) {
    logOAuthFailure('authorization_start', 'OAUTH_TOKEN_EXCHANGE_FAILED', err);
    return safeError(500, 'SERVICE_TEMPORARY');
  }
}
