import { getCookie } from '@/lib/cookies';
import { ACCESS_COOKIE_NAME } from '@/lib/auth/session-cookies';
import { createFlynetMemberClient } from '@/lib/flynet';
import {
  getAuthenticatedOperator,
  resolveOrCreateFlynetDinerUser,
  AuthenticatedOperatorContext,
} from '@/lib/auth';
import { User } from '@/lib/db/types';

export type RequestIdentity =
  | { authenticated: false }
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

async function defaultFlynetSession(accessToken: string): Promise<FlynetSession | null> {
  try {
    const member = createFlynetMemberClient(accessToken);
    const profile = await member.getProfile();
    if (!profile || !(profile as any).id) return null;
    let checkIns: any[] = [];
    try {
      const res = await member.listCheckIns({ page: 0, pageSize: 50 });
      checkIns = (res as any)?.checkIns || [];
    } catch {
      checkIns = [];
    }
    return { profile, checkIns };
  } catch {
    return null;
  }
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
  if (!accessToken) return { authenticated: false };

  let session: FlynetSession | null = null;
  try {
    session = await deps.getFlynetSession(accessToken);
  } catch (err) {
    console.warn('[auth] Flynet session resolution failed:', err);
    session = null;
  }
  if (!session) return { authenticated: false };

  const flynetId = (session.profile as any)?.id as string;
  if (!flynetId) return { authenticated: false };

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
