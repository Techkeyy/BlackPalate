// In-memory persistent fallback store for development resilience & seed data
let inMemoryRestaurants = [
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

let inMemoryCampaigns = [
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
];

let inMemoryApplications = [];
let inMemoryFeedbacks = [];
let inMemoryReceipts = [];

export const db = {
  async getCampaigns() {
    return inMemoryCampaigns;
  },

  async getCampaignById(id) {
    return inMemoryCampaigns.find(c => c.id === id) || null;
  },

  async createCampaign(campaign) {
    const newId = `camp_${Date.now()}`;
    const newCampaign = {
      ...campaign,
      id: newId,
      filledSlots: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryCampaigns.unshift(newCampaign);
    return newCampaign;
  },

  async getApplications(campaignId) {
    if (campaignId) {
      return inMemoryApplications.filter(a => a.campaignId === campaignId);
    }
    return inMemoryApplications;
  },

  async getUserApplications(dinerFlynetId) {
    const apps = inMemoryApplications.filter(a => a.dinerFlynetId === dinerFlynetId);
    const campaigns = await this.getCampaigns();
    return apps.map(app => ({
      ...app,
      campaign: campaigns.find(c => c.id === app.campaignId),
    }));
  },

  async getApplication(campaignId, dinerFlynetId) {
    return (
      inMemoryApplications.find(
        a => a.campaignId === campaignId && a.dinerFlynetId === dinerFlynetId
      ) || null
    );
  },

  async createApplication(appData) {
    const existing = await this.getApplication(appData.campaignId, appData.dinerFlynetId);
    if (existing) return existing;

    const newApp = {
      ...appData,
      id: `app_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    inMemoryApplications.push(newApp);

    const camp = inMemoryCampaigns.find(c => c.id === appData.campaignId);
    if (camp) {
      camp.filledSlots += 1;
    }

    return newApp;
  },

  async updateApplicationStatus(id, status) {
    const app = inMemoryApplications.find(a => a.id === id);
    if (app) {
      app.status = status;
      app.updatedAt = new Date().toISOString();
      return app;
    }
    return null;
  },

  async createFeedback(feedback) {
    const existing = inMemoryFeedbacks.find(f => f.applicationId === feedback.applicationId);
    if (existing) return existing;

    const newFb = {
      ...feedback,
      id: `fb_${Date.now()}`,
      submittedAt: new Date().toISOString(),
    };

    inMemoryFeedbacks.push(newFb);
    await this.updateApplicationStatus(feedback.applicationId, 'SUBMITTED');
    return newFb;
  },

  async createRewardReceipt(receipt) {
    const newReceipt = {
      ...receipt,
      id: `rcpt_${Date.now()}`,
    };
    inMemoryReceipts.push(newReceipt);
    return newReceipt;
  },
};

