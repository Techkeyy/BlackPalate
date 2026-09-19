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

export interface FeedbackQuestion {
  id: string;
  prompt: string;
  type: 'rating' | 'text' | 'choice';
  options?: string[];
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  dishFocus: string;
  restaurantId: string;
  restaurantName?: string;
  restaurantCuisine?: string[];
  targetCuisines: string[];
  minTotalCheckIns: number;
  minCuisineVisits: number;
  mustBeNewToVenue: boolean;
  rewardFly: string; // whole FLY string e.g. "5"
  rewardFlyWei?: string | null; // 18 decimals e.g. "5000000000000000000"
  maxSlots: number;
  filledSlots: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  feedbackQuestions: FeedbackQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  campaignId: string;
  dinerFlynetId: string;
  dinerName?: string | null;
  dinerAvatar?: string | null;
  qualificationProof?: {
    totalCheckIns: number;
    cuisineVisits: number;
    isNewToVenue: boolean;
    qualifiedRuleSummary: string[];
  } | null;
  status: 'QUALIFIED' | 'ATTENDED' | 'SUBMITTED' | 'REWARDED' | 'REJECTED';
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

