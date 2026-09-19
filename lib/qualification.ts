export interface FlynetCheckIn {
  id: string;
  object: string;
  location: {
    id: string;
    object: string;
    name: string;
    restaurant: {
      id: string;
      object: string;
      name: string;
    };
    neighborhood?: {
      id: string;
      object: string;
      name: string;
    };
  };
  blackbird_pay_enabled?: boolean;
  created_at: string;
  ended_at?: string | null;
}

export interface FlynetRestaurantMetadata {
  id: string;
  name: string;
  cuisine?: string[];
  price?: number;
  tags?: string[];
  cohort?: string;
}

export type QualificationRuleType =
  | 'MIN_TOTAL_CHECKINS'
  | 'MIN_CUISINE_VISITS'
  | 'SPECIFIC_RESTAURANT_VISITS'
  | 'NEW_TO_RESTAURANT'
  | 'MIN_DISTINCT_VENUES';

export interface QualificationRule {
  type: QualificationRuleType;
  threshold?: number;
  targetCuisine?: string;
  cuisine?: string;
  targetRestaurantIds?: string[];
  restaurantId?: string;
  description: string;
}

export interface QualificationResult {
  qualified: boolean;
  score: number;
  totalCheckIns: number;
  distinctVenues: number;
  ruleEvaluations: {
    rule: QualificationRule;
    passed: boolean;
    actualValue: number | string | boolean;
    details: string;
  }[];
  explanation: string;
}

/**
 * Pure, deterministic evaluation of diner qualification against Flynet check-ins
 * and restaurant metadata. No LLM hallucinations or arbitrary scores.
 */
export function evaluateDinerQualification(
  checkIns: FlynetCheckIn[],
  rules: QualificationRule[],
  restaurantMap: Map<string, FlynetRestaurantMetadata> = new Map()
): QualificationResult {
  const totalCheckIns = checkIns.length;
  
  // Set of distinct restaurant IDs
  const visitedRestaurantIds = new Set<string>();
  const cuisineVisitCounts = new Map<string, number>();

  for (const ci of checkIns) {
    const rId = ci.location?.restaurant?.id;
    if (rId) {
      visitedRestaurantIds.add(rId);
      const meta = restaurantMap.get(rId);
      if (meta?.cuisine) {
        for (const c of meta.cuisine) {
          const normalized = c.trim().toLowerCase();
          cuisineVisitCounts.set(normalized, (cuisineVisitCounts.get(normalized) || 0) + 1);
        }
      }
    }
  }

  const distinctVenues = visitedRestaurantIds.size;
  const ruleEvaluations: QualificationResult['ruleEvaluations'] = [];
  let allPassed = true;

  for (const rule of rules) {
    let passed = false;
    let actualValue: number | string | boolean = 0;
    let details = '';

    switch (rule.type) {
      case 'MIN_TOTAL_CHECKINS': {
        const threshold = rule.threshold ?? 1;
        actualValue = totalCheckIns;
        passed = totalCheckIns >= threshold;
        details = `Verified check-ins: ${totalCheckIns}/${threshold}`;
        break;
      }

      case 'MIN_DISTINCT_VENUES': {
        const threshold = rule.threshold ?? 1;
        actualValue = distinctVenues;
        passed = distinctVenues >= threshold;
        details = `Distinct restaurants visited: ${distinctVenues}/${threshold}`;
        break;
      }

      case 'MIN_CUISINE_VISITS': {
        const target = ((rule.targetCuisine || rule.cuisine) ?? '').trim().toLowerCase();
        const threshold = rule.threshold ?? 1;
        const actualCount = cuisineVisitCounts.get(target) || 0;
        actualValue = actualCount;
        passed = actualCount >= threshold;
        details = `Verified ${(rule.targetCuisine || rule.cuisine) || 'target'} cuisine visits: ${actualCount}/${threshold}`;
        break;
      }

      case 'SPECIFIC_RESTAURANT_VISITS': {
        const targetIds = rule.targetRestaurantIds ?? (rule.restaurantId ? [rule.restaurantId] : []);
        let count = 0;
        for (const tid of targetIds) {
          if (visitedRestaurantIds.has(tid)) count++;
        }
        actualValue = count;
        const threshold = rule.threshold ?? 1;
        passed = count >= threshold;
        details = `Visited target restaurants: ${count}/${threshold}`;
        break;
      }

      case 'NEW_TO_RESTAURANT': {
        const targetIds = rule.targetRestaurantIds ?? (rule.restaurantId ? [rule.restaurantId] : []);
        const hasVisited = targetIds.some(tid => visitedRestaurantIds.has(tid));
        actualValue = !hasVisited;
        passed = !hasVisited;
        details = hasVisited ? 'Already visited target restaurant' : 'First-time visitor to target restaurant';
        break;
      }
    }

    if (!passed) {
      allPassed = false;
    }

    ruleEvaluations.push({
      rule,
      passed,
      actualValue,
      details,
    });
  }

  const passedCount = ruleEvaluations.filter(r => r.passed).length;
  const explanation = allPassed
    ? `Diner fully qualified by verified dining behavior (${passedCount}/${rules.length} requirements met).`
    : `Diner does not meet all campaign requirements (${passedCount}/${rules.length} requirements met).`;

  return {
    qualified: allPassed,
    score: rules.length > 0 ? Math.round((passedCount / rules.length) * 100) : 100,
    totalCheckIns,
    distinctVenues,
    ruleEvaluations,
    explanation,
  };
}

export const evaluateQualification = evaluateDinerQualification;


