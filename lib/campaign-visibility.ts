export interface CampaignVisibilityFields {
  isDemo?: boolean | null;
  status?: string | null;
}

/**
 * Only real, published/active campaigns belong in the public marketplace.
 * Demo records remain available to explicitly labeled demo surfaces.
 */
export function isPublicMarketplaceCampaign(campaign: CampaignVisibilityFields): boolean {
  return campaign.isDemo !== true && (campaign.status === 'ACTIVE' || campaign.status === 'PUBLISHED');
}

export function filterPublicMarketplaceCampaigns<T extends CampaignVisibilityFields>(campaigns: T[]): T[] {
  return campaigns.filter(isPublicMarketplaceCampaign);
}
