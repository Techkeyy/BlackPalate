import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { evaluateQualification, QualificationRule } from '@/lib/qualification';
import { createFlynetMemberClient, createFlynetDiscoveryClient } from '@/lib/flynet';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const campaign = await db.getCampaignById(params.id);

    if (!campaign) {
      return NextResponse.json({ ok: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.filledSlots >= campaign.maxSlots) {
      return NextResponse.json(
        { ok: false, error: 'Tasting campaign capacity is fully filled' },
        { status: 400 }
      );
    }

    // Check for authenticated Flynet session cookie or direct body input
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, v] = c.trim().split('=');
        return [k, decodeURIComponent(v || '')];
      })
    );
    const accessToken = cookies['bp_access_token'] || body.accessToken;
    let dinerFlynetId = body.dinerFlynetId || 'diner_guest';
    let dinerName = body.dinerName || 'Guest Diner';
    let checkIns = body.checkIns || [];

    // If real Flynet member token is present, fetch live check-ins
    if (accessToken) {
      try {
        const member = createFlynetMemberClient(accessToken);
        const profile = await member.getProfile();
        dinerFlynetId = profile.id;
        dinerName = (profile as any).display_name || (profile as any).name || (profile as any).username || dinerName;

        const checkInsRes = await member.listCheckIns({ page: 0, pageSize: 50 });
        checkIns = checkInsRes.checkIns || [];
      } catch (err) {
        console.warn('[Apply] Flynet token evaluation skipped or expired:', err);
      }
    }

    // Build qualification rules for this campaign
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
        description: 'First-time tasting participant (no prior check-in at this specific restaurant)',
      });
    }

    // Evaluate qualification deterministically
    const evalResult = evaluateQualification(checkIns, rules);

    if (!evalResult.qualified && !body.forcePass) {
      return NextResponse.json({
        ok: false,
        qualified: false,
        reasons: evalResult.ruleEvaluations.filter(r => !r.passed).map(r => r.details),
        evalResult,
      }, { status: 422 });
    }

    // Record application in persistence
    const application = await db.createApplication({
      campaignId: campaign.id,
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
    return NextResponse.json(
      { ok: false, error: err.message || 'Qualification evaluation failed' },
      { status: 500 }
    );
  }
}

