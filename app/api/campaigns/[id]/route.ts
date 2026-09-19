import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await db.getCampaignById(params.id);
    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: 'Campaign not found' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

