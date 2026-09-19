import assert from 'node:assert/strict';
import { evaluateQualification } from './qualification.mjs';

console.log('--- Testing diner history availability and qualification semantics ---');

function evaluateHistoryResponse(response, rules) {
  if (!response.ok) {
    return { historyAvailable: false, result: 'PROVIDER_ERROR' };
  }

  const qualification = evaluateQualification(response.checkIns, rules);
  return {
    historyAvailable: true,
    result: qualification.qualified ? 'QUALIFIED' : 'NOT_QUALIFIED',
    checkInsCount: response.checkIns.length,
    qualification,
  };
}

const historyRequired = [
  {
    type: 'MIN_TOTAL_CHECKINS',
    threshold: 2,
    description: 'At least 2 verified Blackbird visits',
  },
  {
    type: 'MIN_CUISINE_VISITS',
    threshold: 1,
    targetCuisine: 'Contemporary American',
    description: '1 verified Contemporary American visit required',
  },
];

const emptyHistory = evaluateHistoryResponse({ ok: true, status: 200, checkIns: [] }, historyRequired);
assert.equal(emptyHistory.historyAvailable, true);
assert.equal(emptyHistory.result, 'NOT_QUALIFIED');
assert.equal(emptyHistory.checkInsCount, 0);
console.log('  [PASS] HTTP 200 with [] is available history and evaluates to NOT_QUALIFIED');

const firstTime = evaluateHistoryResponse(
  { ok: true, status: 200, checkIns: [] },
  [{ type: 'NEW_TO_RESTAURANT', restaurantId: 'rest-new', description: 'No prior verified visits' }]
);
assert.equal(firstTime.historyAvailable, true);
assert.equal(firstTime.result, 'QUALIFIED');
console.log('  [PASS] Zero-history member can qualify for a first-time-only campaign');

const providerFailure = evaluateHistoryResponse({ ok: false, status: 503, checkIns: [] }, historyRequired);
assert.equal(providerFailure.historyAvailable, false);
assert.equal(providerFailure.result, 'PROVIDER_ERROR');
console.log('  [PASS] Provider failure is distinct from empty history');

console.log('Diner history semantics tests passed.');
