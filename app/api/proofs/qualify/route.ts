import { NextResponse } from 'next/server';
import {
  createFlynetMemberClient,
  createFlynetDiscoveryClient,
  normalizeFlynetError,
} from '@/lib/flynet';
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

  const member = createFlynetMemberClient(accessToken);
  const discovery = createFlynetDiscoveryClient();

  try {
    // 1. Fetch user check-ins
    const checkInsRes = await member.listCheckIns({ page: 0, pageSize: 50 });
    const checkIns = checkInsRes.checkIns || [];

    // 2. Fetch restaurant discovery catalog to build correlation map
    const restaurantMap = new Map<string, FlynetRestaurantMetadata>();

    if (discovery) {
      try {
        const discRes = await discovery.restaurants.listRestaurants({ page: 0, pageSize: 100 });
        if (discRes.restaurants) {
          for (const r of discRes.restaurants) {
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
      } catch {
        // Continue with available check-in data even if discovery catalog fails
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
    const qualificationResult = evaluateDinerQualification(checkIns as any, testRules, restaurantMap);

    return NextResponse.json({
      success: true,
      proof: 'Proof E: Qualification Rule Derivation',
      totalCheckInsFound: checkIns.length,
      distinctRestaurantsInCatalog: restaurantMap.size,
      qualificationResult,
    });
  } catch (err: any) {
    const norm = normalizeFlynetError(err);
    return NextResponse.json(
      {
        success: false,
        error: norm.message,
        kind: norm.kind,
        code: norm.code,
      },
      { status: norm.kind === 'unauthorized' ? 401 : norm.kind === 'forbidden' ? 403 : 500 }
    );
  }
}
