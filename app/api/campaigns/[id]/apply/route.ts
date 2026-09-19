import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import {
  evaluateCampaignQualification,
  qualificationReasons,
  safeQualificationSummary,
} from '@/lib/campaign-qualification';
import { resolveFlynetDinerIdentity } from '@/lib/auth/diner';
import { logOAuthPhase } from '@/lib/auth/oauth-diagnostics';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const identity = await resolveFlynetDinerIdentity(req);
    if (!identity.authenticated) {
      if (identity.failure === 'internal_user_resolution_failed') {
        return safeError(500, 'SERVICE_TEMPORARY', 'diner user resolution failed');
      }
      if (identity.failure === 'provider_unavailable' || identity.failure === 'insufficient_scope') {
        return safeError(503, 'FLYNET_UNAVAILABLE', 'diner profile request failed');
      }
      return safeError(401, 'UNAUTHORIZED', 'apply without Blackbird session');
    }

    if (!identity.historyAvailable) {
      logOAuthPhase('diner_apply', {
        DINER_AUTHENTICATED: true,
        CHECKINS_FETCH_STATUS: identity.historyStatus ?? 0,
        CHECKINS_COUNT: 0,
        QUALIFICATION_EVALUATED: false,
        APPLICATION_CREATE_STARTED: false,
        failure: 'provider_unavailable',
      });
      return safeError(503, 'FLYNET_UNAVAILABLE', 'member check-in request failed');
    }

    const campaign = await db.getCampaignById(params.id);
    if (!campaign) return safeError(404, 'NOT_FOUND');
    if (campaign.filledSlots >= campaign.maxSlots) {
      return safeError(400, 'CAMPAIGN_FULL', 'campaign capacity reached');
    }

    const existing = await db.getApplication(campaign.id, identity.user.id);
    if (existing) {
      logOAuthPhase('diner_apply', {
        DINER_AUTHENTICATED: true,
        CHECKINS_FETCH_STATUS: identity.historyStatus ?? 200,
        CHECKINS_COUNT: identity.checkIns.length,
        QUALIFICATION_EVALUATED: false,
        APPLICATION_CREATE_STARTED: false,
        APPLICATION_CREATED: false,
        duplicateApplication: true,
      });
      return safeError(409, 'CONFLICT', undefined, {
        qualified: true,
        application: existing,
      });
    }

    const result = evaluateCampaignQualification(campaign, identity.checkIns);
    const qualification = safeQualificationSummary(result);
    const reasons = qualificationReasons(campaign, result);
    logOAuthPhase('diner_apply', {
      DINER_AUTHENTICATED: true,
      CHECKINS_FETCH_STATUS: identity.historyStatus ?? 200,
      CHECKINS_COUNT: identity.checkIns.length,
      QUALIFICATION_EVALUATED: true,
      QUALIFICATION_RESULT: result.qualified ? 'QUALIFIED' : 'NOT_QUALIFIED',
      APPLICATION_CREATE_STARTED: false,
    });

    if (!result.qualified) {
      return safeError(422, 'QUALIFICATION_NOT_MET', undefined, {
        qualified: false,
        historyAvailable: true,
        checkInsCount: identity.checkIns.length,
        reasons,
        qualification,
      });
    }

    logOAuthPhase('diner_apply', {
      DINER_AUTHENTICATED: true,
      CHECKINS_FETCH_STATUS: identity.historyStatus ?? 200,
      CHECKINS_COUNT: identity.checkIns.length,
      QUALIFICATION_EVALUATED: true,
      QUALIFICATION_RESULT: 'QUALIFIED',
      APPLICATION_CREATE_STARTED: true,
    });

    const application = await db.createApplication({
      campaignId: campaign.id,
      userId: identity.user.id,
      dinerFlynetId: identity.flynetUserId,
      dinerName: identity.dinerName,
      status: 'QUALIFIED',
      qualificationProof: {
        totalCheckIns: identity.checkIns.length,
        cuisineVisits: Number(
          result.ruleEvaluations.find(rule => rule.rule.type === 'MIN_CUISINE_VISITS')?.actualValue || 0
        ),
        distinctVenues: result.distinctVenues,
        isNewToVenue: !identity.checkIns.some(
          (checkIn: any) => checkIn.location?.restaurant?.id === campaign.restaurantId
        ),
        qualifiedRuleSummary: result.ruleEvaluations.map(rule => rule.rule.description),
      },
    });

    logOAuthPhase('diner_apply', {
      DINER_AUTHENTICATED: true,
      CHECKINS_FETCH_STATUS: identity.historyStatus ?? 200,
      CHECKINS_COUNT: identity.checkIns.length,
      QUALIFICATION_EVALUATED: true,
      QUALIFICATION_RESULT: 'QUALIFIED',
      APPLICATION_CREATE_STARTED: true,
      APPLICATION_CREATED: true,
    });

    return NextResponse.json({
      ok: true,
      qualified: true,
      application,
      campaign,
    });
  } catch (error) {
    return safeCatch(error);
  }
}