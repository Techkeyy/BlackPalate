import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { evaluateQualification, QualificationRule } from '@/lib/qualification';
import { resolveRequestIdentity } from '@/lib/auth/resolve';
import { safeError, safeCatch } from '@/lib/api-errors';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await db.getCampaignById(params.id);

    if (!campaign) {
      return safeError(404, 'NOT_FOUND');
    }

    if (campaign.filledSlots >= campaign.maxSlots) {
      return safeError(400, 'CAMPAIGN_FULL', 'campaign capacity reached');
    }

    // 1. Authenticate the diner through the shared identity service
    // (same session source as /api/auth/me and /api/user/tastings).
    const identity = await resolveRequestIdentity(req);
    if (!identity.authenticated || identity.role !== 'DINER') {
      return safeError(503, 'FLYNET_UNAVAILABLE', 'apply without Blackbird session');
    }

    const dinerFlynetId: string = identity.flynetUserId;
    const dinerName: string = identity.dinerName;
    const checkIns: any[] = identity.checkIns;
    const internalUser = identity.user;

    // 2. Build deterministic qualification rules
    const rules: QualificationRule[] = [
      {
        type: 'MIN_TOTAL_CHECKINS',
        threshold: campaign.minTotalCheckIns,
        description: `At least ${campaign.minTotalCheckIns} verified dining check-in(s)`,
      },
    ];

    if (campaign.minCuisineVisits > 0 && campaign.targetCuisines.length > 0) {
      rules.push({
        type: 'MIN_CUISINE_VISITS',
        cuisine: campaign.targetCuisines[0],
        threshold: campaign.minCuisineVisits,
        description: `At least ${campaign.minCuisineVisits} verified visit(s) to ${campaign.targetCuisines.join('/')} venues`,
      });
    }

    if (campaign.mustBeNewToVenue) {
      rules.push({
        type: 'NEW_TO_RESTAURANT',
        restaurantId: campaign.restaurantId,
        description: `First-time tasting participant (no prior check-in at ${campaign.restaurantName || 'this venue'})`,
      });
    }

    // 3. Evaluate deterministic qualification rules
    const evalResult = evaluateQualification(checkIns, rules);

    if (!evalResult.qualified) {
      return NextResponse.json(
        {
          ok: false,
          qualified: false,
          reasons: evalResult.ruleEvaluations.filter(r => !r.passed).map(r => r.details),
          evalResult,
        },
        { status: 422 }
      );
    }

    // 4. Record application in persistence with internal userId
    const application = await db.createApplication({
      campaignId: campaign.id,
      userId: internalUser.id,
      dinerFlynetId,
      dinerName,
      status: 'QUALIFIED',
      qualificationProof: {
        totalCheckIns: checkIns.length,
        cuisineVisits: 0,
        isNewToVenue: !checkIns.some((c: any) => c.location?.restaurant?.id === campaign.restaurantId),
        qualifiedRuleSummary: evalResult.ruleEvaluations.map(r => r.rule.description),
      },
    });

    return NextResponse.json({
      ok: true,
      qualified: true,
      application,
      campaign,
    });
  } catch (err: any) {
    return safeCatch(err);
  }
}
