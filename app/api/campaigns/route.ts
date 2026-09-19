import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { getAuthenticatedOperator } from '@/lib/auth';
import { safeError, safeCatch } from '@/lib/api-errors';
import { filterPublicMarketplaceCampaigns } from '@/lib/campaign-visibility';
import { normalizeCampaignNarrative } from '@/lib/campaign-content';

export const dynamic = 'force-dynamic';

function parseNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || undefined;
    const surface = searchParams.get('surface') || 'marketplace';

    const campaigns = await db.getCampaigns(restaurantId);
    const visibleCampaigns =
      surface === 'demo'
        ? campaigns.filter(campaign => campaign.isDemo === true)
        : surface === 'all'
          ? campaigns
          : filterPublicMarketplaceCampaigns(campaigns);

    const normalizedCampaigns = visibleCampaigns.map(campaign => ({
      ...campaign,
      ...normalizeCampaignNarrative(campaign),
    }));

    return NextResponse.json({ ok: true, campaigns: normalizedCampaigns });
  } catch (err: any) {
    return safeCatch(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.title || !body.dishFocus || !body.restaurantId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: title, dishFocus, restaurantId' },
        { status: 400 }
      );
    }

    // 1. Authenticate operator via real Neon Auth session
    const operatorCtx = await getAuthenticatedOperator(req);
    if (!operatorCtx) {
      return safeError(401, 'UNAUTHORIZED', 'campaign publish without session');
    }

    // 2. Enforce RestaurantMembership authorization (prevent cross-restaurant mutation)
    const membership = await db.getMembership(operatorCtx.user.id, body.restaurantId);
    if (!membership) {
      return safeError(403, 'FORBIDDEN_WORKSPACE', `no membership for publish`);
    }

    // 3. Resolve authoritative workspace content. Client text cannot replace the
    // restaurant identity attached to the authenticated operator's membership.
    const restaurant = await db.getRestaurantById(body.restaurantId);
    if (!restaurant) return safeError(404, 'NOT_FOUND');
    const targetCuisines = Array.isArray(body.targetCuisines) && body.targetCuisines.length > 0
      ? body.targetCuisines
      : restaurant.cuisine;
    const campaignNarrative = normalizeCampaignNarrative({
      restaurantName: restaurant.name,
      dishFocus: body.dishFocus,
      targetCuisines,
      restaurantCuisine: restaurant.cuisine,
      description: typeof body.description === 'string' ? body.description : '',
      researchGoal: typeof body.researchGoal === 'string' ? body.researchGoal : '',
    });
    // 3. Create persistent campaign
    const mustBeNewToVenue = Boolean(body.mustBeNewToVenue);
    const campaign = await db.createCampaign({
      title: body.title,
      description: campaignNarrative.description || '',
      dishFocus: body.dishFocus,
      researchGoal: campaignNarrative.researchGoal || null,
      restaurantId: body.restaurantId,
      restaurantName: restaurant.name,
      restaurantCuisine: restaurant.cuisine,
      location: body.location || restaurant.neighborhood || 'NYC',
      timing: body.timing || 'Flexible schedule',
      timeCommitment: body.timeCommitment || '45 minutes',
      targetCuisines,
      minTotalCheckIns: parseNonNegativeInteger(body.minTotalCheckIns, mustBeNewToVenue ? 0 : 1),
      minDistinctVenues: parseNonNegativeInteger(body.minDistinctVenues, 0),
      minCuisineVisits: parseNonNegativeInteger(body.minCuisineVisits, 0),
      mustBeNewToVenue,
      rewardFly: String(body.rewardFly || '10'),
      rewardFlyWei: body.rewardFlyWei || `${BigInt(Number(body.rewardFly || 10)) * BigInt(10 ** 18)}`,
      maxSlots: Number(body.maxSlots) || 10,
      status: body.status || 'ACTIVE',
      isDemo: false,
      creatorKey: operatorCtx.user.id,
      feedbackQuestions: body.feedbackQuestions || [],
    });

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (err: any) {
    return safeCatch(err);
  }
}
