import { getFlynetConfig } from '@/lib/flynet';

export const FLYNET_MEMBER_API_BASE_URLS = {
  staging: 'https://api.staging.blackbird.xyz/flynet/v1',
  production: 'https://api.blackbird.xyz/flynet/v1',
} as const;

export const FLYNET_MEMBER_PATHS = {
  profile: '/users/me',
  checkIns: '/users/me/check_ins',
} as const;

export type FlynetMemberPath = (typeof FLYNET_MEMBER_PATHS)[keyof typeof FLYNET_MEMBER_PATHS];
export type FlynetMemberAuthError = 'invalid_token' | 'insufficient_scope' | 'none' | 'unknown';
export type FlynetMemberFailure = 'invalid_token' | 'insufficient_scope' | 'provider_unavailable';

export type FlynetMemberFetchResult<T> =
  | {
      ok: true;
      status: 200;
      authError: 'none';
      bodyPresent: true;
      contentType: string | null;
      data: T;
    }
  | {
      ok: false;
      status: number | null;
      authError: FlynetMemberAuthError;
      bodyPresent: boolean;
      contentType: string | null;
      failure: FlynetMemberFailure;
    };

export function getFlynetMemberApiBaseUrl(): string {
  return FLYNET_MEMBER_API_BASE_URLS[getFlynetConfig().environment];
}

function parseAuthError(header: string | null): FlynetMemberAuthError {
  if (!header) return 'none';
  const match = header.match(/(?:^|,|\s)error\s*=\s*"?(invalid_token|insufficient_scope)"?/i);
  if (!match) return 'unknown';
  return match[1].toLowerCase() as FlynetMemberAuthError;
}

function failureFor(status: number, authError: FlynetMemberAuthError): FlynetMemberFailure {
  if (status === 401 && authError === 'invalid_token') return 'invalid_token';
  if (status === 403 && authError === 'insufficient_scope') return 'insufficient_scope';
  return 'provider_unavailable';
}

export async function flynetMemberFetch<T>(
  accessToken: string,
  path: FlynetMemberPath
): Promise<FlynetMemberFetchResult<T>> {
  const endpoint = `${getFlynetMemberApiBaseUrl()}${path}`;
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    });
  } catch {
    return {
      ok: false,
      status: null,
      authError: 'unknown',
      bodyPresent: false,
      contentType: null,
      failure: 'provider_unavailable',
    };
  }

  const contentType = response.headers.get('content-type');
  // Read as text first. 401/403 responses may have an empty or non-JSON body.
  const body = await response.text();
  const bodyPresent = body.length > 0;
  const authError = response.ok ? 'none' : parseAuthError(response.headers.get('www-authenticate'));

  if (response.status !== 200) {
    return {
      ok: false,
      status: response.status,
      authError,
      bodyPresent,
      contentType,
      failure: failureFor(response.status, authError),
    };
  }

  if (!bodyPresent) {
    return {
      ok: false,
      status: response.status,
      authError: 'none',
      bodyPresent: false,
      contentType,
      failure: 'provider_unavailable',
    };
  }

  try {
    return {
      ok: true,
      status: 200,
      authError: 'none',
      bodyPresent: true,
      contentType,
      data: JSON.parse(body) as T,
    };
  } catch {
    return {
      ok: false,
      status: response.status,
      authError: 'none',
      bodyPresent: true,
      contentType,
      failure: 'provider_unavailable',
    };
  }
}

export function extractFlynetCheckIns(payload: unknown): any[] {
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['checkIns', 'check_ins', 'items']) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}
