import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, normalizeFlynetError } from '@/lib/flynet';
import { proofGuard, safeError } from '@/lib/api-errors';

export async function GET() {
  const blocked = proofGuard();
  if (blocked) return blocked;

  const discovery = createFlynetDiscoveryClient();

  if (!discovery) {
    return safeError(400, 'FLYNET_UNAVAILABLE', 'balance proof without API key');
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
    return safeError(
      norm.kind === 'forbidden' ? 403 : norm.kind === 'unauthorized' ? 401 : 500,
      norm.kind === 'unauthorized' ? 'UNAUTHORIZED' : 'FLYNET_UNAVAILABLE',
      norm
    );
  }
}
