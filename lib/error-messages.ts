export interface UserSafeError {
  title: string;
  message: string;
  actionText?: string;
  actionType: 'RETRY' | 'SIGN_IN_RESTAURANT' | 'CONNECT_FLYNET' | 'CREATE_WORKSPACE' | 'EDIT_DRAFT' | 'DISMISS' | 'NONE';
  isPreserved: boolean;
}

/**
 * Maps raw backend errors, exception codes, HTTP statuses, and network failures
 * into calm, clear, actionable, and human-friendly user language.
 *
 * Rules:
 * 1. Never expose raw error strings (e.g. DATABASE_UNAVAILABLE, 500, ECONNRESET, SQL errors).
 * 2. Explain what happened, whether the user's action went through, and what to do next.
 * 3. Clearly communicate when drafts/inputs are preserved.
 */
export function mapErrorToUserMessage(rawError: any, context?: 'campaign_publish' | 'join_tasting' | 'feedback_submit' | 'workspace_create' | 'auth' | 'fetch_data'): UserSafeError {
  const errorStr = typeof rawError === 'string'
    ? rawError
    : rawError?.message || rawError?.error || rawError?.code || '';

  const normalized = errorStr.toUpperCase();

  // 1. Authentication & Workspace Access
  if (normalized.includes('UNAUTHORIZED') || normalized.includes('AUTH_REQUIRED') || normalized.includes('SIGN_IN_REQUIRED') || rawError?.status === 401) {
    if (context === 'campaign_publish' || context === 'workspace_create') {
      return {
        title: 'Sign In Required',
        message: 'You need to be signed in as a restaurant operator to perform this action. Your draft is still here.',
        actionText: 'Sign In',
        actionType: 'SIGN_IN_RESTAURANT',
        isPreserved: true,
      };
    }
    if (context === 'join_tasting' || context === 'feedback_submit') {
      return {
        title: 'Blackbird Connection Required',
        message: 'Connect your Blackbird account to verify your dining history and join this tasting.',
        actionText: 'Connect Blackbird',
        actionType: 'CONNECT_FLYNET',
        isPreserved: true,
      };
    }
    return {
      title: 'Session Expired',
      message: 'Your session has expired. Please sign in again to continue.',
      actionText: 'Sign In',
      actionType: 'SIGN_IN_RESTAURANT',
      isPreserved: true,
    };
  }

  if (normalized.includes('FORBIDDEN_WORKSPACE') || normalized.includes('NO_MEMBERSHIP') || rawError?.status === 403) {
    if (context === 'campaign_publish') {
      return {
        title: 'Workspace Access Required',
        message: "You don't have access to publish for this restaurant venue. Create or switch to your restaurant workspace. Your draft is preserved.",
        actionText: 'Create Workspace',
        actionType: 'CREATE_WORKSPACE',
        isPreserved: true,
      };
    }
    return {
      title: 'Access Restricted',
      message: "You don't have permission to access this restaurant workspace.",
      actionText: 'Switch Workspace',
      actionType: 'CREATE_WORKSPACE',
      isPreserved: true,
    };
  }

  // 2. Duplicate Actions (Graceful Handling)
  if (normalized.includes('ALREADY_JOINED') || normalized.includes('DUPLICATE_APPLICATION')) {
    return {
      title: 'Already Joined',
      message: "You have already claimed a tasting slot for this mission. Check 'My Tastings' to view your confirmation.",
      actionText: 'View My Tastings',
      actionType: 'DISMISS',
      isPreserved: true,
    };
  }

  if (normalized.includes('ALREADY_SUBMITTED') || normalized.includes('DUPLICATE_FEEDBACK')) {
    return {
      title: 'Feedback Already Submitted',
      message: 'Your feedback for this tasting has already been recorded and your reward status is active.',
      actionText: 'View Tastings',
      actionType: 'DISMISS',
      isPreserved: true,
    };
  }

  if (normalized.includes('REWARD_ALREADY_ISSUED')) {
    return {
      title: 'Reward Already Issued',
      message: 'Your FLY reward for this tasting mission has already been issued to your Blackbird account.',
      actionText: 'Got It',
      actionType: 'DISMISS',
      isPreserved: true,
    };
  }

  // 3. Campaign Full / Capacity Limits
  if (normalized.includes('CAMPAIGN_FULL') || normalized.includes('MAX_SLOTS_REACHED') || normalized.includes('CAPACITY')) {
    return {
      title: 'Tasting Mission Full',
      message: 'All available tasting slots for this dish have been filled by other diners. Check back soon for new sessions.',
      actionText: 'Explore Other Tastings',
      actionType: 'DISMISS',
      isPreserved: false,
    };
  }

  // 4. Attendance & Qualification Requirements
  if (normalized.includes('ATTENDANCE_REQUIRED') || normalized.includes('ATTENDANCE_VERIFIED')) {
    return {
      title: 'Venue Check-in Required',
      message: 'You must check in at the restaurant venue before submitting tasting feedback.',
      actionText: 'Check In Details',
      actionType: 'DISMISS',
      isPreserved: true,
    };
  }

  if (normalized.includes('QUALIFICATION_FAILED') || normalized.includes('NOT_QUALIFIED') || normalized.includes('CRITERIA')) {
    return {
      title: 'Eligibility Requirements Not Met',
      message: 'This specific tasting requires a different dining history or cuisine experience on Blackbird.',
      actionText: 'Explore Other Tastings',
      actionType: 'DISMISS',
      isPreserved: false,
    };
  }

  // 5. External Blackbird / Flynet Availability
  if (normalized.includes('FLYNET') || normalized.includes('BLACKBIRD') || normalized.includes('MAKER') || normalized.includes('APPROVAL')) {
    return {
      title: 'Blackbird Verification Unavailable',
      message: 'Blackbird dining history verification is temporarily unavailable while access activation is in progress. Your place has not been changed.',
      actionText: 'Try Again in a Moment',
      actionType: 'RETRY',
      isPreserved: true,
    };
  }

  // 6. Network, Database & Infrastructure Timeouts
  if (
    normalized.includes('DATABASE') ||
    normalized.includes('POSTGRES') ||
    normalized.includes('ECONNRESET') ||
    normalized.includes('TIMEOUT') ||
    normalized.includes('ETIMEDOUT') ||
    normalized.includes('FETCH FAILED') ||
    rawError?.status === 500 ||
    rawError?.status === 502 ||
    rawError?.status === 503 ||
    rawError?.status === 504
  ) {
    if (context === 'campaign_publish') {
      return {
        title: "Couldn't Publish Tasting",
        message: "We couldn't publish your tasting mission right now due to a network delay. Your draft is completely preserved.",
        actionText: 'Try Again',
        actionType: 'RETRY',
        isPreserved: true,
      };
    }
    if (context === 'feedback_submit') {
      return {
        title: "Couldn't Submit Feedback",
        message: "We couldn't save your feedback right now. Your answers and notes are still here so you won't need to retype them.",
        actionText: 'Try Again',
        actionType: 'RETRY',
        isPreserved: true,
      };
    }
    if (context === 'workspace_create') {
      return {
        title: "Couldn't Create Workspace",
        message: "We couldn't save your restaurant workspace right now. Your details are preserved.",
        actionText: 'Try Again',
        actionType: 'RETRY',
        isPreserved: true,
      };
    }
    return {
      title: "Couldn't Load Information",
      message: 'We had trouble connecting to the service. Please check your connection and try again.',
      actionText: 'Try Again',
      actionType: 'RETRY',
      isPreserved: true,
    };
  }

  // 7. Generic Fallback (Calm & Actionable)
  return {
    title: 'Action Could Not Be Completed',
    message: context === 'campaign_publish' || context === 'feedback_submit'
      ? "We couldn't complete this action right now. Your draft information is preserved."
      : 'Something went wrong while processing your request. Please try again.',
    actionText: 'Try Again',
    actionType: 'RETRY',
    isPreserved: true,
  };
}

/**
 * Returns human-readable descriptive text for financial reward statuses.
 */
export function getRewardStatusDisplay(status?: string): { label: string; description: string; color: string } {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Reward Queued',
        description: 'Your FLY reward is queued and will be issued once network batch confirms.',
        color: '#F59E0B',
      };
    case 'ISSUING':
      return {
        label: 'Sending Reward...',
        description: 'Sending your FLY reward to your Blackbird account...',
        color: '#3B82F6',
      };
    case 'ISSUED':
      return {
        label: 'Reward Issued',
        description: 'FLY reward has been successfully sent to your Blackbird account.',
        color: '#10B981',
      };
    case 'FAILED':
      return {
        label: 'Reward Issuance Paused',
        description: "We couldn't send your reward automatically. Your feedback is safely stored and our team will reconcile it.",
        color: '#EF4444',
      };
    case 'UNKNOWN':
      return {
        label: 'Confirming Reward Status',
        description: "We're confirming your reward status with the network. Please do not re-submit.",
        color: '#F59E0B',
      };
    default:
      return {
        label: 'Pending',
        description: 'Reward processing will begin upon attendance verification.',
        color: '#A8A29E',
      };
  }
}
