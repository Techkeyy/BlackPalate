import { db } from './db/repository';
import { User, RestaurantMembership } from './db/types';
import { logOAuthPhase } from './auth/oauth-diagnostics';
import { neonAuth } from './auth/neon-server';

export { neonAuth } from './auth/neon-server';

export interface AuthenticatedOperatorContext {
  user: User;
  neonAuthUserId: string;
  memberships: RestaurantMembership[];
}

type NeonSessionLookup = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    displayName?: string | null;
    image?: string | null;
    avatarUrl?: string | null;
  };
  source: 'server_adapter' | 'request_get_session';
};

function extractNeonUser(sessionResult: unknown): NeonSessionLookup['user'] | null {
  const payload = (sessionResult as any)?.data || sessionResult;
  const user = payload?.user || payload?.session?.user;
  return user && typeof user.id === 'string' ? user : null;
}

/**
 * Read the managed Neon session from the current request context. The Next
 * adapter is the primary path; the same-origin get-session request is a
 * narrow fallback that forwards the incoming cookies when the route handler's
 * request context has not been populated for a nested server call.
 */
async function getNeonSessionFromRequest(req: Request): Promise<NeonSessionLookup | null> {
  const adapterResult = await neonAuth.getSession().catch(() => null);
  const adapterUser = extractNeonUser(adapterResult);
  if (adapterUser) return { user: adapterUser, source: 'server_adapter' };

  const cookieHeader = req.headers.get('cookie') || '';
  if (!cookieHeader.includes('__Secure-neon-auth')) return null;

  try {
    const sessionUrl = new URL('/api/auth/get-session', req.url);
    const headers = new Headers();
    headers.set('cookie', cookieHeader);
    headers.set('origin', req.headers.get('origin') || sessionUrl.origin);
    const response = await fetch(sessionUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const responseData = await response.json().catch(() => null);
    const requestUser = extractNeonUser(responseData);
    return requestUser ? { user: requestUser, source: 'request_get_session' } : null;
  } catch {
    return null;
  }
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
    const neonSession = await getNeonSessionFromRequest(req);
    const neonUser = neonSession?.user || null;
    neonSessionPresent = Boolean(neonUser?.id);

    if (!neonUser || !neonUser.id) {
      logOAuthPhase('restaurant_auth_resolution', {
        neonSessionPresent: false,
        operatorResolved: false,
        roleRestaurant: false,
        membershipFound: false,
        workspaceFound: false,
        sessionSource: 'none',
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
      sessionSource: neonSession?.source || 'none',
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

