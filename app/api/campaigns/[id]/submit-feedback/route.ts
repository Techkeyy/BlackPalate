import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { createFlynetDiscoveryClient, createFlynetMemberClient } from '@/lib/flynet';

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

    // 1. Authenticate member from HttpOnly session cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, v] = c.trim().split('=');
        return [k, decodeURIComponent(v || '')];
      })
    );
    const accessToken = cookies['bp_access_token'];

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'UNAUTHORIZED', message: 'Authentication required to submit feedback.' },
        { status: 401 }
      );
    }

    let authenticatedDinerId: string;
    try {
      const member = createFlynetMemberClient(accessToken);
      const profile = await member.getProfile();
      authenticatedDinerId = profile.id;
    } catch {
      return NextResponse.json(
        { ok: false, error: 'INVALID_SESSION', message: 'Active Blackbird session expired or invalid.' },
        { status: 401 }
      );
    }

    // 2. Load authoritative campaign from database
    const campaign = await db.getCampaignById(params.id);
    if (!campaign) {
      return NextResponse.json({ ok: false, error: 'Campaign not found' }, { status: 404 });
    }

    // 3. Load and verify authoritative application ownership (prevent IDOR)
    const application = await db.getApplicationById(body.applicationId);
    if (!application) {
      return NextResponse.json(
        { ok: false, error: 'APPLICATION_NOT_FOUND', message: 'No valid tasting enrollment found.' },
        { status: 404 }
      );
    }

    if (application.dinerFlynetId !== authenticatedDinerId) {
      return NextResponse.json(
        { ok: false, error: 'FORBIDDEN', message: 'You cannot submit feedback for another diner.' },
        { status: 403 }
      );
    }

    if (application.campaignId !== params.id) {
      return NextResponse.json(
        { ok: false, error: 'MISMATCH', message: 'Application does not match this tasting campaign.' },
        { status: 400 }
      );
    }

    // 4. Verify application state allows feedback submission
    // Must be ATTENDANCE_VERIFIED (or SUBMITTED if re-saving)
    if (application.status !== 'ATTENDANCE_VERIFIED' && application.status !== 'SUBMITTED') {
      return NextResponse.json(
        {
          ok: false,
          error: 'ATTENDANCE_REQUIRED',
          message: 'Tasting attendance must be verified at the venue before feedback can be submitted.',
        },
        { status: 403 }
      );
    }

    // 5. Record structured sensory feedback
    const feedback = await db.createFeedback({
      applicationId: application.id,
      campaignId: params.id,
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

    let rewardStatus: 'PENDING' | 'ISSUING' | 'ISSUED' | 'FAILED' = 'PENDING';
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
        txHash = (rewardRes as any)?.txHash || (rewardRes as any)?.id || 'tx_flynet_confirmed';
      } catch (err: any) {
        rewardStatus = 'PENDING';
        rewardError = err.message || 'Reward execution pending Flynet admin approval';
      }
    } else {
      rewardStatus = 'PENDING';
      rewardError = 'Awaiting Flynet API key & Blackbird admin approval';
    }

    const receipt = await db.createRewardReceipt({
      applicationId: application.id,
      campaignId: params.id,
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
    return NextResponse.json(
      { ok: false, error: err.message || 'Feedback submission failed' },
      { status: 500 }
    );
  }
}
