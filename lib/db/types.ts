export interface Restaurant {
  id: string;
  flynetId?: string | null;
  name: string;
  cuisine: string[];
  neighborhood?: string | null;
  priceTier?: number | null;
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
  timing?: string; // e.g. "Tuesday · 7:00 PM" or "Flexible this week"
  timeCommitment?: string; // e.g. "45 minutes"
  targetCuisines: string[];
  minTotalCheckIns: number;
  minDistinctVenues?: number;
  minCuisineVisits: number;
  mustBeNewToVenue: boolean;
  rewardFly: string; // whole FLY string e.g. "500" or "25"
  rewardFlyWei?: string | null; // 18 decimals e.g. "25000000000000000000"
  maxSlots: number;
  filledSlots: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  feedbackQuestions: FeedbackQuestion[];
  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | 'QUALIFIED'
  | 'JOINED'
  | 'ATTENDANCE_PENDING'
  | 'ATTENDANCE_VERIFIED'
  | 'SUBMITTED'
  | 'REWARD_PENDING'
  | 'REWARDED'
  | 'REJECTED';

export interface Application {
  id: string;
  campaignId: string;
  dinerFlynetId: string;
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
  dinerFlynetId: string;
  overallScore: number; // 1 to 5
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
  dinerFlynetId: string;
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
