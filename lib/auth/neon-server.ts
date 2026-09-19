import { createNeonAuth } from '@neondatabase/auth/next/server';

const isProd = process.env.NODE_ENV === 'production';
const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL;
const neonAuthSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!neonAuthSecret) {
  throw new Error('NEON_AUTH_CONFIGURATION_ERROR: NEON_AUTH_COOKIE_SECRET is missing. Fail-closed.');
}

if (!neonAuthBaseUrl && isProd) {
  throw new Error('NEON_AUTH_CONFIGURATION_ERROR: NEON_AUTH_BASE_URL is missing in production. Fail-closed.');
}

// Keep this module limited to the Neon SDK instance so it can be imported by
// Next middleware without pulling the database-backed application resolver into
// the Edge bundle.
export const neonAuth = createNeonAuth({
  baseUrl: neonAuthBaseUrl || 'https://auth.neon.tech',
  cookies: {
    secret: neonAuthSecret,
    sessionDataTtl: 300,
  },
});
