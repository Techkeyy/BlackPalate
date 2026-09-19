import { NextResponse } from 'next/server';
import { flynetMemberFetch, flynetDiscoveryFetch } from '@/lib/flynet';
import {
  evaluateDinerQualification,
  FlynetRestaurantMetadata,
  QualificationRule,
} from '@/lib/qualification';

export async function POST(req: Request) {
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
      {
        success: false,
        error: 'OAuth access token required. Connect Blackbird account first.',
      },
      { status: 401 }
    );
  }

  // 1. Fetch user check-ins
  const checkInsRes = await flynetMemberFetch<any>(
    '/users/me/check_ins?page=0&page_size=50',
    accessToken
  );

  if (!checkInsRes.ok) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch member check-ins: ${checkInsRes.error}`,
      },
      { status: checkInsRes.status }
    );
  }

  const checkIns = checkInsRes.data?.check_ins || [];

  // 2. Fetch restaurant discovery catalog to build correlation map
  const discRes = await flynetDiscoveryFetch<any>('/restaurants?page=0&page_size=100');
  const restaurantMap = new Map<string, FlynetRestaurantMetadata>();

  if (discRes.ok && discRes.data?.restaurants) {
    for (const r of discRes.data.restaurants) {
      restaurantMap.set(r.id, {
        id: r.id,
        name: r.name,
        cuisine: r.cuisine || [],
        price: r.price,
        tags: r.tags || [],
        cohort: r.cohort,
      });
    }
  }

  // 3. Define candidate deterministic test rules
  const testRules: QualificationRule[] = [
    {
      type: 'MIN_TOTAL_CHECKINS',
      threshold: 1,
      description: 'At least 1 verified Blackbird dining visit',
    },
    {
      type: 'MIN_DISTINCT_VENUES',
      threshold: 1,
      description: 'At least 1 distinct restaurant venue visited',
    },
  ];

  // 4. Run deterministic qualification engine
  const qualificationResult = evaluateDinerQualification(checkIns, testRules, restaurantMap);

  return NextResponse.json({
    success: true,
    proof: 'Proof E: Qualification Rule Derivation',
    totalCheckInsFound: checkIns.length,
    distinctRestaurantsInCatalog: restaurantMap.size,
    qualificationResult,
  });
}
