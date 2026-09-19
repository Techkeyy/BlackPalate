// Explicit In-Memory Test Fixture Repository for Automated Unit Tests

const TEST_CAMPAIGNS = [
  {
    id: 'test_camp_01',
    title: 'Dry-Aged Guanciale Carbonara Benchmark',
    description: 'Testing Umbrian guanciale cut with farm-fresh organic yolk emulsion.',
    dishFocus: 'Signature Umbrian Carbonara with Pecorino Romano DOP',
    researchGoal: 'Determine yolk emulsion vs Pecorino balance.',
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
      { id: 'q1', prompt: 'Rate flavor balance:', type: 'scale' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryCampaigns = [...TEST_CAMPAIGNS];
let inMemoryApplications = [];
let inMemoryFeedbacks = [];
let inMemoryReceipts = [];

export const testDb = {
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

  async getApplicationById(id) {
    return inMemoryApplications.find(a => a.id === id) || null;
  },

  async getApplication(campaignId, dinerFlynetId) {
    return (
      inMemoryApplications.find(
        a => a.campaignId === campaignId && a.dinerFlynetId === dinerFlynetId
      ) || null
    );
  },

  async getUserApplications(dinerFlynetId) {
    const apps = inMemoryApplications.filter(a => a.dinerFlynetId === dinerFlynetId);
    const campaigns = await this.getCampaigns();
    return apps.map(app => ({
      ...app,
      campaign: campaigns.find(c => c.id === app.campaignId),
    }));
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

export const db = testDb;

