import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import {
  OAUTH_PENDING_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  clearOAuthPendingCookieOptions,
  clearOAuthTransientCookieOptions,
  flynetLoginCookies,
} from '@/lib/auth/session-cookies';
import { logOAuthFailure, logOAuthPhase } from '@/lib/auth/oauth-diagnostics';

type PendingTokens = {
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number;
};

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function parsePending(raw: string | null): PendingTokens | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingTokens>;
    if (typeof parsed.access_token !== 'string' || parsed.access_token.length === 0) return null;
    if (
      parsed.refresh_token !== null &&
      parsed.refresh_token !== undefined &&
      typeof parsed.refresh_token !== 'string'
    ) return null;
    return parsed as PendingTokens;
  } catch {
    return null;
  }
}

function fail(req: Request, error?: unknown) {
  logOAuthFailure('session_completion', 'OAUTH_SESSION_COOKIE_WRITE_FAILED', error);
  return NextResponse.redirect(new URL('/?error=oauth_session_cookie_write_failed', req.url));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const step = url.searchParams.get('step');
  const isProduction = process.env.NODE_ENV === 'production';
  const rawPending = getCookie(req.headers.get('cookie'), OAUTH_PENDING_COOKIE);
  const pending = parsePending(rawPending);

  logOAuthPhase('pending_cookie_observed', {
    present: Boolean(rawPending),
    serializedSize: rawPending ? utf8ByteLength(rawPending) : 0,
    step: step || 'missing',
  });

  try {
    if (step === 'access') {
      if (!pending) return fail(req);
      const { access } = flynetLoginCookies(pending, isProduction);
      const next = new URL('/api/auth/session?step=refresh', req.url);
      if (!pending.refresh_token) next.searchParams.set('step', 'clear_pending');
      const response = NextResponse.redirect(next);
      response.cookies.set(access.name, access.value, access.options as any);
      logOAuthPhase('access_cookie_written', {
        path: '/',
        httpOnly: true,
        serializedSize: utf8ByteLength(access.value),
      });
      return response;
    }

    if (step === 'refresh') {
      if (!pending) return fail(req);
      const { refresh } = flynetLoginCookies(pending, isProduction);
      const response = NextResponse.redirect(new URL('/api/auth/session?step=clear_pending', req.url));
      if (refresh) {
        response.cookies.set(refresh.name, refresh.value, refresh.options as any);
        logOAuthPhase('refresh_cookie_written', {
          path: '/api/auth',
          httpOnly: true,
          serializedSize: utf8ByteLength(refresh.value),
        });
      }
      return response;
    }

    if (step === 'clear_pending') {
      const response = NextResponse.redirect(new URL('/api/auth/session?step=clear_state', req.url));
      response.cookies.set(OAUTH_PENDING_COOKIE, '', clearOAuthPendingCookieOptions(isProduction));
      logOAuthPhase('session_cookies_written');
      return response;
    }

    if (step === 'clear_state') {
      const response = NextResponse.redirect(new URL('/api/auth/session?step=clear_verifier', req.url));
      response.cookies.set(OAUTH_STATE_COOKIE, '', clearOAuthTransientCookieOptions(isProduction));
      return response;
    }

    if (step === 'clear_verifier') {
      const response = NextResponse.redirect(new URL('/?oauth_success=true', req.url));
      response.cookies.set(OAUTH_VERIFIER_COOKIE, '', clearOAuthTransientCookieOptions(isProduction));
      logOAuthPhase('callback_complete');
      return response;
    }

    return fail(req);
  } catch (err: unknown) {
    return fail(req, err);
  }
}
