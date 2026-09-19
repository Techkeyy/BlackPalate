import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { getAuthenticatedOperator } from '@/lib/auth';
import {
  isConfirmableApplicationStatus,
  toSafeRestaurantApplication,
} from '@/lib/restaurant-applications';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const operator = await getAuthenticatedOperator(req);
    if (!operator) return safeError(401, 'UNAUTHORIZED', 'application confirmation without restaurant session');

    const application = await db.getApplicationById(params.id);
    if (!application) return safeError(404, 'NOT_FOUND');

    const campaign = await db.getCampaignById(application.campaignId);
    if (!campaign) return safeError(404, 'NOT_FOUND');

    const membership = await db.getMembership(operator.user.id, campaign.restaurantId);
    if (!membership) return safeError(403, 'FORBIDDEN_WORKSPACE', 'operator does not own application campaign');

    if (!isConfirmableApplicationStatus(application.status)) {
      return safeError(409, 'CONFLICT', `invalid application transition from ${application.status}`);
    }

    const updated = await db.updateApplicationStatus(application.id, 'CONFIRMED');
    if (!updated) return safeError(404, 'NOT_FOUND');

    return NextResponse.json({
      ok: true,
      application: toSafeRestaurantApplication(updated, campaign),
    });
  } catch (err) {
    return safeCatch(err);
  }
}
