import { Campaign, FeedbackSubmission, FeedbackQuestion, SynthesisReport } from './db/types';

export interface CampaignDraftPrompt {
  restaurantName: string;
  dishName: string;
  cuisine: string;
  conceptNotes: string;
  targetAudience?: string;
  budgetFly?: number;
}

export interface GeneratedCampaignDraft {
  title: string;
  description: string;
  dishFocus: string;
  targetCuisines: string[];
  minTotalCheckIns: number;
  minCuisineVisits: number;
  mustBeNewToVenue: boolean;
  rewardFly: string;
  maxSlots: number;
  feedbackQuestions: FeedbackQuestion[];
}

export interface AiResponseMetadata {
  mode: 'ai' | 'template';
  provider: 'deepseek' | 'openai' | 'template';
  model?: string;
}

export async function draftCampaignWithAI(input: CampaignDraftPrompt): Promise<{
  draft: GeneratedCampaignDraft;
  meta: AiResponseMetadata;
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const isDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const endpoint = isDeepSeek
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini';

  const systemPrompt = `You are the BlackPalate AI Culinary Research Strategist.
Your goal is to help elite restaurants create high-signal tasting campaigns to recruit verified diners on Blackbird/Flynet.
Respond ONLY with a valid JSON object matching the requested schema.`;

  const userPrompt = `Restaurant: ${input.restaurantName}
Dish/Concept: ${input.dishName}
Cuisine: ${input.cuisine}
Research Goals: ${input.conceptNotes}
Target Diner Profile: ${input.targetAudience || 'Discerning diners with verified dining history'}
Reward Budget: ${input.budgetFly || 25} FLY per diner

Generate a structured tasting campaign proposal with:
1. title: Compelling tasting job title
2. description: Engaging briefing for qualified diners
3. dishFocus: Exact dish or flight being tested
4. targetCuisines: Array of relevant cuisines (e.g. ["${input.cuisine}", "Fine Dining"])
5. minTotalCheckIns: Suggested minimum Flynet check-ins (1-5)
6. minCuisineVisits: Suggested minimum visits in this specific cuisine (0-3)
7. mustBeNewToVenue: boolean (true if restaurant wants fresh eyes, false if regulars welcome)
8. rewardFly: suggested reward as a string (e.g. "${input.budgetFly || 25}")
9. maxSlots: number of tasting slots (typically 4 to 12)
10. feedbackQuestions: Array of 3-4 structured research questions [{ id: "q1", prompt: "...", type: "scale" | "yes_no" | "choice" | "text", options?: ["..."] }]`;

  if (apiKey) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            draft: {
              title: parsed.title || `${input.dishName} Sensory Tasting`,
              description: parsed.description || input.conceptNotes,
              dishFocus: parsed.dishFocus || input.dishName,
              targetCuisines: parsed.targetCuisines || [input.cuisine],
              minTotalCheckIns: Number(parsed.minTotalCheckIns) || 2,
              minCuisineVisits: Number(parsed.minCuisineVisits) || 1,
              mustBeNewToVenue: Boolean(parsed.mustBeNewToVenue),
              rewardFly: String(parsed.rewardFly || input.budgetFly || '25'),
              maxSlots: Number(parsed.maxSlots) || 8,
              feedbackQuestions: parsed.feedbackQuestions || [
                { id: 'q1', prompt: 'Rate flavor balance and seasoning accuracy:', type: 'scale' },
                { id: 'q2', prompt: 'Was the portion size appropriate?', type: 'yes_no' },
                { id: 'q3', prompt: 'Specific feedback on texture and temperature:', type: 'text' },
              ],
            },
            meta: {
              mode: 'ai',
              provider: isDeepSeek ? 'deepseek' : 'openai',
              model,
            },
          };
        }
      }
    } catch (err) {
      console.warn('[AI] Model call failed, using deterministic template:', err);
    }
  }

  // Explicit template fallback
  return {
    draft: {
      title: `${input.dishName} Tasting & Menu Development Research`,
      description: `Join ${input.restaurantName} for an exclusive tasting of our new ${input.dishName}. We are collecting structured culinary feedback from verified ${input.cuisine} enthusiasts.`,
      dishFocus: input.dishName,
      targetCuisines: [input.cuisine, 'Fine Dining'].filter(Boolean),
      minTotalCheckIns: 2,
      minCuisineVisits: 1,
      mustBeNewToVenue: false,
      rewardFly: String(input.budgetFly || '25'),
      maxSlots: 8,
      feedbackQuestions: [
        {
          id: 'q1',
          prompt: `How balanced were the core flavor profiles in this ${input.dishName}?`,
          type: 'scale',
        },
        {
          id: 'q2',
          prompt: 'Was the portion size and ingredient quality commensurate with premium dining?',
          type: 'yes_no',
        },
        {
          id: 'q3',
          prompt: 'Detailed feedback on texture, aroma, and execution nuance:',
          type: 'text',
        },
        {
          id: 'q4',
          prompt: 'Would you order this dish again at standard full menu pricing?',
          type: 'choice',
          options: ['Definitely Yes', 'Likely Yes', 'Neutral / Needs Tweaks', 'No'],
        },
      ],
    },
    meta: {
      mode: 'template',
      provider: 'template',
    },
  };
}

export async function synthesizeFeedbackWithAI(
  campaign: Campaign,
  submissions: FeedbackSubmission[]
): Promise<{
  report: Omit<SynthesisReport, 'id' | 'generatedAt'>;
  meta: AiResponseMetadata;
}> {
  if (submissions.length === 0) {
    return {
      report: {
        campaignId: campaign.id,
        executiveSummary: 'No diner feedback submissions have been recorded yet.',
        flavorAnalysis: 'Awaiting initial sensory evaluations.',
        cohortTrends: [],
        recommendations: ['Promote tasting campaign to qualified diners.'],
        rawSubmissionCount: 0,
      },
      meta: {
        mode: 'template',
        provider: 'template',
      },
    };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const isDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const endpoint = isDeepSeek
    ? 'https://api.deepseek.com/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini';

  const avgScore = (
    submissions.reduce((acc, s) => acc + s.overallScore, 0) / submissions.length
  ).toFixed(1);

  const avgFlavor = (
    submissions.reduce((acc, s) => acc + (s.ratings?.flavor || 0), 0) / submissions.length
  ).toFixed(1);

  const avgPresentation = (
    submissions.reduce((acc, s) => acc + (s.ratings?.presentation || 0), 0) / submissions.length
  ).toFixed(1);

  const avgValue = (
    submissions.reduce((acc, s) => acc + (s.ratings?.value || 0), 0) / submissions.length
  ).toFixed(1);

  if (apiKey) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content:
                'You are an executive culinary consultant summarizing sensory tasting research for the head chef and restaurant owner. Respond ONLY with a valid JSON object.',
            },
            {
              role: 'user',
              content: `Campaign: ${campaign.title} (${campaign.dishFocus})
Restaurant: ${campaign.restaurantName || 'Restaurant'}
Submissions Count: ${submissions.length}
Metrics: Overall Avg: ${avgScore}/5, Flavor: ${avgFlavor}/5, Presentation: ${avgPresentation}/5, Value: ${avgValue}/5
Raw Submissions: ${JSON.stringify(submissions.map(s => ({
                score: s.overallScore,
                ratings: s.ratings,
                dishFeedback: s.dishFeedback,
                suggestions: s.suggestions,
                answers: s.answers,
              })))}

Synthesize this data into:
1. executiveSummary: High-level overview of diner consensus
2. flavorAnalysis: Deep dive into flavor balance, texture, temperature, technique
3. cohortTrends: Array of [{ cohort: "e.g. Verified Enthusiasts", sentiment: "e.g. Highly positive", takeaways: "..." }]
4. recommendations: Array of 3-4 specific, actionable recipe or menu adjustments`,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        if (parsed.executiveSummary) {
          return {
            report: {
              campaignId: campaign.id,
              executiveSummary: parsed.executiveSummary,
              flavorAnalysis: parsed.flavorAnalysis || `Overall flavor rating averaged ${avgFlavor}/5 with positive reception across technique and texture.`,
              cohortTrends: parsed.cohortTrends || [],
              recommendations: parsed.recommendations || [],
              rawSubmissionCount: submissions.length,
            },
            meta: {
              mode: 'ai',
              provider: isDeepSeek ? 'deepseek' : 'openai',
              model,
            },
          };
        }
      }
    } catch (err) {
      console.warn('[AI] Synthesis LLM call failed, using statistical template synthesis:', err);
    }
  }

  // Statistical template synthesis
  const notes = submissions.map(s => s.dishFeedback).filter(Boolean);
  const suggestionList = submissions.map(s => s.suggestions).filter(Boolean);

  return {
    report: {
      campaignId: campaign.id,
      executiveSummary: `Diners rated ${campaign.dishFocus} with an average overall score of ${avgScore}/5 across ${submissions.length} verified tasting session(s). Flavor satisfaction scored ${avgFlavor}/5 and presentation achieved ${avgPresentation}/5.`,
      flavorAnalysis: notes.length > 0
        ? `Key diner sensory feedback: "${notes.slice(0, 2).join(' ')}"`
        : `Solid flavor ratings with high consistency across respondents (Flavor avg: ${avgFlavor}/5, Value avg: ${avgValue}/5).`,
      cohortTrends: [
        {
          cohort: `Verified ${campaign.targetCuisines.join('/') || 'Dining'} Enthusiasts`,
          sentiment: Number(avgScore) >= 4 ? 'Strongly Favorable' : 'Constructive Feedback',
          takeaways: `Participants appreciated the core execution of the ${campaign.dishFocus}, highlighting technique precision and balance.`,
        },
      ],
      recommendations: [
        `Maintain core seasoning and presentation standard (${avgFlavor}/5 flavor score).`,
        suggestionList.length > 0 ? `Consider diner suggestion: "${suggestionList[0]}"` : 'Validate portion vs. cost positioning prior to broad menu release.',
        'Schedule follow-up tasting flight once iteration is plated.',
      ],
      rawSubmissionCount: submissions.length,
    },
    meta: {
      mode: 'template',
      provider: 'template',
    },
  };
}
