import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, normalizeFlynetError } from '@/lib/flynet';
import { proofGuard, safeError } from '@/lib/api-errors';

export async function GET() {
  const blocked = proofGuard();
  if (blocked) return blocked;

  const discovery = createFlynetDiscoveryClient();

  if (!discovery) {
    return safeError(400, 'FLYNET_UNAVAILABLE', 'discovery proof without API key');
  }

  try {
    const res = await discovery.restaurants.listRestaurants({ page: 0, pageSize: 10 });

    const restaurants = res.restaurants || [];
    const sample = restaurants.slice(0, 3).map((r: any) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine || [],
      price: r.price,
      tags: r.tags || [],
    }));

    return NextResponse.json({
      success: true,
      proof: 'Proof A: API Key Restaurant Discovery',
      totalRestaurantsInNetwork: res.pagination?.totalCount,
      sampleRestaurants: sample,
      pagination: res.pagination,
    });
  } catch (err: any) {
    const norm = normalizeFlynetError(err);
    return safeError(
      norm.kind === 'unauthorized' ? 401 : 500,
      norm.kind === 'unauthorized' ? 'UNAUTHORIZED' : 'FLYNET_UNAVAILABLE',
      norm
    );
  }
}
