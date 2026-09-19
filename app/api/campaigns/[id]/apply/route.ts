import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { evaluateQualification, QualificationRule } from '@/lib/qualification';
import { createFlynetMemberClient } from '@/lib/flynet';
import { resolveOrCreateFlynetDinerUser } from '@/lib/auth';
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

    // 1. Authenticate member via HttpOnly session cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, v] = c.trim().split('=');
        return [k, decodeURIComponent(v || '')];
      })
    );
    const accessToken = cookies['bp_access_token'];

    // If no active Blackbird session token exists: fail closed with truthful message
    if (!accessToken) {
      return safeError(503, 'FLYNET_UNAVAILABLE', 'apply without Blackbird session');
    }

    let dinerFlynetId: string;
    let dinerName: string;
    let checkIns: any[] = [];
    let internalUser: any;

    try {
      const member = createFlynetMemberClient(accessToken);
      const profile = await member.getProfile();
      dinerFlynetId = profile.id;
      dinerName = (profile as any).display_name || (profile as any).name || (profile as any).username || profile.id;

      const checkInsRes = await member.listCheckIns({ page: 0, pageSize: 50 });
      checkIns = checkInsRes.checkIns || [];

      // Resolve or create internal BlackPalate user
      internalUser = await resolveOrCreateFlynetDinerUser({
        id: profile.id,
        displayName: dinerName,
      });
    } catch {
      return safeError(503, 'FLYNET_UNAVAILABLE', 'Flynet profile/check-ins fetch failed');
    }

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
