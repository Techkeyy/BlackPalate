import { NextResponse } from 'next/server';
import { draftCampaignWithAI } from '@/lib/ai';
import { safeError, safeCatch } from '@/lib/api-errors';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.dishName || !body.restaurantName) {
      return safeError(400, 'VALIDATION');
    }

    const { draft, meta } = await draftCampaignWithAI({
      restaurantName: body.restaurantName,
      dishName: body.dishName,
      cuisine: body.cuisine || 'Fine Dining',
      conceptNotes: body.conceptNotes || 'Tasting and sensory evaluation for seasonal menu.',
      targetAudience: body.targetAudience,
      budgetFly: Number(body.budgetFly) || 25,
    });

    return NextResponse.json({ ok: true, draft, meta });
  } catch (err: any) {
    return safeCatch(err);
  }
}
