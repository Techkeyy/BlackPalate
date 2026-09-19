/**
 * Runnable mirror of lib/auth/session-cookies.ts for node:test.
 * Keep logic identical.
 */
export const ACCESS_COOKIE_NAME = 'bp_access_token';
export const REFRESH_COOKIE_NAME = 'bp_refresh_token';
export const OAUTH_VERIFIER_COOKIE = 'bp_oauth_verifier';
export const OAUTH_STATE_COOKIE = 'bp_oauth_state';
export const OAUTH_PENDING_COOKIE = 'bp_oauth_pending';

export function oauthTransientCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  };
}

export function oauthPendingCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth/session',
    maxAge: 600,
  };
}

export function clearOAuthTransientCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  };
}

export function clearOAuthPendingCookieOptions(isProduction) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth/session',
    maxAge: 0,
  };
}

export function flynetLoginCookies(tokens, isProduction) {
  const access = {
    name: ACCESS_COOKIE_NAME,
    value: tokens.access_token,
    options: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: tokens.expires_in || 3600,
    },
  };
  if (!tokens.refresh_token) return { access, refresh: null };
  return {
    access,
    refresh: {
      name: REFRESH_COOKIE_NAME,
      value: tokens.refresh_token,
      options: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/api/auth',
        maxAge: 30 * 24 * 3600,
      },
    },
  };
}

export function clearFlynetCookies(isProduction) {
  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax', maxAge: 0 };
  return [
    { name: ACCESS_COOKIE_NAME, options: { ...base, path: '/' } },
    { name: REFRESH_COOKIE_NAME, options: { ...base, path: '/api/auth' } },
  ];
}
