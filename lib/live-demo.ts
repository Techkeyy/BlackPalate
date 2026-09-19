export interface LiveDemoCheckIn {
  id: string;
  createdAt: string;
  endedAt?: string | null;
  blackbirdPayEnabled: boolean;
  location: {
    id: string;
    name?: string | null;
    neighborhood?: string | null;
    region?: string | null;
    restaurant: {
      id: string;
      name?: string | null;
      cuisine: string[];
      price?: number | null;
      tags: string[];
    };
  };
}

export interface CampaignVenueMatch {
  venueIdMatch: boolean;
  nameMatch: boolean;
  cuisineOverlap: string[];
  verdict: 'MATCH' | 'NO_MATCH';
  reason: string;
}

const FIELDS_NEVER_EXPOSED = [
  'member',
  'user',
  'actor',
  'memberId',
  'userId',
  'phoneNumber',
  'googlePlaceId',
  'coordinate',
  'reservationUrl',
];

/**
 * Reduces a raw Flynet venue check-in to the safe public demo shape.
 * Drops anything resembling identity, contact, or precise-location data,
 * even if a future API version adds such fields.
 */
export function sanitizeLiveCheckIn(raw: any): LiveDemoCheckIn {
  const loc = raw?.location || {};
  const rest = loc?.restaurant || {};
  const cuisines = Array.isArray(rest?.cuisine)
    ? rest.cuisine
        .map((c: any) => (typeof c === 'string' ? c : String(c?.name || c || '')))
        .filter(Boolean)
    : [];
  const tags = Array.isArray(rest?.tags)
    ? rest.tags
        .map((t: any) => (typeof t === 'string' ? t : String(t?.name || t || '')))
        .filter(Boolean)
    : [];

  const clean: LiveDemoCheckIn = {
    id: String(raw?.id || ''),
    createdAt: raw?.createdAt ? new Date(raw.createdAt).toISOString() : '',
    endedAt: raw?.endedAt ? new Date(raw.endedAt).toISOString() : null,
    blackbirdPayEnabled: Boolean(raw?.blackbirdPayEnabled),
    location: {
      id: String(loc?.id || ''),
      name: typeof loc?.name === 'string' ? loc.name : null,
      neighborhood: typeof loc?.neighborhood?.name === 'string' ? loc.neighborhood.name : null,
      region: typeof loc?.neighborhood?.region === 'string' ? loc.neighborhood.region : null,
      restaurant: {
        id: String(rest?.id || ''),
        name: typeof rest?.name === 'string' ? rest.name : null,
        cuisine: cuisines,
        price: typeof rest?.price === 'number' ? rest.price : null,
        tags,
      },
    },
  };

  // Defensive: assert no forbidden field survived (shape is constructed, never spread).
  const serialized = JSON.stringify(clean);
  for (const f of FIELDS_NEVER_EXPOSED) {
    if (new RegExp(`"${f}"\\s*:`).test(serialized)) {
      throw new Error(`Live demo sanitizer leaked forbidden field: ${f}`);
    }
  }
  return clean;
}

/**
 * Compares a live venue check-in against a BlackPalate campaign venue.
 * Truthful by construction: demo campaign venues carry no Flynet linkage,
 * so venue-id matches are not fabricated — only genuine name equality counts.
 */
export function matchCampaignVenue(
  checkIn: LiveDemoCheckIn,
  campaign: {
    restaurantId?: string;
    restaurantName?: string | null;
    targetCuisines?: string[];
    restaurantCuisine?: string[];
  }
): CampaignVenueMatch {
  const venueName = (checkIn.location.restaurant.name || '').trim().toLowerCase();
  const campaignName = (campaign.restaurantName || '').trim().toLowerCase();
  const nameMatch = venueName.length > 0 && venueName === campaignName;

  const campaignCuisines = [...(campaign.targetCuisines || []), ...(campaign.restaurantCuisine || [])].map(c =>
    c.toLowerCase()
  );
  const cuisineOverlap = checkIn.location.restaurant.cuisine.filter(c =>
    campaignCuisines.includes(c.toLowerCase())
  );

  const venueIdMatch = false; // Demo venues are illustrative and carry no Flynet linkage.
  const verdict = nameMatch ? 'MATCH' : 'NO_MATCH';
  return {
    venueIdMatch,
    nameMatch,
    cuisineOverlap,
    verdict,
    reason: nameMatch
      ? 'Live venue name matches the campaign venue.'
      : 'Demo campaign venues are illustrative and carry no Flynet venue linkage, so a venue-id match cannot be claimed from the network feed.',
  };
}

/**
 * The exact attendance predicate BlackPalate uses: a check-in verifies
 * attendance at a campaign venue when the Flynet location ids are equal.
 */
export function sameVenueAttendance(
  checkInLocationId: string,
  campaignVenueLocationId: string
): { verified: boolean; predicate: string } {
  const verified =
    Boolean(checkInLocationId) && checkInLocationId === campaignVenueLocationId;
  return {
    verified,
    predicate: 'checkIn.location.id === campaignVenue.locationId',
  };
}
