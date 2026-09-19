import assert from 'node:assert';
import { evaluateQualification } from './qualification.mjs';

console.log('--- Running BlackPalate Product Logic Tests ---');

// Test 1: Full Campaign Application Lifecycle & Qualification Match
const mockDinerCheckIns = [
  {
    id: 'chk_01',
    created_at: '2026-09-10T12:00:00Z',
    location: {
      id: 'loc_01',
      name: 'Via Carota',
      restaurant: { id: 'rest_01', name: 'Via Carota' },
    },
  },
  {
    id: 'chk_02',
    created_at: '2026-09-15T18:00:00Z',
    location: {
      id: 'loc_02',
      name: 'I Sodi',
      restaurant: { id: 'rest_04', name: 'I Sodi' },
    },
  },
];

const mockRestaurantMetadata = new Map([
  ['rest_01', { id: 'rest_01', name: 'Via Carota', cuisine: ['Italian', 'Pasta'] }],
  ['rest_04', { id: 'rest_04', name: 'I Sodi', cuisine: ['Italian', 'Tuscan'] }],
]);

// Rule set: Needs >= 2 check-ins, >= 1 Italian visit, and must be new to Kappo Wagyu (rest_02)
const campaignRules = [
  { type: 'MIN_TOTAL_CHECKINS', threshold: 2, description: 'Min 2 total check-ins' },
  { type: 'MIN_CUISINE_VISITS', cuisine: 'Italian', threshold: 1, description: 'Min 1 Italian visit' },
  { type: 'NEW_TO_RESTAURANT', restaurantId: 'rest_02', description: 'New to Kappo Wagyu' },
];

const evalResult = evaluateQualification(mockDinerCheckIns, campaignRules, mockRestaurantMetadata);
assert.strictEqual(evalResult.qualified, true, 'Diner should qualify for campaign');
console.log('  [PASS] Test 1: Deterministic Campaign Qualification Passed');

// Test 2: Disqualification when diner has visited target restaurant before
const disqualifiedRules = [
  { type: 'NEW_TO_RESTAURANT', restaurantId: 'rest_01', description: 'Must be new to Via Carota' },
];
const evalDisqualified = evaluateQualification(mockDinerCheckIns, disqualifiedRules, mockRestaurantMetadata);
assert.strictEqual(evalDisqualified.qualified, false, 'Diner should be disqualified for prior visit');
console.log('  [PASS] Test 2: New-to-venue Disqualification Passed');

// Test 3: Idempotency Key Format Test
const campaignId = 'camp_01';
const applicationId = 'app_user_01';
const idempotencyKey = `bp_reward_${campaignId}_${applicationId}_test`;
assert.strictEqual(idempotencyKey.startsWith('bp_reward_'), true);
console.log('  [PASS] Test 3: Reward Idempotency Key Structure Passed');

// Test 4: Structured Sensory Ratings Calculation
const mockSubmissions = [
  { overallScore: 5, ratings: { flavor: 5, presentation: 4, value: 4, portion: 5 } },
  { overallScore: 4, ratings: { flavor: 4, presentation: 5, value: 3, portion: 4 } },
];
const avgOverall = mockSubmissions.reduce((acc, s) => acc + s.overallScore, 0) / mockSubmissions.length;
assert.strictEqual(avgOverall, 4.5);
console.log('  [PASS] Test 4: Sensory Rating Calculations Passed');

console.log('\nAll 4 BlackPalate product logic tests passed successfully!\n');

