import { getCookie } from '@/lib/cookies';
import { ACCESS_COOKIE_NAME } from '@/lib/auth/session-cookies';
import {
  extractFlynetCheckIns,
  flynetMemberFetch,
  FLYNET_MEMBER_PATHS,
  type FlynetMemberFailure,
} from '@/lib/flynet-member';
import { logOAuthPhase } from '@/lib/auth/oauth-diagnostics';
import {
  getAuthenticatedOperator,
  resolveOrCreateFlynetDinerUser,
  AuthenticatedOperatorContext,
  type FlynetUserResolutionTrace,
} from '@/lib/auth';
import { User } from '@/lib/db/types';

export type RequestIdentity =
  | { authenticated: false; failure?: IdentityFailure; upstreamStatus?: number | null; debug?: DinerResolutionDebug }
  | {
      authenticated: true;
      role: 'RESTAURANT';
      user: User;
      neonAuthUserId: string;
      memberships: AuthenticatedOperatorContext['memberships'];
    }
  | {
      authenticated: true;
      role: 'DINER';
      user: User;
      flynetUserId: string;
      dinerName: string;
      profile: any;
      checkIns: any[];
      debug?: DinerResolutionDebug;
    };

export type IdentityFailure =
  | 'missing_access_token'
  | 'invalid_token'
  | 'insufficient_scope'
  | 'provider_unavailable'
  | 'internal_user_resolution_failed';

export type DinerResolutionDebug = {
  stage: 'PROFILE_OK' | 'FLYNET_ID_MISSING' | 'USER_LOOKUP_FAILED' | 'USER_CREATE_FAILED' | 'USER_RESOLVED';
  topLevelKeys: string[];
  idFieldUsed: 'id';
  idPresent: boolean;
  profileFetched: boolean;
  flynetIdPresent: boolean;
  userLookupStarted: boolean;
  userLookupFound: boolean;
  userLookupErrorKind: string | null;
  userCreateStarted: boolean;
  userCreateSucceeded: boolean;
  userCreateErrorKind: string | null;
  finalRole: 'DINER' | 'NONE';
};

export interface FlynetSession {
  profile: any;
  checkIns: any[];
}

export interface ResolveDeps {
  getOperator: (req: Request) => Promise<AuthenticatedOperatorContext | null>;
  readAccessToken: (req: Request) => string | null;
  getFlynetSession: (accessToken: string) => Promise<FlynetSession | null>;
  resolveDinerUser: (
    identity: { id: string; displayName?: string; avatarUrl?: string },
    trace?: FlynetUserResolutionTrace
  ) => Promise<User>;
}

class FlynetProfileResolutionError extends Error {
  constructor(
    public readonly failure: FlynetMemberFailure,
    public readonly upstreamStatus: number | null
  ) {
    super('Flynet member profile resolution failed');
    this.name = 'FlynetProfileResolutionError';
  }
}

type FlynetProfile = {
  id?: unknown;
  display_name?: unknown;
  name?: unknown;
  username?: unknown;
  avatar_url?: unknown;
  image?: unknown;
};

async function defaultFlynetSession(accessToken: string): Promise<FlynetSession | null> {
  const profileResult = await flynetMemberFetch<FlynetProfile>(
    accessToken,
    FLYNET_MEMBER_PATHS.profile
  );

  if (!profileResult.ok) {
    logOAuthPhase('member_profile_resolution', {
      status: profileResult.status ?? 0,
      authError: profileResult.authError,
      bodyPresent: profileResult.bodyPresent,
      profileResolved: false,
    });
    throw new FlynetProfileResolutionError(profileResult.failure, profileResult.status);
  }

  const profile = profileResult.data;
  if (!profile || typeof profile.id !== 'string' || profile.id.length === 0) {
    logOAuthPhase('member_profile_resolution', {
      status: profileResult.status,
      authError: profileResult.authError,
      bodyPresent: profileResult.bodyPresent,
      profileResolved: false,
    });
    throw new FlynetProfileResolutionError('provider_unavailable', profileResult.status);
  }

  const checkInsResult = await flynetMemberFetch<unknown>(
    accessToken,
    FLYNET_MEMBER_PATHS.checkIns
  );
  const checkIns = checkInsResult.ok ? extractFlynetCheckIns(checkInsResult.data) : [];
  logOAuthPhase('member_checkins_resolution', {
    status: checkInsResult.status ?? 0,
    authError: checkInsResult.authError,
    resolved: checkInsResult.ok,
    count: checkIns.length,
  });

  logOAuthPhase('member_profile_resolution', {
    status: profileResult.status,
    authError: profileResult.authError,
    bodyPresent: profileResult.bodyPresent,
    profileResolved: true,
  });
  return { profile, checkIns };
}

export const defaultResolveDeps: ResolveDeps = {
  getOperator: (req) => getAuthenticatedOperator(req),
  readAccessToken: (req) => getCookie(req.headers.get('cookie'), ACCESS_COOKIE_NAME),
  getFlynetSession: defaultFlynetSession,
  resolveDinerUser: (identity, trace) =>
    resolveOrCreateFlynetDinerUser(
      {
        id: identity.id,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
      },
      trace
    ),
};

/**
 * Single auth-resolution service for all protected routes.
 *
 * - Neon restaurant identity is tested first (authoritative for operators).
 * - A failing/absent Neon check NEVER blocks the Flynet attempt and vice versa.
 * - Diner and restaurant identities are never merged (separate User rows by key).
 */
export async function resolveRequestIdentity(
  req: Request,
  deps: ResolveDeps = defaultResolveDeps
): Promise<RequestIdentity> {
  let operator: AuthenticatedOperatorContext | null = null;
  try {
    operator = await deps.getOperator(req);
  } catch (err) {
    console.warn('[auth] operator resolution failed, trying Flynet session:', err);
    operator = null;
  }
  if (operator) {
    return {
      authenticated: true,
      role: 'RESTAURANT',
      user: operator.user,
      neonAuthUserId: operator.neonAuthUserId,
      memberships: operator.memberships,
    };
  }

  let accessToken: string | null = null;
  try {
    accessToken = deps.readAccessToken(req);
  } catch {
    accessToken = null;
  }
  if (!accessToken) {
    logOAuthPhase('member_session_resolution', {
      accessCookiePresent: false,
      profileResolved: false,
      profileIdPresent: false,
      failure: 'missing_access_token',
    });
    return { authenticated: false, failure: 'missing_access_token' };
  }

  let session: FlynetSession | null = null;
  let failure: IdentityFailure = 'provider_unavailable';
  let upstreamStatus: number | null = null;
  try {
    session = await deps.getFlynetSession(accessToken);
  } catch (err) {
    console.warn('[auth] Flynet session resolution failed:', err);
    if (err instanceof FlynetProfileResolutionError) {
      failure = err.failure;
      upstreamStatus = err.upstreamStatus;
    }
    session = null;
  }
  if (!session) {
    logOAuthPhase('member_session_resolution', {
      accessCookiePresent: true,
      profileResolved: false,
      profileIdPresent: false,
      failure,
      status: upstreamStatus ?? 0,
    });
    return { authenticated: false, failure, upstreamStatus };
  }

  const flynetId = (session.profile as any)?.id as string;
  if (!flynetId) {
    logOAuthPhase('member_session_resolution', {
      accessCookiePresent: true,
      profileResolved: true,
      profileIdPresent: false,
      failure: 'provider_unavailable',
      status: 200,
    });
    return { authenticated: false, failure: 'provider_unavailable', upstreamStatus: 200 };
  }

  logOAuthPhase('member_session_resolution', {
    accessCookiePresent: true,
    profileResolved: true,
    profileIdPresent: true,
    failure: 'none',
    status: 200,
  });

  const profileObject =
    session.profile && typeof session.profile === 'object' && !Array.isArray(session.profile)
      ? (session.profile as Record<string, unknown>)
      : {};
  const topLevelKeys = Object.keys(profileObject).sort();
  const idPresent = typeof profileObject.id === 'string' && profileObject.id.length > 0;
  const displayName =
    (session.profile as any)?.display_name ||
    (session.profile as any)?.name ||
    (session.profile as any)?.username ||
    flynetId;
  const debug: DinerResolutionDebug = {
    stage: 'PROFILE_OK',
    topLevelKeys,
    idFieldUsed: 'id',
    idPresent,
    profileFetched: true,
    flynetIdPresent: idPresent,
    userLookupStarted: false,
    userLookupFound: false,
    userLookupErrorKind: null,
    userCreateStarted: false,
    userCreateSucceeded: false,
    userCreateErrorKind: null,
    finalRole: 'NONE',
  };
  const trace: FlynetUserResolutionTrace = {
    onLookupStarted: () => { debug.userLookupStarted = true; },
    onLookupFound: found => { debug.userLookupFound = found; },
    onLookupFailed: kind => { debug.userLookupErrorKind = kind; },
    onCreateStarted: () => { debug.userCreateStarted = true; },
    onCreateSucceeded: () => { debug.userCreateSucceeded = true; },
    onCreateFailed: kind => { debug.userCreateErrorKind = kind; },
  };

  let user: User;
  try {
    user = await deps.resolveDinerUser(
      {
        id: flynetId,
        displayName,
        avatarUrl: (session.profile as any)?.avatar_url || (session.profile as any)?.image,
      },
      trace
    );
  } catch (error) {
    debug.stage = debug.userCreateStarted ? 'USER_CREATE_FAILED' : 'USER_LOOKUP_FAILED';
    logOAuthPhase('member_user_resolution', {
      profileFetched: debug.profileFetched,
      flynetIdPresent: debug.flynetIdPresent,
      userLookupStarted: debug.userLookupStarted,
      userLookupFound: debug.userLookupFound,
      userCreateStarted: debug.userCreateStarted,
      userCreateSucceeded: debug.userCreateSucceeded,
      userCreateErrorKind: debug.userCreateErrorKind ?? 'none',
      finalRole: 'NONE',
      debugStage: debug.stage,
    });
    console.warn('[auth] internal Flynet user resolution failed:', error instanceof Error ? error.name : 'unknown');
    return { authenticated: false, failure: 'internal_user_resolution_failed', upstreamStatus: null, debug };
  }

  debug.stage = 'USER_RESOLVED';
  debug.finalRole = 'DINER';
  logOAuthPhase('member_user_resolution', {
    profileFetched: debug.profileFetched,
    flynetIdPresent: debug.flynetIdPresent,
    userLookupStarted: debug.userLookupStarted,
    userLookupFound: debug.userLookupFound,
    userCreateStarted: debug.userCreateStarted,
    userCreateSucceeded: debug.userCreateSucceeded,
    userCreateErrorKind: debug.userCreateErrorKind ?? 'none',
    finalRole: 'DINER',
    debugStage: debug.stage,
  });

  return {
    authenticated: true,
    role: 'DINER',
    user,
    flynetUserId: flynetId,
    dinerName: displayName,
    profile: session.profile,
    checkIns: session.checkIns,
    debug,
  };
}




