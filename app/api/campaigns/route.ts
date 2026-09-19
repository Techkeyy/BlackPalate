import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET() {
  try {
    const campaigns = await db.getCampaigns();
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

    const campaign = await db.createCampaign({
      title: body.title,
      description: body.description || '',
      dishFocus: body.dishFocus,
      restaurantId: body.restaurantId,
      restaurantName: body.restaurantName,
      restaurantCuisine: body.restaurantCuisine || [],
      targetCuisines: body.targetCuisines || [],
      minTotalCheckIns: Number(body.minTotalCheckIns) || 1,
      minCuisineVisits: Number(body.minCuisineVisits) || 0,
      mustBeNewToVenue: Boolean(body.mustBeNewToVenue),
      rewardFly: String(body.rewardFly || '10'),
      rewardFlyWei: body.rewardFlyWei || `${BigInt(Number(body.rewardFly || 10)) * BigInt(10 ** 18)}`,
      maxSlots: Number(body.maxSlots) || 10,
      status: body.status || 'ACTIVE',
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

