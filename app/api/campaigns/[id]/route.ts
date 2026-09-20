import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = decodeURIComponent(
      new URL(req.url).pathname.split('/').filter(Boolean).pop() || ''
    );
    // Detail must resolve from the same authoritative campaign collection as
    // Discover so a listed campaign can never disappear at this boundary.
    const campaigns = await db.getCampaigns();
    const campaign = campaigns.find((candidate) => candidate.id === campaignId) || null;
    if (!campaign) {
      return safeError(404, 'NOT_FOUND');
    }

    const applications = await db.getApplications(campaignId);
    const feedbacks = await db.getFeedbacks(campaignId);

    return NextResponse.json(
      {
        ok: true,
        campaign,
        applicationsCount: applications.length,
        feedbacksCount: feedbacks.length,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    return safeCatch(err);
  }
}
