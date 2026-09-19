import { createNeonAuth } from '@neondatabase/auth/next/server';
import { db } from './db/repository';
import { User, RestaurantMembership } from './db/types';
import { logOAuthPhase } from './auth/oauth-diagnostics';

const isProd = process.env.NODE_ENV === 'production';
const neonAuthBaseUrl = process.env.NEON_AUTH_BASE_URL;
const neonAuthSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!neonAuthSecret) {
  throw new Error('NEON_AUTH_CONFIGURATION_ERROR: NEON_AUTH_COOKIE_SECRET is missing. Fail-closed.');
}

if (!neonAuthBaseUrl && isProd) {
  throw new Error('NEON_AUTH_CONFIGURATION_ERROR: NEON_AUTH_BASE_URL is missing in production. Fail-closed.');
}

// Official Neon Auth (Managed Better Auth) Server Instance
export const neonAuth = createNeonAuth({
  baseUrl: neonAuthBaseUrl || 'https://auth.neon.tech',
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

export type FlynetUserResolutionErrorKind =
  | 'database_unavailable'
  | 'database_query_failed'
  | 'database_insert_failed'
  | 'uniqueness_conflict'
  | 'required_field'
  | 'schema_mismatch'
  | 'unknown';

export interface FlynetUserResolutionTrace {
  onLookupStarted?: () => void;
  onLookupFound?: (found: boolean) => void;
  onLookupFailed?: (kind: FlynetUserResolutionErrorKind) => void;
  onCreateStarted?: () => void;
  onCreateSucceeded?: () => void;
  onCreateFailed?: (kind: FlynetUserResolutionErrorKind) => void;
}

function classifyFlynetUserResolutionError(error: unknown): FlynetUserResolutionErrorKind {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('database_unavailable') || message.includes('connection string')) {
    return 'database_unavailable';
  }
  if (message.includes('database query failed')) return 'database_query_failed';
  if (message.includes('database insert failed')) return 'database_insert_failed';
  if (message.includes('duplicate') || message.includes('unique constraint')) {
    return 'uniqueness_conflict';
  }
  if (message.includes('not-null') || message.includes('required')) return 'required_field';
  if (message.includes('column') || message.includes('schema')) return 'schema_mismatch';
  return 'unknown';
}

/**
 * Validates a real managed Neon Auth session from the incoming request.
 * Resolves the authenticated external Neon Auth ID to the internal BlackPalate User.
 * Does NOT accept arbitrary client-provided user IDs, emails, or fake credentials.
 */
export async function getAuthenticatedOperator(req: Request): Promise<AuthenticatedOperatorContext | null> {
  let neonSessionPresent = false;
  try {
    // 1. Validate session with Neon Auth
    const sessionRes = await neonAuth.getSession({
      headers: req.headers,
    } as any).catch(() => null);

    const sessionData = (sessionRes as any)?.data || sessionRes;
    const neonUser = sessionData?.user || sessionData?.session?.user;
    neonSessionPresent = Boolean(neonUser?.id);

    if (!neonUser || !neonUser.id) {
      // Also inspect direct Neon session cookie if present
      const cookieHeader = req.headers.get('cookie') || '';
      logOAuthPhase('restaurant_auth_resolution', {
        neonSessionPresent: false,
        operatorResolved: false,
        roleRestaurant: false,
        membershipFound: false,
        workspaceFound: false,
      });
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

    logOAuthPhase('restaurant_auth_resolution', {
      neonSessionPresent: true,
      operatorResolved: true,
      roleRestaurant: true,
      membershipFound: memberships.length > 0,
      workspaceFound: memberships.length > 0,
    });

    return {
      user,
      neonAuthUserId: neonUser.id,
      memberships,
    };
  } catch (err) {
    logOAuthPhase('restaurant_auth_resolution', {
      neonSessionPresent,
      operatorResolved: false,
      roleRestaurant: false,
      membershipFound: false,
      workspaceFound: false,
    });
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
}, trace: FlynetUserResolutionTrace = {}): Promise<User> {
  trace.onLookupStarted?.();
  let user: User | null;
  try {
    user = await db.getUserByFlynetId(flynetProfile.id);
  } catch (error) {
    trace.onLookupFailed?.(classifyFlynetUserResolutionError(error));
    throw error;
  }
  trace.onLookupFound?.(Boolean(user));

  if (!user) {
    trace.onCreateStarted?.();
    const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      user = await db.createUser({
        id: newId,
        displayName: flynetProfile.displayName || flynetProfile.name || `Blackbird Member #${flynetProfile.id.slice(-4)}`,
        flynetUserId: flynetProfile.id,
        avatarUrl: flynetProfile.avatarUrl || null,
      });
      trace.onCreateSucceeded?.();
    } catch (error) {
      trace.onCreateFailed?.(classifyFlynetUserResolutionError(error));
      throw error;
    }
  }

  return user;
}

