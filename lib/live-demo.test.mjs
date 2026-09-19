import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeLiveCheckIn,
  matchCampaignVenue,
  sameVenueAttendance,
} from './live-demo.mjs';

const RAW_LIVE_CHECKIN = {
  id: 'ck_live_01',
  object: 'check_in',
  location: {
    id: 'loc_soma_01',
    object: 'location',
    name: 'SOMA',
    restaurant: {
      id: 'rest_live_01',
      name: 'Live Demo Kitchen',
      cuisine: ['Japanese', 'Ramen'],
      price: 2,
      tags: ['Counter Seating'],
    },
    neighborhood: { id: 'nb_01', object: 'neighborhood', name: 'SOMA', region: 'San Francisco, CA' },
    slug: 'live-demo-kitchen-soma',
    address: { line1: '1 Demo St' },
    coordinate: { latitude: 1.1, longitude: 2.2 },
    phoneNumber: '+1-555-0100',
    googlePlaceId: 'PLACE_SECRET',
    timeZone: 'America/Los_Angeles',
  },
  blackbirdPayEnabled: true,
  createdAt: '2026-09-19T08:10:12.000Z',
  endedAt: null,
  // A future API version must never leak through the sanitizer:
  member: { id: 'mbr_hidden', displayName: 'Private Diner' },
  userId: 'usr_hidden',
};

describe('Live Network Demo Truthfulness Suite', () => {
  it('strips identity, contact, and precise-location fields from live records', () => {
    const clean = sanitizeLiveCheckIn(RAW_LIVE_CHECKIN);
    const s = JSON.stringify(clean);
    for (const f of ['member', 'userId', 'phoneNumber', 'googlePlaceId', 'coordinate', 'reservationUrl', 'actor']) {
      assert.ok(!new RegExp(`"${f}"\\s*:`).test(s), `leaked ${f}`);
    }
    assert.strictEqual(clean.location.restaurant.name, 'Live Demo Kitchen');
    assert.deepStrictEqual(clean.location.restaurant.cuisine, ['Japanese', 'Ramen']);
    assert.strictEqual(clean.location.neighborhood, 'SOMA');
    assert.strictEqual(clean.blackbirdPayEnabled, true);
  });

  it('never fabricates a venue-id match for illustrative demo campaigns', () => {
    const clean = sanitizeLiveCheckIn(RAW_LIVE_CHECKIN);
    const res = matchCampaignVenue(clean, {
      restaurantId: 'rest_01',
      restaurantName: 'Via Carota / Roman Osteria',
      targetCuisines: ['Italian'],
    });
    assert.strictEqual(res.venueIdMatch, false);
    assert.strictEqual(res.verdict, 'NO_MATCH');
    assert.ok(res.reason.length > 0);
  });

  it('reports genuine name equality as a match', () => {
    const clean = sanitizeLiveCheckIn(RAW_LIVE_CHECKIN);
    const res = matchCampaignVenue(clean, { restaurantName: 'live demo kitchen' });
    assert.strictEqual(res.nameMatch, true);
    assert.strictEqual(res.verdict, 'MATCH');
  });

  it('computes cuisine overlap without claiming qualification', () => {
    const clean = sanitizeLiveCheckIn(RAW_LIVE_CHECKIN);
    const res = matchCampaignVenue(clean, {
      restaurantName: 'Somewhere Else',
      targetCuisines: ['Japanese', 'Italian'],
    });
    assert.deepStrictEqual(res.cuisineOverlap, ['Japanese']);
    assert.strictEqual(res.verdict, 'NO_MATCH');
  });

  it('attendance predicate is strict location-id equality', () => {
    assert.strictEqual(sameVenueAttendance('loc_a', 'loc_a').verified, true);
    assert.strictEqual(sameVenueAttendance('loc_a', 'loc_b').verified, false);
    assert.strictEqual(sameVenueAttendance('', '').verified, false);
    assert.ok(sameVenueAttendance('loc_a', 'loc_a').predicate.includes('location.id'));
  });
});
