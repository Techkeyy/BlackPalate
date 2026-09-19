/**
 * Runnable mirror of live-demo.ts for node:test (node cannot import TS).
 * Keep logic identical to lib/live-demo.ts.
 */
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

export function sanitizeLiveCheckIn(raw) {
  const loc = raw?.location || {};
  const rest = loc?.restaurant || {};
  const cuisines = Array.isArray(rest?.cuisine)
    ? rest.cuisine
        .map((c) => (typeof c === 'string' ? c : String(c?.name || c || '')))
        .filter(Boolean)
    : [];
  const tags = Array.isArray(rest?.tags)
    ? rest.tags
        .map((t) => (typeof t === 'string' ? t : String(t?.name || t || '')))
        .filter(Boolean)
    : [];

  const clean = {
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

  const serialized = JSON.stringify(clean);
  for (const f of FIELDS_NEVER_EXPOSED) {
    if (new RegExp(`"${f}"\\s*:`).test(serialized)) {
      throw new Error(`Live demo sanitizer leaked forbidden field: ${f}`);
    }
  }
  return clean;
}

export function matchCampaignVenue(checkIn, campaign) {
  const venueName = (checkIn.location.restaurant.name || '').trim().toLowerCase();
  const campaignName = (campaign.restaurantName || '').trim().toLowerCase();
  const nameMatch = venueName.length > 0 && venueName === campaignName;

  const campaignCuisines = [...(campaign.targetCuisines || []), ...(campaign.restaurantCuisine || [])].map((c) =>
    c.toLowerCase()
  );
  const cuisineOverlap = checkIn.location.restaurant.cuisine.filter((c) =>
    campaignCuisines.includes(c.toLowerCase())
  );

  const venueIdMatch = false;
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

export function sameVenueAttendance(checkInLocationId, campaignVenueLocationId) {
  const verified =
    Boolean(checkInLocationId) && checkInLocationId === campaignVenueLocationId;
  return {
    verified,
    predicate: 'checkIn.location.id === campaignVenue.locationId',
  };
}
