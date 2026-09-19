import assert from 'node:assert/strict';
import { evaluateQualification } from './qualification.mjs';
import { testDb } from './db/memory-repository.mjs';

console.log('--- Testing Directive 003B marketplace workflow boundaries ---');

const emptyHistory = [];

const firstTimeOnly = evaluateQualification(emptyHistory, [
  {
    type: 'NEW_TO_RESTAURANT',
    restaurantId: 'rest_new',
    description: 'No prior verified visits to this venue',
  },
]);
assert.equal(firstTimeOnly.qualified, true);
console.log('  [PASS] Zero-history diner qualifies for first-time-only campaign');

const firstTimeWithHistoryRequirement = evaluateQualification(emptyHistory, [
  {
    type: 'MIN_TOTAL_CHECKINS',
    threshold: 3,
    description: 'At least 3 verified dining check-ins',
  },
  {
    type: 'NEW_TO_RESTAURANT',
    restaurantId: 'rest_new',
    description: 'No prior verified visits to this venue',
  },
]);
assert.equal(firstTimeWithHistoryRequirement.qualified, false);
assert.equal(firstTimeWithHistoryRequirement.ruleEvaluations[0].passed, false);
console.log('  [PASS] First-time campaign can independently retain a total-history requirement');

const historyOnly = evaluateQualification(emptyHistory, [
  {
    type: 'MIN_TOTAL_CHECKINS',
    threshold: 5,
    description: 'At least 5 verified dining check-ins',
  },
]);
assert.equal(historyOnly.qualified, false);
console.log('  [PASS] Empty history does not qualify for a history-required campaign');

const campaign = await testDb.createCampaign({
  title: 'First-Time Diner Test',
  description: 'A zero-history-compatible campaign.',
  dishFocus: 'Test Dish',
  restaurantId: 'rest_new',
  restaurantName: 'Test Venue',
  restaurantCuisine: ['American'],
  location: 'NYC',
  timing: 'Flexible',
  timeCommitment: '30 minutes',
  targetCuisines: [],
  minTotalCheckIns: 0,
  minCuisineVisits: 0,
  mustBeNewToVenue: true,
  rewardFly: '0',
  maxSlots: 5,
  status: 'ACTIVE',
  isDemo: false,
  feedbackQuestions: [],
});

const application = await testDb.createApplication({
  campaignId: campaign.id,
  dinerFlynetId: 'flynet_member_18f4',
  dinerName: 'Provider name is not used by the restaurant safe view',
  status: 'QUALIFIED',
  qualificationProof: {
    totalCheckIns: 0,
    cuisineVisits: 0,
    distinctVenues: 0,
    isNewToVenue: true,
    qualifiedRuleSummary: ['No prior verified visits to this venue'],
  },
});
assert.equal(application.status, 'QUALIFIED');
const confirmed = await testDb.updateApplicationStatus(application.id, 'CONFIRMED');
assert.equal(confirmed?.status, 'CONFIRMED');
const dinerRoundTrip = await testDb.getUserApplications('flynet_member_18f4');
assert.equal(dinerRoundTrip[0].id, application.id);
assert.equal(dinerRoundTrip[0].status, 'CONFIRMED');
console.log('  [PASS] Application confirmation persists and returns to the same diner application');

console.log('Directive 003B marketplace workflow tests passed.');
