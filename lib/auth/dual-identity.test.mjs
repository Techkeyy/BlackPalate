import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const meRoute = readFileSync(new URL('../../app/api/auth/me/route.ts', import.meta.url), 'utf8');
const feedbackRoute = readFileSync(new URL('../../app/api/campaigns/[id]/submit-feedback/route.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../../app/page.tsx', import.meta.url), 'utf8');
const gate = readFileSync(new URL('./gate.ts', import.meta.url), 'utf8');

assert.match(meRoute, /type DualIdentityResolution/);
assert.match(meRoute, /const diner = await resolveDirectDinerIdentity\(req\)/);
assert.match(meRoute, /restaurant: operator/);
assert.match(meRoute, /identities:/);
assert.match(meRoute, /activeRole/);
assert.match(meRoute, /capabilityIdentities\.diner/);
assert.match(meRoute, /capabilityIdentities\.restaurant/);
assert.doesNotMatch(meRoute, /if \(operator\) \{[\s\S]{0,240}return \{/);

assert.match(feedbackRoute, /import \{ resolveFlynetDinerIdentity \} from '@\/lib\/auth\/diner'/);
assert.doesNotMatch(feedbackRoute, /resolveRequestIdentity/);

assert.match(page, /const \[hasDinerSession, setHasDinerSession\]/);
assert.match(page, /const \[hasRestaurantSession, setHasRestaurantSession\]/);
assert.match(page, /const \[activeMode, setActiveMode\]/);
assert.match(page, /meData\.identities\?\.diner\?\.authenticated/);
assert.match(page, /meData\.identities\?\.restaurant\?\.authenticated/);
assert.match(page, /if \(nextNav === 'discover' \|\| nextNav === 'my-tastings'\)/);
assert.match(page, /nextNav === 'create-tasting' \|\| nextNav === 'campaign-studio'/);

assert.match(gate, /hasRestaurantSession\?/);
assert.match(gate, /hasDinerSession\?/);

console.log('Dual-identity arbitration contract tests passed.');
