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
import { proofGuard, safeError } from '@/lib/api-errors';
import { getCookie } from '@/lib/cookies';
import { ACCESS_COOKIE_NAME } from '@/lib/auth/session-cookies';

export async function POST(req: Request) {
  const blocked = proofGuard();
  if (blocked) return blocked;

  const accessToken = getCookie(req.headers.get('cookie'), ACCESS_COOKIE_NAME);

  if (!accessToken) {
    return safeError(401, 'UNAUTHORIZED', 'qualify proof without session');
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
              cuisine: (r.cuisine || []).map((c: any) => typeof c === 'string' ? c : String(c?.name || c)),
              price: r.price ?? undefined,
              tags: (r.tags || []).map((t: any) => typeof t === 'string' ? t : String(t?.name || t)),
              cohort: r.cohort ?? undefined,
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
    return safeError(
      norm.kind === 'unauthorized' ? 401 : norm.kind === 'forbidden' ? 403 : 500,
      norm.kind === 'unauthorized' ? 'UNAUTHORIZED' : 'FLYNET_UNAVAILABLE',
      norm
    );
  }
}
