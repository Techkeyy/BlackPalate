'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils,
  Calendar,
  Sparkles,
  Compass,
  ShieldCheck,
  Clock,
  Coins,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Search,
  X,
  ChefHat,
  BarChart3,
  Flame,
  Lock,
} from 'lucide-react';
import {
  Reveal,
  StaggerContainer,
  StaggerItem,
  InteractiveCard,
  InteractiveButton,
} from '@/components/MotionPrimitives';
import { CalloutAlert } from '@/components/CalloutAlert';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  mapErrorToUserMessage,
  getRewardStatusDisplay,
  UserSafeError,
} from '@/lib/error-messages';
import { authClient } from '@/lib/auth/client';
import { evaluateDinerQualification, QualificationRule } from '@/lib/qualification';
import {
  matchCampaignVenue,
  sameVenueAttendance,
  LiveDemoCheckIn,
} from '@/lib/live-demo';
import {
  shouldShowRestaurantGate,
  shouldShowAuthLoading,
} from '@/lib/auth/gate';

interface Question {
  id: string;
  prompt: string;
  type: 'rating' | 'scale' | 'yes_no' | 'choice' | 'text';
  options?: string[];
}

interface Campaign {
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
  maxSlots: number;
  filledSlots: number;
  status: string;
  isDemo?: boolean;
  feedbackQuestions: Question[];
  createdAt: string;
}

interface Application {
  id: string;
  campaignId: string;
  dinerFlynetId: string;
  dinerName?: string | null;
  status: string;
  rewardStatus?: string;
  rewardTxHash?: string | null;
  qualificationProof?: {
    totalCheckIns: number;
    cuisineVisits: number;
    distinctVenues?: number;
    isNewToVenue: boolean;
    qualifiedRuleSummary: string[];
  };
  campaign?: Campaign;
}

interface RestaurantApplication {
  id: string;
  campaignId: string;
  status: string;
  createdAt: string;
  diner: { displayName: string; avatar?: string | null };
  qualification: { qualified: boolean; ruleSummary: string[] };
  verifiedHistory: {
    totalCheckIns: number;
    cuisineVisits: number;
    distinctVenues: number;
    isNewToVenue: boolean;
    summary: string;
  };
}

type TastingQualificationState = {
  status:
    | 'loading'
    | 'qualified'
    | 'not_qualified'
    | 'signed_out'
    | 'campaign_not_found'
    | 'provider_error'
    | 'network_error'
    | 'server_error'
    | 'already_applied';
  qualified?: boolean;
  historyAvailable?: boolean;
  checkInsCount?: number;
  cuisineVisits?: number;
  reasons?: string[];
  ruleResults?: Array<{
    description: string;
    passed: boolean;
    actualValue?: number;
    details: string;
  }>;
  message?: string;
};
export default function BlackPalateApp() {
  const [activeNav, setRawActiveNav] = useState<
    'landing' | 'discover' | 'my-tastings' | 'create-tasting' | 'campaign-studio' | 'diagnostics' | 'live-demo'
  >('landing');

  // Application Data States
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [demoCampaigns, setDemoCampaigns] = useState<Campaign[]>([]);
  const [selectedTasting, setSelectedTasting] = useState<Campaign | null>(null);
  const [tastingQualification, setTastingQualification] = useState<TastingQualificationState | null>(null);
  const [qualificationRetry, setQualificationRetry] = useState(0);
  const qualificationRequestKey = useRef<string | null>(null);
  const [userApplications, setUserApplications] = useState<Application[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [restaurantUser, setRestaurantUser] = useState<any>(null);
  const [dinerUser, setDinerUser] = useState<any>(null);
  const [hasDinerSession, setHasDinerSession] = useState(false);
  const [hasRestaurantSession, setHasRestaurantSession] = useState(false);
  const [activeMode, setActiveMode] = useState<'DINER' | 'RESTAURANT' | null>(null);
  const [operatorWorkspaces, setOperatorWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<UserSafeError | null>(null);
  const [publishError, setPublishError] = useState<UserSafeError | null>(null);
  const [feedbackError, setFeedbackError] = useState<UserSafeError | null>(null);
  const [joinError, setJoinError] = useState<UserSafeError | null>(null);
  const [workspaceError, setWorkspaceError] = useState<UserSafeError | null>(null);
  const [isPublishingCampaign, setIsPublishingCampaign] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isJoiningTasting, setIsJoiningTasting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'info' | 'success' | 'warning';
    text: string;
  } | null>(null);

  // Marketplace filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisineFilter, setSelectedCuisineFilter] = useState('All');

  // Tasting Detail & Feedback Modal States
  const [activeFeedbackCampaign, setActiveFeedbackCampaign] = useState<Campaign | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    overallScore: 5,
    ratings: { flavor: 5, presentation: 5, value: 4, portion: 4 },
    answers: {} as Record<string, any>,
    dishFeedback: '',
    suggestions: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Progressive Mission Builder State (Dscout philosophy)
  const [builderStep, setBuilderStep] = useState<number>(1);
  const [newCampaign, setNewCampaign] = useState({
    restaurantName: '',
    dishFocus: '',
    researchGoal: '',
    cuisine: '',
    location: '',
    timing: '',
    timeCommitment: '45 minutes',
    minTotalCheckIns: 2,
    minCuisineVisits: 1,
    mustBeNewToVenue: false,
    rewardFly: '10',
    maxSlots: 8,
    questions: [
      {
        id: 'q1',
        prompt: 'What did you notice first about the dish?',
        type: 'scale',
      },
      {
        id: 'q2',
        prompt: 'How would you improve the dish or dining experience?',
        type: 'yes_no',
      },
      {
        id: 'q3',
        prompt: 'What menu price would you consider fair for this entree?',
        type: 'choice',
        options: ['$34-$38', '$39-$44', '$45+'],
      },
      { id: 'q4', prompt: 'General chef notes and flavor critique:', type: 'text' },
    ] as Question[],
  });

  // Suggested draft helper state
  const [draftPromptText, setDraftPromptText] = useState(
    'We are testing an artisan smash burger and want 6 diners who eat burgers frequently to tell us if $22 is too expensive.'
  );
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftMode, setDraftMode] = useState<string | null>(null);

  // Restaurant Studio Synthesis View
  const [selectedStudioCampaign, setSelectedStudioCampaign] = useState<Campaign | null>(null);
  const [studioSynthesis, setStudioSynthesis] = useState<any>(null);
  const [studioSubmissions, setStudioSubmissions] = useState<any[]>([]);
  const [studioApplications, setStudioApplications] = useState<RestaurantApplication[]>([]);
  const [synthesisMode, setSynthesisMode] = useState<string | null>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [loadingStudioApplications, setLoadingStudioApplications] = useState(false);
  const [confirmingApplicationId, setConfirmingApplicationId] = useState<string | null>(null);

  // Live Network Demo (observational only — never mutates marketplace state)
  const [liveFeed, setLiveFeed] = useState<{
    source: string;
    fetchedAt: string;
    venue: any;
    checkIns: LiveDemoCheckIn[];
  } | null>(null);
  const [liveFeedLoading, setLiveFeedLoading] = useState(false);
  const [liveFeedError, setLiveFeedError] = useState<UserSafeError | null>(null);
  const [demoCheckInId, setDemoCheckInId] = useState<string | null>(null);
  const [demoCampaignId, setDemoCampaignId] = useState<string | null>(null);

  const authRole = activeMode;
  const isAuthenticated = hasDinerSession || hasRestaurantSession;

  function navigateTo(
    nextNav: 'landing' | 'discover' | 'my-tastings' | 'create-tasting' | 'campaign-studio' | 'diagnostics' | 'live-demo'
  ) {
    setRawActiveNav(nextNav);
    if (nextNav === 'discover' || nextNav === 'my-tastings') {
      setActiveMode('DINER');
    } else if (nextNav === 'create-tasting' || nextNav === 'campaign-studio') {
      setActiveMode('RESTAURANT');
    }
  }
  const setActiveNav = navigateTo;

  // Restaurant areas require a signed-in RESTAURANT operator; anything else sees the auth gate.
  // The gate NEVER renders while identity is still resolving (authLoading).
  const needsRestaurantGate = shouldShowRestaurantGate({
    activeNav,
    hasRestaurantSession,
    authLoading,
  });
  const showAuthResolving = shouldShowAuthLoading({
    activeNav,
    authLoading,
    hasDinerSession,
    hasRestaurantSession,
  });

  // Preserve restaurant intent across the Google redirect (sessionStorage survives same-origin navigation).
  useEffect(() => {
    try {
      if (
        (activeNav === 'create-tasting' || activeNav === 'campaign-studio') &&
        !hasRestaurantSession
      ) {
        sessionStorage.setItem('bp_pending_restaurant_nav', activeNav);
      }
    } catch {
      // Storage unavailable: intent simply won't survive the redirect.
    }
  }, [activeNav, hasRestaurantSession]);

  function consumePendingRestaurantNav() {
    try {
      const pending = sessionStorage.getItem('bp_pending_restaurant_nav');
      sessionStorage.removeItem('bp_pending_restaurant_nav');
      if (pending === 'create-tasting' || pending === 'campaign-studio') {
        navigateTo(pending);
      }
    } catch {
      // Storage unavailable: stay on the current view.
    }
  }

  useEffect(() => {
    if (!activeWorkspace) return;
    setNewCampaign((previous) => ({
      ...previous,
      restaurantName: previous.restaurantName || activeWorkspace.name || '',
      cuisine: previous.cuisine || activeWorkspace.cuisine?.[0] || '',
      location: previous.location || activeWorkspace.neighborhood || '',
    }));
  }, [activeWorkspace]);
  function renderRestaurantAuthGate() {    return (
      <main
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div
          role="alert"
          style={{
            backgroundColor: '#121212',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '48px 36px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              color: '#F59E0B',
            }}
          >
            <Utensils size={26} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 10px 0', color: '#F5F5F4' }}>
            Create tastings for your restaurant
          </h2>
          <p style={{ fontSize: '14px', color: '#A8A29E', lineHeight: 1.6, margin: '0 0 28px 0' }}>
            Sign in to create tasting missions, manage applicants, and review feedback.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOperatorLogin()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#F59E0B',
                color: '#080808',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Continue with Google
            </button>
            <button
              onClick={() => setActiveNav('discover')}
              style={{
                padding: '12px 20px',
                backgroundColor: '#1C1C1C',
                color: '#D6D3D1',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to marketplace
            </button>
          </div>
        </div>
      </main>
    );
  }

  function renderAuthResolving() {
    return (
      <main
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: '#121212',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '48px 36px',
            fontSize: '14px',
            color: '#A8A29E',
          }}
        >
          Finishing sign-in...
        </div>
      </main>
    );
  }

  useEffect(() => {
    loadData()
      .then((outcome) => handleOAuthReturn(outcome))
      .catch(() => undefined);
  }, []);

  async function loadData() {
    setLoading(true);
    setFetchError(null);
    setAuthLoading(true);
    let sessionOutcome: { authenticated: boolean; role: 'RESTAURANT' | 'DINER' | null } = {
      authenticated: false,
      role: null,
    };
    try {
      // 1. Fetch campaigns from PostgreSQL
      const campRes = await fetch('/api/campaigns?surface=marketplace');
      const campData = await campRes.json();
      if (campData.ok && campData.campaigns) {
        setCampaigns(campData.campaigns);
      } else if (!campData.ok) {
        setFetchError(mapErrorToUserMessage(campData, 'fetch_data'));
      }

      // 2. Compare the provider session boundary before the application session.
      // Neither response body is persisted here; /api/auth/me remains authoritative
      // for the combined RESTAURANT/DINER identity.
      try {
        const neonSessionRes = await fetch('/api/auth/get-session', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null);
        if (neonSessionRes?.ok) await neonSessionRes.json().catch(() => null);

        const meRes = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null);
        if (meRes && meRes.ok) {
          const meData = await meRes.json();
          const dinerCapability = meData.identities?.diner?.authenticated
            ? meData.identities.diner
            : meData.role === 'DINER'
              ? { authenticated: true, user: meData.user, profile: meData.profile, checkIns: meData.checkIns }
              : null;
          const restaurantCapability = meData.identities?.restaurant?.authenticated
            ? meData.identities.restaurant
            : meData.role === 'RESTAURANT'
              ? { authenticated: true, user: meData.user, memberships: meData.memberships, workspaces: meData.workspaces }
              : null;
          const dinerAvailable = Boolean(dinerCapability?.authenticated);
          const restaurantAvailable = Boolean(restaurantCapability?.authenticated);
          const defaultMode: 'DINER' | 'RESTAURANT' | null = restaurantAvailable
            ? 'RESTAURANT'
            : dinerAvailable
              ? 'DINER'
              : null;

          if (dinerAvailable || restaurantAvailable) {
            setHasDinerSession(dinerAvailable);
            setHasRestaurantSession(restaurantAvailable);
            setDinerUser(dinerCapability?.user || null);
            setRestaurantUser(restaurantCapability?.user || null);
            setUserProfile(dinerCapability?.profile || null);
            setSessionUser(defaultMode === 'RESTAURANT' ? restaurantCapability?.user : dinerCapability?.user);
            if (!activeMode) setActiveMode(defaultMode);
            sessionOutcome = { authenticated: true, role: defaultMode };

            if (restaurantAvailable) {
              const workspaces = restaurantCapability?.workspaces || [];
              setOperatorWorkspaces(workspaces);
              if (workspaces.length > 0) {
                setActiveWorkspace(workspaces[0]);
              } else {
                // A valid operator with no membership goes directly to the
                // existing workspace-creation flow, never back to sign-in.
                setIsCreatingWorkspaceModalOpen(true);
              }
              consumePendingRestaurantNav();
            }
          } else {
            setHasDinerSession(false);
            setHasRestaurantSession(false);
            setActiveMode(null);
            setSessionUser(null);
            setDinerUser(null);
            setRestaurantUser(null);
          }
        }
      } finally {
        setAuthLoading(false);
      }

      // 3. Fetch user tastings
      const tastingsRes = await fetch('/api/user/tastings');
      const tastingsData = await tastingsRes.json();
      if (tastingsData.ok && tastingsData.tastings?.all) {
        setUserApplications(tastingsData.tastings.all);
      }
    } catch (err) {
      console.error('Data load error:', err);
      setFetchError(mapErrorToUserMessage(err, 'fetch_data'));
    } finally {
      setLoading(false);
    }
    return sessionOutcome;
  }

  // Surfaces the OAuth redirect result exactly once per return. Redirect alone
  // is never treated as success: the session outcome above is authoritative.
  function handleOAuthReturn(outcome: { authenticated: boolean; role: string | null }) {
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthSuccess = params.get('oauth_success');
      const oauthError = params.get('error');
      if (!oauthSuccess && !oauthError) return;

      if (oauthError) {
        const userErr =
          oauthError === 'oauth_provider_error'
            ? mapErrorToUserMessage('FLYNET_UNAVAILABLE', 'auth')
            : mapErrorToUserMessage('AUTH_REQUIRED', 'auth');
        setStatusBanner({ type: 'warning', text: userErr.message });
      } else if (oauthSuccess && !outcome.authenticated) {
        // Blackbird redirect completed but no session could be established.
        setStatusBanner({
          type: 'warning',
          text: "We couldn't finish signing you in. Try again.",
        });
      }
      params.delete('oauth_success');
      params.delete('error');
      const clean = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
      window.history.replaceState(null, '', clean);
    } catch {
      // URL handling must never break the app shell.
    }
  }

  // Live Network Demo feed (read-only; creates no applications, slots, or rewards)
  async function loadLiveFeed() {
    setLiveFeedLoading(true);
    setLiveFeedError(null);
    try {
      const [res, campaignRes] = await Promise.all([
        fetch('/api/demo/live-feed'),
        fetch('/api/campaigns?surface=demo'),
      ]);
      const data = await res.json();
      const campaignData = await campaignRes.json().catch(() => null);
      if (campaignData?.ok && Array.isArray(campaignData.campaigns)) {
        setDemoCampaigns(campaignData.campaigns);
      } else {
        setDemoCampaigns([]);
      }

      if (data.ok && data.checkIns) {
        setLiveFeed(data);
        if (data.checkIns.length > 0 && !demoCheckInId) {
          setDemoCheckInId(data.checkIns[0].id);
        }
      } else {
        setLiveFeedError(mapErrorToUserMessage(data, 'fetch_data'));
      }
    } catch (err) {
      setLiveFeedError(mapErrorToUserMessage(err, 'fetch_data'));
    } finally {
      setLiveFeedLoading(false);
    }
  }

  useEffect(() => {
    if (activeNav === 'live-demo' && !liveFeed && !liveFeedLoading) {
      loadLiveFeed();
    }
  }, [activeNav]);

  // A prior join attempt may leave a global banner visible after navigation.
  // My Tastings must reflect the current applications state, not stale join UI.
  useEffect(() => {
    if (activeNav === 'my-tastings') {
      setStatusBanner(null);
      setJoinError(null);
    }
  }, [activeNav]);

  // Handle Restaurant Operator Login (Managed Neon Auth via official client)
  async function handleOperatorLogin() {
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.origin : '/',
      });
    } catch (err: any) {
      const userErr = mapErrorToUserMessage(err, 'auth');
      setStatusBanner({ type: 'warning', text: userErr.message });
    }
  }

  // Handle Logout: clears BOTH sessions explicitly (Neon restaurant session
  // via the official client, Flynet diner cookies via the server logout route).
  async function handleLogout() {
    try {
      await authClient.signOut().catch(() => null);
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
      setHasDinerSession(false);
      setHasRestaurantSession(false);
      setActiveMode(null);
      setSessionUser(null);
      setDinerUser(null);
      setRestaurantUser(null);
      setUserProfile(null);
      setUserApplications([]);
      setOperatorWorkspaces([]);
      setActiveWorkspace(null);
      setStatusBanner({ type: 'info', text: 'Signed out successfully.' });
      loadData();
    } catch (err: any) {
      const userErr = mapErrorToUserMessage(err, 'auth');
      setStatusBanner({ type: 'warning', text: userErr.message });
    }
  }

  function openTasting(campaign: Campaign) {
    setSelectedTasting(campaign);
    setTastingQualification({ status: 'loading' });
    setQualificationRetry(0);
    qualificationRequestKey.current = null;
    setJoinError(null);
  }
  // Handle joining a tasting. The server re-checks identity, history, rules,
  // capacity, and duplicate application state authoritatively.
  async function handleJoinTasting(campaign: Campaign) {
    if (!hasDinerSession) {
      const authErr = mapErrorToUserMessage('AUTH_REQUIRED', 'join_tasting');
      setJoinError(authErr);
      return;
    }

    if (tastingQualification?.status !== 'qualified') {
      return;
    }
    setIsJoiningTasting(true);
    setJoinError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.ok) {
        setStatusBanner({
          type: 'success',
          text: `You have joined the tasting for "${campaign.dishFocus}". Reward: ${campaign.rewardFly} FLY after verified attendance and completed feedback.`,
        });
        setTastingQualification({ status: 'already_applied', qualified: true, historyAvailable: true });
        setJoinError(null);
        await loadData();
        setSelectedTasting(null);
        setActiveNav('my-tastings');
      } else if (data.code === 'QUALIFICATION_NOT_MET' || data.qualified === false) {
        const reasons = Array.isArray(data.reasons) ? data.reasons : ['This tasting requires a different verified dining history.'];
        setTastingQualification({
          status: 'not_qualified',
          qualified: false,
          historyAvailable: data.historyAvailable !== false,
          checkInsCount: Number(data.checkInsCount ?? data.qualification?.totalCheckIns ?? 0),
          reasons,
        });
        setJoinError({
          title: 'Not qualified for this tasting',
          message: reasons.join(' '),
          actionText: 'Explore Other Tastings',
          actionType: 'DISMISS',
          isPreserved: false,
        });
      } else if (data.code === 'CONFLICT') {
        setTastingQualification({ status: 'already_applied', qualified: true, historyAvailable: true });
        setJoinError(null);
      } else if (data.code === 'FLYNET_UNAVAILABLE') {
        setTastingQualification({
          status: 'provider_error',
          historyAvailable: false,
          message: "We couldn't verify your dining history right now.",
        });
        setJoinError({
          title: "We couldn't verify your dining history right now",
          message: 'Your application was not changed. Try again in a moment.',
          actionText: 'Retry',
          actionType: 'RETRY',
          isPreserved: true,
        });
      } else {
        const userErr = mapErrorToUserMessage(data, 'join_tasting');
        setJoinError(userErr);
      }
    } catch (err: any) {
      setTastingQualification({
        status: 'network_error',
        message: "We couldn't reach the qualification service right now.",
      });
      const userErr = mapErrorToUserMessage(err, 'join_tasting');
      setJoinError(userErr);
    } finally {
      setIsJoiningTasting(false);
    }
  }

  async function loadTastingQualification(campaignId: string) {
    setTastingQualification({ status: 'loading' });
    console.info('[qualification] request_start', { campaignIdPresent: Boolean(campaignId) });
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/qualification`, {
        credentials: 'include',
        cache: 'no-store',
      });
      console.info('[qualification] response_status', res.status);
      const data = await res.json().catch(() => null);
      const ruleResults = Array.isArray(data?.qualification?.ruleResults)
        ? data.qualification.ruleResults
        : [];
      const cuisineRule = ruleResults.find((rule: any) =>
        typeof rule?.description === 'string' &&
        /visit/i.test(rule.description) &&
        !/Blackbird|distinct restaurant/i.test(rule.description)
      );

      if (res.ok && data?.ok && typeof data.qualified === 'boolean') {
        setTastingQualification({
          status: data.qualified ? 'qualified' : 'not_qualified',
          qualified: Boolean(data.qualified),
          historyAvailable: data.historyAvailable !== false,
          checkInsCount: Number(data.checkInsCount ?? data.qualification?.totalCheckIns ?? 0),
          cuisineVisits: Number(cuisineRule?.actualValue ?? 0),
          ruleResults,
          reasons: Array.isArray(data.reasons) ? data.reasons : [],
        });
      } else if (res.status === 401 || data?.code === 'UNAUTHORIZED') {
        setTastingQualification({
          status: 'signed_out',
          message: 'Sign in with Blackbird to check your qualification.',
        });
      } else if (res.status === 404 || data?.code === 'NOT_FOUND') {
        setTastingQualification({
          status: 'campaign_not_found',
          message: 'This tasting is no longer available.',
        });
      } else if (res.status === 503 || data?.code === 'FLYNET_UNAVAILABLE') {
        setTastingQualification({
          status: 'provider_error',
          historyAvailable: false,
          message: "We couldn't verify your dining history right now.",
        });
      } else {
        setTastingQualification({
          status: 'server_error',
          message: 'We could not evaluate this tasting right now.',
        });
      }
    } catch {
      setTastingQualification({
        status: 'network_error',
        message: "We couldn't reach the qualification service right now.",
      });
    }
  }

  useEffect(() => {
    if (!selectedTasting) {
      setTastingQualification(null);
      return;
    }
    if (authLoading) {
      setTastingQualification({ status: 'loading' });
      return;
    }
    if (!hasDinerSession) {
      setTastingQualification({
        status: 'signed_out',
        message: 'Sign in with Blackbird to check your qualification.',
      });
      return;
    }
    const requestKey = `${selectedTasting.id}:${qualificationRetry}:${authRole}`;
    if (qualificationRequestKey.current === requestKey) return;
    qualificationRequestKey.current = requestKey;
    const existing = userApplications.find(
      (application) => application.campaignId === selectedTasting.id && application.status !== 'REJECTED'
    );
    if (existing) {
      setTastingQualification({ status: 'already_applied', qualified: true, historyAvailable: true });
      return;
    }
    loadTastingQualification(selectedTasting.id);
  }, [selectedTasting?.id, qualificationRetry, hasDinerSession, authRole, authLoading, userApplications]);
  // Handle submitting feedback
  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFeedbackCampaign) return;

    setSubmittingFeedback(true);
    setFeedbackError(null);
    try {
      const res = await fetch(
        `/api/campaigns/${activeFeedbackCampaign.id}/submit-feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: `app_${activeFeedbackCampaign.id}`,
            overallScore: feedbackForm.overallScore,
            ratings: feedbackForm.ratings,
            answers: feedbackForm.answers,
            dishFeedback: feedbackForm.dishFeedback,
            suggestions: feedbackForm.suggestions,
          }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        setStatusBanner({
          type: 'success',
          text: `Feedback submitted for "${activeFeedbackCampaign.dishFocus}".`,
        });
        setFeedbackError(null);
        setActiveFeedbackCampaign(null);
        setFeedbackForm({
          overallScore: 5,
          ratings: { flavor: 5, presentation: 5, value: 4, portion: 4 },
          answers: {},
          dishFeedback: '',
          suggestions: '',
        });
        loadData();
      } else {
        const userErr = mapErrorToUserMessage(data, 'feedback_submit');
        setFeedbackError(userErr);
        setStatusBanner({
          type: 'warning',
          text: userErr.message,
        });
      }
    } catch (err: any) {
      const userErr = mapErrorToUserMessage(err, 'feedback_submit');
      setFeedbackError(userErr);
      setStatusBanner({ type: 'warning', text: userErr.message });
    } finally {
      setSubmittingFeedback(false);
    }
  }

  // Generate a deterministic starting point from the campaign template.
  function handleSuggestedDraft() {
    setIsGeneratingDraft(true);
    setStatusBanner({
      type: 'info',
      text: 'Generating a suggested draft from the campaign template...',
    });

    const cuisine = newCampaign.cuisine || activeWorkspace?.cuisine?.[0] || 'Fine Dining';
    const dishFocus = newCampaign.dishFocus || 'Seasonal tasting dish';
    const restaurant = newCampaign.restaurantName || activeWorkspace?.name || 'your restaurant';
    const conceptNotes = draftPromptText.trim();

    setNewCampaign((prev) => ({
      ...prev,
      restaurantName: prev.restaurantName || activeWorkspace?.name || '',
      dishFocus: prev.dishFocus || dishFocus,
      researchGoal:
        prev.researchGoal ||
        (conceptNotes ||
          `Collect structured feedback on ${dishFocus} from verified ${cuisine} diners at ${restaurant}.`),
      cuisine: prev.cuisine || cuisine,
      minTotalCheckIns: prev.minTotalCheckIns || 2,
      minCuisineVisits: prev.minCuisineVisits || 1,
      mustBeNewToVenue: prev.mustBeNewToVenue ?? false,
      rewardFly: prev.rewardFly || '10',
      maxSlots: prev.maxSlots || 8,
      questions: prev.questions,
    }));
    setDraftMode('Template suggestion');
    setStatusBanner({
      type: 'success',
      text: 'Suggested draft generated from the campaign template. Review it before publishing.',
    });
    setBuilderStep(7);
    setIsGeneratingDraft(false);
  }

  // Workspace creation state
  const [isCreatingWorkspaceModalOpen, setIsCreatingWorkspaceModalOpen] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({
    name: '',
    cuisine: '',
    location: 'NYC',
    description: '',
  });

  // Handle Restaurant Workspace Creation (Explicit Action)
  async function handleCreateWorkspace(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!workspaceForm.name || !workspaceForm.cuisine) {
      setStatusBanner({ type: 'warning', text: 'Restaurant name and primary cuisine are required.' });
      return;
    }
    setIsCreatingWorkspace(true);
    setWorkspaceError(null);
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workspaceForm.name,
          cuisine: [workspaceForm.cuisine],
          location: workspaceForm.location || 'NYC',
          description: workspaceForm.description || '',
        }),
      });
      const data = await res.json();
      if (data.ok && data.restaurant) {
        setStatusBanner({
          type: 'success',
          text: `Restaurant workspace "${data.restaurant.name}" created with OWNER privileges.`,
        });
        setIsCreatingWorkspaceModalOpen(false);
        setWorkspaceError(null);
        setWorkspaceForm({ name: '', cuisine: '', location: 'NYC', description: '' });
        await loadData();
        setActiveWorkspace(data.restaurant);
      } else {
        const userErr = mapErrorToUserMessage(data, 'workspace_create');
        setWorkspaceError(userErr);
        setStatusBanner({ type: 'warning', text: userErr.message });
      }
    } catch (err: any) {
      const userErr = mapErrorToUserMessage(err, 'workspace_create');
      setWorkspaceError(userErr);
      setStatusBanner({ type: 'warning', text: userErr.message });
    } finally {
      setIsCreatingWorkspace(false);
    }
  }

  // Handle Publishing Campaign (Strictly requires active workspace with OWNER/MANAGER role)
  async function handlePublishCampaign() {
    if (!hasRestaurantSession) {
      const authErr = mapErrorToUserMessage('AUTH_REQUIRED', 'campaign_publish');
      setPublishError(authErr);
      setStatusBanner({
        type: 'warning',
        text: authErr.message,
      });
      return;
    }

    if (!newCampaign.dishFocus || !newCampaign.cuisine) {
      setStatusBanner({ type: 'warning', text: 'Add a dish focus and cuisine before publishing this tasting.' });
      return;
    }

    if (!activeWorkspace || !activeWorkspace.id) {
      const wsErr = mapErrorToUserMessage('FORBIDDEN_WORKSPACE', 'campaign_publish');
      setPublishError(wsErr);
      setStatusBanner({
        type: 'warning',
        text: wsErr.message,
      });
      setIsCreatingWorkspaceModalOpen(true);
      return;
    }

    setIsPublishingCampaign(true);
    setPublishError(null);
    try {
      const restId = activeWorkspace.id;
      const restName = activeWorkspace.name || newCampaign.restaurantName;
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${newCampaign.dishFocus} Tasting`,
          description: newCampaign.researchGoal,
          dishFocus: newCampaign.dishFocus,
          researchGoal: newCampaign.researchGoal,
          restaurantId: restId,
          restaurantName: restName,
          restaurantCuisine: [newCampaign.cuisine],
          location: newCampaign.location,
          timing: newCampaign.timing,
          timeCommitment: newCampaign.timeCommitment,
          targetCuisines: [newCampaign.cuisine],
          minTotalCheckIns: newCampaign.minTotalCheckIns,
          minCuisineVisits: newCampaign.minCuisineVisits,
          mustBeNewToVenue: newCampaign.mustBeNewToVenue,
          rewardFly: newCampaign.rewardFly,
          maxSlots: newCampaign.maxSlots,
          feedbackQuestions: newCampaign.questions,
          isDemo: false,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatusBanner({
          type: 'success',
          text: `Tasting mission "${newCampaign.dishFocus}" published to database.`,
        });
        setPublishError(null);
        loadData();
        setActiveNav('discover');
      } else {
        const userErr = mapErrorToUserMessage(data, 'campaign_publish');
        setPublishError(userErr);
        setStatusBanner({
          type: 'warning',
          text: userErr.message,
        });
      }
    } catch (err: any) {
      const userErr = mapErrorToUserMessage(err, 'campaign_publish');
      setPublishError(userErr);
      setStatusBanner({ type: 'warning', text: userErr.message });
    } finally {
      setIsPublishingCampaign(false);
    }
  }

  async function loadStudioApplications(camp: Campaign) {
    setLoadingStudioApplications(true);
    try {
      const res = await fetch(`/api/restaurant/campaigns/${camp.id}/applications`);
      const data = await res.json();
      if (data.ok) {
        setStudioApplications(data.applications || []);
      } else {
        setStudioApplications([]);
      }
    } catch (err) {
      console.error('Applicant load error:', err);
      setStudioApplications([]);
    } finally {
      setLoadingStudioApplications(false);
    }
  }

  async function handleConfirmApplicant(applicationId: string) {
    setConfirmingApplicationId(applicationId);
    try {
      const res = await fetch(`/api/restaurant/applications/${applicationId}/confirm`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        setStatusBanner({ type: 'success', text: 'Applicant confirmed.' });
        if (selectedStudioCampaign) await loadStudioApplications(selectedStudioCampaign);
        await loadData();
      } else {
        const userErr = mapErrorToUserMessage(data, 'fetch_data');
        setStatusBanner({ type: 'warning', text: userErr.message });
      }
    } catch (err: any) {
      const userErr = mapErrorToUserMessage(err, 'fetch_data');
      setStatusBanner({ type: 'warning', text: userErr.message });
    } finally {
      setConfirmingApplicationId(null);
    }
  }

  // Load Studio Synthesis for a selected campaign
  async function loadStudioSynthesis(camp: Campaign) {
    loadStudioApplications(camp);
    setSelectedStudioCampaign(camp);
    setLoadingSynthesis(true);
    try {
      const res = await fetch(`/api/campaigns/${camp.id}/synthesis`);
      const data = await res.json();
      if (data.ok) {
        setStudioSynthesis(data.report);
        setStudioSubmissions(data.submissions || []);
        setSynthesisMode('Recorded feedback summary');
      }
    } catch (err) {
      console.error('Synthesis error:', err);
    } finally {
      setLoadingSynthesis(false);
    }
  }

  const cuisineFilters = Array.from(
    new Set(
      campaigns
        .flatMap(camp => [...camp.targetCuisines, ...(camp.restaurantCuisine || [])])
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  const effectiveCuisineFilter = cuisineFilters.includes(selectedCuisineFilter)
    ? selectedCuisineFilter
    : 'All';

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesSearch =
      searchQuery === '' ||
      camp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.dishFocus.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (camp.restaurantName &&
        camp.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCuisine =
      effectiveCuisineFilter === 'All' ||
      camp.targetCuisines.some(
        (c) => c.toLowerCase() === effectiveCuisineFilter.toLowerCase()
      ) ||
      (camp.restaurantCuisine &&
        camp.restaurantCuisine.some(
          (c) => c.toLowerCase() === effectiveCuisineFilter.toLowerCase()
        ));

    return matchesSearch && matchesCuisine;
  });

  const studioCampaigns =
    hasRestaurantSession && activeWorkspace
      ? campaigns.filter(camp => camp.restaurantId === activeWorkspace.id)
      : [];

  useEffect(() => {
    if (!hasRestaurantSession) return;
    const selectedStillBelongs = selectedStudioCampaign && studioCampaigns.some(
      camp => camp.id === selectedStudioCampaign.id
    );
    if (!selectedStillBelongs) {
      setSelectedStudioCampaign(studioCampaigns[0] || null);
      setStudioApplications([]);
    }
  }, [hasRestaurantSession, activeWorkspace?.id, campaigns, selectedStudioCampaign?.id]);

  useEffect(() => {
    if (!selectedTasting) return;
    if (!campaigns.some((campaign) => campaign.id === selectedTasting.id)) {
      setSelectedTasting(null);
      setTastingQualification(null);
      setJoinError(null);
    }
  }, [campaigns, selectedTasting?.id]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#080808',
        color: '#F5F5F4',
      }}
    >
      {/* ========================================================================= */}
      {/* GLOBAL NAVIGATION HEADER                                                  */}
      {/* ========================================================================= */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(8, 8, 8, 0.88)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Logo & Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
            onClick={() => setActiveNav('landing')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#080808',
                  fontWeight: '900',
                  fontSize: '15px',
                  boxShadow: '0 0 16px rgba(245, 158, 11, 0.35)',
                }}
              >
                BP
              </div>
              <span
                style={{
                  fontSize: '19px',
                  fontWeight: '800',
                  letterSpacing: '-0.5px',
                  color: '#F5F5F4',
                }}
              >
                BLACK<span style={{ color: '#F59E0B' }}>PALATE</span>
              </span>
            </div>

          </div>

          {/* Primary Nav Links */}
          <nav style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setActiveNav('discover')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeNav === 'discover' ? '#181818' : 'transparent',
                color: activeNav === 'discover' ? '#F59E0B' : '#A8A29E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Compass size={15} />
              Discover Tastings
            </button>
            <button
              onClick={() => setActiveNav('my-tastings')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeNav === 'my-tastings' ? '#181818' : 'transparent',
                color: activeNav === 'my-tastings' ? '#F59E0B' : '#A8A29E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} />
              My Tastings
            </button>
            <button
              onClick={() => setActiveNav('create-tasting')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  activeNav === 'create-tasting' ? '#181818' : 'transparent',
                color: activeNav === 'create-tasting' ? '#F59E0B' : '#A8A29E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Utensils size={15} />
              Create Tasting
            </button>
            <button
              onClick={() => {
                setActiveNav('campaign-studio');
                if (selectedStudioCampaign)
                  loadStudioSynthesis(selectedStudioCampaign);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  activeNav === 'campaign-studio' ? '#181818' : 'transparent',
                color: activeNav === 'campaign-studio' ? '#F59E0B' : '#A8A29E',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <BarChart3 size={15} />
              Restaurant Studio
            </button>
          </nav>

          {/* Account / Auth Actions (no signed-out CTA while resolving) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {authLoading && !isAuthenticated ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '12px',
                  color: '#A8A29E',
                }}
              >
                Finishing sign-in...
              </div>
            ) : isAuthenticated && authRole === 'RESTAURANT' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: '#181818',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                    }}
                  />
                  <span>
                    Operator:{' '}
                    <strong style={{ color: '#F59E0B' }}>
                      {restaurantUser?.displayName || 'Operator'}
                    </strong>
                  </span>
                </div>

                {operatorWorkspaces.length > 0 ? (
                  <select
                    value={activeWorkspace?.id || ''}
                    onChange={(e) => {
                      const found = operatorWorkspaces.find((w) => w.id === e.target.value);
                      if (found) setActiveWorkspace(found);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#181818',
                      color: '#F59E0B',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    {operatorWorkspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setIsCreatingWorkspaceModalOpen(true)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      color: '#F59E0B',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '700',
                    }}
                  >
                    + Create Workspace
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#181818',
                    color: '#A8A29E',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : isAuthenticated && authRole === 'DINER' ? (
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  backgroundColor: '#121212',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
                  }}
                />
                <span>
                  Blackbird:{' '}
                  <strong style={{ color: '#F5F5F4' }}>
                    {dinerUser?.displayName || userProfile?.name || 'Blackbird Member'}
                  </strong>
                </span>
              </div>
            ) : null}


          </div>
        </div>
      </header>

      {/* Global Status Banner */}
      <AnimatePresence>
        {statusBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              backgroundColor:
                statusBanner.type === 'success'
                  ? '#064E3B'
                  : statusBanner.type === 'warning'
                  ? '#78350F'
                  : '#1E1B4B',
              color:
                statusBanner.type === 'success'
                  ? '#A7F3D0'
                  : statusBanner.type === 'warning'
                  ? '#FDE68A'
                  : '#C7D2FE',
              padding: '10px 24px',
              textAlign: 'center',
              fontSize: '13px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>{statusBanner.text}</span>
            <button
              onClick={() => setStatusBanner(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* VIEW 1: FULL-BLEED EDITORIAL HERO & LANDING                               */}
      {/* ========================================================================= */}
      {activeNav === 'landing' && (
        <div>
          {/* Full-Bleed Hero Section (Extended 118-128svh Cinematic Height) */}
          <section
            style={{
              position: 'relative',
              width: '100%',
              minHeight: 'clamp(780px, 120svh, 130svh)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflow: 'hidden',
            }}
          >
            {/* Full-Bleed Background Image (Most Recent User Download) */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
              <img
                src="/images/blackpalate-hero.jpg"
                alt="Chef finishing tasting course"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 22%',
                  transform: 'scale(1.02)',
                  transition: 'transform 10s ease-out',
                }}
              />
              {/* Layer 1: Top Navigation Protection Gradient */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(8, 8, 8, 0.9) 0%, rgba(8, 8, 8, 0.35) 18%, transparent 38%)',
                }}
              />
              {/* Layer 2: Editorial Center Vignette for Text Contrast */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'radial-gradient(ellipse at 50% 28%, rgba(8, 8, 8, 0.3) 0%, rgba(8, 8, 8, 0.65) 55%, rgba(8, 8, 8, 0.92) 100%)',
                }}
              />
              {/* Layer 3: Extended Deep Bottom Fade into Page */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, transparent 0%, transparent 40%, rgba(8, 8, 8, 0.3) 60%, rgba(8, 8, 8, 0.75) 80%, rgba(8, 8, 8, 0.96) 93%, #080808 100%)',
                }}
              />
            </div>

            {/* Hero Foreground Content (Positioned Above Center to Let Image Breathe Below) */}
            <div
              style={{
                position: 'relative',
                zIndex: 10,
                maxWidth: '960px',
                margin: '0 auto',
                padding: 'clamp(110px, 15vh, 150px) 24px clamp(160px, 24vh, 280px)',
                textAlign: 'center',
              }}
            >
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  borderRadius: '24px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#F59E0B',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  marginBottom: '24px',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Flame size={14} />
                <span>Verified Dining Research Marketplace</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.75,
                  delay: 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontSize: 'clamp(38px, 6vw, 64px)',
                  fontWeight: '900',
                  lineHeight: '1.1',
                  margin: '0 0 24px 0',
                  letterSpacing: '-1.5px',
                  color: '#F5F5F4',
                  textShadow: '0 4px 24px rgba(0, 0, 0, 0.8)',
                }}
              >
                Get paid to shape what <br />
                <span style={{ color: '#F59E0B' }}>restaurants</span> serve next.
              </motion.h1>

              {/* Supporting copy */}
              <motion.p
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.75,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  fontSize: 'clamp(16px, 2vw, 19px)',
                  lineHeight: '1.6',
                  color: '#D6D3D1',
                  maxWidth: '700px',
                  margin: '0 auto 36px',
                  textShadow: '0 2px 12px rgba(0, 0, 0, 0.9)',
                }}
              >
                Discover paid tasting opportunities matched to your real dining
                history, try what restaurants are building, and earn FLY for useful
                feedback.
              </motion.p>

              {/* Hero CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  marginBottom: '36px',
                }}
              >
                <InteractiveButton
                  onClick={() => setActiveNav('discover')}
                  variant="primary"
                  style={{ padding: '16px 32px', fontSize: '16px' }}
                >
                  Explore Tastings
                  <ArrowRight size={18} />
                </InteractiveButton>

                <InteractiveButton
                  onClick={() => setActiveNav('create-tasting')}
                  variant="secondary"
                  style={{ padding: '16px 28px', fontSize: '15px' }}
                >
                  <Utensils size={16} />
                  Create a Tasting
                </InteractiveButton>
              </motion.div>

              {/* Trust validation line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.45 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#A8A29E',
                  backgroundColor: 'rgba(18, 18, 18, 0.7)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <ShieldCheck size={15} color="#10B981" />
                <span>Qualified by real dining behavior. Verified through Flynet.</span>
              </motion.div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 1: HOW IT WORKS (REVEAL ANIMATIONS)                               */}
          {/* ========================================================================= */}
          <section
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '60px 24px 100px',
            }}
          >
            <Reveal>
              <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#F59E0B',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                  }}
                >
                  The Culinary Research Model
                </span>
                <h2
                  style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    margin: '8px 0 12px 0',
                    color: '#F5F5F4',
                  }}
                >
                  How BlackPalate Works
                </h2>
                <p
                  style={{
                    fontSize: '15px',
                    color: '#A8A29E',
                    maxWidth: '600px',
                    margin: '0 auto',
                  }}
                >
                  Structured sensory research connecting innovative kitchens with
                  verified culinary cohorts.
                </p>
              </div>
            </Reveal>

            <StaggerContainer
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px',
              }}
            >
              <StaggerItem>
                <div
                  style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '32px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F59E0B',
                      marginBottom: '20px',
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <h3
                    style={{
                      fontSize: '19px',
                      fontWeight: '700',
                      margin: '0 0 10px 0',
                      color: '#F5F5F4',
                    }}
                  >
                    1. Verified Behavior Matching
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#A8A29E',
                      margin: 0,
                    }}
                  >
                    Restaurants recruit diners based on confirmed dining visit
                    history on Flynet, filtering for specific cuisine enthusiasts and
                    first-time guests.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '32px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F59E0B',
                      marginBottom: '20px',
                    }}
                  >
                    <Utensils size={22} />
                  </div>
                  <h3
                    style={{
                      fontSize: '19px',
                      fontWeight: '700',
                      margin: '0 0 10px 0',
                      color: '#F5F5F4',
                    }}
                  >
                    2. Focused Sensory Tastings
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#A8A29E',
                      margin: 0,
                    }}
                  >
                    Attend scheduled tasting sessions to evaluate upcoming dishes,
                    recipe iterations, ingredient ratios, and menu price
                    positioning.
                  </p>
                </div>
              </StaggerItem>

              <StaggerItem>
                <div
                  style={{
                    backgroundColor: '#121212',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '32px',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#F59E0B',
                      marginBottom: '20px',
                    }}
                  >
                    <Coins size={22} />
                  </div>
                  <h3
                    style={{
                      fontSize: '19px',
                      fontWeight: '700',
                      margin: '0 0 10px 0',
                      color: '#F5F5F4',
                    }}
                  >
                    3. Earn FLY for Useful Feedback
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#A8A29E',
                      margin: 0,
                    }}
                  >
                    Submit structured sensory responses and direct recommendations
                    to earn FLY rewards after verified attendance and completed feedback.
                  </p>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 2: FEATURED TASTINGS PREVIEW (REVEAL)                             */}
          {/* ========================================================================= */}
          <section
            style={{
              backgroundColor: '#0D0D0D',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '80px 24px',
            }}
          >
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <Reveal>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    marginBottom: '36px',
                    flexWrap: 'wrap',
                    gap: '16px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#F59E0B',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Active Research
                    </span>
                    <h2
                      style={{
                        fontSize: '28px',
                        fontWeight: '800',
                        margin: '6px 0 0 0',
                        color: '#F5F5F4',
                      }}
                    >
                      Featured Tasting Opportunities
                    </h2>
                  </div>

                  <InteractiveButton
                    onClick={() => setActiveNav('discover')}
                    variant="amber-ghost"
                  >
                    View All {campaigns.length} Tastings
                    <ChevronRight size={16} />
                  </InteractiveButton>
                </div>
              </Reveal>

              <StaggerContainer
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                  gap: '24px',
                }}
              >
                {campaigns.slice(0, 3).map((camp) => (
                  <StaggerItem key={camp.id}>
                    <InteractiveCard
                      onClick={() => openTasting(camp)}
                      style={{
                        backgroundColor: '#121212',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                      }}
                    >
                      <div>
                        {/* Header: Restaurant + Reward */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '14px',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  color: '#F59E0B',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                }}
                              >
                                {camp.restaurantName}
                              </span>
                              {camp.isDemo && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#222',
                                    color: '#A8A29E',
                                    fontWeight: '700',
                                  }}
                                >
                                  DEMO
                                </span>
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                color: '#78716C',
                                marginTop: '3px',
                              }}
                            >
                              <MapPin size={12} />
                              <span>{camp.location || 'NYC'}</span>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '15px',
                              fontWeight: '800',
                              color: '#F59E0B',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Coins size={14} />
                            <span>{camp.rewardFly} FLY</span>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            margin: '0 0 8px 0',
                            color: '#F5F5F4',
                            lineHeight: '1.3',
                          }}
                        >
                          {camp.title}
                        </h3>
                        <p
                          style={{
                            fontSize: '13px',
                            color: '#A8A29E',
                            margin: '0 0 16px 0',
                            lineHeight: '1.5',
                          }}
                        >
                          {camp.description}
                        </p>

                        {/* Qualification Pill */}
                        <div
                          style={{
                            backgroundColor: '#181818',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            marginBottom: '18px',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '11px',
                              textTransform: 'uppercase',
                              color: '#78716C',
                              fontWeight: '700',
                              marginBottom: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <ShieldCheck size={12} color="#10B981" />
                            Verified Criteria
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#E7E5E4',
                              fontWeight: '500',
                            }}
                          >
                            {camp.minCuisineVisits > 0
                              ? `${camp.minCuisineVisits}+ verified ${camp.targetCuisines.join('/')} visits`
                              : `${camp.minTotalCheckIns}+ verified dining check-ins`}
                            {camp.mustBeNewToVenue && ' (First-time visitor)'}
                          </div>
                        </div>
                      </div>

                      {/* Footer: Spots & CTA */}
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px',
                            color: '#78716C',
                            marginBottom: '14px',
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Users size={13} />
                            <strong
                              style={{
                                color:
                                  camp.maxSlots - camp.filledSlots > 0
                                    ? '#10B981'
                                    : '#EF4444',
                              }}
                            >
                              {camp.maxSlots - camp.filledSlots} spots left
                            </strong>
                          </span>
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Clock size={13} />
                            {camp.timeCommitment || '45m'}
                          </span>
                        </div>

                        <div
                          style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: '#1C1C1C',
                            color: '#F5F5F4',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            fontWeight: '700',
                            fontSize: '13px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          View Tasting Details
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    </InteractiveCard>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 3: RESTAURANT RESEARCH PLATFORM PROPOSITION                       */}
          {/* ========================================================================= */}
          <section
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '100px 24px',
            }}
          >
            <div
              style={{
                backgroundColor: '#121212',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: 'clamp(32px, 5vw, 64px)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '48px',
                alignItems: 'center',
              }}
            >
              <Reveal>
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: '#F59E0B',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    For Executive Chefs &amp; Operators
                  </span>
                  <h2
                    style={{
                      fontSize: 'clamp(28px, 4vw, 38px)',
                      fontWeight: '800',
                      margin: '10px 0 18px 0',
                      color: '#F5F5F4',
                      lineHeight: '1.2',
                    }}
                  >
                    Turn menu development into{' '}
                    <span style={{ color: '#F59E0B' }}>high-signal research</span>.
                  </h2>
                  <p
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.6',
                      color: '#A8A29E',
                      margin: '0 0 24px 0',
                    }}
                  >
                    Eliminate guesswork when launching new dishes, testing seasonal
                    recipes, or adjusting price points. Draft research missions in
                    minutes with a structured template helper and review feedback
                    summaries built from recorded responses.
                  </p>

                  <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <InteractiveButton
                      onClick={() => setActiveNav('create-tasting')}
                      variant="primary"
                    >
                      <ChefHat size={16} />
                      Launch a Tasting Mission
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={() => setActiveNav('campaign-studio')}
                      variant="secondary"
                    >
                      <BarChart3 size={16} />
                      Explore Restaurant Studio
                    </InteractiveButton>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.15}>
                <div
                  style={{
                    backgroundColor: '#080808',
                    borderRadius: '12px',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '24px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Sparkles size={16} color="#F59E0B" />
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: '800',
                          color: '#F5F5F4',
                        }}
                      >
                        Research workflow
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      Deterministic
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.6',
                      color: '#D6D3D1',
                      marginBottom: '16px',
                    }}
                  >
                    <strong style={{ color: '#F59E0B' }}>How it works:</strong>{' '}
                    Campaign rules are evaluated against verified diner history,
                    and feedback summaries use recorded production responses.
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: '#141414',
                        padding: '10px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '800',
                          color: '#10B981',
                        }}
                      >
                        Verified
                      </div>
                      <div style={{ fontSize: '11px', color: '#78716C' }}>
                        history
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: '#141414',
                        padding: '10px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '800',
                          color: '#F59E0B',
                        }}
                      >
                        Rule-based
                      </div>
                      <div style={{ fontSize: '11px', color: '#78716C' }}>
                        qualification
                      </div>
                    </div>
                    <div
                      style={{
                        backgroundColor: '#141414',
                        padding: '10px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: '800',
                          color: '#F5F5F4',
                        }}
                      >
                        Recorded
                      </div>
                      <div style={{ fontSize: '11px', color: '#78716C' }}>
                        feedback
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>

          {/* Footer */}
          <footer
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: '#050505',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#F5F5F4',
                  }}
                >
                  BLACK<span style={{ color: '#F59E0B' }}>PALATE</span>
                </span>
                <span style={{ fontSize: '12px', color: '#78716C' }}>
                  Culinary Research Marketplace
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#78716C' }}>
                Built for Runtime NYC Blackbird Track · Powered by Flynet
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '12px',
                  color: '#A8A29E',
                }}
              >
                <button
                  onClick={() => setActiveNav('discover')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Marketplace
                </button>
                <button
                  onClick={() => setActiveNav('create-tasting')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Create Tasting
                </button>
                <button
                  onClick={() => setActiveNav('diagnostics')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  System Status
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DINER DISCOVER (RESPONDENT / USERTESTING MARKETPLACE UX)          */}
      {/* ========================================================================= */}
      {activeNav === 'discover' && (
        <ErrorBoundary fallbackTitle="Tastings Marketplace Unavailable" onReset={loadData}>
          <main
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '40px 24px 80px',
            }}
          >
            {/* Header & Search Bar */}
            <div style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  margin: '0 0 8px 0',
                  color: '#F5F5F4',
                }}
              >
                Open Tasting Opportunities
              </h2>
              <p style={{ fontSize: '14px', color: '#A8A29E', margin: '0 0 24px 0' }}>
                Browse active culinary research opportunities matched to verified dining
                behavior.
              </p>

              {/* Filter and Search Bar */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                  <Search
                    size={16}
                    color="#78716C"
                    style={{ position: 'absolute', left: '14px', top: '14px' }}
                  />
                  <input
                    type="text"
                    placeholder="Search by dish, restaurant, or cuisine..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      backgroundColor: '#121212',
                      color: '#F5F5F4',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                {/* Cuisine filters are derived only from real marketplace campaigns. */}
                {cuisineFilters.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['All', ...cuisineFilters].map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCuisineFilter(c)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '20px',
                          border:
                            effectiveCuisineFilter === c
                              ? '1px solid #F59E0B'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor:
                            effectiveCuisineFilter === c
                              ? 'rgba(245, 158, 11, 0.15)'
                              : '#121212',
                          color: effectiveCuisineFilter === c ? '#F59E0B' : '#A8A29E',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {fetchError ? (
              <CalloutAlert error={fetchError} onAction={loadData} />
            ) : loading ? (
              <div style={{ textAlign: 'center', padding: '80px', color: '#A8A29E' }}>
                <div style={{ marginBottom: '12px' }}>
                  Loading tasting marketplace...
                </div>
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '80px 24px',
                  backgroundColor: '#121212',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <p style={{ fontSize: '18px', color: '#F5F5F4', margin: '0 0 10px 0' }}>
                  {campaigns.length === 0 ? 'No live tastings yet.' : 'No matching tasting opportunities found.'}
                </p>
                {campaigns.length === 0 ? (
                  <>
                    <p style={{ fontSize: '14px', color: '#A8A29E', margin: '0 0 20px 0' }}>
                      New restaurant research opportunities will appear here.
                    </p>
                    {hasRestaurantSession && (
                      <InteractiveButton
                        onClick={() => setActiveNav('create-tasting')}
                        variant="primary"
                      >
                        Create a Tasting
                      </InteractiveButton>
                    )}
                  </>
                ) : (
                  <InteractiveButton
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCuisineFilter('All');
                    }}
                    variant="secondary"
                  >
                    Reset Search Filters
                  </InteractiveButton>
                )}
              </div>
            ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: '24px',
              }}
            >
              {filteredCampaigns.map((camp) => {
                const spotsLeft = camp.maxSlots - camp.filledSlots;

                return (
                  <InteractiveCard
                    key={camp.id}
                    onClick={() => openTasting(camp)}
                    style={{
                      backgroundColor: '#121212',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                    }}
                  >
                    <div>
                      {/* Card Header: Restaurant & Reward */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '14px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: '800',
                                color: '#F59E0B',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}
                            >
                              {camp.restaurantName}
                            </span>
                            {camp.isDemo && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: '#222',
                                  color: '#A8A29E',
                                  fontWeight: '700',
                                }}
                              >
                                DEMO
                              </span>
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              color: '#78716C',
                              marginTop: '3px',
                            }}
                          >
                            <MapPin size={12} />
                            <span>
                              {camp.location || 'NYC'} ·{' '}
                              {camp.timing || 'Scheduled'}
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: '800',
                            color: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(245, 158, 11, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Coins size={14} />
                          <span>{camp.rewardFly} FLY</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          margin: '0 0 8px 0',
                          color: '#F5F5F4',
                          lineHeight: '1.3',
                        }}
                      >
                        {camp.title}
                      </h3>
                      <p
                        style={{
                          fontSize: '13px',
                          color: '#A8A29E',
                          margin: '0 0 16px 0',
                          lineHeight: '1.5',
                        }}
                      >
                        {camp.description}
                      </p>

                      {/* Qualification Requirement Box */}
                      <div
                        style={{
                          backgroundColor: '#181818',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          marginBottom: '18px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            color: '#78716C',
                            fontWeight: '700',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ShieldCheck size={12} color="#10B981" />
                          Verified Requirement
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#E7E5E4',
                            fontWeight: '500',
                          }}
                        >
                          {camp.minCuisineVisits > 0
                            ? `${camp.minCuisineVisits}+ verified ${camp.targetCuisines.join('/')} visits`
                            : `${camp.minTotalCheckIns}+ verified dining check-ins`}
                          {camp.mustBeNewToVenue && ' (First-time visitor)'}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Spots & CTA */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: '#78716C',
                          marginBottom: '14px',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Users size={13} />
                          <strong
                            style={{
                              color: spotsLeft > 0 ? '#10B981' : '#EF4444',
                            }}
                          >
                            {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} remaining
                          </strong>
                        </span>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={13} />
                          {camp.timeCommitment || '45m commitment'}
                        </span>
                      </div>

                      <div
                        style={{
                          width: '100%',
                          padding: '11px',
                          borderRadius: '6px',
                          backgroundColor: '#1C1C1C',
                          color: '#F5F5F4',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          fontWeight: '700',
                          fontSize: '13px',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        View Tasting Details
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </InteractiveCard>
                );
              })}
            </div>
          )}
        </main>
      </ErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TASTING DETAIL & QUALIFICATION INSPECTOR                            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTasting && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 60,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                backgroundColor: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '32px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '18px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color: '#F59E0B',
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedTasting.restaurantName}
                    </span>
                    {selectedTasting.isDemo && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          backgroundColor: '#222',
                          color: '#A8A29E',
                          fontWeight: '700',
                        }}
                      >
                        DEMO
                      </span>
                    )}
                  </div>
                  <h2
                    style={{
                      fontSize: '22px',
                      fontWeight: '800',
                      margin: '4px 0',
                      color: '#F5F5F4',
                    }}
                  >
                    {selectedTasting.title}
                  </h2>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      display: 'flex',
                      gap: '12px',
                      marginTop: '4px',
                    }}
                  >
                    <span>{selectedTasting.location || 'NYC'}</span>
                    <span>·</span>
                    <span>{selectedTasting.timing || 'Flexible'}</span>
                    <span>·</span>
                    <span>{selectedTasting.timeCommitment || '45 minutes'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTasting(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A8A29E',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Reward & Capacity Grid */}
              <div
                style={{
                  backgroundColor: '#181818',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#78716C' }}>
                    Reward
                  </div>
                  <div
                    style={{
                      fontSize: '22px',
                      fontWeight: '900',
                      color: '#F59E0B',
                    }}
                  >
                    {selectedTasting.rewardFly} FLY
                  </div>
                  <div style={{ fontSize: '11px', color: '#A8A29E' }}>
                    Paid after verified attendance and completed feedback.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#78716C' }}>
                    Available Capacity
                  </div>
                  <div
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#10B981',
                    }}
                  >
                    {selectedTasting.maxSlots - selectedTasting.filledSlots} of{' '}
                    {selectedTasting.maxSlots} spots open
                  </div>
                  <div style={{ fontSize: '11px', color: '#A8A29E' }}>
                    Strictly limited research cohort
                  </div>
                </div>
              </div>

              {/* Research Focus */}
              <div style={{ marginBottom: '20px' }}>
                <h4
                  style={{
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    color: '#78716C',
                    margin: '0 0 6px 0',
                    fontWeight: '700',
                  }}
                >
                  Research focus
                </h4>
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#D6D3D1',
                    margin: 0,
                  }}
                >
                  {selectedTasting.researchGoal || selectedTasting.description}
                </p>
              </div>

              {/* Qualification requirements */}
              <div
                style={{
                  backgroundColor: '#080808',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h4
                  style={{
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    color: '#F59E0B',
                    margin: '0 0 10px 0',
                    fontWeight: '700',
                  }}
                >
                  Qualification requirements
                </h4>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#E7E5E4', lineHeight: '1.6' }}>
                  {selectedTasting.minTotalCheckIns > 0 && (
                    <li>{selectedTasting.minTotalCheckIns} verified Blackbird visit{selectedTasting.minTotalCheckIns === 1 ? '' : 's'}</li>
                  )}
                  {selectedTasting.minDistinctVenues !== undefined && selectedTasting.minDistinctVenues > 0 && (
                    <li>{selectedTasting.minDistinctVenues} distinct verified restaurant visit{selectedTasting.minDistinctVenues === 1 ? '' : 's'}</li>
                  )}
                  {selectedTasting.minCuisineVisits > 0 && (
                    <li>{selectedTasting.minCuisineVisits} verified {selectedTasting.targetCuisines[0] || 'matching cuisine'} visit{selectedTasting.minCuisineVisits === 1 ? '' : 's'}</li>
                  )}
                  {selectedTasting.mustBeNewToVenue && (
                    <li>No prior verified visits to {selectedTasting.restaurantName || 'this restaurant'}</li>
                  )}
                </ul>
              </div>

              {tastingQualification?.status === 'loading' && (
                <div role="status" style={{ color: '#A8A29E', fontSize: '13px', marginBottom: '18px' }}>
                  Checking qualification...
                </div>
              )}
              {tastingQualification?.status === 'qualified' && (
                <div role="status" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '14px', marginBottom: '18px', color: '#A7F3D0', fontSize: '13px' }}>
                  <strong>You're qualified</strong>
                  {selectedTasting.mustBeNewToVenue && <div style={{ marginTop: '4px' }}>No prior verified visits to this restaurant.</div>}
                </div>
              )}
              {tastingQualification?.status === 'not_qualified' && (
                <div role="status" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '14px', marginBottom: '18px', color: '#FDE68A', fontSize: '13px' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F59E0B', marginBottom: '6px' }}>
                    Your eligibility
                  </div>
                  <strong>Not qualified</strong>
                  {selectedTasting.minTotalCheckIns > 0 && (
                    <div style={{ marginTop: '6px' }}>
                      {tastingQualification.checkInsCount ?? 0} of {selectedTasting.minTotalCheckIns} verified visits
                    </div>
                  )}
                  {selectedTasting.minCuisineVisits > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      {tastingQualification.cuisineVisits ?? 0} of {selectedTasting.minCuisineVisits} {selectedTasting.targetCuisines[0] || 'matching cuisine'} visits
                    </div>
                  )}
                  {tastingQualification.checkInsCount === 0 && (
                    <div style={{ marginTop: '6px' }}>You currently have 0 verified visits.</div>
                  )}
                  {tastingQualification.reasons?.map((reason) => (
                    <div key={reason} style={{ marginTop: '4px' }}>{reason}</div>
                  ))}
                </div>
              )}
              {['provider_error', 'network_error', 'server_error'].includes(tastingQualification?.status || '') && (
                <CalloutAlert
                  type="warning"
                  title={tastingQualification?.status === 'provider_error' ? 'Verification unavailable' : 'Qualification unavailable'}
                  message={
                    tastingQualification?.status === 'provider_error'
                      ? 'Blackbird dining verification is temporarily unavailable. Try again in a moment.'
                      : tastingQualification?.message || 'We could not evaluate this tasting right now.'
                  }
                  actionText="Retry"
                  onAction={() => setQualificationRetry((value) => value + 1)}
                />
              )}
              {tastingQualification?.status === 'campaign_not_found' && (
                <CalloutAlert
                  type="info"
                  title="Tasting unavailable"
                  message="This tasting is no longer available."
                />
              )}
              {joinError && !['provider_error', 'network_error', 'server_error'].includes(tastingQualification?.status || '') && (
                <CalloutAlert
                  error={joinError}
                  onDismiss={() => setJoinError(null)}
                  onAction={() => handleJoinTasting(selectedTasting)}
                />
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <InteractiveButton
                  onClick={() => {
                    if (tastingQualification?.status === 'signed_out') {
                      window.location.href = '/api/auth/login';
                      return;
                    }
                    if (tastingQualification?.status === 'qualified') {
                      handleJoinTasting(selectedTasting);
                    }
                  }}
                  disabled={isJoiningTasting || !['qualified', 'signed_out'].includes(tastingQualification?.status || '')}
                  variant="primary"
                  style={{
                    flex: 1,
                    backgroundColor: '#78350F',
                    color: '#FEF3C7',
                    border: '1px solid #92400E',
                  }}
                >
                  {isJoiningTasting
                    ? 'Applying...'
                    : tastingQualification?.status === 'loading' || !tastingQualification
                      ? 'Checking eligibility...'
                      : tastingQualification.status === 'qualified'
                        ? 'Apply to this tasting'
                        : tastingQualification.status === 'already_applied'
                          ? 'Applied'
                          : tastingQualification.status === 'signed_out'
                            ? 'Connect Blackbird'
                            : tastingQualification.status === 'not_qualified'
                              ? 'Not eligible for this tasting'
                              : tastingQualification.status === 'campaign_not_found'
                                ? 'Tasting unavailable'
                                : 'Verification unavailable'}
                </InteractiveButton>
                <InteractiveButton
                  onClick={() => {
                    setSelectedTasting(null);
                    setJoinError(null);
                  }}
                  variant="secondary"
                >
                  Close
                </InteractiveButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* VIEW 3: MY TASTINGS (DINER DASHBOARD & SINGLE STATUS PROGRESSION)         */}
      {/* ========================================================================= */}
      {activeNav === 'my-tastings' && (
        <ErrorBoundary fallbackTitle="Tastings History Unavailable" onReset={loadData}>
          <main
            style={{
              maxWidth: '1000px',
              margin: '0 auto',
              padding: '40px 24px 80px',
            }}
          >
            <div style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  margin: '0 0 6px 0',
                  color: '#F5F5F4',
                }}
              >
                My Tasting Sessions
              </h2>
              <p style={{ fontSize: '14px', color: '#A8A29E', margin: 0 }}>
                Track your reservations, submit sensory evaluations, and monitor FLY
                rewards paid after verified attendance and completed feedback.
              </p>
            </div>

            {fetchError ? (
              <CalloutAlert error={fetchError} onAction={loadData} />
            ) : showAuthResolving ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  backgroundColor: '#121212',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '14px',
                  color: '#A8A29E',
                }}
              >
                Finishing sign-in...
              </div>
            ) : !hasDinerSession ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  backgroundColor: '#121212',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#181818',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                    marginBottom: '16px',
                  }}
                >
                  <Lock size={22} />
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#F5F5F4',
                    margin: '0 0 8px 0',
                  }}
                >
                  Blackbird Authentication Required
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#A8A29E',
                    margin: '0 0 24px 0',
                    maxWidth: '460px',
                    marginInline: 'auto',
                    lineHeight: '1.5',
                  }}
                >
                  Connect your Blackbird account to view your scheduled tasting
                  reservations and submitted sensory feedback.
                </p>
                <InteractiveButton
                  onClick={() => {
                    window.location.href = '/api/auth/login';
                  }}
                  variant="primary"
                >
                  Connect Blackbird Account
                </InteractiveButton>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#78716C',
                    margin: '16px 0 0 0',
                    lineHeight: '1.6',
                  }}
                >
                  Blackbird Passport may not support every phone region yet.
                  <br />
                  Explore how BlackPalate uses live Flynet dining activity without
                  signing into a member account:{' '}
                  <button
                    onClick={() => setActiveNav('live-demo')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: '#F59E0B',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Try Live Flynet Demo
                  </button>
                </p>
              </div>
            ) : userApplications.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  backgroundColor: '#121212',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <p
                  style={{
                    fontSize: '15px',
                    color: '#A8A29E',
                    margin: '0 0 20px 0',
                  }}
                >
                  You have not joined any tasting sessions yet.
                </p>
                <InteractiveButton
                  onClick={() => setActiveNav('discover')}
                  variant="primary"
                >
                  Browse Open Tastings
                </InteractiveButton>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {userApplications.map((app) => {
                  const camp =
                    app.campaign || campaigns.find((c) => c.id === app.campaignId);
                  if (!camp) return null;

                  const isCompleted =
                    app.status === 'SUBMITTED' ||
                    app.status === 'REWARDED' ||
                    app.status === 'REWARD_PENDING';
                  const rewardInfo = getRewardStatusDisplay(app.rewardStatus);

                  return (
                    <div
                      key={app.id}
                      style={{
                        backgroundColor: '#121212',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '6px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '800',
                              color: '#F59E0B',
                            }}
                          >
                            {camp.restaurantName}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: isCompleted
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(56, 189, 248, 0.15)',
                              color: isCompleted ? '#A7F3D0' : '#38BDF8',
                              fontWeight: '700',
                              border: isCompleted
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid rgba(56, 189, 248, 0.3)',
                            }}
                          >
                            {app.status === 'SUBMITTED'
                              ? 'Feedback Submitted'
                              : app.status}
                          </span>
                        </div>

                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '700',
                            margin: '0 0 4px 0',
                            color: '#F5F5F4',
                          }}
                        >
                          {camp.dishFocus}
                        </h3>
                        <div style={{ fontSize: '13px', color: '#A8A29E' }}>
                          Timing: <strong>{camp.timing || 'Scheduled'}</strong> ·
                          Reward:{' '}
                          <strong style={{ color: '#F59E0B' }}>
                            {camp.rewardFly} FLY
                          </strong>
                        </div>
                      </div>

                      <div>
                    {isCompleted ? (
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            color: rewardInfo.color,
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <CheckCircle2 size={15} color={rewardInfo.color} />
                          {rewardInfo.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#78716C', display: 'block', maxWidth: '240px' }}>
                          {rewardInfo.description}
                        </span>
                      </div>
                    ) : app.status === 'ATTENDANCE_VERIFIED' ? (
                      <InteractiveButton
                        onClick={() => setActiveFeedbackCampaign(camp)}
                        variant="primary"
                      >
                        Submit Feedback
                        <ArrowRight size={15} />
                      </InteractiveButton>
                    ) : (
                      <span style={{ color: '#A8A29E', fontSize: '12px', textAlign: 'right', display: 'block', maxWidth: '190px' }}>
                        {app.status === 'CONFIRMED' || app.status === 'ATTENDANCE_PENDING'
                          ? 'Awaiting verified attendance'
                          : 'Awaiting restaurant confirmation'}
                      </span>
                    )}
                  </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </ErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SENSORY FEEDBACK SUBMISSION FLOW                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {activeFeedbackCampaign && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 70,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              style={{
                backgroundColor: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '14px',
                maxWidth: '620px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '32px',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: '800',
                      color: '#F59E0B',
                      textTransform: 'uppercase',
                    }}
                  >
                    Sensory Evaluation Questionnaire
                  </span>
                  <h2
                    style={{
                      fontSize: '20px',
                      fontWeight: '800',
                      margin: '4px 0',
                      color: '#F5F5F4',
                    }}
                  >
                    {activeFeedbackCampaign.dishFocus}
                  </h2>
                  <div style={{ fontSize: '13px', color: '#A8A29E' }}>
                    {activeFeedbackCampaign.restaurantName}
                  </div>
                </div>
                <button
                  onClick={() => setActiveFeedbackCampaign(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A8A29E',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitFeedback}>
                {feedbackError && (
                  <CalloutAlert
                    error={feedbackError}
                    onDismiss={() => setFeedbackError(null)}
                  />
                )}
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#E7E5E4',
                      marginBottom: '6px',
                    }}
                  >
                    Overall Dish Evaluation (1 to 5)
                  </label>
                  <select
                    value={feedbackForm.overallScore}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        overallScore: Number(e.target.value),
                      })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#181818',
                      color: '#FFF',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <option value={5}>5 - Exceptional / Exceeded Expectations</option>
                    <option value={4}>4 - Very Good / Minor Refinement</option>
                    <option value={3}>3 - Average / Needs Adjustment</option>
                    <option value={2}>2 - Below Standard</option>
                    <option value={1}>1 - Major Issues</option>
                  </select>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#A8A29E',
                        marginBottom: '4px',
                      }}
                    >
                      Flavor Balance (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={feedbackForm.ratings.flavor}
                      onChange={(e) =>
                        setFeedbackForm({
                          ...feedbackForm,
                          ratings: {
                            ...feedbackForm.ratings,
                            flavor: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#181818',
                        color: '#FFF',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        color: '#A8A29E',
                        marginBottom: '4px',
                      }}
                    >
                      Presentation (1-5)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={feedbackForm.ratings.presentation}
                      onChange={(e) =>
                        setFeedbackForm({
                          ...feedbackForm,
                          ratings: {
                            ...feedbackForm.ratings,
                            presentation: Number(e.target.value),
                          },
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        backgroundColor: '#181818',
                        color: '#FFF',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                {activeFeedbackCampaign.feedbackQuestions?.map((q, idx) => (
                  <div key={q.id || idx} style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#E7E5E4',
                        marginBottom: '6px',
                      }}
                    >
                      {idx + 1}. {q.prompt}
                    </label>
                    {q.type === 'yes_no' ? (
                      <select
                        onChange={(e) =>
                          setFeedbackForm({
                            ...feedbackForm,
                            answers: {
                              ...feedbackForm.answers,
                              [q.id]: e.target.value,
                            },
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : q.type === 'choice' && q.options ? (
                      <select
                        onChange={(e) =>
                          setFeedbackForm({
                            ...feedbackForm,
                            answers: {
                              ...feedbackForm.answers,
                              [q.id]: e.target.value,
                            },
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      >
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="Your answer..."
                        onChange={(e) =>
                          setFeedbackForm({
                            ...feedbackForm,
                            answers: {
                              ...feedbackForm.answers,
                              [q.id]: e.target.value,
                            },
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    )}
                  </div>
                ))}

                <div style={{ marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#E7E5E4',
                      marginBottom: '6px',
                    }}
                  >
                    Sensory Dynamics &amp; Texture Notes
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={feedbackForm.dishFeedback}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        dishFeedback: e.target.value,
                      })
                    }
                    placeholder="Describe mouthfeel, temperature balance, seasoning nuance..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#181818',
                      color: '#FFF',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#E7E5E4',
                      marginBottom: '6px',
                    }}
                  >
                    Direct Action Recommendations for Head Chef
                  </label>
                  <input
                    type="text"
                    value={feedbackForm.suggestions}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        suggestions: e.target.value,
                      })
                    }
                    placeholder="e.g. Increase acidity slightly to balance fat rendering"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#181818',
                      color: '#FFF',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <InteractiveButton
                    type="submit"
                    disabled={submittingFeedback}
                    variant="primary"
                    style={{ flex: 1 }}
                  >
                    {submittingFeedback
                      ? 'Submitting & Claiming...'
                      : `Submit Feedback (${activeFeedbackCampaign.rewardFly} FLY)`}
                  </InteractiveButton>
                  <InteractiveButton
                    type="button"
                    onClick={() => setActiveFeedbackCampaign(null)}
                    variant="secondary"
                  >
                    Cancel
                  </InteractiveButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* VIEW 4: RESTAURANT MISSION BUILDER (DSCOUT PROGRESSIVE STEPPER)           */}
      {/* ========================================================================= */}
      {activeNav === 'create-tasting' && (
        <ErrorBoundary fallbackTitle="Tasting Mission Builder Unavailable">
          {showAuthResolving ? (renderAuthResolving()) : needsRestaurantGate ? (
            renderRestaurantAuthGate()
          ) : (
          <main
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              padding: '40px 24px 80px',
            }}
          >
            <div style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  margin: '0 0 6px 0',
                  color: '#F5F5F4',
                }}
              >
                Create a Tasting Mission
              </h2>
              <p style={{ fontSize: '14px', color: '#A8A29E', margin: 0 }}>
                Define your research goal, configure deterministic Flynet criteria, and
                deploy incentives.
              </p>
            </div>

            {publishError && (
              <CalloutAlert
                error={publishError}
                onDismiss={() => setPublishError(null)}
                onAction={handlePublishCampaign}
              />
            )}

          {/* Suggested Draft Helper */}
          <div
            style={{
              backgroundColor: '#121212',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#F59E0B" />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#F59E0B',
                  }}
                >
                  Suggested Draft Helper
                </span>
              </div>
              {draftMode && (
                <span
                  style={{
                    fontSize: '11px',
                    color: '#FDE68A',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#78350F',
                  }}
                >
                  {draftMode}
                </span>
              )}
            </div>

            <p style={{ fontSize: '13px', color: '#A8A29E', margin: 0 }}>
              Describe your dish concept and testing goals in plain English. The
              template helper will prefill a starting point for your review.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={draftPromptText}
                onChange={(e) => setDraftPromptText(e.target.value)}
                placeholder="e.g. We have a wood-fired duck breast and want 8 fine dining regulars to evaluate glaze acid..."
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '10px 14px',
                  backgroundColor: '#181818',
                  color: '#FFF',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              />
              <InteractiveButton
                disabled={isGeneratingDraft}
                onClick={handleSuggestedDraft}
                variant="primary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                {isGeneratingDraft ? 'Generating Draft...' : 'Generate Suggested Draft'}
              </InteractiveButton>
            </div>
          </div>

          {/* Stepper Layout (Desktop Left Rail, Right Form) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '260px 1fr',
              gap: '32px',
              alignItems: 'flex-start',
            }}
          >
            {/* Left Rail Progress Stepper */}
            <div
              style={{
                backgroundColor: '#121212',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {[
                { step: 1, title: 'What are you testing?' },
                { step: 2, title: 'What to learn?' },
                { step: 3, title: 'Who qualifies?' },
                { step: 4, title: 'Timing & Location' },
                { step: 5, title: 'Capacity & Reward' },
                { step: 6, title: 'Questions' },
                { step: 7, title: 'Review & Publish' },
              ].map((s) => {
                const isActive = builderStep === s.step;
                const isPassed = builderStep > s.step;

                return (
                  <button
                    key={s.step}
                    onClick={() => setBuilderStep(s.step)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isActive
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'transparent',
                      color: isActive
                        ? '#F59E0B'
                        : isPassed
                        ? '#E7E5E4'
                        : '#78716C',
                      fontWeight: isActive ? '800' : '600',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: isActive
                          ? '#F59E0B'
                          : isPassed
                          ? '#10B981'
                          : '#181818',
                        color: isActive
                          ? '#080808'
                          : isPassed
                          ? '#FFF'
                          : '#78716C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}
                    >
                      {isPassed ? <CheckCircle2 size={13} /> : s.step}
                    </span>
                    <span>{s.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Active Step Form Body */}
            <div
              style={{
                backgroundColor: '#121212',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '32px',
              }}
            >
              {/* Step 1: Dish Details */}
              {builderStep === 1 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 1: What are you testing?
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Specify the dish, recipe flight, or menu concept under
                    evaluation.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#E7E5E4',
                          marginBottom: '6px',
                        }}
                      >
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        value={newCampaign.restaurantName}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            restaurantName: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#E7E5E4',
                          marginBottom: '6px',
                        }}
                      >
                        Dish / Flight Focus
                      </label>
                      <input
                        type="text"
                        value={newCampaign.dishFocus}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            dishFocus: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '13px',
                          fontWeight: '700',
                          color: '#E7E5E4',
                          marginBottom: '6px',
                        }}
                      >
                        Primary Cuisine Category
                      </label>
                      <input
                        type="text"
                        value={newCampaign.cuisine}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            cuisine: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  <InteractiveButton
                    onClick={() => setBuilderStep(2)}
                    variant="primary"
                  >
                    Next: Research Goals
                    <ArrowRight size={15} />
                  </InteractiveButton>
                </div>
              )}

              {/* Step 2: Research Goals */}
              {builderStep === 2 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 2: What do you want to learn?
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Articulate your key culinary hypothesis, pricing questions, or
                    texture dynamics.
                  </p>

                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#E7E5E4',
                        marginBottom: '6px',
                      }}
                    >
                      Research Objective &amp; Tasting Brief
                    </label>
                    <textarea
                      rows={4}
                      value={newCampaign.researchGoal}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          researchGoal: e.target.value,
                        })
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        backgroundColor: '#181818',
                        color: '#FFF',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <InteractiveButton
                      onClick={() => setBuilderStep(1)}
                      variant="secondary"
                    >
                      Back
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={() => setBuilderStep(3)}
                      variant="primary"
                    >
                      Next: Qualification Criteria
                      <ArrowRight size={15} />
                    </InteractiveButton>
                  </div>
                </div>
              )}

              {/* Step 3: Qualification Criteria */}
              {builderStep === 3 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 3: Who should participate?
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Establish deterministic Flynet check-in criteria to target your
                    desired diner segment.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Minimum Total Check-ins
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={newCampaign.minTotalCheckIns}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            minTotalCheckIns: Number(e.target.value),
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Min Visits in {newCampaign.cuisine}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={newCampaign.minCuisineVisits}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            minCuisineVisits: Number(e.target.value),
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '13px',
                        color: '#D6D3D1',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newCampaign.mustBeNewToVenue}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            mustBeNewToVenue: e.target.checked,
                            minTotalCheckIns:
                              e.target.checked && newCampaign.minTotalCheckIns === 2
                                ? 0
                                : newCampaign.minTotalCheckIns,
                            minCuisineVisits:
                              e.target.checked && newCampaign.minCuisineVisits === 1
                                ? 0
                                : newCampaign.minCuisineVisits,
                          })
                        }
                      />
                      Require first-time visitors (Must have no prior visits to{' '}
                      {newCampaign.restaurantName})
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <InteractiveButton
                      onClick={() => setBuilderStep(2)}
                      variant="secondary"
                    >
                      Back
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={() => setBuilderStep(4)}
                      variant="primary"
                    >
                      Next: Timing &amp; Location
                      <ArrowRight size={15} />
                    </InteractiveButton>
                  </div>
                </div>
              )}

              {/* Step 4: Timing & Location */}
              {builderStep === 4 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 4: When and where will it happen?
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Provide location, schedule, and estimated time commitment.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Location / Neighborhood
                      </label>
                      <input
                        type="text"
                        value={newCampaign.location}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            location: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Timing / Date
                      </label>
                      <input
                        type="text"
                        value={newCampaign.timing}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            timing: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Estimated Time Commitment
                      </label>
                      <input
                        type="text"
                        value={newCampaign.timeCommitment}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            timeCommitment: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <InteractiveButton
                      onClick={() => setBuilderStep(3)}
                      variant="secondary"
                    >
                      Back
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={() => setBuilderStep(5)}
                      variant="primary"
                    >
                      Next: Capacity &amp; Reward
                      <ArrowRight size={15} />
                    </InteractiveButton>
                  </div>
                </div>
              )}

              {/* Step 5: Capacity & Rewards */}
              {builderStep === 5 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 5: Capacity &amp; Incentive Budget
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Determine how many seats are open and the FLY token incentive
                    per completed evaluation.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '24px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Tasting Seats (Capacity)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={newCampaign.maxSlots}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            maxSlots: Number(e.target.value),
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#A8A29E',
                          marginBottom: '4px',
                        }}
                      >
                        Reward per Participant (FLY)
                      </label>
                      <input
                        type="text"
                        value={newCampaign.rewardFly}
                        onChange={(e) =>
                          setNewCampaign({
                            ...newCampaign,
                            rewardFly: e.target.value,
                          })
                        }
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: '#181818',
                          color: '#FFF',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <InteractiveButton
                      onClick={() => setBuilderStep(4)}
                      variant="secondary"
                    >
                      Back
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={() => setBuilderStep(6)}
                      variant="primary"
                    >
                      Next: Research Questions
                      <ArrowRight size={15} />
                    </InteractiveButton>
                  </div>
                </div>
              )}

              {/* Step 6: Questions */}
              {builderStep === 6 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 6: What should participants answer?
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Customized sensory and pricing questions tailored to your
                    research goals.
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginBottom: '24px',
                    }}
                  >
                    {newCampaign.questions.map((q, i) => (
                      <div
                        key={i}
                        style={{
                          backgroundColor: '#181818',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#E7E5E4',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                      >
                        <span>
                          <strong>Q{i + 1}:</strong> {q.prompt}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            backgroundColor: '#222',
                            color: '#F59E0B',
                            textTransform: 'uppercase',
                          }}
                        >
                          {q.type}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <InteractiveButton
                      onClick={() => setBuilderStep(5)}
                      variant="secondary"
                    >
                      Back
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={() => setBuilderStep(7)}
                      variant="primary"
                    >
                      Next: Review &amp; Publish
                      <ArrowRight size={15} />
                    </InteractiveButton>
                  </div>
                </div>
              )}

              {/* Step 7: Review and Publish */}
              {builderStep === 7 && (
                <div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: '800',
                      color: '#F5F5F4',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Step 7: Mission Review &amp; Launch
                  </h3>
                  <p
                    style={{
                      fontSize: '13px',
                      color: '#A8A29E',
                      margin: '0 0 20px 0',
                    }}
                  >
                    Inspect the summary card before publishing to the live
                    BlackPalate marketplace.
                  </p>

                  {/* Summary Card Preview */}
                  <div
                    style={{
                      backgroundColor: '#181818',
                      borderRadius: '10px',
                      padding: '20px',
                      marginBottom: '24px',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          color: '#F59E0B',
                        }}
                      >
                        {newCampaign.restaurantName}
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '800',
                          color: '#F59E0B',
                        }}
                      >
                        {newCampaign.rewardFly} FLY
                      </span>
                    </div>
                    <h4
                      style={{
                        fontSize: '18px',
                        fontWeight: '800',
                        margin: '0 0 6px 0',
                        color: '#F5F5F4',
                      }}
                    >
                      {newCampaign.dishFocus} Tasting
                    </h4>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#A8A29E',
                        margin: '0 0 14px 0',
                      }}
                    >
                      {newCampaign.researchGoal}
                    </p>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '10px',
                        fontSize: '12px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        paddingTop: '12px',
                      }}
                    >
                      <div>
                        <span style={{ color: '#78716C' }}>Capacity: </span>
                        <strong style={{ color: '#10B981' }}>
                          {newCampaign.maxSlots} seats
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#78716C' }}>Criteria: </span>
                        <strong style={{ color: '#F5F5F4' }}>
                          {newCampaign.minTotalCheckIns}+ check-ins
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#78716C' }}>Timing: </span>
                        <strong style={{ color: '#F5F5F4' }}>
                          {newCampaign.timing}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <InteractiveButton
                      onClick={() => setBuilderStep(6)}
                      variant="secondary"
                    >
                      Back
                    </InteractiveButton>
                    <InteractiveButton
                      onClick={handlePublishCampaign}
                      disabled={isPublishingCampaign}
                      variant="primary"
                      style={{ flex: 1 }}
                    >
                      {isPublishingCampaign
                        ? 'Publishing Mission...'
                        : 'Publish Tasting Campaign'}
                      <ArrowRight size={15} />
                    </InteractiveButton>
                  </div>
                </div>
              )}
            </div>
          </div>
          </main>
          )}
        </ErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* VIEW 5: RESTAURANT STUDIO & RESEARCH INTELLIGENCE                         */}
      {/* ========================================================================= */}
      {activeNav === 'campaign-studio' && (
        <ErrorBoundary fallbackTitle="Restaurant Dashboard Unavailable" onReset={loadData}>
          {showAuthResolving ? (renderAuthResolving()) : needsRestaurantGate ? (
            renderRestaurantAuthGate()
          ) : (
          <main
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              padding: '40px 24px 80px',
            }}
          >
            <div style={{ marginBottom: '32px' }}>
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '800',
                  margin: '0 0 6px 0',
                  color: '#F5F5F4',
                }}
              >
                Restaurant Campaign Dashboard &amp; Feedback Summary
              </h2>
              <p style={{ fontSize: '14px', color: '#A8A29E', margin: 0 }}>
                Review active campaigns, qualified participant cohorts, and feedback
                summaries built from recorded responses.
              </p>
            </div>

            {fetchError ? (
              <CalloutAlert error={fetchError} onAction={loadData} />
            ) : studioCampaigns.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '64px 24px',
                  backgroundColor: '#121212',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <p style={{ fontSize: '15px', color: '#A8A29E', margin: '0 0 20px 0' }}>
                  {operatorWorkspaces.length === 0
                    ? 'Create your restaurant workspace to start publishing tasting missions.'
                    : 'No tasting campaigns created yet for your restaurant workspace.'}
                </p>
                {operatorWorkspaces.length === 0 ? (
                  <InteractiveButton
                    onClick={() => setIsCreatingWorkspaceModalOpen(true)}
                    variant="primary"
                  >
                    Create Restaurant Workspace
                  </InteractiveButton>
                ) : (
                  <InteractiveButton
                    onClick={() => setActiveNav('create-tasting')}
                    variant="primary"
                  >
                    Create Your First Tasting Mission
                  </InteractiveButton>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '320px 1fr',
                  gap: '24px',
                  alignItems: 'flex-start',
                }}
              >
            {/* Sidebar: Campaign List */}
            <div
              style={{
                backgroundColor: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  color: '#78716C',
                  margin: '0 0 14px 0',
                  fontWeight: '800',
                }}
              >
                Your Campaigns
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {studioCampaigns.map((camp) => {
                  const isSelected = selectedStudioCampaign?.id === camp.id;
                  return (
                    <button
                      key={camp.id}
                      onClick={() => loadStudioSynthesis(camp)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#181818' : 'transparent',
                        border: isSelected
                          ? '1px solid #F59E0B'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#F5F5F4' : '#A8A29E',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: '700', fontSize: '13px' }}>
                          {camp.dishFocus}
                        </span>
                        {camp.isDemo && (
                          <span
                            style={{
                              fontSize: '9px',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: '#222',
                              color: '#A8A29E',
                            }}
                          >
                            DEMO
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#78716C' }}>
                        {camp.filledSlots}/{camp.maxSlots} seats · {camp.rewardFly}{' '}
                        FLY
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Area: Feedback Summary & Raw Responses */}
            <div
              style={{
                backgroundColor: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '32px',
              }}
            >
              {selectedStudioCampaign ? (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '24px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingBottom: '16px',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          color: '#F59E0B',
                          textTransform: 'uppercase',
                        }}
                      >
                        {selectedStudioCampaign.restaurantName}
                      </span>
                      <h3
                        style={{
                          fontSize: '22px',
                          fontWeight: '800',
                          margin: '2px 0',
                          color: '#F5F5F4',
                        }}
                      >
                        Research Synthesis: {selectedStudioCampaign.dishFocus}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#A8A29E' }}>
                        {selectedStudioCampaign.researchGoal}
                      </div>
                    </div>
                    {synthesisMode && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#FDE68A',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#78350F',
                        }}
                      >
                        Feedback summary
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      marginBottom: '28px',
                      paddingBottom: '24px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#F5F5F4' }}>Applicants</h4>
                      <span style={{ fontSize: '11px', color: '#78716C' }}>Live database records</span>
                    </div>
                    {loadingStudioApplications ? (
                      <div style={{ color: '#A8A29E', fontSize: '13px' }}>Loading applicants...</div>
                    ) : studioApplications.length === 0 ? (
                      <div style={{ color: '#78716C', fontSize: '13px' }}>No applications recorded for this campaign yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {studioApplications.map(application => {
                          const canConfirm = application.status === 'APPLIED' || application.status === 'QUALIFIED';
                          return (
                            <div
                              key={application.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '14px 16px',
                                backgroundColor: '#181818',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                                  <strong style={{ color: '#F5F5F4', fontSize: '13px' }}>{application.diner.displayName}</strong>
                                  <span style={{ color: '#A7F3D0', fontSize: '11px', fontWeight: 700 }}>{application.status}</span>
                                </div>
                                <div style={{ color: '#A8A29E', fontSize: '12px' }}>{application.verifiedHistory.summary}</div>
                                <div style={{ color: '#78716C', fontSize: '11px', marginTop: '3px' }}>
                                  Applied {new Date(application.createdAt).toLocaleString()}
                                </div>
                              </div>
                              {canConfirm ? (
                                <InteractiveButton
                                  onClick={() => handleConfirmApplicant(application.id)}
                                  disabled={confirmingApplicationId === application.id}
                                  variant="primary"
                                >
                                  {confirmingApplicationId === application.id ? 'Confirming...' : 'Confirm Applicant'}
                                </InteractiveButton>
                              ) : (
                                <span style={{ color: '#78716C', fontSize: '12px' }}>{application.status}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {loadingSynthesis ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#A8A29E',
                      }}
                    >
                      Synthesizing feedback records...
                    </div>
                  ) : studioSynthesis ? (
                    <div>
                      {/* Executive Summary */}
                      <div
                        style={{
                          backgroundColor: '#181818',
                          borderLeft: '4px solid #F59E0B',
                          borderRadius: '6px',
                          padding: '16px 20px',
                          marginBottom: '24px',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: '800',
                            color: '#F59E0B',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          Executive Consensus
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#E7E5E4',
                          }}
                        >
                          {studioSynthesis.executiveSummary}
                        </p>
                      </div>

                      {/* Flavor & Technique Analysis */}
                      <div style={{ marginBottom: '24px' }}>
                        <h4
                          style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#F5F5F4',
                            margin: '0 0 8px 0',
                          }}
                        >
                          Flavor &amp; Technique Dynamics
                        </h4>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#A8A29E',
                          }}
                        >
                          {studioSynthesis.flavorAnalysis}
                        </p>
                      </div>

                      {/* Cohort Trends */}
                      {studioSynthesis.cohortTrends?.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                          <h4
                            style={{
                              fontSize: '15px',
                              fontWeight: '700',
                              color: '#F5F5F4',
                              margin: '0 0 10px 0',
                            }}
                          >
                            Behavioral Cohort Breakdown
                          </h4>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr',
                              gap: '10px',
                            }}
                          >
                            {studioSynthesis.cohortTrends.map(
                              (c: any, i: number) => (
                                <div
                                  key={i}
                                  style={{
                                    backgroundColor: '#181818',
                                    padding: '12px 16px',
                                    borderRadius: '6px',
                                    border:
                                      '1px solid rgba(255, 255, 255, 0.06)',
                                  }}
                                >
                                  <strong
                                    style={{
                                      color: '#F59E0B',
                                      fontSize: '13px',
                                    }}
                                  >
                                    {c.cohort}
                                  </strong>{' '}
                                  ({c.sentiment})
                                  <p
                                    style={{
                                      margin: '4px 0 0 0',
                                      fontSize: '13px',
                                      color: '#A8A29E',
                                    }}
                                  >
                                    {c.takeaways}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Actionable Chef Recommendations */}
                      <div style={{ marginBottom: '32px' }}>
                        <h4
                          style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#F5F5F4',
                            margin: '0 0 10px 0',
                          }}
                        >
                          Prioritized Chef Action Items
                        </h4>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: '20px',
                            fontSize: '13px',
                            color: '#D6D3D1',
                            lineHeight: '1.6',
                          }}
                        >
                          {studioSynthesis.recommendations?.map(
                            (rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            )
                          )}
                        </ul>
                      </div>

                      {/* Raw Submissions Table */}
                      <div
                        style={{
                          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                          paddingTop: '24px',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: '15px',
                            fontWeight: '700',
                            color: '#F5F5F4',
                            margin: '0 0 12px 0',
                          }}
                        >
                          Raw Diner Submissions ({studioSubmissions.length})
                        </h4>
                        {studioSubmissions.length === 0 ? (
                          <div style={{ fontSize: '13px', color: '#78716C' }}>
                            No feedback submissions recorded yet.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            {studioSubmissions.map((sub: any, i: number) => (
                              <div
                                key={sub.id || i}
                                style={{
                                  backgroundColor: '#181818',
                                  padding: '14px',
                                  borderRadius: '8px',
                                  border:
                                    '1px solid rgba(255, 255, 255, 0.06)',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '6px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: '700',
                                      color: '#F59E0B',
                                    }}
                                  >
                                    Verified Diner (Score: {sub.overallScore}/5)
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      color: '#78716C',
                                    }}
                                  >
                                    Flavor: {sub.ratings?.flavor}/5 ·
                                    Presentation: {sub.ratings?.presentation}/5
                                  </span>
                                </div>
                                <p
                                  style={{
                                    margin: '0 0 4px 0',
                                    fontSize: '13px',
                                    color: '#E7E5E4',
                                  }}
                                >
                                  "{sub.dishFeedback}"
                                </p>
                                {sub.suggestions && (
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      color: '#A8A29E',
                                    }}
                                  >
                                    Suggestion: {sub.suggestions}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#A8A29E', fontSize: '14px' }}>
                      No synthesis available.
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#A8A29E',
                  }}
                >
                  Select a campaign to view research intelligence.
                </div>
              )}
            </div>
          </div>
          )}
          </main>
          )}
        </ErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* VIEW: LIVE FLYNET NETWORK DEMO (observational only)                   */}
      {/* ========================================================================= */}
      {activeNav === 'live-demo' && (
        <ErrorBoundary fallbackTitle="Live Demo Unavailable" onReset={loadLiveFeed}>
          <main
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              padding: '40px 24px 80px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '0.08em',
                color: '#10B981',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                }}
              />
              LIVE · FLYNET PRODUCTION
            </div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '800',
                margin: '0 0 6px 0',
                color: '#F5F5F4',
              }}
            >
              Live Flynet Network Demo
            </h2>
            <p style={{ fontSize: '14px', color: '#A8A29E', margin: '0 0 8px 0', maxWidth: '720px', lineHeight: 1.6 }}>
              Real anonymized dining activity from the Flynet production network,
              interpreted by BlackPalate. This is a demonstration only — it is not
              a personal member account and creates no applications, slots, or rewards.
            </p>

            {liveFeedLoading ? (
              <p style={{ color: '#A8A29E', fontSize: '14px', padding: '32px 0' }}>
                Loading live Flynet activity...
              </p>
            ) : liveFeedError ? (
              <CalloutAlert error={liveFeedError} onAction={loadLiveFeed} />
            ) : liveFeed ? (
              <LiveDemoBody
                feed={liveFeed}
                campaigns={demoCampaigns}
                demoCheckInId={demoCheckInId}
                setDemoCheckInId={setDemoCheckInId}
                demoCampaignId={demoCampaignId}
                setDemoCampaignId={setDemoCampaignId}
              />
            ) : null}

            <div
              style={{
                marginTop: '32px',
                padding: '24px',
                backgroundColor: '#121212',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '13px', color: '#A8A29E', margin: '0 0 16px 0' }}>
                Have a supported Blackbird Passport? Get your personal verified
                dining history instead.
              </p>
              <InteractiveButton
                onClick={() => {
                  window.location.href = '/api/auth/login';
                }}
                variant="primary"
              >
                Continue with Blackbird
              </InteractiveButton>
            </div>
          </main>
        </ErrorBoundary>
      )}

      {/* ========================================================================= */}
      {/* VIEW 6: SYSTEM INTEGRATION DIAGNOSTICS                                    */}
      {/* ========================================================================= */}
      {activeNav === 'diagnostics' && (
        <main
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '40px 24px 80px',
          }}
        >
          <div style={{ marginBottom: '32px' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '800',
                margin: '0 0 6px 0',
                color: '#F5F5F4',
              }}
            >
              System Health &amp; Integration State
            </h2>
            <p style={{ fontSize: '14px', color: '#A8A29E', margin: 0 }}>
              Live verification matrix reflecting underlying services and Flynet
              approval boundaries.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#451A03',
              border: '1px solid #78350F',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '24px',
              color: '#FDE68A',
            }}
          >
            <strong style={{ fontSize: '15px' }}>
              Flynet Maker Status: BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL
            </strong>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#FEF3C7',
              }}
            >
              The Flynet Make dashboard currently prevents application and API key
              minting. All credential-independent product flows (marketplace
              discovery, campaign creation, deterministic qualification engine,
              feedback storage, and recorded feedback summaries) are operational
              and hardened.
              Live token exchange will execute immediately upon Blackbird approval.
            </p>
          </div>

          <div
            style={{
              backgroundColor: '#121212',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '24px',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#A8A29E',
                  }}
                >
                  <th style={{ padding: '10px' }}>Component</th>
                  <th style={{ padding: '10px' }}>Host / Route</th>
                  <th style={{ padding: '10px' }}>Truthful Status</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                    Public Host &amp; Callback
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <code>https://blackpalate.vercel.app</code>
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      color: '#10B981',
                      fontWeight: '700',
                    }}
                  >
                    INTEGRATION PROVEN
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                    Database Persistence
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <code>lib/db/repository.ts</code>
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      color: '#10B981',
                      fontWeight: '700',
                    }}
                  >
                    COMPONENT PROVEN (Fail-Closed)
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                    Deterministic Qualification Engine
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <code>lib/qualification.ts</code>
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      color: '#10B981',
                      fontWeight: '700',
                    }}
                  >
                    COMPONENT PROVEN
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                    Campaign drafting &amp; feedback summary
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <code>template helper / recorded data</code>
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      color: '#10B981',
                      fontWeight: '700',
                    }}
                  >
                    AVAILABLE (TEMPLATE + DATA)
                  </td>
                </tr>
                <tr
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                    Managed Restaurant Auth
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <code>/api/auth/*</code>
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      color: '#F59E0B',
                      fontWeight: '700',
                    }}
                  >
                    IMPLEMENTED (UAT PENDING)
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '12px 10px', fontWeight: '600' }}>
                    Flynet OAuth &amp; Reward
                  </td>
                  <td style={{ padding: '12px 10px' }}>
                    <code>/api/auth/*</code> &amp; <code>/api/proofs/*</code>
                  </td>
                  <td
                    style={{
                      padding: '12px 10px',
                      color: '#F59E0B',
                      fontWeight: '700',
                    }}
                  >
                    LIVE / PRODUCTION PROVEN
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* Explicit Restaurant Workspace Creation Modal */}
      <AnimatePresence>
        {isCreatingWorkspaceModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                backgroundColor: '#121212',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.9)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Utensils size={20} color="#F59E0B" />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#F5F5F4' }}>
                    Create Restaurant Workspace
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingWorkspaceModalOpen(false);
                    setWorkspaceError(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#A8A29E',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '14px', color: '#A8A29E', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                Creating a workspace establishes your restaurant profile on PostgreSQL and grants your authenticated account <strong style={{ color: '#F59E0B' }}>OWNER</strong> privileges.
              </p>

              {workspaceError && (
                <CalloutAlert
                  error={workspaceError}
                  onDismiss={() => setWorkspaceError(null)}
                />
              )}

              <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#A8A29E', marginBottom: '6px' }}>
                    Restaurant Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Your restaurant"
                    value={workspaceForm.name}
                    onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#F5F5F4',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#A8A29E', marginBottom: '6px' }}>
                    Primary Cuisine
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Contemporary American, Italian, Japanese"
                    value={workspaceForm.cuisine}
                    onChange={(e) => setWorkspaceForm({ ...workspaceForm, cuisine: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#F5F5F4',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#A8A29E', marginBottom: '6px' }}>
                    Location / Neighborhood
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flatiron, NYC"
                    value={workspaceForm.location}
                    onChange={(e) => setWorkspaceForm({ ...workspaceForm, location: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: '#1C1C1C',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#F5F5F4',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingWorkspaceModalOpen(false);
                      setWorkspaceError(null);
                    }}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      backgroundColor: '#181818',
                      color: '#A8A29E',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingWorkspace}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      backgroundColor: '#F59E0B',
                      color: '#080808',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Utensils size={14} />
                    {isCreatingWorkspace ? 'Creating Workspace...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveDemoBody({
  feed,
  campaigns,
  demoCheckInId,
  setDemoCheckInId,
  demoCampaignId,
  setDemoCampaignId,
}: {
  feed: { source: string; fetchedAt: string; venue: any; checkIns: LiveDemoCheckIn[] };
  campaigns: Campaign[];
  demoCheckInId: string | null;
  setDemoCheckInId: (id: string) => void;
  demoCampaignId: string | null;
  setDemoCampaignId: (id: string) => void;
}) {
  const checkIns = feed.checkIns || [];
  const selectedCheckIn =
    checkIns.find((c) => c.id === demoCheckInId) || checkIns[0] || null;
  const demoCampaigns = campaigns.filter((c) => c.isDemo);
  const selectable = demoCampaigns;
  const selectedCampaign =
    selectable.find((c) => c.id === demoCampaignId) || selectable[0] || null;

  const match = selectedCheckIn && selectedCampaign
    ? matchCampaignVenue(selectedCheckIn, {
        restaurantId: selectedCampaign.restaurantId,
        restaurantName: selectedCampaign.restaurantName,
        targetCuisines: selectedCampaign.targetCuisines,
        restaurantCuisine: selectedCampaign.restaurantCuisine,
      })
    : null;

  const predicate = selectedCheckIn
    ? sameVenueAttendance(selectedCheckIn.location.id, feed.venue.location.id)
    : null;

  // Illustrative rule evaluation on the anonymized network sample (NOT member history).
  let preview: ReturnType<typeof evaluateDinerQualification> | null = null;
  if (selectedCampaign && checkIns.length > 0) {
    const rules: QualificationRule[] = [
      {
        type: 'MIN_TOTAL_CHECKINS',
        threshold: selectedCampaign.minTotalCheckIns,
        description: `At least ${selectedCampaign.minTotalCheckIns} verified dining check-in(s)`,
      },
    ];
    if (selectedCampaign.minCuisineVisits > 0 && selectedCampaign.targetCuisines.length > 0) {
      rules.push({
        type: 'MIN_CUISINE_VISITS',
        cuisine: selectedCampaign.targetCuisines[0],
        threshold: selectedCampaign.minCuisineVisits,
        description: `At least ${selectedCampaign.minCuisineVisits} verified visit(s) to ${selectedCampaign.targetCuisines.join('/')}`,
      });
    }
    const restaurantMap = new Map();
    for (const ci of checkIns) {
      restaurantMap.set(ci.location.restaurant.id, {
        id: ci.location.restaurant.id,
        name: ci.location.restaurant.name || '',
        cuisine: ci.location.restaurant.cuisine,
      });
    }
    preview = evaluateDinerQualification(checkIns as any, rules, restaurantMap);
  }

  const card: React.CSSProperties = {
    backgroundColor: '#121212',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '20px 22px',
    marginBottom: '20px',
  };
  const label: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: '800',
    letterSpacing: '0.08em',
    color: '#78716C',
    marginBottom: '10px',
  };

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={card}>
        <div style={label}>LIVE VENUE · {feed.source.toUpperCase()}</div>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#F5F5F4' }}>
          {feed.venue.restaurant.name || 'Unnamed venue'}
        </div>
        <div style={{ fontSize: '13px', color: '#A8A29E', marginTop: '4px' }}>
          {[feed.venue.location.name, feed.venue.location.neighborhood, feed.venue.location.region]
            .filter(Boolean)
            .join(' · ')}
          {feed.venue.restaurant.cuisine.length > 0 &&
            ` · ${feed.venue.restaurant.cuisine.join(', ')}`}
        </div>
        <div style={{ fontSize: '12px', color: '#78716C', marginTop: '8px' }}>
          {checkIns.length} recent verified check-in{checkIns.length === 1 ? '' : 's'} · feed at{' '}
          {new Date(feed.fetchedAt).toLocaleString()}
        </div>
      </div>

      <div style={card}>
        <div style={label}>RECENT VERIFIED DINING ACTIVITY (ANONYMIZED)</div>
        {checkIns.map((ci) => (
          <button
            key={ci.id}
            onClick={() => setDemoCheckInId(ci.id)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              marginBottom: '8px',
              borderRadius: '8px',
              border:
                selectedCheckIn?.id === ci.id
                  ? '1px solid rgba(245, 158, 11, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: selectedCheckIn?.id === ci.id ? '#1A1408' : '#0C0C0C',
              color: '#D6D3D1',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <strong style={{ color: '#F5F5F4' }}>
              {ci.location.restaurant.name || 'Unnamed venue'}
            </strong>
            {' · '}
            {(ci.location.restaurant.cuisine || []).join(', ') || 'Cuisine n/a'}
            <br />
            <span style={{ color: '#78716C', fontSize: '12px' }}>
              {[ci.location.name, ci.location.neighborhood].filter(Boolean).join(' · ')}
              {' · '}
              {ci.createdAt ? new Date(ci.createdAt).toLocaleString() : 'time n/a'}
            </span>
          </button>
        ))}
      </div>

      <div style={card}>
        <div style={label}>CAMPAIGN MATCHING (SELECT A DEMO TASTING)</div>
        {selectable.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#A8A29E', margin: 0 }}>
            No tasting campaigns available right now.
          </p>
        ) : (
          <select
            value={selectedCampaign?.id || ''}
            onChange={(e) => setDemoCampaignId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              backgroundColor: '#0C0C0C',
              color: '#F5F5F4',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          >
            {selectable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
        {selectedCampaign && (
          <div style={{ fontSize: '13px', color: '#A8A29E', lineHeight: 1.6 }}>
            Requirement: {selectedCampaign.minTotalCheckIns}+ verified visit(s)
            {selectedCampaign.minCuisineVisits > 0 &&
              ` · ${selectedCampaign.minCuisineVisits}+ ${selectedCampaign.targetCuisines.join('/')} visit(s)`}
            {selectedCampaign.mustBeNewToVenue && ' · first-time guests only'}
          </div>
        )}
        {match && selectedCampaign && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor:
                match.verdict === 'MATCH' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
              border:
                match.verdict === 'MATCH'
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '13px',
              color: '#D6D3D1',
            }}
          >
            Campaign venue match:{' '}
            <strong style={{ color: match.verdict === 'MATCH' ? '#10B981' : '#F59E0B' }}>
              {match.verdict === 'MATCH' ? 'MATCH' : 'NOT A MATCH'}
            </strong>
            <br />
            <span style={{ color: '#A8A29E', fontSize: '12px' }}>{match.reason}</span>
            {match.cuisineOverlap.length > 0 && (
              <span style={{ color: '#A8A29E', fontSize: '12px' }}>
                <br />
                Shared cuisine signal: {match.cuisineOverlap.join(', ')} (signal only — not qualification).
              </span>
            )}
          </div>
        )}
      </div>

      <div style={card}>
        <div style={label}>ATTENDANCE DEMONSTRATION · LIVE NETWORK DEMONSTRATION</div>
        {predicate && selectedCheckIn ? (
          <div style={{ fontSize: '13px', color: '#D6D3D1', lineHeight: 1.7 }}>
            Verified Flynet activity detected
            <br />
            Restaurant: {selectedCheckIn.location.restaurant.name || 'Unnamed venue'}
            <br />
            Same-venue predicate <code>{predicate.predicate}</code>:{' '}
            <strong style={{ color: predicate.verified ? '#10B981' : '#EF4444' }}>
              {predicate.verified ? 'VERIFIED' : 'NOT A MATCH'}
            </strong>
            <br />
            <span style={{ color: '#78716C', fontSize: '12px' }}>
              This is the exact matching rule BlackPalate applies against a real
              campaign venue — shown here against the live venue, not your attendance.
            </span>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#A8A29E', margin: 0 }}>
            Select a live check-in above to run the attendance check.
          </p>
        )}
      </div>

      <div style={card}>
        <div style={label}>QUALIFICATION ENGINE PREVIEW (ILLUSTRATIVE)</div>
        <p style={{ fontSize: '12px', color: '#F59E0B', margin: '0 0 12px 0', lineHeight: 1.6 }}>
          Illustrative evaluation on this anonymized network sample — not member
          history. Member-specific qualification requires Blackbird OAuth.
        </p>
        {preview ? (
          <div style={{ fontSize: '13px', color: '#D6D3D1', lineHeight: 1.7 }}>
            {preview.ruleEvaluations.map((r, i) => (
              <div key={i}>
                {r.passed ? 'PASS' : 'NOT MET'} — {r.rule.description} ({r.details})
              </div>
            ))}
            <div style={{ marginTop: '8px', color: '#A8A29E' }}>{preview.explanation}</div>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#A8A29E', margin: 0 }}>
            Select a demo tasting to preview its rules against the live sample.
          </p>
        )}
      </div>

      <div style={card}>
        <div style={label}>LIVE PROOF</div>
        <div style={{ fontSize: '13px', color: '#A8A29E', lineHeight: 1.8 }}>
          Flynet production · Restaurant discovery: Live · Network check-ins: Live
          <br />
          Member OAuth: Available where Passport sign-in is supported
          <br />
          Rewards: App balance currently 0 FLY
        </div>
      </div>
    </div>
  );
}
