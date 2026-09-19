import { getCookie } from '@/lib/cookies';
import { ACCESS_COOKIE_NAME } from '@/lib/auth/session-cookies';
import {
  extractFlynetCheckIns,
  flynetMemberFetch,
  FLYNET_MEMBER_PATHS,
  type FlynetMemberFailure,
} from '@/lib/flynet-member';
import { logOAuthPhase } from '@/lib/auth/oauth-diagnostics';
import { resolveOrCreateFlynetDinerUser } from '@/lib/auth';
import type { User } from '@/lib/db/types';

export type DinerIdentityFailure =
  | 'missing_access_token'
  | 'invalid_token'
  | 'insufficient_scope'
  | 'provider_unavailable'
  | 'internal_user_resolution_failed';

export type DinerIdentityResult =
  | {
      authenticated: false;
      failure: DinerIdentityFailure;
      upstreamStatus?: number | null;
    }
  | {
      authenticated: true;
      role: 'DINER';
      user: User;
      flynetUserId: string;
      dinerName: string;
      profile: Record<string, unknown>;
      checkIns: any[];
      historyAvailable: boolean;
      historyStatus: number | null;
    };

function memberFailure(failure: FlynetMemberFailure): DinerIdentityFailure {
  return failure;
}

function memberDisplayName(profile: Record<string, unknown>, flynetId: string): string {
  const first = typeof profile.first_name === 'string' ? profile.first_name.trim() : '';
  const last = typeof profile.last_name === 'string' ? profile.last_name.trim() : '';
  const fullName = [first, last].filter(Boolean).join(' ');
  if (fullName) return fullName;
  for (const key of ['display_name', 'name', 'username']) {
    if (typeof profile[key] === 'string' && profile[key]) return profile[key] as string;
  }
  return `Blackbird Member #${flynetId.slice(-4)}`;
}

/**
 * The single production diner identity/history source. It deliberately uses
 * the same raw member endpoints already proven by /api/auth/me.
 *
 * Profile identity and history availability are separate facts: a successful
 * profile with a successful 200 [] history response is an authenticated diner
 * with zero history, while a failed history request is an authenticated diner
 * whose qualification cannot safely be evaluated yet.
 */
export async function resolveFlynetDinerIdentity(req: Request): Promise<DinerIdentityResult> {
  const accessToken = getCookie(req.headers.get('cookie'), ACCESS_COOKIE_NAME);
  const accessCookiePresent = Boolean(accessToken);

  if (!accessToken) {
    logOAuthPhase('diner_authentication', {
      DINER_AUTHENTICATED: false,
      ACCESS_COOKIE_PRESENT: false,
      failure: 'missing_access_token',
    });
    return { authenticated: false, failure: 'missing_access_token' };
  }

  logOAuthPhase('diner_profile_fetch', {
    DINER_AUTHENTICATED: false,
    ACCESS_COOKIE_PRESENT: accessCookiePresent,
    PROFILE_FETCH_STARTED: true,
  });

  const profileResult = await flynetMemberFetch<Record<string, unknown>>(
    accessToken,
    FLYNET_MEMBER_PATHS.profile
  );

  logOAuthPhase('diner_profile_fetch', {
    ACCESS_COOKIE_PRESENT: true,
    PROFILE_FETCH_STARTED: true,
    PROFILE_FETCH_STATUS: profileResult.status ?? 0,
    profileResolved: profileResult.ok,
  });

  if (!profileResult.ok) {
    return {
      authenticated: false,
      failure: memberFailure(profileResult.failure),
      upstreamStatus: profileResult.status,
    };
  }

  const profile = profileResult.data;
  const flynetId = profile && typeof profile.id === 'string' ? profile.id : null;
  if (!flynetId) {
    logOAuthPhase('diner_profile_fetch', {
      ACCESS_COOKIE_PRESENT: true,
      PROFILE_FETCH_STATUS: 200,
      profileResolved: false,
      profileIdPresent: false,
    });
    return { authenticated: false, failure: 'provider_unavailable', upstreamStatus: 200 };
  }

  logOAuthPhase('diner_checkins_fetch', {
    ACCESS_COOKIE_PRESENT: true,
    PROFILE_FETCH_STATUS: 200,
    PROFILE_FETCH_STARTED: true,
    CHECKINS_FETCH_STARTED: true,
  });

  const checkInsResult = await flynetMemberFetch<unknown>(
    accessToken,
    FLYNET_MEMBER_PATHS.checkIns
  );
  const checkIns = checkInsResult.ok ? extractFlynetCheckIns(checkInsResult.data) : [];
  const historyAvailable = checkInsResult.ok;

  logOAuthPhase('diner_checkins_fetch', {
    CHECKINS_FETCH_STARTED: true,
    CHECKINS_FETCH_STATUS: checkInsResult.status ?? 0,
    CHECKINS_COUNT: checkIns.length,
    historyAvailable,
  });

  const displayName = memberDisplayName(profile, flynetId);
  let user: User;
  try {
    user = await resolveOrCreateFlynetDinerUser({
      id: flynetId,
      displayName,
      avatarUrl:
        typeof profile.avatar === 'string'
          ? profile.avatar
          : typeof profile.avatar_url === 'string'
            ? profile.avatar_url
            : typeof profile.image === 'string'
              ? profile.image
              : undefined,
    });
  } catch {
    logOAuthPhase('diner_authentication', {
      DINER_AUTHENTICATED: false,
      ACCESS_COOKIE_PRESENT: true,
      PROFILE_FETCH_STATUS: 200,
      CHECKINS_FETCH_STATUS: checkInsResult.status ?? 0,
      CHECKINS_COUNT: checkIns.length,
      failure: 'internal_user_resolution_failed',
    });
    return { authenticated: false, failure: 'internal_user_resolution_failed', upstreamStatus: null };
  }

  logOAuthPhase('diner_authentication', {
    DINER_AUTHENTICATED: true,
    ACCESS_COOKIE_PRESENT: true,
    PROFILE_FETCH_STATUS: 200,
    CHECKINS_FETCH_STATUS: checkInsResult.status ?? 0,
    CHECKINS_COUNT: checkIns.length,
    historyAvailable,
  });

  return {
    authenticated: true,
    role: 'DINER',
    user,
    flynetUserId: flynetId,
    dinerName: displayName,
    profile,
    checkIns,
    historyAvailable,
    historyStatus: checkInsResult.status,
  };
}
