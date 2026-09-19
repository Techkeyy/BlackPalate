import { NextResponse } from 'next/server';
import { createFlynetDiscoveryClient, getFlynetConfig, normalizeFlynetError } from '@/lib/flynet';
import { sanitizeLiveCheckIn } from '@/lib/live-demo';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// Short in-memory cache: the venue feed is observational, not per-user state.
let cache: { at: number; payload: any } | null = null;
const CACHE_TTL_MS = 90_000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.payload);
    }

    const discovery = createFlynetDiscoveryClient();
    if (!discovery) {
      return safeError(503, 'FLYNET_UNAVAILABLE', 'live demo without API key');
    }

    const { environment } = getFlynetConfig();

    // Scan a bounded window of the network catalog for the first venue with
    // recent activity. Pages are scanned in order; the loop exits on first hit.
    let found: { rest: any; loc: any; items: any[] } | null = null;
    for (let page = 0; page < 3 && !found; page++) {
      const rests = await discovery.restaurants.listRestaurants({ page, pageSize: 20 });
      const candidates = rests.restaurants || [];
      if (candidates.length === 0) break;
      for (const rest of candidates) {
        let locations: any[] = [];
        try {
          const locRes = await discovery.restaurants.listRestaurantLocations({ id: (rest as any).id });
          locations = locRes.locations || [];
        } catch {
          continue;
        }
        for (const loc of locations.slice(0, 3)) {
          let items: any[] = [];
          try {
            const feed = await discovery.checkIns.listVenueCheckIns({
              location: (loc as any).id,
              pageSize: 8,
            } as any);
            items = feed?.checkIns || [];
          } catch {
            continue;
          }
          if (items.length > 0) {
            found = { rest, loc, items };
            break;
          }
        }
        if (found) break;
      }
    }

    if (!found) {
      return safeError(503, 'FLYNET_UNAVAILABLE', 'no live venue activity found');
    }

    const { rest, loc, items } = found;
    const first = sanitizeLiveCheckIn(items[0]);
    const payload = {
      ok: true,
      source: environment === 'production' ? 'flynet-production' : 'flynet-staging',
      fetchedAt: new Date().toISOString(),
      demonstrationOnly: true,
      venue: {
        restaurant: {
          id: (rest as any).id,
          name: (rest as any).name || null,
          cuisine: first.location.restaurant.cuisine,
        },
        location: {
          id: (loc as any).id,
          name: (loc as any).name || null,
          neighborhood: first.location.neighborhood || null,
          region: first.location.region || null,
        },
      },
      checkIns: items.map((ci: any) => sanitizeLiveCheckIn(ci)),
    };
    cache = { at: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err: any) {
    const norm = (() => {
      try {
        return normalizeFlynetError(err);
      } catch {
        return null;
      }
    })();
    if (norm && (norm.kind === 'unauthorized' || norm.kind === 'forbidden')) {
      return safeError(503, 'FLYNET_UNAVAILABLE', norm);
    }
    return safeCatch(err);
  }
}
