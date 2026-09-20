import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await db.getCampaignById(params.id);
    if (!campaign) {
      return safeError(404, 'NOT_FOUND');
    }

    const applications = await db.getApplications(params.id);
    const feedbacks = await db.getFeedbacks(params.id);

    return NextResponse.json({
      ok: true,
      campaign,
      applicationsCount: applications.length,
      feedbacksCount: feedbacks.length,
    });
  } catch (err: any) {
    return safeCatch(err);
  }
}
