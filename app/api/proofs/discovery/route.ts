import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, normalizeFlynetError } from '@/lib/flynet';

export async function GET() {
  const discovery = createFlynetDiscoveryClient();

  if (!discovery) {
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof A: API Key Restaurant Discovery',
        status: 400,
        error: 'FLYNET_API_KEY is not configured in server environment.',
      },
      { status: 400 }
    );
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
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof A: API Key Restaurant Discovery',
        error: norm.message,
        kind: norm.kind,
        code: norm.code,
      },
      { status: norm.kind === 'unauthorized' ? 401 : 500 }
    );
  }
}
