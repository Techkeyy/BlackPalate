import type { Application, ApplicationStatus, Campaign } from './db/types';

export const CONFIRMABLE_APPLICATION_STATUSES: ApplicationStatus[] = ['APPLIED', 'QUALIFIED'];

export function isConfirmableApplicationStatus(status: ApplicationStatus): boolean {
  return CONFIRMABLE_APPLICATION_STATUSES.includes(status);
}

function safeMemberLabel(dinerFlynetId?: string | null): string {
  if (!dinerFlynetId) return 'Blackbird Member';
  const suffix = dinerFlynetId.replace(/[^a-zA-Z0-9]/g, '').slice(-4);
  return suffix ? `Blackbird Member #${suffix}` : 'Blackbird Member';
}

export function toSafeRestaurantApplication(
  application: Application,
  _campaign?: Campaign | null,
) {
  const proof = application.qualificationProof || {
    totalCheckIns: 0,
    cuisineVisits: 0,
    distinctVenues: 0,
    isNewToVenue: false,
    qualifiedRuleSummary: [],
  };
  const totalCheckIns = Math.max(0, Number(proof.totalCheckIns) || 0);
  const cuisineVisits = Math.max(0, Number(proof.cuisineVisits) || 0);
  const distinctVenues = Math.max(0, Number(proof.distinctVenues) || 0);
  const isNewToVenue = Boolean(proof.isNewToVenue);

  return {
    id: application.id,
    campaignId: application.campaignId,
    status: application.status,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    diner: {
      displayName: safeMemberLabel(application.dinerFlynetId),
      avatar: application.dinerAvatar || null,
    },
    qualification: {
      qualified: application.status !== 'REJECTED',
      ruleSummary: Array.isArray(proof.qualifiedRuleSummary) ? proof.qualifiedRuleSummary : [],
    },
    verifiedHistory: {
      totalCheckIns,
      cuisineVisits,
      distinctVenues,
      isNewToVenue,
      summary: isNewToVenue
        ? 'No prior verified visits to this venue'
        : `${totalCheckIns} verified dining check-in${totalCheckIns === 1 ? '' : 's'}`,
    },
  };
}
