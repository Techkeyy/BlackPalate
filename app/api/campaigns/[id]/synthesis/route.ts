import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { synthesizeFeedbackWithAI, AiResponseMetadata } from '@/lib/ai';
import { safeError, safeCatch } from '@/lib/api-errors';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await db.getCampaignById(params.id);
    if (!campaign) {
      return safeError(404, 'NOT_FOUND');
    }

    // Check if report already exists in database
    let report = await db.getSynthesis(params.id);
    const submissions = await db.getFeedbacks(params.id);
    let meta: AiResponseMetadata = { mode: 'template', provider: 'template' };

    if (!report && submissions.length > 0) {
      // Generate new AI synthesis report
      const result = await synthesizeFeedbackWithAI(campaign, submissions);
      report = await db.saveSynthesis(result.report);
      meta = result.meta;
    } else if (!report) {
      // Fallback empty draft report
      report = {
        id: `synth_preview_${params.id}`,
        campaignId: params.id,
        executiveSummary: 'Tasting campaign is currently active. Waiting for diner submissions to generate culinary synthesis.',
        flavorAnalysis: 'Data points will populate automatically upon completion of tastings.',
        cohortTrends: [],
        recommendations: ['Monitor initial qualified applicants.'],
        rawSubmissionCount: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      ok: true,
      report,
      submissionsCount: submissions.length,
      submissions,
      meta,
    });
  } catch (err: any) {
    return safeCatch(err);
  }
}
