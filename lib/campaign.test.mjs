import assert from 'node:assert';
import { evaluateQualification } from './qualification.mjs';
import { db } from './db/memory-repository.mjs';
import { filterPublicMarketplaceCampaigns } from './campaign-visibility.mjs';

console.log('====================================================');
console.log('       BLACKPALATE CORE PRODUCT & LOGIC TESTS       ');
console.log('====================================================\n');

async function runTests() {
  // Test 0: Public marketplace visibility
  const visibleCampaigns = filterPublicMarketplaceCampaigns([
    { id: 'demo', isDemo: true, status: 'ACTIVE' },
    { id: 'draft', isDemo: false, status: 'DRAFT' },
    { id: 'paused', isDemo: false, status: 'PAUSED' },
    { id: 'real-active', isDemo: false, status: 'ACTIVE' },
    { id: 'real-published', isDemo: false, status: 'PUBLISHED' },
  ]);
  assert.deepStrictEqual(
    visibleCampaigns.map(campaign => campaign.id),
    ['real-active', 'real-published']
  );
  console.log('  [PASS] Test 0: Marketplace exposes only real active/published campaigns');

  // Test 1: Deterministic Qualification Matching
  console.log('--- 1. Deterministic Qualification Engine ---');
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

  const campaignRules = [
    { type: 'MIN_TOTAL_CHECKINS', threshold: 2, description: 'Min 2 total check-ins' },
    { type: 'MIN_CUISINE_VISITS', cuisine: 'Italian', threshold: 1, description: 'Min 1 Italian visit' },
    { type: 'NEW_TO_RESTAURANT', restaurantId: 'rest_02', description: 'New to Kappo Wagyu' },
  ];

  const evalResult = evaluateQualification(mockDinerCheckIns, campaignRules, mockRestaurantMetadata);
  assert.strictEqual(evalResult.qualified, true, 'Diner should qualify for campaign');
  console.log('  [PASS] Test 1.1: Qualified diner passes all rules');

  // Disqualification test
  const disqualifiedRules = [
    { type: 'NEW_TO_RESTAURANT', restaurantId: 'rest_01', description: 'Must be new to Via Carota' },
  ];
  const evalDisqualified = evaluateQualification(mockDinerCheckIns, disqualifiedRules, mockRestaurantMetadata);
  assert.strictEqual(evalDisqualified.qualified, false, 'Diner should be disqualified for prior visit');
  console.log('  [PASS] Test 1.2: Returning diner fails new-to-venue rule');

  // Test 2: Campaign Creation & DB Persistence
  console.log('\n--- 2. Campaign Creation & Persistence ---');
  const initialCount = (await db.getCampaigns()).length;
  const created = await db.createCampaign({
    title: 'Wood-Fired Duck Breast Tasting',
    description: 'Testing plum reduction acid balance with frequent fine dining guests.',
    dishFocus: 'Wood-Fired Duck Breast',
    researchGoal: 'Determine if diners prefer a crisper skin rendering.',
    restaurantId: 'rest_01',
    restaurantName: 'Gramercy Tavern',
    restaurantCuisine: ['Contemporary American'],
    location: 'Flatiron, NYC',
    timing: 'Friday · 7:00 PM',
    timeCommitment: '45 minutes',
    targetCuisines: ['Contemporary American'],
    minTotalCheckIns: 2,
    minCuisineVisits: 1,
    mustBeNewToVenue: false,
    rewardFly: '35',
    maxSlots: 8,
    status: 'ACTIVE',
    feedbackQuestions: [
      { id: 'q1', prompt: 'Rate skin crispness:', type: 'scale' },
      { id: 'q2', prompt: 'Would you pay $38 for this dish?', type: 'yes_no' },
    ],
  });

  assert.strictEqual(created.title, 'Wood-Fired Duck Breast Tasting');
  assert.strictEqual(created.filledSlots, 0);
  assert.strictEqual(created.maxSlots, 8);
  console.log('  [PASS] Test 2.1: Campaign created with correct properties');

  const afterCreate = await db.getCampaigns();
  assert.strictEqual(afterCreate.length, initialCount + 1);
  console.log('  [PASS] Test 2.2: Campaign persists in repository list');

  // Test 3: Application & Duplicate Prevention
  console.log('\n--- 3. Diner Applications & Duplicate Prevention ---');
  const app1 = await db.createApplication({
    campaignId: created.id,
    dinerFlynetId: 'usr_test_diner_1',
    dinerName: 'Sarah K.',
    status: 'QUALIFIED',
  });
  assert.strictEqual(app1.dinerFlynetId, 'usr_test_diner_1');
  assert.strictEqual(created.filledSlots, 1);
  console.log('  [PASS] Test 3.1: Application increments filled slots');

  // Attempt duplicate application
  const appDuplicate = await db.createApplication({
    campaignId: created.id,
    dinerFlynetId: 'usr_test_diner_1',
    dinerName: 'Sarah K.',
    status: 'QUALIFIED',
  });
  assert.strictEqual(appDuplicate.id, app1.id, 'Duplicate application returns existing record');
  assert.strictEqual(created.filledSlots, 1, 'Duplicate application does not increase slot count');
  console.log('  [PASS] Test 3.2: Duplicate join prevention enforced');

  // Test 4: Feedback Submission & Duplicate Prevention
  console.log('\n--- 4. Feedback Persistence & Scoring ---');
  const feedback = await db.createFeedback({
    applicationId: app1.id,
    campaignId: created.id,
    dinerFlynetId: 'usr_test_diner_1',
    overallScore: 5,
    ratings: { flavor: 5, presentation: 5, value: 4, portion: 4 },
    answers: { q1: 5, q2: 'Yes' },
    dishFeedback: 'Exceptional plum balance and succulent meat texture.',
    suggestions: 'Keep portion as tested.',
  });

  assert.strictEqual(feedback.overallScore, 5);
  console.log('  [PASS] Test 4.1: Structured feedback saved');

  // Verify application status transitioned to SUBMITTED
  const updatedApp = await db.getApplication(created.id, 'usr_test_diner_1');
  assert.strictEqual(updatedApp?.status, 'SUBMITTED');
  console.log('  [PASS] Test 4.2: Application state transitioned to SUBMITTED');

  // Duplicate feedback check
  const duplicateFeedback = await db.createFeedback({
    applicationId: app1.id,
    campaignId: created.id,
    dinerFlynetId: 'usr_test_diner_1',
    overallScore: 4,
    ratings: { flavor: 4, presentation: 4, value: 3, portion: 3 },
    answers: {},
    dishFeedback: 'Duplicate test',
  });
  assert.strictEqual(duplicateFeedback.id, feedback.id, 'Duplicate feedback returns original');
  console.log('  [PASS] Test 4.3: Duplicate feedback submission blocked');

  // Test 5: Reward Integrity & Idempotency
  console.log('\n--- 5. Reward Integrity & Security Boundaries ---');
  const idempotencyKey = `blackpalate:reward:${app1.id}`;
  const receipt = await db.createRewardReceipt({
    applicationId: app1.id,
    campaignId: created.id,
    dinerFlynetId: 'usr_test_diner_1',
    amountFly: created.rewardFly, // Authoritative from campaign
    amountFlyWei: `${BigInt(Number(created.rewardFly)) * BigInt(10 ** 18)}`,
    idempotencyKey,
    status: 'PENDING',
    error: 'Awaiting Flynet API key & Blackbird admin approval',
  });

  assert.strictEqual(receipt.amountFly, '35');
  assert.strictEqual(receipt.status, 'PENDING');
  console.log('  [PASS] Test 5.1: Reward receipt recorded with authoritative campaign amount');

  console.log('\n====================================================');
  console.log('  ALL 10 BLACKPALATE CORE PRODUCT TESTS PASSED!    ');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
