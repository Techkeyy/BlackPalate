import {
  FlynetOAuth,
  FlynetDiscoveryClient,
  type FlynetEnvironment,
  normalizeFlynetError,
} from '@flynetdev/core';

export interface FlynetConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  environment: FlynetEnvironment;
  scopes: string[];
  audience: string;
}

export function getFlynetConfig(): FlynetConfig {
  const envStr = process.env.FLYNET_ENV || 'staging';
  const environment: FlynetEnvironment = envStr === 'production' ? 'production' : 'staging';

  return {
    apiKey: process.env.FLYNET_API_KEY,
    clientId: process.env.NEXT_PUBLIC_FLYNET_CLIENT_ID,
    clientSecret: process.env.FLYNET_CLIENT_SECRET,
    redirectUri:
      process.env.NEXT_PUBLIC_FLYNET_REDIRECT_URI ||
      'https://blackpalate.vercel.app/api/auth/callback',
    environment,
    // Reduced minimal scopes per Directive 001C
    scopes: (process.env.NEXT_PUBLIC_FLYNET_SCOPES || 'read:profile read:user_checkins')
      .split(' ')
      .filter(Boolean),
    audience:
      environment === 'production'
        ? 'https://api.blackbird.xyz'
        : 'https://api.staging.blackbird.xyz',
  };
}

export function createFlynetOAuth(): FlynetOAuth {
  const config = getFlynetConfig();
  return new FlynetOAuth({
    clientId: config.clientId || '',
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri || '',
    scopes: config.scopes,
    audience: config.audience,
    environment: config.environment,
  });
}

export function createFlynetDiscoveryClient(): FlynetDiscoveryClient | null {
  const config = getFlynetConfig();
  if (!config.apiKey) return null;
  return new FlynetDiscoveryClient({
    apiKey: config.apiKey,
    environment: config.environment,
  });
}

export { normalizeFlynetError };
