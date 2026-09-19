import type { Campaign } from '@/lib/db/types';
import {
  evaluateDinerQualification,
  type FlynetCheckIn,
  type FlynetRestaurantMetadata,
  type QualificationResult,
  type QualificationRule,
} from '@/lib/qualification';

export function buildCampaignQualificationRules(campaign: Campaign): QualificationRule[] {
  const rules: QualificationRule[] = [];

  if (campaign.minTotalCheckIns > 0) {
    rules.push({
      type: 'MIN_TOTAL_CHECKINS',
      threshold: campaign.minTotalCheckIns,
      description: `At least ${campaign.minTotalCheckIns} verified Blackbird visit${campaign.minTotalCheckIns === 1 ? '' : 's'}`,
    });
  }

  if (campaign.minDistinctVenues && campaign.minDistinctVenues > 0) {
    rules.push({
      type: 'MIN_DISTINCT_VENUES',
      threshold: campaign.minDistinctVenues,
      description: `At least ${campaign.minDistinctVenues} distinct verified restaurant visit${campaign.minDistinctVenues === 1 ? '' : 's'}`,
    });
  }

  if (campaign.minCuisineVisits > 0 && campaign.targetCuisines.length > 0) {
    const cuisine = campaign.targetCuisines[0];
    rules.push({
      type: 'MIN_CUISINE_VISITS',
      cuisine,
      threshold: campaign.minCuisineVisits,
      description: `${campaign.minCuisineVisits} verified ${cuisine} visit${campaign.minCuisineVisits === 1 ? '' : 's'} required`,
    });
  }

  if (campaign.mustBeNewToVenue) {
    rules.push({
      type: 'NEW_TO_RESTAURANT',
      restaurantId: campaign.restaurantId,
      description: `No prior verified visits to ${campaign.restaurantName || 'this restaurant'}`,
    });
  }

  return rules;
}

function restaurantMetadataFromCheckIns(checkIns: FlynetCheckIn[]): Map<string, FlynetRestaurantMetadata> {
  const restaurantMap = new Map<string, FlynetRestaurantMetadata>();
  for (const checkIn of checkIns) {
    const restaurant = checkIn.location?.restaurant;
    if (!restaurant?.id) continue;
    const cuisine = Array.isArray((restaurant as any).cuisine)
      ? (restaurant as any).cuisine.filter((value: unknown): value is string => typeof value === 'string')
      : undefined;
    restaurantMap.set(restaurant.id, {
      id: restaurant.id,
      name: restaurant.name,
      cuisine,
    });
  }
  return restaurantMap;
}

export function evaluateCampaignQualification(
  campaign: Campaign,
  checkIns: any[]
): QualificationResult {
  const rules = buildCampaignQualificationRules(campaign);
  return evaluateDinerQualification(
    checkIns as FlynetCheckIn[],
    rules,
    restaurantMetadataFromCheckIns(checkIns as FlynetCheckIn[])
  );
}

export function safeQualificationSummary(result: QualificationResult) {
  return {
    qualified: result.qualified,
    totalCheckIns: result.totalCheckIns,
    distinctVenues: result.distinctVenues,
    explanation: result.explanation,
    ruleResults: result.ruleEvaluations.map(({ rule, passed, actualValue, details }) => ({
      description: rule.description,
      passed,
      actualValue,
      details,
    })),
  };
}

export function qualificationReasons(campaign: Campaign, result: QualificationResult): string[] {
  return result.ruleEvaluations
    .filter((evaluation) => !evaluation.passed)
    .map((evaluation) => {
      switch (evaluation.rule.type) {
        case 'MIN_TOTAL_CHECKINS':
          return `This tasting requires at least ${evaluation.rule.threshold || 0} verified Blackbird visit${evaluation.rule.threshold === 1 ? '' : 's'}.`;
        case 'MIN_CUISINE_VISITS':
          return `${evaluation.rule.threshold || 0} verified ${evaluation.rule.cuisine || evaluation.rule.targetCuisine || 'matching cuisine'} visit${evaluation.rule.threshold === 1 ? '' : 's'} required.`;
        case 'MIN_DISTINCT_VENUES':
          return `${evaluation.rule.threshold || 0} distinct verified restaurant visit${evaluation.rule.threshold === 1 ? '' : 's'} required.`;
        case 'NEW_TO_RESTAURANT':
          return `You have a prior verified visit to ${campaign.restaurantName || 'this restaurant'}.`;
        default:
          return evaluation.details;
      }
    });
}
