import { neon } from '@neondatabase/serverless';
import {
  Restaurant,
  Campaign,
  Application,
  FeedbackSubmission,
  RewardReceipt,
  SynthesisReport,
  ApplicationStatus,
} from './types';

// Explicit Seed Data for development & demo presentation
const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest_01',
    flynetId: null,
    name: 'Via Carota / Roman Osteria',
    cuisine: ['Italian', 'Pasta', 'Roman'],
    neighborhood: 'West Village, NYC',
    priceTier: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_02',
    flynetId: null,
    name: 'Kappo Wagyu Lab',
    cuisine: ['Japanese', 'Wagyu', 'Omakase'],
    neighborhood: 'Lower East Side, NYC',
    priceTier: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_03',
    flynetId: null,
    name: 'Lure & Tide Raw Bar',
    cuisine: ['Seafood', 'Mediterranean', 'Raw Bar'],
    neighborhood: 'SoHo, NYC',
    priceTier: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_04',
    flynetId: null,
    name: 'Nori Ramen House',
    cuisine: ['Japanese', 'Ramen'],
    neighborhood: 'East Village, NYC',
    priceTier: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_CAMPAIGNS: Campaign[] = [
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
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_camp_02',
    title: 'Spicy Miso Ramen & Charred Chashu Test',
    description:
      'Testing an unreleased rich 18-hour spicy miso pork broth with hand-pulled wavy noodles and torch-finished Kurobuta pork belly.',
    dishFocus: 'Spicy Miso Ramen with Charred Chashu',
    researchGoal: 'Validate if frequent ramen diners consider $24 appropriate for artisan hand-crafted broth.',
    restaurantId: 'rest_04',
    restaurantName: 'Nori Ramen House',
    restaurantCuisine: ['Japanese', 'Ramen'],
    location: 'East Village, NYC',
    timing: 'Tuesday · 7:00 PM',
    timeCommitment: '35 minutes',
    targetCuisines: ['Japanese', 'Ramen', 'Asian'],
    minTotalCheckIns: 2,
    minCuisineVisits: 1,
    mustBeNewToVenue: false,
    rewardFly: '500',
    rewardFlyWei: '500000000000000000000',
    maxSlots: 6,
    filledSlots: 4,
    status: 'ACTIVE',
    isDemo: true,
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate broth viscosity and spice depth:',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'Was the chashu tenderness optimal?',
        type: 'yes_no',
      },
      {
        id: 'q3',
        prompt: 'What price point would you expect for this bowl on our regular menu?',
        type: 'choice',
        options: ['$18 - $20', '$21 - $23', '$24 - $26', '$27+'],
      },
      {
        id: 'q4',
        prompt: 'Notes on noodle chew and broth cling:',
        type: 'text',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_camp_03',
    title: 'A5 Miyazaki Katsu Sando & Smoked Ponzu Mayo',
    description:
      'Testing an unreleased brioche crust formulation with 60-second flash-fried A5 Wagyu striploin. Diners must have verified Japanese dining experience.',
    dishFocus: 'A5 Miyazaki Katsu Sando',
    researchGoal: 'Gauge willingness to pay for ultra-premium cut format.',
    restaurantId: 'rest_02',
    restaurantName: 'Kappo Wagyu Lab',
    restaurantCuisine: ['Japanese', 'Wagyu', 'Omakase'],
    location: 'Lower East Side, NYC',
    timing: 'Saturday · 5:30 PM',
    timeCommitment: '40 minutes',
    targetCuisines: ['Japanese', 'Asian'],
    minTotalCheckIns: 3,
    minCuisineVisits: 2,
    mustBeNewToVenue: false,
    rewardFly: '75',
    rewardFlyWei: '75000000000000000000',
    maxSlots: 5,
    filledSlots: 1,
    status: 'ACTIVE',
    isDemo: true,
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate the contrast between milk bread crunch and meat tenderness:',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'Did the smoked ponzu cut through the A5 marbling fat appropriately?',
        type: 'choice',
        options: ['Too acidic', 'Perfect balance', 'Too rich / Needed more acid'],
      },
      {
        id: 'q3',
        prompt: 'What price point would you expect for this tasting item on a dinner menu?',
        type: 'text',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo_camp_04',
    title: 'Hokkaido Scallop Crudo with Finger Lime & Yuzu Kosho',
    description:
      'Recruiting seafood and raw bar diners for first-look tasting of our summer crudo flight.',
    dishFocus: 'Hokkaido Scallop Crudo',
    researchGoal: 'Gather initial diner reactions on acidity levels before menu print.',
    restaurantId: 'rest_03',
    restaurantName: 'Lure & Tide Raw Bar',
    restaurantCuisine: ['Seafood', 'Mediterranean', 'Raw Bar'],
    location: 'SoHo, NYC',
    timing: 'Wednesday · 8:00 PM',
    timeCommitment: '30 minutes',
    targetCuisines: ['Seafood', 'Mediterranean', 'Japanese'],
    minTotalCheckIns: 1,
    minCuisineVisits: 0,
    mustBeNewToVenue: true,
    rewardFly: '15',
    rewardFlyWei: '15000000000000000000',
    maxSlots: 12,
    filledSlots: 4,
    status: 'ACTIVE',
    isDemo: true,
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate scallop sweetness and knife cut texture:',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'Flavor profile notes on yuzu kosho heat level:',
        type: 'text',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// In-memory state for explicit test & dev memory mode
let inMemoryRestaurants: Restaurant[] = [...SEED_RESTAURANTS];
let inMemoryCampaigns: Campaign[] = [...SEED_CAMPAIGNS];
let inMemoryApplications: Application[] = [];
let inMemoryFeedbacks: FeedbackSubmission[] = [];
let inMemoryReceipts: RewardReceipt[] = [];
let inMemorySynthesis: SynthesisReport[] = [];

export function getDbClient() {
  const dbUrl = process.env.DATABASE_URL;
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
  const dbUrl = process.env.DATABASE_URL;

  if (isProduction && (!dbUrl || !dbUrl.startsWith('postgres'))) {
    throw new Error(
      'DATABASE_UNAVAILABLE: Production database connection string (DATABASE_URL) is required. In-memory fallback is disabled in production.'
    );
  }
}

export const db = {
  async getCampaigns(): Promise<Campaign[]> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT c.*, r.name as "restaurantName", r.cuisine as "restaurantCuisine", r.neighborhood as "restaurantNeighborhood"
          FROM campaigns c
          LEFT JOIN restaurants r ON c.restaurant_id = r.id
          ORDER BY c.created_at DESC
        `;
        if (rows) {
          return rows.map((r: any) => ({
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
          }));
        }
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Database query failed: ${err.message}`);
        }
      }
    }
    return inMemoryCampaigns;
  },

  async getCampaignById(id: string): Promise<Campaign | null> {
    const campaigns = await this.getCampaigns();
    return campaigns.find(c => c.id === id) || null;
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
            location, timing, time_commitment, min_total_check_ins, min_cuisine_visits, must_be_new_to_venue,
            reward_fly, reward_fly_wei, max_slots, filled_slots, status, is_demo, creator_key, feedback_questions
          ) VALUES (
            ${newCampaign.id}, ${newCampaign.title}, ${newCampaign.description}, ${newCampaign.dishFocus},
            ${newCampaign.researchGoal || null}, ${newCampaign.restaurantId}, ${newCampaign.targetCuisines},
            ${newCampaign.location || 'NYC'}, ${newCampaign.timing || 'Flexible'}, ${newCampaign.timeCommitment || '45 minutes'},
            ${newCampaign.minTotalCheckIns}, ${newCampaign.minCuisineVisits}, ${newCampaign.mustBeNewToVenue},
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

  async getUserApplications(dinerFlynetId: string): Promise<Array<Application & { campaign?: Campaign }>> {
    checkDatabaseConfig();
    if (!dinerFlynetId) return [];

    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT a.*, c.title as "campTitle", c.dish_focus as "campDishFocus", c.reward_fly as "campRewardFly",
                 c.timing as "campTiming", c.location as "campLocation", r.name as "restaurantName"
          FROM applications a
          JOIN campaigns c ON a.campaign_id = c.id
          LEFT JOIN restaurants r ON c.restaurant_id = r.id
          WHERE a.diner_flynet_id = ${dinerFlynetId}
          ORDER BY a.created_at DESC
        `;
        return rows.map((r: any) => ({
          id: r.id,
          campaignId: r.campaign_id,
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

    const apps = inMemoryApplications.filter(a => a.dinerFlynetId === dinerFlynetId);
    const campaigns = await this.getCampaigns();
    return apps.map(app => ({
      ...app,
      campaign: campaigns.find(c => c.id === app.campaignId),
    }));
  },

  async getApplication(campaignId: string, dinerFlynetId: string): Promise<Application | null> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT * FROM applications
          WHERE campaign_id = ${campaignId} AND diner_flynet_id = ${dinerFlynetId}
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          const r = rows[0];
          return {
            id: r.id,
            campaignId: r.campaign_id,
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
        a => a.campaignId === campaignId && a.dinerFlynetId === dinerFlynetId
      ) || null
    );
  },

  async createApplication(appData: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application> {
    checkDatabaseConfig();
    const existing = await this.getApplication(appData.campaignId, appData.dinerFlynetId);
    if (existing) return existing;

    const newId = `app_${Date.now()}`;
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
          INSERT INTO applications (id, campaign_id, diner_flynet_id, diner_name, diner_avatar, qualification_proof, status)
          VALUES (${newApp.id}, ${newApp.campaignId}, ${newApp.dinerFlynetId}, ${newApp.dinerName || null},
                  ${newApp.dinerAvatar || null}, ${JSON.stringify(newApp.qualificationProof || null)}, ${newApp.status})
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
          INSERT INTO feedback_submissions (id, application_id, campaign_id, diner_flynet_id, overall_score, ratings, answers, dish_feedback, suggestions)
          VALUES (${newId}, ${feedback.applicationId}, ${feedback.campaignId}, ${feedback.dinerFlynetId}, ${feedback.overallScore},
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

  async createRewardReceipt(receipt: Omit<RewardReceipt, 'id'>): Promise<RewardReceipt> {
    checkDatabaseConfig();
    const sql = getDbClient();
    if (sql) {
      try {
        const newId = `rcpt_${Date.now()}`;
        await sql`
          INSERT INTO reward_receipts (id, application_id, campaign_id, diner_flynet_id, amount_fly, amount_fly_wei, tx_hash, idempotency_key, status, error)
          VALUES (${newId}, ${receipt.applicationId}, ${receipt.campaignId}, ${receipt.dinerFlynetId}, ${receipt.amountFly}, ${receipt.amountFlyWei},
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

  async getRestaurants(): Promise<Restaurant[]> {
    return SEED_RESTAURANTS;
  },

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
