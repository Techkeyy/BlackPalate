import { createNeonAuth } from '@neondatabase/auth/next/server';
import { db } from './db/repository';
import { User, RestaurantMembership } from './db/types';

const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL || 'https://auth.neon.tech';
const neonAuthSecret = process.env.NEON_AUTH_COOKIE_SECRET;

// Official Neon Auth (Managed Better Auth) Server Instance
export const neonAuth = createNeonAuth({
  baseUrl: neonAuthBaseUrl,
  cookies: {
    secret: neonAuthSecret,
    sessionDataTtl: 300,
  },
});

export interface AuthenticatedOperatorContext {
  user: User;
  neonAuthUserId: string;
  memberships: RestaurantMembership[];
}

/**
 * Validates a real managed Neon Auth session from the incoming request.
 * Resolves the authenticated external Neon Auth ID to the internal BlackPalate User.
 * Does NOT accept arbitrary client-provided user IDs, emails, or fake credentials.
 */
export async function getAuthenticatedOperator(req: Request): Promise<AuthenticatedOperatorContext | null> {
  try {
    // 1. Validate session with Neon Auth
    const sessionRes = await neonAuth.getSession({
      headers: req.headers,
    } as any).catch(() => null);

    const sessionData = (sessionRes as any)?.data || sessionRes;
    const neonUser = sessionData?.user || sessionData?.session?.user;

    if (!neonUser || !neonUser.id) {
      // Also inspect direct Neon session cookie if present
      const cookieHeader = req.headers.get('cookie') || '';
      if (!cookieHeader.includes('neon_auth') && !cookieHeader.includes('better-auth')) {
        return null;
      }
      return null;
    }

    // 2. Map external Neon Auth identity to internal BlackPalate User
    const user = await resolveOrCreateRestaurantUser({
      id: neonUser.id,
      email: neonUser.email,
      name: neonUser.name || neonUser.displayName,
      avatarUrl: neonUser.image || neonUser.avatarUrl,
    });

    // 3. Load legitimate memberships from PostgreSQL
    const memberships = await db.getMembershipsByUserId(user.id);

    return {
      user,
      neonAuthUserId: neonUser.id,
      memberships,
    };
  } catch (err) {
    console.warn('[Neon Auth] Session verification error:', err);
    return null;
  }
}

/**
 * Resolves or creates an internal BlackPalate User from an authenticated Neon Auth identity.
 * Keyed strictly by restaurantAuthUserId.
 * Does NOT auto-create fake restaurant ownership.
 * Does NOT merge automatically with Flynet users by email.
 */
export async function resolveOrCreateRestaurantUser(neonAuthUser: {
  id: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  let user = await db.getUserByRestaurantAuthId(neonAuthUser.id);

  if (!user) {
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = await db.createUser({
      id: newId,
      displayName: neonAuthUser.name || 'Restaurant Operator',
      email: neonAuthUser.email || null,
      restaurantAuthUserId: neonAuthUser.id,
      avatarUrl: neonAuthUser.avatarUrl || null,
    });
  }

  return user;
}

/**
 * Resolves or creates an internal BlackPalate User from an authenticated Flynet member identity.
 * Keyed strictly by flynetUserId.
 * Does NOT merge automatically by email.
 */
export async function resolveOrCreateFlynetDinerUser(flynetProfile: {
  id: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string;
}): Promise<User> {
  let user = await db.getUserByFlynetId(flynetProfile.id);

  if (!user) {
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    user = await db.createUser({
      id: newId,
      displayName: flynetProfile.displayName || flynetProfile.name || `Blackbird Member #${flynetProfile.id.slice(-4)}`,
      flynetUserId: flynetProfile.id,
      avatarUrl: flynetProfile.avatarUrl || null,
    });
  }

  return user;
}
