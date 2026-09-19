import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('====================================================');
console.log('    BLACKPALATE REAL NEON POSTGRES INTEGRATION      ');
console.log('====================================================\n');

async function runIntegrationTests() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    console.log('[SKIP] Real database integration tests require DATABASE_URL (skipped in local unit-only run)');
    return;
  }

  const sql = neon(dbUrl);

  console.log('--- 1. Real Database Connectivity & Seed Campaign Verification ---');
  const campaigns = await sql`SELECT * FROM campaigns ORDER BY created_at DESC`;
  assert(Array.isArray(campaigns), 'campaigns query must return array');
  assert(campaigns.length >= 1, 'Database must contain seeded demo campaigns');
  console.log(`  [PASS] Integration 1.1: Connected to Neon PostgreSQL. Found ${campaigns.length} persistent campaigns.`);

  console.log('\n--- 2. User & Restaurant Membership Relational Persistence ---');
  const testUserId = `usr_test_${Date.now()}`;
  const testEmail = `chef_${Date.now()}@gramercy.demo`;
  
  await sql`
    INSERT INTO users (id, display_name, email, restaurant_auth_user_id)
    VALUES (${testUserId}, 'Integration Chef', ${testEmail}, ${'auth_' + Date.now()})
  `;
  const userRows = await sql`SELECT * FROM users WHERE id = ${testUserId} LIMIT 1`;
  assert.strictEqual(userRows.length, 1);
  assert.strictEqual(userRows[0].id, testUserId);
  console.log('  [PASS] Integration 2.1: Created and verified real User record in Neon PostgreSQL');

  const testRestId = `rest_test_${Date.now()}`;
  await sql`
    INSERT INTO restaurants (id, name, cuisine, neighborhood, price_tier, is_demo)
    VALUES (${testRestId}, 'Integration Omakase Lab', '{"Japanese", "Omakase"}', 'Tribeca, NYC', 4, false)
  `;
  const restRows = await sql`SELECT * FROM restaurants WHERE id = ${testRestId} LIMIT 1`;
  assert.strictEqual(restRows.length, 1);
  assert.strictEqual(restRows[0].id, testRestId);
  console.log('  [PASS] Integration 2.2: Created and verified real Restaurant record in Neon PostgreSQL');

  const testMembId = `memb_test_${Date.now()}`;
  await sql`
    INSERT INTO restaurant_memberships (id, user_id, restaurant_id, role)
    VALUES (${testMembId}, ${testUserId}, ${testRestId}, 'OWNER')
  `;
  const membRows = await sql`
    SELECT m.*, r.name as "restaurantName" 
    FROM restaurant_memberships m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.user_id = ${testUserId} AND m.restaurant_id = ${testRestId}
  `;
  assert.strictEqual(membRows.length, 1);
  assert.strictEqual(membRows[0].role, 'OWNER');
  assert.strictEqual(membRows[0].restaurantName, 'Integration Omakase Lab');
  console.log('  [PASS] Integration 2.3: Verified RestaurantMembership relation with JOIN to Restaurant');

  console.log('\n--- 3. Campaign & User-Centric Application Persistence ---');
  const testCampId = `camp_test_${Date.now()}`;
  await sql`
    INSERT INTO campaigns (
      id, title, description, dish_focus, research_goal, restaurant_id, target_cuisines,
      location, timing, time_commitment, min_total_check_ins, min_cuisine_visits, must_be_new_to_venue,
      reward_fly, max_slots, filled_slots, status, is_demo, creator_key, feedback_questions
    ) VALUES (
      ${testCampId}, 'Integration Wagyu Flight', 'Sensory testing', 'Miyazaki A5 Wagyu', 'Test texture',
      ${testRestId}, '{"Japanese"}', 'Tribeca, NYC', '8:00 PM', '30m', 2, 1, false,
      '35', 6, 0, 'ACTIVE', false, ${testUserId}, '[]'::jsonb
    )
  `;
  const campRows = await sql`SELECT * FROM campaigns WHERE id = ${testCampId}`;
  assert.strictEqual(campRows.length, 1);
  assert.strictEqual(campRows[0].dish_focus, 'Miyazaki A5 Wagyu');
  console.log('  [PASS] Integration 3.1: Created and verified Campaign attached to Restaurant');

  const testAppId = `app_test_${Date.now()}`;
  await sql`
    INSERT INTO applications (
      id, campaign_id, user_id, diner_flynet_id, diner_name, status, qualification_proof
    ) VALUES (
      ${testAppId}, ${testCampId}, ${testUserId}, 'fly_test_diner_01', 'Test Diner', 'QUALIFIED',
      '{"totalCheckIns": 5, "isNewToVenue": true}'::jsonb
    )
  `;
  const appRows = await sql`
    SELECT a.*, c.title as "campTitle", u.display_name as "userName"
    FROM applications a
    JOIN campaigns c ON a.campaign_id = c.id
    JOIN users u ON a.user_id = u.id
    WHERE a.id = ${testAppId}
  `;
  assert.strictEqual(appRows.length, 1);
  assert.strictEqual(appRows[0].user_id, testUserId);
  assert.strictEqual(appRows[0].campTitle, 'Integration Wagyu Flight');
  console.log('  [PASS] Integration 3.2: Verified Application relational join to Campaign and internal User');

  console.log('\n====================================================');
  console.log('  ALL NEON POSTGRES INTEGRATION TESTS PASSED!       ');
  console.log('====================================================\n');
}

runIntegrationTests().catch(err => {
  console.error('Integration tests failed:', err);
  process.exit(1);
});

