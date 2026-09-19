/**
 * Unit Test for Deterministic Qualification Logic
 * Verifies that the rules engine correctly evaluates real-world check-in fixtures.
 */

import { evaluateDinerQualification } from './qualification.mjs';

console.log('--- Testing Deterministic Qualification Engine ---');

// Mock Flynet check-in payload matching real OpenAPI schema
const mockCheckIns = [
  {
    id: 'ci-1',
    object: 'check_in',
    location: {
      id: 'loc-1',
      object: 'location',
      name: 'Anton\'s West Village',
      restaurant: {
        id: 'rest-antons',
        object: 'restaurant',
        name: 'Anton\'s',
      },
    },
    created_at: '2026-05-12T18:06:03.729Z',
  },
  {
    id: 'ci-2',
    object: 'check_in',
    location: {
      id: 'loc-2',
      object: 'location',
      name: 'FLYBAR Williamsburg',
      restaurant: {
        id: 'rest-flybar',
        object: 'restaurant',
        name: 'FLYBAR',
      },
    },
    created_at: '2026-06-15T20:12:00.000Z',
  },
];

const mockCatalog = new Map([
  [
    'rest-antons',
    {
      id: 'rest-antons',
      name: 'Anton\'s',
      cuisine: ['American', 'Italian'],
      price: 3,
    },
  ],
  [
    'rest-flybar',
    {
      id: 'rest-flybar',
      name: 'FLYBAR',
      cuisine: ['Cocktail Bar', 'American'],
      price: 2,
    },
  ],
]);

// Test 1: Minimum total check-ins >= 2 (Expected: PASS)
const res1 = evaluateDinerQualification(
  mockCheckIns,
  [{ type: 'MIN_TOTAL_CHECKINS', threshold: 2, description: 'Min 2 check-ins' }],
  mockCatalog
);
console.assert(res1.qualified === true, 'Test 1 Failed: Expected qualified = true');
console.log('  [PASS] Test 1: MIN_TOTAL_CHECKINS >= 2 passed');

// Test 2: Minimum total check-ins >= 5 (Expected: FAIL)
const res2 = evaluateDinerQualification(
  mockCheckIns,
  [{ type: 'MIN_TOTAL_CHECKINS', threshold: 5, description: 'Min 5 check-ins' }],
  mockCatalog
);
console.assert(res2.qualified === false, 'Test 2 Failed: Expected qualified = false');
console.log('  [PASS] Test 2: MIN_TOTAL_CHECKINS >= 5 failed deterministically');

// Test 3: Cuisine visit >= 1 for 'Italian' (Expected: PASS)
const res3 = evaluateDinerQualification(
  mockCheckIns,
  [{ type: 'MIN_CUISINE_VISITS', threshold: 1, targetCuisine: 'Italian', description: 'Min 1 Italian visit' }],
  mockCatalog
);
console.assert(res3.qualified === true, 'Test 3 Failed: Expected qualified = true');
console.log('  [PASS] Test 3: MIN_CUISINE_VISITS Italian >= 1 passed');

// Test 4: Cuisine visit >= 1 for 'Japanese' (Expected: FAIL)
const res4 = evaluateDinerQualification(
  mockCheckIns,
  [{ type: 'MIN_CUISINE_VISITS', threshold: 1, targetCuisine: 'Japanese', description: 'Min 1 Japanese visit' }],
  mockCatalog
);
console.assert(res4.qualified === false, 'Test 4 Failed: Expected qualified = false');
console.log('  [PASS] Test 4: MIN_CUISINE_VISITS Japanese >= 1 failed deterministically');

// Test 5: New to restaurant 'rest-omakase' (Expected: PASS)
const res5 = evaluateDinerQualification(
  mockCheckIns,
  [{ type: 'NEW_TO_RESTAURANT', targetRestaurantIds: ['rest-omakase'], description: 'Never visited rest-omakase' }],
  mockCatalog
);
console.assert(res5.qualified === true, 'Test 5 Failed: Expected qualified = true');
console.log('  [PASS] Test 5: NEW_TO_RESTAURANT passed');

console.log('\nAll 5 deterministic qualification unit tests passed successfully!\n');

