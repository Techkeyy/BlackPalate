import { neon } from '@neondatabase/serverless';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error('ERROR: DATABASE_URL or POSTGRES_URL environment variable is required.');
  process.exit(1);
}

console.log('Connecting to Neon PostgreSQL database...');
const sql = neon(dbUrl);

async function migrate() {
  try {
    console.log('Reading schema.sql...');
    const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'lib/db/schema.sql'), 'utf-8');

    // Clean comments and split SQL statements
    const cleanSql = schemaSql.replace(/--.*$/gm, '').trim();
    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} schema statements...`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`[Statement ${i + 1}] ${stmt.substring(0, 40).replace(/\n/g, ' ')}...`);
      await sql.query(stmt);
    }
    console.log('Schema migration complete!');

    // Seed Demo Restaurants
    console.log('Seeding Demo Restaurants...');
    await sql`
      INSERT INTO restaurants (id, name, cuisine, neighborhood, price_tier, is_demo)
      VALUES 
        ('rest_01', 'Via Carota / Roman Osteria', '{"Italian", "Pasta", "Roman"}', 'West Village, NYC', 3, true),
        ('rest_02', 'Kappo Wagyu Lab', '{"Japanese", "Wagyu", "Omakase"}', 'Lower East Side, NYC', 4, true),
        ('rest_03', 'Lure & Tide Raw Bar', '{"Seafood", "Mediterranean", "Raw Bar"}', 'SoHo, NYC', 3, true),
        ('rest_04', 'Nori Ramen House', '{"Japanese", "Ramen"}', 'East Village, NYC', 2, true)
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        cuisine = EXCLUDED.cuisine,
        neighborhood = EXCLUDED.neighborhood,
        is_demo = EXCLUDED.is_demo;
    `;

    // Seed Demo Demo User for initial demo restaurant ownership
    console.log('Seeding Demo Owner User...');
    await sql`
      INSERT INTO users (id, display_name, email, restaurant_auth_user_id)
      VALUES ('usr_demo_owner', 'Chef Marco / Operator', 'operator@blackpalate.demo', 'auth_demo_owner')
      ON CONFLICT (id) DO NOTHING;
    `;

    // Seed Demo Restaurant Membership
    console.log('Seeding Demo Restaurant Memberships...');
    await sql`
      INSERT INTO restaurant_memberships (id, user_id, restaurant_id, role)
      VALUES 
        ('memb_01', 'usr_demo_owner', 'rest_01', 'OWNER'),
        ('memb_02', 'usr_demo_owner', 'rest_02', 'OWNER'),
        ('memb_03', 'usr_demo_owner', 'rest_03', 'OWNER'),
        ('memb_04', 'usr_demo_owner', 'rest_04', 'OWNER')
      ON CONFLICT (user_id, restaurant_id) DO NOTHING;
    `;

    // Seed Demo Campaigns
    console.log('Seeding Demo Campaigns...');
    await sql`
      INSERT INTO campaigns (
        id, title, description, dish_focus, research_goal, restaurant_id, target_cuisines,
        location, timing, time_commitment, min_total_check_ins, min_cuisine_visits, must_be_new_to_venue,
        reward_fly, reward_fly_wei, max_slots, filled_slots, status, is_demo, feedback_questions
      ) VALUES (
        'demo_camp_01',
        'Dry-Aged Guanciale Carbonara Benchmark',
        'We are piloting a 45-day cured Umbrian guanciale cut with farm-fresh organic yolk emulsion. Seeking pasta enthusiasts with verified Italian dining visits.',
        'Signature Umbrian Carbonara with Pecorino Romano DOP',
        'Determine whether pasta lovers prefer a heavier yolk emulsion or a sharper Pecorino balance.',
        'rest_01',
        '{"Italian", "Pasta"}',
        'West Village, NYC',
        'Thursday · 6:30 PM',
        '45 minutes',
        2, 1, false,
        '25', '25000000000000000000',
        8, 3, 'ACTIVE', true,
        '[{"id": "q1", "prompt": "How balanced was the Pecorino sharpness versus the yolk richness?", "type": "scale"}, {"id": "q2", "prompt": "Was the pasta al dente structure preserved under the sauce weight?", "type": "yes_no"}, {"id": "q3", "prompt": "Detailed feedback on guanciale crispness and fat rendering:", "type": "text"}, {"id": "q4", "prompt": "Would you order this dish again at a $28 dinner price point?", "type": "choice", "options": ["Definitely Yes", "Yes, with tweaks", "Too expensive / No"]}]'::jsonb
      ),
      (
        'demo_camp_02',
        'A5 Miyazaki Wagyu Nigiri & Bone Marrow Tare',
        'Testing our new dry-aged A5 striploin cut with smoked bone marrow tare glaze. Looking for sushi & omakase regulars.',
        'A5 Wagyu Nigiri with Smoked Tare',
        'Assess whether the rich bone marrow tare overpowers the delicate wagyu marbling.',
        'rest_02',
        '{"Japanese", "Wagyu"}',
        'Lower East Side, NYC',
        'Saturday · 8:30 PM',
        '30 minutes',
        3, 2, false,
        '40', '40000000000000000000',
        6, 2, 'ACTIVE', true,
        '[{"id": "q1", "prompt": "Rate the balance between tare sweetness and wagyu richness:", "type": "scale"}, {"id": "q2", "prompt": "Was the sear temperature and fat rendering optimal?", "type": "yes_no"}, {"id": "q3", "prompt": "Specific feedback on wasabi heat level and rice acidity:", "type": "text"}]'::jsonb
      ),
      (
        'demo_camp_03',
        'Charred Spanish Octopus with Smoked Paprika Romesco',
        'Evaluating tenderization technique and char intensity on wild Spanish octopus tentacles.',
        'Charred Spanish Octopus Tentacle',
        'Collect structured feedback on chew resistance and smoke depth.',
        'rest_03',
        '{"Seafood", "Mediterranean"}',
        'SoHo, NYC',
        'Sunday · 5:00 PM',
        '45 minutes',
        2, 1, true,
        '30', '30000000000000000000',
        10, 4, 'ACTIVE', true,
        '[{"id": "q1", "prompt": "Rate the tenderness vs chew texture of the octopus:", "type": "scale"}, {"id": "q2", "prompt": "Was the romesco acidity sufficient to balance the char?", "type": "yes_no"}, {"id": "q3", "prompt": "General critique for the head chef:", "type": "text"}]'::jsonb
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        dish_focus = EXCLUDED.dish_focus,
        research_goal = EXCLUDED.research_goal,
        is_demo = EXCLUDED.is_demo;
    `;

    console.log('Database migration and seeding completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
