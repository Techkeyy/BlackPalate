import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { resolveFlynetDinerIdentity } from '@/lib/auth/diner';
import {
  evaluateCampaignQualification,
  qualificationReasons,
  safeQualificationSummary,
} from '@/lib/campaign-qualification';
import { logOAuthPhase } from '@/lib/auth/oauth-diagnostics';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await db.getCampaignById(params.id);
    if (!campaign) return safeError(404, 'NOT_FOUND');

    const identity = await resolveFlynetDinerIdentity(req);
    if (!identity.authenticated) {
      if (identity.failure === 'internal_user_resolution_failed') {
        return safeError(500, 'SERVICE_TEMPORARY', 'diner user resolution failed');
      }
      return safeError(401, 'UNAUTHORIZED', 'qualification without diner session');
    }
    if (identity.role !== 'DINER') {
      return safeError(403, 'FORBIDDEN', 'qualification requires a diner session');
    }
    if (identity.historyAvailable === false) {
      logOAuthPhase('diner_qualification', {
        CHECKINS_FETCH_STATUS: identity.historyStatus ?? 0,
        CHECKINS_COUNT: 0,
        QUALIFICATION_EVALUATED: false,
        QUALIFICATION_RESULT: 'PROVIDER_ERROR',
      });
      return safeError(503, 'FLYNET_UNAVAILABLE', 'member check-in request failed');
    }

    const result = evaluateCampaignQualification(campaign, identity.checkIns);
    const qualification = safeQualificationSummary(result);
    const reasons = qualificationReasons(campaign, result);
    logOAuthPhase('diner_qualification', {
      CHECKINS_FETCH_STATUS: identity.historyStatus ?? 200,
      CHECKINS_COUNT: identity.checkIns.length,
      QUALIFICATION_EVALUATED: true,
      QUALIFICATION_RESULT: result.qualified ? 'QUALIFIED' : 'NOT_QUALIFIED',
    });

    return NextResponse.json({
      ok: true,
      qualified: result.qualified,
      historyAvailable: true,
      checkInsCount: identity.checkIns.length,
      qualification,
      reasons,
    });
  } catch (error) {
    return safeCatch(error);
  }
}
