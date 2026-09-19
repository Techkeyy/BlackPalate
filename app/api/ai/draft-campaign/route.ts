import { NextResponse } from 'next/server';
import { draftCampaignWithAI } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.dishName || !body.restaurantName) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: dishName, restaurantName' },
        { status: 400 }
      );
    }

    const draft = await draftCampaignWithAI({
      restaurantName: body.restaurantName,
      dishName: body.dishName,
      cuisine: body.cuisine || 'Fine Dining',
      conceptNotes: body.conceptNotes || 'Tasting and sensory evaluation for seasonal menu.',
      targetAudience: body.targetAudience,
      budgetFly: Number(body.budgetFly) || 25,
    });

    return NextResponse.json({ ok: true, draft });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to generate AI campaign draft' },
      { status: 500 }
    );
  }
}

