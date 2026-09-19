/**
 * Single source of truth for Flynet session cookie attributes.
 *
 * - bp_access_token: consumed by product routes OUTSIDE /api/auth
 *   (/api/user/tastings, /apply, /submit-feedback), so Path MUST be '/'.
 * - bp_refresh_token: consumed only by /api/auth/refresh, scoped to /api/auth.
 * - HttpOnly is never weakened; Secure follows production; SameSite lax.
 */

export interface SessionCookieDef {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
  };
}

export const ACCESS_COOKIE_NAME = 'bp_access_token';
export const REFRESH_COOKIE_NAME = 'bp_refresh_token';
export const OAUTH_VERIFIER_COOKIE = 'bp_oauth_verifier';
export const OAUTH_STATE_COOKIE = 'bp_oauth_state';
export const OAUTH_PENDING_COOKIE = 'bp_oauth_pending';

export function oauthTransientCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 600,
  };
}

export function oauthPendingCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/api/auth/session',
    maxAge: 600,
  };
}

export function clearOAuthTransientCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export function clearOAuthPendingCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/api/auth/session',
    maxAge: 0,
  };
}

export function flynetLoginCookies(
  tokens: { access_token: string; refresh_token?: string | null; expires_in?: number },
  isProduction: boolean
): { access: SessionCookieDef; refresh: SessionCookieDef | null } {
  const access: SessionCookieDef = {
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

export interface ClearCookieDef {
  name: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: 0;
  };
}

/**
 * Clearing must mirror the original Path (otherwise the browser keeps the cookie).
 */
export function clearFlynetCookies(isProduction: boolean): ClearCookieDef[] {
  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, maxAge: 0 as const };
  return [
    { name: ACCESS_COOKIE_NAME, options: { ...base, path: '/' } },
    { name: REFRESH_COOKIE_NAME, options: { ...base, path: '/api/auth' } },
  ];
}
