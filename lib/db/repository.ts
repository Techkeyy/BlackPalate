import { neon } from '@neondatabase/serverless';
import {
  Restaurant,
  Campaign,
  Application,
  FeedbackSubmission,
  RewardReceipt,
  SynthesisReport,
} from './types';

// In-memory persistent fallback store for development resilience
let inMemoryRestaurants: Restaurant[] = [
  {
    id: 'rest_01',
    flynetId: 'fly_rest_cacio_nyc',
    name: 'Via Carota / Roman Osteria',
    cuisine: ['Italian', 'Pasta', 'Roman'],
    neighborhood: 'West Village, NYC',
    priceTier: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_02',
    flynetId: 'fly_rest_sando_nyc',
    name: 'Kappo Wagyu Lab',
    cuisine: ['Japanese', 'Wagyu', 'Omakase'],
    neighborhood: 'Lower East Side, NYC',
    priceTier: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rest_03',
    flynetId: 'fly_rest_crudo_nyc',
    name: 'Lure & Tide Raw Bar',
    cuisine: ['Seafood', 'Mediterranean', 'Raw Bar'],
    neighborhood: 'SoHo, NYC',
    priceTier: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryCampaigns: Campaign[] = [
  {
    id: 'camp_01',
    title: 'Dry-Aged Guanciale Carbonara Benchmark',
    description:
      'We are piloting a 45-day cured Umbrian guanciale cut with farm-fresh organic yolk emulsion. Seeking pasta enthusiasts with verified Italian dining visits.',
    dishFocus: 'Signature Umbrian Carbonara with Pecorino Romano DOP',
    restaurantId: 'rest_01',
    restaurantName: 'Via Carota / Roman Osteria',
    restaurantCuisine: ['Italian', 'Pasta', 'Roman'],
    targetCuisines: ['Italian', 'Pasta'],
    minTotalCheckIns: 2,
    minCuisineVisits: 1,
    mustBeNewToVenue: false,
    rewardFly: '25',
    rewardFlyWei: '25000000000000000000',
    maxSlots: 8,
    filledSlots: 3,
    status: 'ACTIVE',
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'How balanced was the Pecorino sharpness versus the yolk richness?',
        type: 'rating',
      },
      {
        id: 'q2',
        prompt: 'Was the pasta al dente structure preserved under the sauce weight?',
        type: 'rating',
      },
      {
        id: 'q3',
        prompt: 'Detailed feedback on guanciale crispness and fat rendering:',
        type: 'text',
      },
    ],
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'camp_02',
    title: 'A5 Miyazaki Katsu Sando & Smoked Ponzu Mayo',
    description:
      'Testing an unreleased brioche crust formulation with 60-second flash-fried A5 Wagyu striploin. Diners must have verified Japanese dining experience.',
    dishFocus: 'A5 Miyazaki Katsu Sando',
    restaurantId: 'rest_02',
    restaurantName: 'Kappo Wagyu Lab',
    restaurantCuisine: ['Japanese', 'Wagyu', 'Omakase'],
    targetCuisines: ['Japanese', 'Asian'],
    minTotalCheckIns: 3,
    minCuisineVisits: 2,
    mustBeNewToVenue: false,
    rewardFly: '50',
    rewardFlyWei: '50000000000000000000',
    maxSlots: 5,
    filledSlots: 1,
    status: 'ACTIVE',
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate the contrast between milk bread crunch and meat tenderness:',
        type: 'rating',
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
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'camp_03',
    title: 'Hokkaido Scallop Crudo with Finger Lime & Yuzu Kosho',
    description:
      'Recruiting seafood and raw bar diners for first-look tasting of our summer crudo flight.',
    dishFocus: 'Hokkaido Scallop Crudo',
    restaurantId: 'rest_03',
    restaurantName: 'Lure & Tide Raw Bar',
    restaurantCuisine: ['Seafood', 'Mediterranean', 'Raw Bar'],
    targetCuisines: ['Seafood', 'Mediterranean', 'Japanese'],
    minTotalCheckIns: 1,
    minCuisineVisits: 0,
    mustBeNewToVenue: true,
    rewardFly: '15',
    rewardFlyWei: '15000000000000000000',
    maxSlots: 12,
    filledSlots: 4,
    status: 'ACTIVE',
    feedbackQuestions: [
      {
        id: 'q1',
        prompt: 'Rate scallop sweetness and knife cut texture:',
        type: 'rating',
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

let inMemoryApplications: Application[] = [
  {
    id: 'app_sample_01',
    campaignId: 'camp_01',
    dinerFlynetId: 'usr_blackbird_sample_1',
    dinerName: 'Marco P.',
    qualificationProof: {
      totalCheckIns: 4,
      cuisineVisits: 2,
      isNewToVenue: false,
      qualifiedRuleSummary: ['Total check-ins: 4 >= 2', 'Italian visits: 2 >= 1'],
    },
    status: 'SUBMITTED',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryFeedbacks: FeedbackSubmission[] = [
  {
    id: 'fb_sample_01',
    applicationId: 'app_sample_01',
    campaignId: 'camp_01',
    dinerFlynetId: 'usr_blackbird_sample_1',
    overallScore: 5,
    ratings: {
      flavor: 5,
      presentation: 5,
      value: 4,
      portion: 4,
    },
    answers: {
      q1: 5,
      q2: 5,
      q3: 'The fat rendering was crispy on the edges with unctuous center. Exactly what Roman purists look for.',
    },
    dishFeedback: 'Exceptional pepper warmth and silky emulsion with zero egg curdling.',
    suggestions: 'Consider offering a cracked Kampot black pepper alternative.',
    submittedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
];

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

export const db = {
  async getCampaigns(): Promise<Campaign[]> {
    const sql = getDbClient();
    if (sql) {
      try {
        const rows = await sql`
          SELECT c.*, r.name as "restaurantName", r.cuisine as "restaurantCuisine"
          FROM campaigns c
          JOIN restaurants r ON c.restaurant_id = r.id
          ORDER BY c.created_at DESC
        `;
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            dishFocus: r.dish_focus,
            restaurantId: r.restaurant_id,
            restaurantName: r.restaurantName,
            restaurantCuisine: r.restaurantCuisine,
            targetCuisines: r.target_cuisines || [],
            minTotalCheckIns: r.min_total_check_ins,
            minCuisineVisits: r.min_cuisine_visits,
            mustBeNewToVenue: r.must_be_new_to_venue,
            rewardFly: r.reward_fly,
            rewardFlyWei: r.reward_fly_wei,
            maxSlots: r.max_slots,
            filledSlots: r.filled_slots,
            status: r.status,
            feedbackQuestions: r.feedback_questions || [],
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          }));
        }
      } catch (err) {
        console.warn('[DB] Fallback to in-memory store:', err);
      }
    }
    return inMemoryCampaigns;
  },

  async getCampaignById(id: string): Promise<Campaign | null> {
    const campaigns = await this.getCampaigns();
    return campaigns.find(c => c.id === id) || null;
  },

  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'filledSlots'>): Promise<Campaign> {
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
            id, title, description, dish_focus, restaurant_id, target_cuisines,
            min_total_check_ins, min_cuisine_visits, must_be_new_to_venue,
            reward_fly, reward_fly_wei, max_slots, filled_slots, status, feedback_questions
          ) VALUES (
            ${newCampaign.id}, ${newCampaign.title}, ${newCampaign.description},
            ${newCampaign.dishFocus}, ${newCampaign.restaurantId}, ${newCampaign.targetCuisines},
            ${newCampaign.minTotalCheckIns}, ${newCampaign.minCuisineVisits}, ${newCampaign.mustBeNewToVenue},
            ${newCampaign.rewardFly}, ${newCampaign.rewardFlyWei || null}, ${newCampaign.maxSlots},
            ${newCampaign.filledSlots}, ${newCampaign.status}, ${JSON.stringify(newCampaign.feedbackQuestions)}
          )
        `;
      } catch (err) {
        console.warn('[DB] Postgres insert error, stored in-memory:', err);
      }
    }

    inMemoryCampaigns.unshift(newCampaign);
    return newCampaign;
  },

  async getApplications(campaignId?: string): Promise<Application[]> {
    if (campaignId) {
      return inMemoryApplications.filter(a => a.campaignId === campaignId);
    }
    return inMemoryApplications;
  },

  async getApplication(campaignId: string, dinerFlynetId: string): Promise<Application | null> {
    return (
      inMemoryApplications.find(
        a => a.campaignId === campaignId && a.dinerFlynetId === dinerFlynetId
      ) || null
    );
  },

  async createApplication(appData: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Promise<Application> {
    const existing = await this.getApplication(appData.campaignId, appData.dinerFlynetId);
    if (existing) return existing;

    const newApp: Application = {
      ...appData,
      id: `app_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryApplications.push(newApp);

    // Update filled slots
    const camp = inMemoryCampaigns.find(c => c.id === appData.campaignId);
    if (camp) {
      camp.filledSlots += 1;
    }

    return newApp;
  },

  async updateApplicationStatus(id: string, status: Application['status']): Promise<Application | null> {
    const app = inMemoryApplications.find(a => a.id === id);
    if (app) {
      app.status = status;
      app.updatedAt = new Date().toISOString();
      return app;
    }
    return null;
  },

  async createFeedback(feedback: Omit<FeedbackSubmission, 'id' | 'submittedAt'>): Promise<FeedbackSubmission> {
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
    return inMemoryFeedbacks.filter(f => f.campaignId === campaignId);
  },

  async createRewardReceipt(receipt: Omit<RewardReceipt, 'id'>): Promise<RewardReceipt> {
    const newReceipt: RewardReceipt = {
      ...receipt,
      id: `rcpt_${Date.now()}`,
    };
    inMemoryReceipts.push(newReceipt);
    await this.updateApplicationStatus(receipt.applicationId, 'REWARDED');
    return newReceipt;
  },

  async getRewardReceipts(campaignId?: string): Promise<RewardReceipt[]> {
    if (campaignId) {
      return inMemoryReceipts.filter(r => r.campaignId === campaignId);
    }
    return inMemoryReceipts;
  },

  async getRestaurants(): Promise<Restaurant[]> {
    return inMemoryRestaurants;
  },

  async saveSynthesis(report: Omit<SynthesisReport, 'id' | 'generatedAt'>): Promise<SynthesisReport> {
    const newReport: SynthesisReport = {
      ...report,
      id: `synth_${Date.now()}`,
      generatedAt: new Date().toISOString(),
    };
    inMemorySynthesis.push(newReport);
    return newReport;
  },

  async getSynthesis(campaignId: string): Promise<SynthesisReport | null> {
    return inMemorySynthesis.find(s => s.campaignId === campaignId) || null;
  },
};

