import { neon } from '@neondatabase/serverless';
import {
  User,
  RestaurantMembership,
  Restaurant,
  Campaign,
  Application,
  FeedbackSubmission,
  RewardReceipt,
  SynthesisReport,
  ApplicationStatus,
} from './types';

export function getDbClient() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (dbUrl && dbUrl.startsWith('postgres')) {
    try {
      return neon(dbUrl);
    } catch {
      return null;
    }
  }
  return null;
}

function checkDatabaseConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (isProduction && (!dbUrl || !dbUrl.startsWith('postgres'))) {
    throw new Error(
      'DATABASE_UNAVAILABLE: Production database connection string (DATABASE_URL) is required. In-memory fallback is disabled in production.'
    );
  }
}

// In-memory fallback ONLY for local testing / non-production environments when DATABASE_URL is unset
let inMemoryUsers: User[] = [
  {
    id: 'usr_demo_owner',
    displayName: 'Chef Marco / Operator',
    email: 'operator@blackpalate.demo',
    restaurantAuthUserId: 'auth_demo_owner',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryRestaurants: Restaurant[] = [
  {
    id: 'rest_01',
    name: 'Via Carota / Roman Osteria',
    cuisine: ['Italian', 'Pasta', 'Roman'],
    neighborhood: 'West Village, NYC',
    priceTier: 3,
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_02',
    name: 'Kappo Wagyu Lab',
    cuisine: ['Japanese', 'Wagyu', 'Omakase'],
    neighborhood: 'Lower East Side, NYC',
    priceTier: 4,
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_03',
    name: 'Lure & Tide Raw Bar',
    cuisine: ['Seafood', 'Mediterranean', 'Raw Bar'],
    neighborhood: 'SoHo, NYC',
    priceTier: 3,
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_04',
    name: 'Nori Ramen House',
    cuisine: ['Japanese', 'Ramen'],
    neighborhood: 'East Village, NYC',
    priceTier: 2,
    isDemo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryMemberships: RestaurantMembership[] = [
  {
    id: 'memb_01',
    userId: 'usr_demo_owner',
    restaurantId: 'rest_01',
    role: 'OWNER',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'memb_02',
    userId: 'usr_demo_owner',
    restaurantId: 'rest_02',
    role: 'OWNER',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'memb_03',
    userId: 'usr_demo_owner',
    restaurantId: 'rest_03',
    role: 'OWNER',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'memb_04',
    userId: 'usr_demo_owner',
    restaurantId: 'rest_04',
    role: 'OWNER',
    createdAt: new Date().toISOString(),
  },
];

let inMemoryCampaigns: Campaign[] = [
  {
    id: 'demo_camp_01',
    title: 'Dry-Aged Guanciale Carbonara Benchmark',
    description:
      'We are piloting a 45-day cured Umbrian guanciale cut with farm-fresh organic yolk emulsion. Seeking pasta enthusiasts with verified Italian dining visits.',
    dishFocus: 'Signature Umbrian Carbonara with Pecorino Romano DOP',
    researchGoal: 'Determine whether pasta lovers prefer a heavier yolk emulsion or a sharper Pecorino balance.',
    restaurantId: 'rest_01',
    restaurantName: 'Via Carota / Roman Osteria',
    restaurantCuisine: ['Italian', 'Pasta', 'Roman'],
    location: 'West Village, NYC',
    timing: 'Thursday · 6:30 PM',
    timeCommitment: '45 minutes',
    targetCuisines: ['Italian', 'Pasta'],
    minTotalCheckIns: 2,
    minCuisineVisits: 1,
    mustBeNewToVenue: false,
    rewardFly: '25',
    rewardFlyWei: '25000000000000000000',
    maxSlots: 8,
    filledSlots: 3,
    status: 'ACTIVE',
    isDemo: true,
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'How balanced was the Pecorino sharpness versus the yolk richness?',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'Was the pasta al dente structure preserved under the sauce weight?',
        type: 'yes_no',
      },
      {
        id: 'q3',
        prompt: 'Detailed feedback on guanciale crispness and fat rendering:',
        type: 'text',
      },
      {
        id: 'q4',
        prompt: 'Would you order this dish again at a $28 dinner price point?',
        type: 'choice',
        options: ['Definitely Yes', 'Yes, with tweaks', 'Too expensive / No'],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_camp_02',
    title: 'A5 Miyazaki Wagyu Nigiri & Bone Marrow Tare',
    description:
      'Testing our new dry-aged A5 striploin cut with smoked bone marrow tare glaze. Looking for sushi & omakase regulars.',
    dishFocus: 'A5 Wagyu Nigiri with Smoked Tare',
    researchGoal: 'Assess whether the rich bone marrow tare overpowers the delicate wagyu marbling.',
    restaurantId: 'rest_02',
    restaurantName: 'Kappo Wagyu Lab',
    restaurantCuisine: ['Japanese', 'Wagyu', 'Omakase'],
    location: 'Lower East Side, NYC',
    timing: 'Saturday · 8:30 PM',
    timeCommitment: '30 minutes',
    targetCuisines: ['Japanese', 'Wagyu'],
    minTotalCheckIns: 3,
    minCuisineVisits: 2,
    mustBeNewToVenue: false,
    rewardFly: '40',
    rewardFlyWei: '40000000000000000000',
    maxSlots: 6,
    filledSlots: 2,
    status: 'ACTIVE',
    isDemo: true,
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate the balance between tare sweetness and wagyu richness:',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'Was the sear temperature and fat rendering optimal?',
        type: 'yes_no',
      },
      {
        id: 'q3',
        prompt: 'Specific feedback on wasabi heat level and rice acidity:',
        type: 'text',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_camp_03',
    title: 'Charred Spanish Octopus with Smoked Paprika Romesco',
    description:
      'Evaluating tenderization technique and char intensity on wild Spanish octopus tentacles.',
    dishFocus: 'Charred Spanish Octopus Tentacle',
    researchGoal: 'Collect structured feedback on chew resistance and smoke depth.',
    restaurantId: 'rest_03',
    restaurantName: 'Lure & Tide Raw Bar',
    restaurantCuisine: ['Seafood', 'Mediterranean', 'Raw Bar'],
    location: 'SoHo, NYC',
    timing: 'Sunday · 5:00 PM',
    timeCommitment: '45 minutes',
    targetCuisines: ['Seafood', 'Mediterranean'],
    minTotalCheckIns: 2,
    minCuisineVisits: 1,
    mustBeNewToVenue: true,
    rewardFly: '30',
    rewardFlyWei: '30000000000000000000',
    maxSlots: 10,
    filledSlots: 4,
    status: 'ACTIVE',
    isDemo: true,
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate the tenderness vs chew texture of the octopus:',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'Was the romesco acidity sufficient to balance the char?',
        type: 'yes_no',
      },
      {
        id: 'q3',
        prompt: 'General critique for the head chef:',
        type: 'text',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryApplications: Application[] = [];
let inMemoryFeedbacks: FeedbackSubmission[] = [];
let inMemoryReceipts: RewardReceipt[] = [];
let inMemorySynthesis: SynthesisReport[] = [];

function mapCampaignRow(r: any): Campaign {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    dishFocus: r.dish_focus,
    researchGoal: r.research_goal,
    restaurantId: r.restaurant_id,
    restaurantName: r.restaurantName || 'Restaurant Partner',
    restaurantCuisine: r.restaurantCuisine || [],
    location: r.location || r.restaurantNeighborhood || 'NYC',
    timing: r.timing || 'Flexible schedule',
    timeCommitment: r.time_commitment || '45 minutes',
    targetCuisines: r.target_cuisines || [],
    minTotalCheckIns: r.min_total_check_ins,
    minDistinctVenues: r.min_distinct_venues,
    minCuisineVisits: r.min_cuisine_visits,
    mustBeNewToVenue: r.must_be_new_to_venue,
    rewardFly: r.reward_fly,
    rewardFlyWei: r.reward_fly_wei,
    maxSlots: r.max_slots,
    filledSlots: r.filled_slots,
    status: r.status,
    isDemo: r.is_demo ?? false,
    creatorKey: r.creator_key,
    feedbackQuestions: r.feedback_questions || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const db = {
  // ==========================================
  // USERS & ACCOUNT SYSTEM
  // ==========================================

  async getUserById(id: string): Promise<User | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            displayName: r.display_name,
            email: r.email,
            flynetUserId: r.flynet_user_id,
            restaurantAuthUserId: r.restaurant_auth_user_id,
            avatarUrl: r.avatar_url,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryUsers.find(u => u.id === id) || null;
  },

  async getUserByFlynetId(flynetUserId: string): Promise<User | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM users WHERE flynet_user_id = ${flynetUserId} LIMIT 1`;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            displayName: r.display_name,
            email: r.email,
            flynetUserId: r.flynet_user_id,
            restaurantAuthUserId: r.restaurant_auth_user_id,
            avatarUrl: r.avatar_url,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryUsers.find(u => u.flynetUserId === flynetUserId) || null;
  },

  async getUserByRestaurantAuthId(restaurantAuthUserId: string): Promise<User | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM users WHERE restaurant_auth_user_id = ${restaurantAuthUserId} LIMIT 1`;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            displayName: r.display_name,
            email: r.email,
            flynetUserId: r.flynet_user_id,
            restaurantAuthUserId: r.restaurant_auth_user_id,
            avatarUrl: r.avatar_url,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryUsers.find(u => u.restaurantAuthUserId === restaurantAuthUserId) || null;
  },

  async createUser(userData: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    checkDatabaseConfig();
    const newUser: User = {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          INSERT INTO users (id, display_name, email, flynet_user_id, restaurant_auth_user_id, avatar_url)
          VALUES (${newUser.id}, ${newUser.displayName}, ${newUser.email || null}, 
                  ${newUser.flynetUserId || null}, ${newUser.restaurantAuthUserId || null}, ${newUser.avatarUrl || null})
        `;
        return newUser;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    inMemoryUsers.push(newUser);
    return newUser;
  },

  async linkFlynetUser(userId: string, flynetUserId: string): Promise<User | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          UPDATE users 
          SET flynet_user_id = ${flynetUserId}, updated_at = NOW() 
          WHERE id = ${userId}
        `;
        return this.getUserById(userId);
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database update failed: ${err.message}`);
        }
      }
    }

    const u = inMemoryUsers.find(user => user.id === userId);
    if (u) {
      u.flynetUserId = flynetUserId;
      u.updatedAt = new Date().toISOString();
      return u;
    }
    return null;
  },

  // ==========================================
  // RESTAURANTS & WORKSPACE MEMBERSHIPS
  // ==========================================

  async getRestaurants(): Promise<Restaurant[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM restaurants ORDER BY name ASC`;
        return rows.map((r: any) => ({
          id: r.id,
          flynetId: r.flynet_restaurant_id,
          name: r.name,
          cuisine: r.cuisine || [],
          neighborhood: r.neighborhood,
          priceTier: r.price_tier,
          isDemo: r.is_demo ?? false,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryRestaurants;
  },

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const rests = await this.getRestaurants();
    return rests.find(r => r.id === id) || null;
  },

  async createRestaurant(restData: Omit<Restaurant, 'createdAt' | 'updatedAt'>): Promise<Restaurant> {
    checkDatabaseConfig();
    const newRest: Restaurant = {
      ...restData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          INSERT INTO restaurants (id, flynet_restaurant_id, name, cuisine, neighborhood, price_tier, is_demo)
          VALUES (${newRest.id}, ${newRest.flynetId || null}, ${newRest.name}, 
                  ${newRest.cuisine}, ${newRest.neighborhood || null}, ${newRest.priceTier || 2}, ${newRest.isDemo ?? false})
        `;
        return newRest;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    inMemoryRestaurants.push(newRest);
    return newRest;
  },

  async getMembershipsByUserId(userId: string): Promise<RestaurantMembership[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM restaurant_memberships WHERE user_id = ${userId}`;
        return rows.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          restaurantId: r.restaurant_id,
          role: r.role,
          createdAt: r.created_at,
        }));
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryMemberships.filter(m => m.userId === userId);
  },

  async getMembership(userId: string, restaurantId: string): Promise<RestaurantMembership | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT * FROM restaurant_memberships 
          WHERE user_id = ${userId} AND restaurant_id = ${restaurantId} 
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            userId: r.user_id,
            restaurantId: r.restaurant_id,
            role: r.role,
            createdAt: r.created_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryMemberships.find(m => m.userId === userId && m.restaurantId === restaurantId) || null;
  },

  async createMembership(membData: Omit<RestaurantMembership, 'id' | 'createdAt'>): Promise<RestaurantMembership> {
    checkDatabaseConfig();
    const newMemb: RestaurantMembership = {
      ...membData,
      id: `memb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          INSERT INTO restaurant_memberships (id, user_id, restaurant_id, role)
          VALUES (${newMemb.id}, ${newMemb.userId}, ${newMemb.restaurantId}, ${newMemb.role})
          ON CONFLICT (user_id, restaurant_id) DO NOTHING
        `;
        return newMemb;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    inMemoryMemberships.push(newMemb);
    return newMemb;
  },

  // ==========================================
  // CAMPAIGNS
  // ==========================================

  async getCampaigns(restaurantId?: string): Promise<Campaign[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = restaurantId
          ? await sql`
              SELECT c.*, r.name as "restaurantName", r.cuisine as "restaurantCuisine", r.neighborhood as "restaurantNeighborhood"
              FROM campaigns c
              LEFT JOIN restaurants r ON c.restaurant_id = r.id
              WHERE c.restaurant_id = ${restaurantId}
              ORDER BY c.created_at DESC
            `
          : await sql`
              SELECT c.*, r.name as "restaurantName", r.cuisine as "restaurantCuisine", r.neighborhood as "restaurantNeighborhood"
              FROM campaigns c
              LEFT JOIN restaurants r ON c.restaurant_id = r.id
              ORDER BY c.created_at DESC
            `;
        if (rows) {
          return rows.map(mapCampaignRow);
        }
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    if (restaurantId) {
      return inMemoryCampaigns.filter(c => c.restaurantId === restaurantId);
    }
    return inMemoryCampaigns;
  },

  async getCampaignById(id: string): Promise<Campaign | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT c.*, r.name as "restaurantName", r.cuisine as "restaurantCuisine", r.neighborhood as "restaurantNeighborhood"
          FROM campaigns c
          LEFT JOIN restaurants r ON c.restaurant_id = r.id
          WHERE c.id = ${id}
          LIMIT 1
        `;
        return rows?.[0] ? mapCampaignRow(rows[0]) : null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryCampaigns.find(c => c.id === id) || null;
  },

  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'filledSlots'>): Promise<Campaign> {
    checkDatabaseConfig();
    const newId = `camp_${Date.now()}`;
    const newCampaign: Campaign = {
      ...campaign,
      id: newId,
      filledSlots: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          INSERT INTO campaigns (
            id, title, description, dish_focus, research_goal, restaurant_id, target_cuisines,
            location, timing, time_commitment, min_total_check_ins, min_distinct_venues, min_cuisine_visits, must_be_new_to_venue,
            reward_fly, reward_fly_wei, max_slots, filled_slots, status, is_demo, creator_key, feedback_questions
          ) VALUES (
            ${newCampaign.id}, ${newCampaign.title}, ${newCampaign.description}, ${newCampaign.dishFocus},
            ${newCampaign.researchGoal || null}, ${newCampaign.restaurantId}, ${newCampaign.targetCuisines},
            ${newCampaign.location || 'NYC'}, ${newCampaign.timing || 'Flexible'}, ${newCampaign.timeCommitment || '45 minutes'},
            ${newCampaign.minTotalCheckIns}, ${newCampaign.minDistinctVenues || 0}, ${newCampaign.minCuisineVisits}, ${newCampaign.mustBeNewToVenue},
            ${newCampaign.rewardFly}, ${newCampaign.rewardFlyWei || null}, ${newCampaign.maxSlots},
            ${newCampaign.filledSlots}, ${newCampaign.status}, ${newCampaign.isDemo ?? false},
            ${newCampaign.creatorKey || null}, ${JSON.stringify(newCampaign.feedbackQuestions)}
          )
        `;
        return newCampaign;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    inMemoryCampaigns.unshift(newCampaign);
    return newCampaign;
  },

  // ==========================================
  // APPLICATIONS (USER-CENTRIC)
  // ==========================================

  async getApplications(campaignId?: string): Promise<Application[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = campaignId
          ? await sql`SELECT * FROM applications WHERE campaign_id = ${campaignId} ORDER BY created_at DESC`
          : await sql`SELECT * FROM applications ORDER BY created_at DESC`;
        return rows.map((r: any) => ({
          id: r.id,
          campaignId: r.campaign_id,
          userId: r.user_id,
          dinerFlynetId: r.diner_flynet_id,
          dinerName: r.diner_name,
          dinerAvatar: r.diner_avatar,
          qualificationProof: r.qualification_proof,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    if (campaignId) {
      return inMemoryApplications.filter(a => a.campaignId === campaignId);
    }
    return inMemoryApplications;
  },

  async getApplicationById(id: string): Promise<Application | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM applications WHERE id = ${id} LIMIT 1`;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            campaignId: r.campaign_id,
            userId: r.user_id,
            dinerFlynetId: r.diner_flynet_id,
            dinerName: r.diner_name,
            dinerAvatar: r.diner_avatar,
            qualificationProof: r.qualification_proof,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryApplications.find(a => a.id === id) || null;
  },

  async getUserApplications(userId: string): Promise<Array<Application & { campaign?: Campaign }>> {
    checkDatabaseConfig();
    if (!userId) return [];

    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT a.*, c.title as "campTitle", c.dish_focus as "campDishFocus", c.reward_fly as "campRewardFly",
                 c.timing as "campTiming", c.location as "campLocation", r.name as "restaurantName"
          FROM applications a
          JOIN campaigns c ON a.campaign_id = c.id
          LEFT JOIN restaurants r ON c.restaurant_id = r.id
          WHERE a.user_id = ${userId}
          ORDER BY a.created_at DESC
        `;
        return rows.map((r: any) => ({
          id: r.id,
          campaignId: r.campaign_id,
          userId: r.user_id,
          dinerFlynetId: r.diner_flynet_id,
          dinerName: r.diner_name,
          dinerAvatar: r.diner_avatar,
          qualificationProof: r.qualification_proof,
          status: r.status,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          campaign: {
            id: r.campaign_id,
            title: r.campTitle,
            dishFocus: r.campDishFocus,
            rewardFly: r.campRewardFly,
            timing: r.campTiming,
            location: r.campLocation,
            restaurantName: r.restaurantName,
          } as Campaign,
        }));
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }

    const apps = inMemoryApplications.filter(a => a.userId === userId);
    const campaigns = await this.getCampaigns();
    return apps.map(app => ({
      ...app,
      campaign: campaigns.find(c => c.id === app.campaignId),
    }));
  },

  async getApplication(campaignId: string, userId: string): Promise<Application | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT * FROM applications
          WHERE campaign_id = ${campaignId} AND user_id = ${userId}
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            campaignId: r.campaign_id,
            userId: r.user_id,
            dinerFlynetId: r.diner_flynet_id,
            dinerName: r.diner_name,
            dinerAvatar: r.diner_avatar,
            qualificationProof: r.qualification_proof,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return (
      inMemoryApplications.find(
        a => a.campaignId === campaignId && a.userId === userId
      ) || null
    );
  },

  async createApplication(appData: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application> {
    checkDatabaseConfig();
    const existing = await this.getApplication(appData.campaignId, appData.userId);
    if (existing) return existing;

    const newId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newApp: Application = {
      ...appData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          INSERT INTO applications (id, campaign_id, user_id, diner_flynet_id, diner_name, diner_avatar, qualification_proof, status)
          VALUES (${newApp.id}, ${newApp.campaignId}, ${newApp.userId}, ${newApp.dinerFlynetId || null}, 
                  ${newApp.dinerName || null}, ${newApp.dinerAvatar || null}, 
                  ${JSON.stringify(newApp.qualificationProof || null)}, ${newApp.status})
        `;
        await sql`
          UPDATE campaigns SET filled_slots = filled_slots + 1 WHERE id = ${newApp.campaignId}
        `;
        return newApp;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    inMemoryApplications.push(newApp);
    const camp = inMemoryCampaigns.find(c => c.id === appData.campaignId);
    if (camp) {
      camp.filledSlots += 1;
    }
    return newApp;
  },

  async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        await sql`UPDATE applications SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
        return this.getApplicationById(id);
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database update failed: ${err.message}`);
        }
      }
    }

    const app = inMemoryApplications.find(a => a.id === id);
    if (app) {
      app.status = status;
      app.updatedAt = new Date().toISOString();
      return app;
    }
    return null;
  },

  // ==========================================
  // FEEDBACK
  // ==========================================

  async createFeedback(feedback: Omit<FeedbackSubmission, 'id' | 'submittedAt'>): Promise<FeedbackSubmission> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT id FROM feedback_submissions WHERE application_id = ${feedback.applicationId} LIMIT 1`;
        if (rows && rows.length > 0) {
          const existing = rows[0];
          return {
            ...feedback,
            id: existing.id,
            submittedAt: new Date().toISOString(),
          };
        }

        const newId = `fb_${Date.now()}`;
        await sql`
          INSERT INTO feedback_submissions (id, application_id, campaign_id, user_id, diner_flynet_id, overall_score, ratings, answers, dish_feedback, suggestions)
          VALUES (${newId}, ${feedback.applicationId}, ${feedback.campaignId}, ${feedback.userId}, ${feedback.dinerFlynetId || null}, ${feedback.overallScore},
                  ${JSON.stringify(feedback.ratings)}, ${JSON.stringify(feedback.answers)}, ${feedback.dishFeedback}, ${feedback.suggestions || null})
        `;
        await sql`UPDATE applications SET status = 'SUBMITTED', updated_at = NOW() WHERE id = ${feedback.applicationId}`;

        return {
          ...feedback,
          id: newId,
          submittedAt: new Date().toISOString(),
        };
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    const existing = inMemoryFeedbacks.find(f => f.applicationId === feedback.applicationId);
    if (existing) return existing;

    const newFb: FeedbackSubmission = {
      ...feedback,
      id: `fb_${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };

    inMemoryFeedbacks.push(newFb);
    await this.updateApplicationStatus(feedback.applicationId, 'SUBMITTED');
    return newFb;
  },

  async getFeedbacks(campaignId: string): Promise<FeedbackSubmission[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM feedback_submissions WHERE campaign_id = ${campaignId} ORDER BY submitted_at DESC`;
        return rows.map((r: any) => ({
          id: r.id,
          applicationId: r.application_id,
          campaignId: r.campaign_id,
          userId: r.user_id,
          dinerFlynetId: r.diner_flynet_id,
          overallScore: r.overall_score,
          ratings: r.ratings,
          answers: r.answers,
          dishFeedback: r.dish_feedback,
          suggestions: r.suggestions,
          submittedAt: r.submitted_at,
        }));
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryFeedbacks.filter(f => f.campaignId === campaignId);
  },

  // ==========================================
  // REWARDS
  // ==========================================

  async createRewardReceipt(receipt: Omit<RewardReceipt, 'id'>): Promise<RewardReceipt> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const newId = `rcpt_${Date.now()}`;
        await sql`
          INSERT INTO reward_receipts (id, application_id, campaign_id, user_id, diner_flynet_id, amount_fly, amount_fly_wei, tx_hash, idempotency_key, status, error)
          VALUES (${newId}, ${receipt.applicationId}, ${receipt.campaignId}, ${receipt.userId}, ${receipt.dinerFlynetId || null}, 
                  ${receipt.amountFly}, ${receipt.amountFlyWei},
                  ${receipt.txHash || null}, ${receipt.idempotencyKey}, ${receipt.status}, ${receipt.error || null})
          ON CONFLICT (idempotency_key) DO UPDATE SET status = EXCLUDED.status, error = EXCLUDED.error
        `;
        return {
          ...receipt,
          id: newId,
        };
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    const existing = inMemoryReceipts.find(r => r.idempotencyKey === receipt.idempotencyKey);
    if (existing) return existing;

    const newReceipt: RewardReceipt = {
      ...receipt,
      id: `rcpt_${Date.now()}`,
    };
    inMemoryReceipts.push(newReceipt);
    return newReceipt;
  },

  async getRewardReceipts(campaignId?: string): Promise<RewardReceipt[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = campaignId
          ? await sql`SELECT * FROM reward_receipts WHERE campaign_id = ${campaignId}`
          : await sql`SELECT * FROM reward_receipts`;
        return rows.map((r: any) => ({
          id: r.id,
          applicationId: r.application_id,
          campaignId: r.campaign_id,
          userId: r.user_id,
          dinerFlynetId: r.diner_flynet_id,
          amountFly: r.amount_fly,
          amountFlyWei: r.amount_fly_wei,
          txHash: r.tx_hash,
          idempotencyKey: r.idempotency_key,
          status: r.status,
          issuedAt: r.issued_at,
          error: r.error,
        }));
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    if (campaignId) {
      return inMemoryReceipts.filter(r => r.campaignId === campaignId);
    }
    return inMemoryReceipts;
  },

  // ==========================================
  // SYNTHESIS REPORTS
  // ==========================================

  async saveSynthesis(report: Omit<SynthesisReport, 'id' | 'generatedAt'>): Promise<SynthesisReport> {
    checkDatabaseConfig();
    const newId = `synth_${Date.now()}`;
    const newReport: SynthesisReport = {
      ...report,
      id: newId,
      generatedAt: new Date().toISOString(),
    };

    const sql = getDbClient();
    if (sql) {
      try {
        await sql`
          INSERT INTO synthesis_reports (id, campaign_id, executive_summary, flavor_analysis, cohort_trends, recommendations, raw_submission_count)
          VALUES (${newReport.id}, ${newReport.campaignId}, ${newReport.executiveSummary}, ${newReport.flavorAnalysis},
                  ${JSON.stringify(newReport.cohortTrends)}, ${newReport.recommendations}, ${newReport.rawSubmissionCount})
        `;
        return newReport;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database insert failed: ${err.message}`);
        }
      }
    }

    inMemorySynthesis.push(newReport);
    return newReport;
  },

  async getSynthesis(campaignId: string): Promise<SynthesisReport | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`SELECT * FROM synthesis_reports WHERE campaign_id = ${campaignId} ORDER BY generated_at DESC LIMIT 1`;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            campaignId: r.campaign_id,
            executiveSummary: r.executive_summary,
            flavorAnalysis: r.flavor_analysis,
            cohortTrends: r.cohort_trends || [],
            recommendations: r.recommendations || [],
            rawSubmissionCount: r.raw_submission_count,
            generatedAt: r.generated_at,
          };
        }
        return null;
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemorySynthesis.find(s => s.campaignId === campaignId) || null;
  },
};
