export interface User {
  id: string;
  displayName: string;
  email?: string | null;
  flynetUserId?: string | null;
  restaurantAuthUserId?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RestaurantRole = 'OWNER' | 'MANAGER';

export interface RestaurantMembership {
  id: string;
  userId: string;
  restaurantId: string;
  role: RestaurantRole;
  createdAt: string;
}

export interface Restaurant {
  id: string;
  flynetId?: string | null;
  name: string;
  cuisine: string[];
  neighborhood?: string | null;
  priceTier?: number | null;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'rating' | 'scale' | 'yes_no' | 'choice' | 'text';

export interface FeedbackQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  dishFocus: string;
  researchGoal?: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantCuisine?: string[];
  location?: string;
  timing?: string;
  timeCommitment?: string;
  targetCuisines: string[];
  minTotalCheckIns: number;
  minDistinctVenues?: number;
  minCuisineVisits: number;
  mustBeNewToVenue: boolean;
  rewardFly: string;
  rewardFlyWei?: string | null;
  maxSlots: number;
  filledSlots: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  feedbackQuestions: FeedbackQuestion[];
  isDemo?: boolean;
  creatorKey?: string;
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | 'APPLIED'
  | 'QUALIFIED'
  | 'JOINED'
  | 'CONFIRMED'
  | 'ATTENDANCE_PENDING'
  | 'ATTENDANCE_VERIFIED'
  | 'SUBMITTED'
  | 'REWARD_PENDING'
  | 'REWARDED'
  | 'REJECTED';

export interface Application {
  id: string;
  campaignId: string;
  userId: string; // Internal BlackPalate User ID
  dinerFlynetId?: string | null; // Optional external Flynet identity
  dinerName?: string | null;
  dinerAvatar?: string | null;
  qualificationProof?: {
    totalCheckIns: number;
    cuisineVisits: number;
    distinctVenues?: number;
    isNewToVenue: boolean;
    qualifiedRuleSummary: string[];
  } | null;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmission {
  id: string;
  applicationId: string;
  campaignId: string;
  userId: string;
  dinerFlynetId?: string | null;
  overallScore: number;
  ratings: {
    flavor: number;
    presentation: number;
    value: number;
    portion: number;
  };
  answers: Record<string, any>;
  dishFeedback: string;
  suggestions?: string | null;
  submittedAt: string;
}

export interface RewardReceipt {
  id: string;
  applicationId: string;
  campaignId: string;
  userId: string;
  dinerFlynetId?: string | null;
  amountFly: string;
  amountFlyWei: string;
  txHash?: string | null;
  idempotencyKey: string;
  status: 'PENDING' | 'ISSUED' | 'FAILED';
  issuedAt?: string | null;
  error?: string | null;
}

export interface SynthesisReport {
  id: string;
  campaignId: string;
  executiveSummary: string;
  flavorAnalysis: string;
  cohortTrends: Array<{
    cohort: string;
    sentiment: string;
    takeaways: string;
  }>;
  recommendations: string[];
  rawSubmissionCount: number;
  generatedAt: string;
}
