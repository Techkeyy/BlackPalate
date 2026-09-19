import { NextResponse } from 'next/server';
import { flynetDiscoveryFetch } from '@/lib/flynet';

export async function GET() {
  const result = await flynetDiscoveryFetch('/balance');

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof F: App FLY Balance',
        status: result.status,
        error: result.error,
        errorCode: result.errorCode,
      },
      { status: result.status }
    );
  }

  const rawData: any = result.data || {};

  return NextResponse.json({
    success: true,
    proof: 'Proof F: App FLY Balance',
    status: result.status,
    balance: rawData.balance,
    balanceUsd: rawData.balance_usd,
    ownerType: rawData.owner_type,
    // Note: owner_id is safe app identifier, not a secret
    ownerId: rawData.owner_id ? `${rawData.owner_id.slice(0, 8)}...` : undefined,
  });
}
