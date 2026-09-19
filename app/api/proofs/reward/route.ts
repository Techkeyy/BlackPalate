import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, normalizeFlynetError } from '@/lib/flynet';
import { proofGuard, safeError } from '@/lib/api-errors';

export async function POST(req: Request) {
  const blocked = proofGuard();
  if (blocked) return blocked;

  const discovery = createFlynetDiscoveryClient();

  if (!discovery) {
    return safeError(400, 'FLYNET_UNAVAILABLE', 'reward proof without API key');
  }

  const body = await req.json().catch(() => ({}));
  const { targetUserId, proofRunId } = body;

  if (!targetUserId) {
    return safeError(400, 'VALIDATION');
  }

  // Stable deterministic idempotency per controlled proof run. Never timestamp-based:
  // replaying the same proofRunId must return the same reward, proving idempotency.
  if (!proofRunId || typeof proofRunId !== 'string') {
    return safeError(400, 'VALIDATION');
  }

  const testKey = `blackpalate:proof-reward:${proofRunId}`;

  const rewardReq = {
    userId: targetUserId,
    amount: {
      value: '1000000000000000000', // 1 FLY (18-decimal wei string)
      currency: 'FLY' as const,
    },
    description: 'BlackPalate Controlled Integration Proof Reward',
    idempotencyKey: testKey,
  };

  try {
    // 1st Execution
    const firstReward = await discovery.rewards.issueReward(rewardReq);

    // 2nd Execution (Replay exact same idempotency key)
    const replayReward = await discovery.rewards.issueReward(rewardReq);

    const idempotencyVerified =
      Boolean(firstReward.id && replayReward.id && firstReward.id === replayReward.id);

    return NextResponse.json({
      success: true,
      proof: 'Proof G: Controlled FLY Reward & Idempotency',
      idempotencyVerified,
      firstReward: {
        id: firstReward.id,
        amount: firstReward.amount,
        createdAt: firstReward.createdAt,
      },
      replayRewardId: replayReward.id,
    });
  } catch (err: any) {
    const norm = normalizeFlynetError(err);
    return safeError(
      norm.kind === 'forbidden' ? 403 : norm.kind === 'unauthorized' ? 401 : 500,
      norm.kind === 'unauthorized' ? 'UNAUTHORIZED' : 'FLYNET_UNAVAILABLE',
      norm
    );
  }
}
