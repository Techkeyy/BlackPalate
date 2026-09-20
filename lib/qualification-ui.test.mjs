import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');

assert.match(source, /function openTasting\(campaign: Campaign\)/);
assert.match(source, /setTastingQualification\(\{ status: 'loading' \}\)/);
assert.match(source, /fetch\(`\/api\/campaigns\/\$\{campaignId\}\/qualification`/);
assert.match(source, /credentials: 'include'/);
assert.match(source, /cache: 'no-store'/);
assert.match(source, /console\.info\('\[qualification\] request_start'/);
assert.match(source, /console\.info\('\[qualification\] response_status'/);
assert.match(source, /res\.status === 401 \|\| data\?\.code === 'UNAUTHORIZED'/);
assert.match(source, /res\.status === 404 \|\| data\?\.code === 'NOT_FOUND'/);
assert.match(source, /res\.status === 503 \|\| data\?\.code === 'FLYNET_UNAVAILABLE'/);
assert.match(source, /status: 'network_error'/);
assert.match(source, /status: 'not_qualified'/);
assert.match(source, /tastingQualification\.checkInsCount \?\? 0\} of \{selectedTasting\.minTotalCheckIns\} verified visits/);
assert.match(source, /tastingQualification\.cuisineVisits \?\? 0\} of \{selectedTasting\.minCuisineVisits\}/);
assert.doesNotMatch(source, /minDistinctVenues && selectedTasting\.minDistinctVenues > 0/);
assert.doesNotMatch(source, /status === 'error'/);

console.log('Qualification UI boundary contract tests passed.');
