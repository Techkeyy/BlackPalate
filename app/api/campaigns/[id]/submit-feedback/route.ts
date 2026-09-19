import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { createFlynetDiscoveryClient } from '@/lib/flynet';
import { resolveRequestIdentity } from '@/lib/auth/resolve';
import { safeError, safeCatch } from '@/lib/api-errors';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    if (!body.applicationId || !body.overallScore || !body.dishFeedback) {
      return safeError(400, 'VALIDATION');
    }

    // 1. Authenticate the diner through the shared identity service
    // (same session source as /api/auth/me and /api/user/tastings).
    const identity = await resolveRequestIdentity(req);
    if (!identity.authenticated || identity.role !== 'DINER') {
      return safeError(401, 'UNAUTHORIZED', 'feedback without Blackbird session');
    }

    const authenticatedDinerId: string = identity.flynetUserId;
    const internalUser = identity.user;

    // 2. Load authoritative campaign from database
    const campaign = await db.getCampaignById(params.id);
    if (!campaign) {
      return safeError(404, 'NOT_FOUND');
    }

    // 3. Load and verify authoritative application ownership (prevent IDOR)
    const application = await db.getApplicationById(body.applicationId);
    if (!application) {
      return safeError(404, 'NOT_FOUND', 'feedback for unknown application');
    }

    if (application.userId !== internalUser.id && application.dinerFlynetId !== authenticatedDinerId) {
      return safeError(403, 'FORBIDDEN', 'feedback for another diner blocked');
    }

    if (application.campaignId !== params.id) {
      return safeError(400, 'VALIDATION');
    }

    // 4. Verify application state allows feedback submission
    if (application.status !== 'ATTENDANCE_VERIFIED' && application.status !== 'SUBMITTED') {
      return safeError(403, 'ATTENDANCE_REQUIRED', 'feedback before attendance verification');
    }

    // 5. Record structured sensory feedback with internal userId
    const feedback = await db.createFeedback({
      applicationId: application.id,
      campaignId: params.id,
      userId: internalUser.id,
      dinerFlynetId: authenticatedDinerId,
      overallScore: Number(body.overallScore),
      ratings: body.ratings || { flavor: 5, presentation: 5, value: 4, portion: 4 },
      answers: body.answers || {},
      dishFeedback: body.dishFeedback,
      suggestions: body.suggestions || null,
    });

    // 6. Deterministic canonical reward idempotency key (strictly blackpalate:reward:<applicationId>)
    const idempotencyKey = `blackpalate:reward:${application.id}`;
    const amountFly = campaign.rewardFly || '10';
    const amountFlyWei = campaign.rewardFlyWei || `${BigInt(Number(amountFly)) * BigInt(10 ** 18)}`;

    let rewardStatus: 'PENDING' | 'ISSUING' | 'ISSUED' | 'FAILED' | 'UNKNOWN' = 'PENDING';
    let txHash: string | null = null;
    let rewardError: string | null = null;

    const discovery = createFlynetDiscoveryClient();

    if (discovery) {
      try {
        rewardStatus = 'ISSUING';
        const rewardRes = await discovery.rewards.issueReward({
          userId: authenticatedDinerId,
          amount: {
            value: amountFlyWei,
            currency: 'FLY' as const,
          },
          description: `BlackPalate Tasting Reward: ${campaign.dishFocus}`,
          idempotencyKey,
        });
        rewardStatus = 'ISSUED';
        // Only store real identifiers actually returned by Flynet. Never invent a fallback tx identifier.
        txHash = (rewardRes as any)?.txHash || (rewardRes as any)?.transactionHash || null;
      } catch (err: any) {
        const isTimeout = err?.code === 'ETIMEDOUT' || err?.message?.includes('timeout') || err?.status === 504;
        rewardStatus = isTimeout ? 'UNKNOWN' : 'FAILED';
        // Never store provider internals; reconciliation uses the stable idempotency key.
        console.error('[BlackPalate reward issuance failed]:', err);
        rewardError = 'Reward issuance did not complete; feedback is stored and will be reconciled.';
      }
    } else {
      rewardStatus = 'PENDING';
      rewardError = 'Awaiting Flynet API key & Blackbird admin approval';
    }

    const receipt = await db.createRewardReceipt({
      applicationId: application.id,
      campaignId: params.id,
      userId: internalUser.id,
      dinerFlynetId: authenticatedDinerId,
      amountFly,
      amountFlyWei,
      txHash,
      idempotencyKey,
      status: rewardStatus,
      issuedAt: rewardStatus === 'ISSUED' ? new Date().toISOString() : null,
      error: rewardError,
    });

    return NextResponse.json({
      ok: true,
      feedback,
      rewardReceipt: receipt,
      message: 'Sensory feedback submitted successfully.',
    });
  } catch (err: any) {
    return safeCatch(err);
  }
}
