import type { Campaign } from '@/lib/db/types';

function hasMismatchedJoinCopy(text: string, restaurantName: string): boolean {
  const match = text.match(/\bjoin\s+(.+?)\s+for\b/i);
  if (!match) return false;
  return match[1].trim().toLowerCase() !== restaurantName.trim().toLowerCase();
}

function derivedCampaignNarrative(campaign: Pick<Campaign, 'restaurantName' | 'dishFocus' | 'targetCuisines' | 'restaurantCuisine'>): string {
  const restaurant = campaign.restaurantName || 'This restaurant';
  const cuisines = (campaign.targetCuisines?.length ? campaign.targetCuisines : campaign.restaurantCuisine || [])
    .filter(Boolean)
    .join(' / ');
  const audience = cuisines ? `verified ${cuisines} diners` : 'verified diners';
  return `${restaurant} is testing ${campaign.dishFocus} and collecting structured feedback from ${audience}.`;
}

/**
 * Prevent stale template prose from showing a different restaurant than the
 * authoritative workspace attached to the campaign. Normal campaign copy is
 * preserved; only a clearly mismatched "Join ... for" lead is replaced with a
 * narrative derived from the campaign's actual fields.
 */
export function normalizeCampaignNarrative<T extends Pick<Campaign, 'restaurantName' | 'dishFocus' | 'targetCuisines' | 'restaurantCuisine' | 'description' | 'researchGoal'>>(campaign: T): Pick<T, 'description' | 'researchGoal'> {
  const text = `${campaign.description || ''} ${campaign.researchGoal || ''}`;
  if (!campaign.restaurantName || !hasMismatchedJoinCopy(text, campaign.restaurantName)) {
    return {
      description: campaign.description,
      researchGoal: campaign.researchGoal,
    };
  }

  const derived = derivedCampaignNarrative(campaign);
  return { description: derived, researchGoal: derived };
}
