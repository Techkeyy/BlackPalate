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

// In-memory persistent fallback store for development resilience & seed data
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
  {
    id: 'rest_04',
    flynetId: 'fly_rest_nori_nyc',
    name: 'Nori Ramen House',
    cuisine: ['Japanese', 'Ramen'],
    neighborhood: 'East Village, NYC',
    priceTier: 2,
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
    id: 'camp_02',
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
    id: 'camp_03',
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
    id: 'camp_04',
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
  {
    id: 'app_sample_02',
    campaignId: 'camp_02',
    dinerFlynetId: 'usr_blackbird_sample_1',
    dinerName: 'Marco P.',
    qualificationProof: {
      totalCheckIns: 4,
      cuisineVisits: 1,
      isNewToVenue: false,
      qualifiedRuleSummary: ['Total check-ins: 4 >= 2', 'Ramen visits: 1 >= 1'],
    },
    status: 'JOINED',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
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
      q2: 'Yes',
      q3: 'The fat rendering was crispy on the edges with unctuous center. Exactly what Roman purists look for.',
      q4: 'Definitely Yes',
    },
    dishFeedback: 'Exceptional pepper warmth and silky emulsion with zero egg curdling.',
    suggestions: 'Consider offering a cracked Kampot black pepper alternative.',
    submittedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
];

let inMemoryReceipts: RewardReceipt[] = [
  {
    id: 'rcpt_sample_01',
    applicationId: 'app_sample_01',
    campaignId: 'camp_01',
    dinerFlynetId: 'usr_blackbird_sample_1',
    amountFly: '25',
    amountFlyWei: '25000000000000000000',
    idempotencyKey: 'bp_reward_camp_01_app_sample_01_init',
    status: 'PENDING',
    error: 'Awaiting Flynet API key & Blackbird admin approval',
  },
];

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
          SELECT c.*, r.name as "restaurantName", r.cuisine as "restaurantCuisine", r.neighborhood as "restaurantNeighborhood"
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
            researchGoal: r.research_goal,
            restaurantId: r.restaurant_id,
            restaurantName: r.restaurantName,
            restaurantCuisine: r.restaurantCuisine,
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

  async getUserApplications(dinerFlynetId: string): Promise<Array<Application & { campaign?: Campaign }>> {
    const apps = inMemoryApplications.filter(a => a.dinerFlynetId === dinerFlynetId);
    const campaigns = await this.getCampaigns();
    return apps.map(app => ({
      ...app,
      campaign: campaigns.find(c => c.id === app.campaignId),
    }));
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

    // Increment filled slots safely
    const camp = inMemoryCampaigns.find(c => c.id === appData.campaignId);
    if (camp) {
      camp.filledSlots += 1;
    }

    return newApp;
  },

  async updateApplicationStatus(id: string, status: ApplicationStatus): Promise<Application | null> {
    const app = inMemoryApplications.find(a => a.id === id);
    if (app) {
      app.status = status;
      app.updatedAt = new Date().toISOString();
      return app;
    }
    return null;
  },

  async createFeedback(feedback: Omit<FeedbackSubmission, 'id' | 'submittedAt'>): Promise<FeedbackSubmission> {
    // Duplicate check
    const existing = inMemoryFeedbacks.find(f => f.applicationId === feedback.applicationId);
    if (existing) {
      return existing;
    }

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
