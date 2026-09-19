import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { createFlynetDiscoveryClient } from '@/lib/flynet';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    if (!body.applicationId || !body.overallScore || !body.dishFeedback) {
      return NextResponse.json(
        { ok: false, error: 'Missing required feedback fields: applicationId, overallScore, dishFeedback' },
        { status: 400 }
      );
    }

    const campaign = await db.getCampaignById(params.id);
    if (!campaign) {
      return NextResponse.json({ ok: false, error: 'Campaign not found' }, { status: 404 });
    }

    // 1. Record structured sensory feedback in database
    const feedback = await db.createFeedback({
      applicationId: body.applicationId,
      campaignId: params.id,
      dinerFlynetId: body.dinerFlynetId || 'diner_guest',
      overallScore: Number(body.overallScore),
      ratings: body.ratings || { flavor: 5, presentation: 5, value: 4, portion: 4 },
      answers: body.answers || {},
      dishFeedback: body.dishFeedback,
      suggestions: body.suggestions || null,
    });

    // 2. Prepare or issue real Flynet reward if Flynet API key is configured
    const discovery = createFlynetDiscoveryClient();
    const idempotencyKey = `bp_reward_${params.id}_${body.applicationId}_${Date.now()}`;
    const amountFly = campaign.rewardFly || '10';
    const amountFlyWei = campaign.rewardFlyWei || `${BigInt(Number(amountFly)) * BigInt(10 ** 18)}`;

    let rewardStatus: 'PENDING' | 'ISSUED' | 'FAILED' = 'PENDING';
    let txHash: string | null = null;
    let rewardError: string | null = null;

    if (discovery && body.dinerFlynetId && body.dinerFlynetId.startsWith('usr_')) {
      try {
        const rewardRes = await discovery.rewards.issueReward({
          userId: body.dinerFlynetId,
          amount: {
            value: amountFlyWei,
            currency: 'FLY' as const,
          },
          description: `BlackPalate Tasting Reward: ${campaign.dishFocus}`,
          idempotencyKey,
        });
        rewardStatus = 'ISSUED';
        txHash = (rewardRes as any)?.txHash || (rewardRes as any)?.id || 'tx_flynet_confirmed';
      } catch (err: any) {
        console.warn('[Reward] Live Flynet reward execution pending admin approval / balance:', err.message);
        rewardStatus = 'PENDING';
        rewardError = err.message;
      }
    } else {
      rewardStatus = 'PENDING';
      rewardError = 'Awaiting Flynet API key & Blackbird admin approval';
    }

    const receipt = await db.createRewardReceipt({
      applicationId: body.applicationId,
      campaignId: params.id,
      dinerFlynetId: body.dinerFlynetId || 'diner_guest',
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
      message: 'Feedback submitted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Feedback submission failed' },
      { status: 500 }
    );
  }
}

