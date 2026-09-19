import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { getAuthenticatedOperator } from '@/lib/auth';
import { toSafeRestaurantApplication } from '@/lib/restaurant-applications';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const operator = await getAuthenticatedOperator(req);
    if (!operator) return safeError(401, 'UNAUTHORIZED', 'applicant list without restaurant session');

    const campaign = await db.getCampaignById(params.id);
    if (!campaign) return safeError(404, 'NOT_FOUND');

    const membership = await db.getMembership(operator.user.id, campaign.restaurantId);
    if (!membership) return safeError(403, 'FORBIDDEN_WORKSPACE', 'operator does not own campaign workspace');

    const applications = await db.getApplications(campaign.id);
    return NextResponse.json({
      ok: true,
      campaignId: campaign.id,
      applications: applications.map(application => toSafeRestaurantApplication(application, campaign)),
    });
  } catch (err) {
    return safeCatch(err);
  }
}
