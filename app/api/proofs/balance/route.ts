import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, normalizeFlynetError } from '@/lib/flynet';

export async function GET() {
  const discovery = createFlynetDiscoveryClient();

  if (!discovery) {
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof F: App FLY Balance',
        status: 400,
        error: 'FLYNET_API_KEY is not configured in server environment.',
      },
      { status: 400 }
    );
  }

  try {
    const balanceData = await discovery.rewards.getBalance();

    return NextResponse.json({
      success: true,
      proof: 'Proof F: App FLY Balance',
      balance: balanceData.balance,
      balanceUsd: balanceData.balanceUsd,
      ownerType: balanceData.ownerType,
      ownerId: balanceData.ownerId ? `${balanceData.ownerId.slice(0, 8)}...` : undefined,
    });
  } catch (err: any) {
    const norm = normalizeFlynetError(err);
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof F: App FLY Balance',
        error: norm.message,
        kind: norm.kind,
        code: norm.code,
      },
      { status: norm.kind === 'forbidden' ? 403 : norm.kind === 'unauthorized' ? 401 : 500 }
    );
  }
}
