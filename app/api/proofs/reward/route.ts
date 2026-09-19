import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, normalizeFlynetError } from '@/lib/flynet';

export async function POST(req: Request) {
  const discovery = createFlynetDiscoveryClient();

  if (!discovery) {
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof G: Controlled FLY Reward & Idempotency',
        status: 400,
        error: 'FLYNET_API_KEY is not configured in server environment.',
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { targetUserId, idempotencyKey } = body;

  if (!targetUserId) {
    return NextResponse.json(
      {
        success: false,
        error: 'targetUserId is required for controlled reward proof.',
      },
      { status: 400 }
    );
  }

  const testKey = idempotencyKey || `blackpalate-proof-reward-${Date.now()}`;

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
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof G: Controlled FLY Reward & Idempotency',
        error: norm.message,
        kind: norm.kind,
        code: norm.code,
      },
      { status: norm.kind === 'forbidden' ? 403 : norm.kind === 'unauthorized' ? 401 : 500 }
    );
  }
}
