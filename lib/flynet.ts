/**
 * BlackPalate Flynet Client Layer
 * Handles server-side Discovery calls (via X-API-Key) and Member calls (via OAuth Bearer).
 * Follows official @flynetdev/core client semantics.
 */

export interface FlynetConfig {
  apiKey?: string;
  apiBaseUrl?: string;
  oauthBaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export function getFlynetConfig(): FlynetConfig {
  const env = process.env.FLYNET_ENV || 'staging';
  const isProd = env === 'production';

  return {
    apiKey: process.env.FLYNET_API_KEY,
    apiBaseUrl:
      process.env.NEXT_PUBLIC_FLYNET_API_BASE ||
      (isProd
        ? 'https://api.blackbird.xyz/flynet/v1'
        : 'https://api.staging.blackbird.xyz/flynet/v1'),
    oauthBaseUrl:
      process.env.NEXT_PUBLIC_FLYNET_OAUTH_BASE ||
      (isProd
        ? 'https://api.blackbird.xyz/oauth'
        : 'https://api.staging.blackbird.xyz/oauth'),
    clientId: process.env.NEXT_PUBLIC_FLYNET_CLIENT_ID,
    clientSecret: process.env.FLYNET_CLIENT_SECRET,
    redirectUri:
      process.env.NEXT_PUBLIC_FLYNET_REDIRECT_URI ||
      'http://localhost:3000/api/auth/callback',
  };
}

export interface ApiCallResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  errorCode?: string;
  rawHeaders?: Record<string, string>;
}

/**
 * Server-side Discovery Request (Uses X-API-Key)
 */
export async function flynetDiscoveryFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiCallResult<T>> {
  const config = getFlynetConfig();

  if (!config.apiKey) {
    return {
      ok: false,
      status: 400,
      error: 'FLYNET_API_KEY is not configured in server environment.',
      errorCode: 'MISSING_API_KEY',
    };
  }

  const url = `${config.apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const rawHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      rawHeaders[k] = v;
    });

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        error: `Unauthorized: ${rawHeaders['www-authenticate'] || 'Empty 401 response'}`,
        errorCode: 'UNAUTHORIZED_API_KEY',
        rawHeaders,
      };
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: errorText || `HTTP ${res.status}`,
        rawHeaders,
      };
    }

    const data = (await res.json().catch(() => null)) as T;
    return {
      ok: true,
      status: res.status,
      data,
      rawHeaders,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err.message || 'Network error talking to Flynet Discovery API',
      errorCode: 'NETWORK_ERROR',
    };
  }
}

/**
 * Member Route Request (Uses OAuth Bearer Access Token)
 */
export async function flynetMemberFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<ApiCallResult<T>> {
  const config = getFlynetConfig();

  if (!accessToken) {
    return {
      ok: false,
      status: 400,
      error: 'OAuth access token required for member routes.',
      errorCode: 'MISSING_ACCESS_TOKEN',
    };
  }

  const url = `${config.apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const rawHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      rawHeaders[k] = v;
    });

    if (res.status === 401) {
      return {
        ok: false,
        status: 401,
        error: `Unauthorized: ${rawHeaders['www-authenticate'] || 'Empty 401 response'}`,
        errorCode: 'EXPIRED_OR_INVALID_TOKEN',
        rawHeaders,
      };
    }

    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        error: `Forbidden (Insufficient Scope): ${rawHeaders['www-authenticate'] || ''}`,
        errorCode: 'INSUFFICIENT_SCOPE',
        rawHeaders,
      };
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: errorText || `HTTP ${res.status}`,
        rawHeaders,
      };
    }

    const data = (await res.json().catch(() => null)) as T;
    return {
      ok: true,
      status: res.status,
      data,
      rawHeaders,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err.message || 'Network error talking to Flynet Member API',
      errorCode: 'NETWORK_ERROR',
    };
  }
}
