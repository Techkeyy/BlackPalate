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
} from '@/lib/auth';
import { User } from '@/lib/db/types';

export type RequestIdentity =
  | { authenticated: false; failure?: IdentityFailure; upstreamStatus?: number | null }
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
    };

export type IdentityFailure =
  | 'missing_access_token'
  | 'invalid_token'
  | 'insufficient_scope'
  | 'provider_unavailable';

export interface FlynetSession {
  profile: any;
  checkIns: any[];
}

export interface ResolveDeps {
  getOperator: (req: Request) => Promise<AuthenticatedOperatorContext | null>;
  readAccessToken: (req: Request) => string | null;
  getFlynetSession: (accessToken: string) => Promise<FlynetSession | null>;
  resolveDinerUser: (identity: {
    id: string;
    displayName?: string;
    avatarUrl?: string;
  }) => Promise<User>;
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
  resolveDinerUser: (identity) =>
    resolveOrCreateFlynetDinerUser({
      id: identity.id,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
    }),
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

  const displayName =
    (session.profile as any)?.display_name ||
    (session.profile as any)?.name ||
    (session.profile as any)?.username ||
    flynetId;
  const user = await deps.resolveDinerUser({
    id: flynetId,
    displayName,
    avatarUrl: (session.profile as any)?.avatar_url || (session.profile as any)?.image,
  });

  return {
    authenticated: true,
    role: 'DINER',
    user,
    flynetUserId: flynetId,
    dinerName: displayName,
    profile: session.profile,
    checkIns: session.checkIns,
  };
}
