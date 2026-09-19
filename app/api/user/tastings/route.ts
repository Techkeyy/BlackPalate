import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || 'usr_blackbird_sample_1';

    const userApps = await db.getUserApplications(userId);

    const upcoming = userApps.filter(
      a => a.status === 'QUALIFIED' || a.status === 'JOINED' || a.status === 'ATTENDANCE_PENDING'
    );
    const needsAction = userApps.filter(a => a.status === 'ATTENDANCE_VERIFIED');
    const completed = userApps.filter(
      a => a.status === 'SUBMITTED' || a.status === 'REWARD_PENDING' || a.status === 'REWARDED'
    );

    return NextResponse.json({
      ok: true,
      tastings: {
        upcoming,
        needsAction,
        completed,
        all: userApps,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Failed to fetch user tastings' },
      { status: 500 }
    );
  }
}

