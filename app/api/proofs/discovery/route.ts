import { NextResponse } from 'next/server';
import { flynetDiscoveryFetch } from '@/lib/flynet';

export async function GET() {
  const result = await flynetDiscoveryFetch('/restaurants?page=0&page_size=10');

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        proof: 'Proof A: API Key Restaurant Discovery',
        status: result.status,
        error: result.error,
        errorCode: result.errorCode,
      },
      { status: result.status }
    );
  }

  const rawData: any = result.data || {};
  const restaurants = rawData.restaurants || [];
  const pagination = rawData.pagination || {};

  // Extract sanitized summary of actual data
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
    status: result.status,
    totalRestaurantsInNetwork: pagination.total_count,
    sampleRestaurants: sample,
    rawPagination: pagination,
  });
}
