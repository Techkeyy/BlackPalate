import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { verifyOperatorSession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || undefined;

    const campaigns = await db.getCampaigns(restaurantId);
    return NextResponse.json({ ok: true, campaigns });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch campaigns' },
      { status: 500 }
    );
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

    // 1. Authenticate operator session
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, v] = c.trim().split('=');
        return [k, decodeURIComponent(v || '')];
      })
    );

    const operatorToken = cookies['bp_operator_token'];
    if (!operatorToken) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED', message: 'Sign-in required to create tasting campaigns.' },
        { status: 401 }
      );
    }

    const session = verifyOperatorSession(operatorToken);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_SESSION', message: 'Operator session expired or invalid.' },
        { status: 401 }
      );
    }

    // 2. Enforce RestaurantMembership authorization (prevent cross-restaurant mutation)
    const membership = await db.getMembership(session.userId, body.restaurantId);
    if (!membership) {
      return NextResponse.json(
        {
          ok: false,
          error: 'FORBIDDEN_WORKSPACE',
          message: 'You do not have operator authorization for this restaurant workspace.',
        },
        { status: 403 }
      );
    }

    // 3. Create persistent campaign
    const campaign = await db.createCampaign({
      title: body.title,
      description: body.description || '',
      dishFocus: body.dishFocus,
      researchGoal: body.researchGoal || null,
      restaurantId: body.restaurantId,
      restaurantName: body.restaurantName,
      restaurantCuisine: body.restaurantCuisine || [],
      location: body.location || 'NYC',
      timing: body.timing || 'Flexible schedule',
      timeCommitment: body.timeCommitment || '45 minutes',
      targetCuisines: body.targetCuisines || [],
      minTotalCheckIns: Number(body.minTotalCheckIns) || 1,
      minDistinctVenues: Number(body.minDistinctVenues) || 0,
      minCuisineVisits: Number(body.minCuisineVisits) || 0,
      mustBeNewToVenue: Boolean(body.mustBeNewToVenue),
      rewardFly: String(body.rewardFly || '10'),
      rewardFlyWei: body.rewardFlyWei || `${BigInt(Number(body.rewardFly || 10)) * BigInt(10 ** 18)}`,
      maxSlots: Number(body.maxSlots) || 10,
      status: body.status || 'ACTIVE',
      isDemo: false,
      creatorKey: session.userId,
      feedbackQuestions: body.feedbackQuestions || [],
    });

    return NextResponse.json({ ok: true, campaign }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
