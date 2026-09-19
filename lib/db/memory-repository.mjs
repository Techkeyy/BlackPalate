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
    const existing = inMemoryReceipts.find(r => r.idempotencyKey === receipt.idempotencyKey);
    if (existing) return existing;

    const newReceipt = {
      ...receipt,
      id: `rcpt_${Date.now()}`,
    };
    inMemoryReceipts.push(newReceipt);
    return newReceipt;
  },

  // Users
  async getUserById(id) {
    return inMemoryUsers.find(u => u.id === id) || null;
  },

  async getUserByFlynetId(flynetUserId) {
    return inMemoryUsers.find(u => u.flynetUserId === flynetUserId) || null;
  },

  async getUserByRestaurantAuthId(restaurantAuthUserId) {
    return inMemoryUsers.find(u => u.restaurantAuthUserId === restaurantAuthUserId) || null;
  },

  async createUser(user) {
    const newUser = {
      ...user,
      id: user.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryUsers.push(newUser);
    return newUser;
  },

  // Restaurants
  async getRestaurants() {
    return inMemoryRestaurants;
  },

  async getRestaurantById(id) {
    return inMemoryRestaurants.find(r => r.id === id) || null;
  },

  async createRestaurant(rest) {
    const newRest = {
      ...rest,
      id: rest.id || `rest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      cuisine: rest.cuisine || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryRestaurants.push(newRest);
    return newRest;
  },

  // Memberships
  async getMembership(userId, restaurantId) {
    return inMemoryMemberships.find(m => m.userId === userId && m.restaurantId === restaurantId) || null;
  },

  async getMembershipsByUserId(userId) {
    const userMems = inMemoryMemberships.filter(m => m.userId === userId);
    return userMems.map(m => ({
      ...m,
      restaurant: inMemoryRestaurants.find(r => r.id === m.restaurantId) || null,
    }));
  },

  async createMembership(mem) {
    const newMem = {
      ...mem,
      id: mem.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    inMemoryMemberships.push(newMem);
    return newMem;
  },
};

let inMemoryUsers = [];
let inMemoryRestaurants = [];
let inMemoryMemberships = [];

export const db = testDb;

