export function isPublicMarketplaceCampaign(campaign) {
  return campaign.isDemo !== true && (campaign.status === 'ACTIVE' || campaign.status === 'PUBLISHED');
}

export function filterPublicMarketplaceCampaigns(campaigns) {
  return campaigns.filter(isPublicMarketplaceCampaign);
}
