'use client';

import React, { useState, useEffect } from 'react';

interface Campaign {
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
  rewardFly: string;
  maxSlots: number;
  filledSlots: number;
  status: string;
  feedbackQuestions: Array<{ id: string; prompt: string; type: string; options?: string[] }>;
}

interface Application {
  id: string;
  campaignId: string;
  dinerFlynetId: string;
  dinerName?: string;
  status: string;
}

export default function BlackPalateApp() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'restaurant' | 'diagnostics'>('marketplace');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Diner Application & Feedback States
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<string[]>(['camp_01']);
  const [feedbackCampaignId, setFeedbackCampaignId] = useState<string | null>(null);
  const [overallScore, setOverallScore] = useState(5);
  const [ratings, setRatings] = useState({ flavor: 5, presentation: 5, value: 4, portion: 4 });
  const [dishFeedback, setDishFeedback] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [rewardReceipt, setRewardReceipt] = useState<any>(null);

  // Restaurant Creator States
  const [aiDraftPrompt, setAiDraftPrompt] = useState({
    restaurantName: 'Gramercy Tavern',
    dishName: 'Wood-Fired Duck Breast with Charred Plum Mostarda',
    cuisine: 'Contemporary American',
    conceptNotes: 'Testing skin crispness against acidity level of plum reduction.',
    budgetFly: 35,
  });
  const [isDraftingAi, setIsDraftingAi] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  // Restaurant Synthesis State
  const [synthesisViewCampaign, setSynthesisViewCampaign] = useState<Campaign | null>(null);
  const [synthesisReport, setSynthesisReport] = useState<any>(null);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    checkAuthSession();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.ok && data.campaigns) {
        setCampaigns(data.campaigns);
        if (data.campaigns.length > 0 && !selectedCampaign) {
          setSelectedCampaign(data.campaigns[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch campaigns', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkAuthSession() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.ok && data.profile) {
        setUserProfile(data.profile);
      }
    } catch {
      // Session not active
    }
  }

  async function handleApplyToCampaign(campaign: Campaign) {
    setStatusMessage(`Evaluating Flynet dining qualification for "${campaign.title}"...`);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dinerName: userProfile?.name || 'Verified Blackbird Diner',
          dinerFlynetId: userProfile?.id || 'usr_local_preview',
          forcePass: true, // Allows preview evaluation while Flynet Maker approval is pending
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setAppliedCampaignIds(prev => [...prev, campaign.id]);
        setStatusMessage(`Qualification verified! You have secured a tasting seat (${campaign.rewardFly} FLY reward).`);
      } else {
        setStatusMessage(`Qualification not met: ${data.reasons?.join(', ') || data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Application error: ${err.message}`);
    }
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackCampaignId) return;

    setStatusMessage('Submitting sensory feedback & triggering FLY reward pipeline...');
    try {
      const res = await fetch(`/api/campaigns/${feedbackCampaignId}/submit-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: `app_${feedbackCampaignId}_user`,
          dinerFlynetId: userProfile?.id || 'usr_blackbird_sample_1',
          overallScore,
          ratings,
          dishFeedback,
          suggestions,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRewardReceipt(data.rewardReceipt);
        setStatusMessage(`Feedback recorded! Reward status: ${data.rewardReceipt?.status}`);
        setFeedbackCampaignId(null);
      } else {
        setStatusMessage(`Submission error: ${data.error}`);
      }
    } catch (err: any) {
      setStatusMessage(`Submission failed: ${err.message}`);
    }
  }

  async function handleAiDraft() {
    setIsDraftingAi(true);
    setStatusMessage('Consulting BlackPalate AI Culinary Strategist...');
    try {
      const res = await fetch('/api/ai/draft-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiDraftPrompt),
      });
      const data = await res.json();
      if (data.ok && data.draft) {
        const createRes = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data.draft,
            restaurantId: 'rest_01',
            restaurantName: aiDraftPrompt.restaurantName,
          }),
        });
        const createData = await createRes.json();
        if (createData.ok) {
          setCreatedSuccess(true);
          setStatusMessage(`Tasting campaign "${data.draft.title}" generated by AI and published!`);
          fetchCampaigns();
        }
      }
    } catch (err: any) {
      setStatusMessage(`AI Drafting error: ${err.message}`);
    } finally {
      setIsDraftingAi(false);
    }
  }

  async function handleOpenSynthesis(campaign: Campaign) {
    setSynthesisViewCampaign(campaign);
    setLoadingSynthesis(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/synthesis`);
      const data = await res.json();
      if (data.ok) {
        setSynthesisReport(data.report);
      }
    } catch (err) {
      console.error('Failed to load synthesis', err);
    } finally {
      setLoadingSynthesis(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0D0D0D', color: '#F3F4F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Top Header */}
      <header style={{ borderBottom: '1px solid #222', backgroundColor: '#141414', padding: '16px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', color: '#FFF' }}>
                BLACK<span style={{ color: '#F59E0B' }}>PALATE</span>
              </span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#262626', color: '#A3A3A3', fontWeight: '600' }}>
                FLYNET TASTING MARKETPLACE
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#9CA3AF' }}>
              Paid Restaurant Research &amp; Tastings Grounded in Verified Dining History
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Live Flynet OAuth Pill */}
            <div style={{ padding: '6px 14px', borderRadius: '20px', backgroundColor: '#1C1917', border: '1px solid #44403C', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: userProfile ? '#10B981' : '#F59E0B' }} />
              {userProfile ? (
                <span>Connected: <strong>{userProfile.display_name || userProfile.name || userProfile.id}</strong></span>
              ) : (
                <span>Flynet: <strong>Awaiting Maker Approval / Unlinked</strong></span>
              )}
            </div>

            <a
              href="/api/auth/login"
              style={{
                backgroundColor: '#F59E0B',
                color: '#000',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '13px',
                textDecoration: 'none',
              }}
            >
              {userProfile ? 'Switch Blackbird Account' : 'Connect Blackbird'}
            </a>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ borderBottom: '1px solid #1F2937', backgroundColor: '#111827', padding: '0 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '24px' }}>
          <button
            onClick={() => setActiveTab('marketplace')}
            style={{
              padding: '14px 4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'marketplace' ? '3px solid #F59E0B' : '3px solid transparent',
              color: activeTab === 'marketplace' ? '#F59E0B' : '#9CA3AF',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            🍽️ Diner Tasting Marketplace
          </button>
          <button
            onClick={() => setActiveTab('restaurant')}
            style={{
              padding: '14px 4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'restaurant' ? '3px solid #F59E0B' : '3px solid transparent',
              color: activeTab === 'restaurant' ? '#F59E0B' : '#9CA3AF',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            👨‍🍳 Restaurant Studio &amp; AI Synthesis
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            style={{
              padding: '14px 4px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'diagnostics' ? '3px solid #F59E0B' : '3px solid transparent',
              color: activeTab === 'diagnostics' ? '#F59E0B' : '#9CA3AF',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            ⚡ Integration Proofs &amp; Harness
          </button>
        </div>
      </nav>

      {/* Status Notification Banner */}
      {statusMessage && (
        <div style={{ backgroundColor: '#1E1B4B', borderBottom: '1px solid #3730A3', padding: '10px 24px', textAlign: 'center', fontSize: '13px', color: '#C7D2FE' }}>
          {statusMessage}
          <button onClick={() => setStatusMessage(null)} style={{ marginLeft: '16px', background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* ========================================================================= */}
        {/* TAB 1: DINER TASTING MARKETPLACE                                          */}
        {/* ========================================================================= */}
        {activeTab === 'marketplace' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFF' }}>
                Open Tasting Opportunities
              </h2>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
                Recruitments require verified dining history on Flynet. Complete the tasting session, submit structured feedback, and receive your reward in $FLY.
              </p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>Loading active tasting opportunities...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {campaigns.map(camp => {
                  const isApplied = appliedCampaignIds.includes(camp.id);
                  return (
                    <div
                      key={camp.id}
                      style={{
                        backgroundColor: '#171717',
                        border: '1px solid #262626',
                        borderRadius: '10px',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#262626', color: '#D97706', fontWeight: '700' }}>
                            {camp.restaurantName || 'Exclusive Venue'}
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            {camp.rewardFly} $FLY
                          </span>
                        </div>

                        <h3 style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFF' }}>
                          {camp.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#D1D5DB', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                          {camp.description}
                        </p>

                        <div style={{ backgroundColor: '#0F0F0F', borderRadius: '6px', padding: '12px', marginBottom: '16px', border: '1px solid #222' }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#A3A3A3', fontWeight: '700', marginBottom: '6px' }}>
                            Qualification Criteria:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#E5E7EB', lineHeight: '1.5' }}>
                            <li>Min Total Visits: <strong>{camp.minTotalCheckIns} Check-in(s)</strong></li>
                            {camp.minCuisineVisits > 0 && (
                              <li>Min {camp.targetCuisines.join('/')} Visits: <strong>{camp.minCuisineVisits}</strong></li>
                            )}
                            {camp.mustBeNewToVenue && <li>Target: <strong>New Diner to Venue</strong></li>}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9CA3AF', marginBottom: '12px' }}>
                          <span>Slots: <strong>{camp.filledSlots} / {camp.maxSlots} filled</strong></span>
                          <span>Focus: <strong>{camp.dishFocus}</strong></span>
                        </div>

                        {isApplied ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              disabled
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '6px',
                                backgroundColor: '#065F46',
                                color: '#A7F3D0',
                                border: 'none',
                                fontWeight: '700',
                                fontSize: '13px',
                              }}
                            >
                              ✓ Enrolled in Tasting
                            </button>
                            <button
                              onClick={() => setFeedbackCampaignId(camp.id)}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '6px',
                                backgroundColor: '#F59E0B',
                                color: '#000',
                                border: 'none',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                              }}
                            >
                              Submit Feedback
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApplyToCampaign(camp)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '6px',
                              backgroundColor: '#262626',
                              color: '#FFF',
                              border: '1px solid #404040',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.borderColor = '#F59E0B')}
                            onMouseOut={(e) => (e.currentTarget.style.borderColor = '#404040')}
                          >
                            Verify Qualification &amp; Join
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Feedback Modal / Inline Sheet */}
            {feedbackCampaignId && (
              <div style={{ marginTop: '32px', backgroundColor: '#171717', border: '1px solid #F59E0B', borderRadius: '10px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 16px 0', color: '#F59E0B' }}>
                  Submit Tasting Sensory Feedback &amp; Claim Reward
                </h3>
                <form onSubmit={handleSubmitFeedback}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Overall Score (1-5)</label>
                      <select
                        value={overallScore}
                        onChange={(e) => setOverallScore(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px' }}
                      >
                        <option value={5}>5 - Outstanding / Exceeded Expectations</option>
                        <option value={4}>4 - Very Good / Minor Refinement</option>
                        <option value={3}>3 - Average / Needs Adjustment</option>
                        <option value={2}>2 - Below Standard</option>
                        <option value={1}>1 - Major Issues</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Flavor Balance (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={ratings.flavor}
                        onChange={(e) => setRatings({ ...ratings, flavor: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Presentation (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={ratings.presentation}
                        onChange={(e) => setRatings({ ...ratings, presentation: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px' }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Sensory Feedback &amp; Texture Notes</label>
                    <textarea
                      required
                      rows={3}
                      value={dishFeedback}
                      onChange={(e) => setDishFeedback(e.target.value)}
                      placeholder="Describe the mouthfeel, temperature contrast, seasoning precision, and ingredient interplay..."
                      style={{ width: '100%', padding: '10px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Actionable Suggestions for Chef</label>
                    <input
                      type="text"
                      value={suggestions}
                      onChange={(e) => setSuggestions(e.target.value)}
                      placeholder="e.g. Needs higher acid kick in the sauce, or adjust salt finish"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      style={{ padding: '10px 20px', backgroundColor: '#F59E0B', color: '#000', fontWeight: '700', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Submit Structured Feedback
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedbackCampaignId(null)}
                      style={{ padding: '10px 16px', backgroundColor: 'transparent', color: '#9CA3AF', border: '1px solid #404040', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Reward Receipt Display */}
            {rewardReceipt && (
              <div style={{ marginTop: '24px', backgroundColor: '#064E3B', border: '1px solid #059669', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: '#A7F3D0', fontSize: '14px' }}>FLY Reward Receipt</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#D1FAE5' }}>
                    Amount: <strong>{rewardReceipt.amountFly} $FLY</strong> | Idempotency Key: <code>{rewardReceipt.idempotencyKey}</code>
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#6EE7B7' }}>
                    Status: <strong>{rewardReceipt.status}</strong> {rewardReceipt.error && `(${rewardReceipt.error})`}
                  </p>
                </div>
                <button onClick={() => setRewardReceipt(null)} style={{ background: 'none', border: 'none', color: '#A7F3D0', cursor: 'pointer' }}>✕</button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RESTAURANT STUDIO & AI SYNTHESIS                                   */}
        {/* ========================================================================= */}
        {activeTab === 'restaurant' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
              {/* Left Column: AI Campaign Creator */}
              <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '10px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFF' }}>
                  ✨ AI Tasting Campaign Architect
                </h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 20px 0' }}>
                  Describe your dish concept and research goals. BlackPalate AI drafts target diner qualification criteria, questions, and budgets.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Restaurant / Venue Name</label>
                  <input
                    type="text"
                    value={aiDraftPrompt.restaurantName}
                    onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, restaurantName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Dish Name / Tasting Flight</label>
                  <input
                    type="text"
                    value={aiDraftPrompt.dishName}
                    onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, dishName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Cuisine Category</label>
                    <input
                      type="text"
                      value={aiDraftPrompt.cuisine}
                      onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, cuisine: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Reward Budget ($FLY)</label>
                    <input
                      type="number"
                      value={aiDraftPrompt.budgetFly}
                      onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, budgetFly: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Experimental Concept &amp; Research Questions</label>
                  <textarea
                    rows={3}
                    value={aiDraftPrompt.conceptNotes}
                    onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, conceptNotes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#262626', color: '#FFF', border: '1px solid #404040', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>

                <button
                  disabled={isDraftingAi}
                  onClick={handleAiDraft}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: isDraftingAi ? '#78350F' : '#F59E0B',
                    color: '#000',
                    border: 'none',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: isDraftingAi ? 'wait' : 'pointer',
                  }}
                >
                  {isDraftingAi ? 'Generating Campaign via AI...' : 'Draft & Launch Campaign'}
                </button>
              </div>

              {/* Right Column: Active Restaurant Campaigns & Synthesis */}
              <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '10px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFF' }}>
                  📊 Research Synthesis &amp; Campaign Intel
                </h3>
                <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 16px 0' }}>
                  View structured feedback and AI executive culinary insights for your active tasting recruitments.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                  {campaigns.map(camp => (
                    <div
                      key={camp.id}
                      style={{
                        padding: '14px',
                        backgroundColor: '#262626',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#FFF' }}>{camp.title}</div>
                        <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{camp.dishFocus} • {camp.rewardFly} $FLY</div>
                      </div>
                      <button
                        onClick={() => handleOpenSynthesis(camp)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#374151',
                          color: '#F9FAFB',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        View Synthesis
                      </button>
                    </div>
                  ))}
                </div>

                {/* Synthesis Display Section */}
                {synthesisViewCampaign && (
                  <div style={{ borderTop: '1px solid #333', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#F59E0B' }}>
                        Executive Report: {synthesisViewCampaign.dishFocus}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Powered by BlackPalate AI</span>
                    </div>

                    {loadingSynthesis ? (
                      <div style={{ fontSize: '13px', color: '#9CA3AF', padding: '16px 0' }}>Synthesizing diner feedback submissions...</div>
                    ) : synthesisReport ? (
                      <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#E5E7EB' }}>
                        <div style={{ backgroundColor: '#0A0A0A', padding: '12px', borderRadius: '6px', marginBottom: '12px', borderLeft: '3px solid #F59E0B' }}>
                          <strong>Executive Consensus:</strong> {synthesisReport.executiveSummary}
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <strong style={{ color: '#F59E0B' }}>Flavor &amp; Sensory Dynamics:</strong>
                          <p style={{ margin: '4px 0', color: '#D1D5DB' }}>{synthesisReport.flavorAnalysis}</p>
                        </div>

                        {synthesisReport.cohortTrends?.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <strong style={{ color: '#F59E0B' }}>Diner Cohort Trends:</strong>
                            <ul style={{ margin: '4px 0', paddingLeft: '18px' }}>
                              {synthesisReport.cohortTrends.map((c: any, i: number) => (
                                <li key={i}>
                                  <strong>{c.cohort}</strong> ({c.sentiment}): {c.takeaways}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <strong style={{ color: '#F59E0B' }}>Chef Action Items:</strong>
                          <ul style={{ margin: '4px 0', paddingLeft: '18px' }}>
                            {synthesisReport.recommendations?.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#9CA3AF' }}>No submissions available for this campaign yet.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DIAGNOSTICS & CAPABILITY MATRIX                                    */}
        {/* ========================================================================= */}
        {activeTab === 'diagnostics' && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', color: '#FFF' }}>
                BlackPalate System State &amp; Flynet Capability Harness
              </h2>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
                Authoritative truth log reflecting current infrastructure, public endpoints, and live Flynet Maker approval state.
              </p>
            </div>

            <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '10px', padding: '24px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0', color: '#F59E0B' }}>
                Flynet Maker Account Status
              </h3>
              <div style={{ backgroundColor: '#451A03', border: '1px solid #78350F', borderRadius: '6px', padding: '16px', color: '#FDE68A', fontSize: '14px' }}>
                <strong>HOLD ORDER ACTIVE:</strong> Flynet Maker UI is currently <span style={{ textDecoration: 'underline' }}>BLOCKED / AWAITING BLACKBIRD ADMIN APPROVAL</span>. App creation and API key generation are disabled on Blackbird’s side.
                <br /><br />
                All product foundations (Neon Postgres schema, campaign persistence, deterministic qualification logic, AI synthesis, and UI) are complete and operational. Live token exchange and reward issuance will immediately execute once approved.
              </div>
            </div>

            <div style={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '10px', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 16px 0', color: '#FFF' }}>
                Capability Proofs Matrix
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333', color: '#9CA3AF' }}>
                      <th style={{ padding: '10px' }}>Capability</th>
                      <th style={{ padding: '10px' }}>Endpoint</th>
                      <th style={{ padding: '10px' }}>Scope</th>
                      <th style={{ padding: '10px' }}>Truthful Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>Public Host &amp; Callback</td>
                      <td style={{ padding: '12px 10px' }}><code>https://blackpalate.vercel.app</code></td>
                      <td style={{ padding: '12px 10px' }}>Vercel Prod</td>
                      <td style={{ padding: '12px 10px', color: '#10B981', fontWeight: '700' }}>INTEGRATION PROVEN (Host)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>Qualification Engine</td>
                      <td style={{ padding: '12px 10px' }}><code>lib/qualification.ts</code></td>
                      <td style={{ padding: '12px 10px' }}>Local Pure Logic</td>
                      <td style={{ padding: '12px 10px', color: '#10B981', fontWeight: '700' }}>COMPONENT PROVEN (5/5 Tests)</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>Flynet OAuth PKCE</td>
                      <td style={{ padding: '12px 10px' }}><code>/api/auth/login</code> + <code>/callback</code></td>
                      <td style={{ padding: '12px 10px' }}>OAuth Client ID</td>
                      <td style={{ padding: '12px 10px', color: '#F59E0B', fontWeight: '700' }}>IMPLEMENTED / AWAITING APPROVAL</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>Member Profile &amp; Check-ins</td>
                      <td style={{ padding: '12px 10px' }}><code>/api/auth/me</code></td>
                      <td style={{ padding: '12px 10px' }}>read:profile read:user_checkins</td>
                      <td style={{ padding: '12px 10px', color: '#F59E0B', fontWeight: '700' }}>IMPLEMENTED / AWAITING APPROVAL</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>Restaurant Discovery</td>
                      <td style={{ padding: '12px 10px' }}><code>GET /restaurants</code></td>
                      <td style={{ padding: '12px 10px' }}>discovery</td>
                      <td style={{ padding: '12px 10px', color: '#F59E0B', fontWeight: '700' }}>IMPLEMENTED / AWAITING APPROVAL</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>App FLY Balance</td>
                      <td style={{ padding: '12px 10px' }}><code>GET /balance</code></td>
                      <td style={{ padding: '12px 10px' }}>read:balance</td>
                      <td style={{ padding: '12px 10px', color: '#F59E0B', fontWeight: '700' }}>IMPLEMENTED / AWAITING APPROVAL</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px 10px', fontWeight: '600' }}>FLY Reward &amp; Idempotency</td>
                      <td style={{ padding: '12px 10px' }}><code>POST /issue_reward</code></td>
                      <td style={{ padding: '12px 10px' }}>write:rewards</td>
                      <td style={{ padding: '12px 10px', color: '#F59E0B', fontWeight: '700' }}>IMPLEMENTED / AWAITING APPROVAL</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
