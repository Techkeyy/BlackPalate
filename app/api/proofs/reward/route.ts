import { NextResponse } from 'next/server';
import { flynetDiscoveryFetch } from '@/lib/flynet';

export async function POST(req: Request) {
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

  // Use a deterministic idempotency key for this proof test if not provided
  const testKey = idempotencyKey || `blackpalate-proof-reward-${Date.now()}`;

  // Tiny controlled reward: 1 FLY = 10^18 wei string
  const payload = {
    user_id: targetUserId,
    amount: {
      value: '1000000000000000000',
      currency: 'FLY',
    },
    description: 'BlackPalate Controlled Integration Proof Reward',
    idempotency_key: testKey,
  };

  // 1st Execution
  const firstCall = await flynetDiscoveryFetch('/issue_reward', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!firstCall.ok) {
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof G: Controlled FLY Reward & Idempotency',
        stage: 'first_call',
        status: firstCall.status,
        error: firstCall.error,
        errorCode: firstCall.errorCode,
      },
      { status: firstCall.status }
    );
  }

  // 2nd Execution (Replaying exact same idempotency key)
  const replayCall = await flynetDiscoveryFetch('/issue_reward', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const firstData: any = firstCall.data || {};
  const replayData: any = replayCall.data || {};

  return NextResponse.json({
    success: true,
    proof: 'Proof G: Controlled FLY Reward & Idempotency',
    firstCallStatus: firstCall.status, // Expected 201
    replayCallStatus: replayCall.status, // Expected 200
    idempotencyVerified:
      firstData.id &&
      replayData.id &&
      firstData.id === replayData.id &&
      firstCall.status === 201 &&
      replayCall.status === 200,
    rewardSummary: {
      rewardId: firstData.id,
      amount: firstData.amount,
      createdAt: firstData.created_at,
    },
  });
}
