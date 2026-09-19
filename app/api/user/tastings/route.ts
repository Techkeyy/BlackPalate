import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { createFlynetMemberClient } from '@/lib/flynet';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, v] = c.trim().split('=');
        return [k, decodeURIComponent(v || '')];
      })
    );
    const accessToken = cookies['bp_access_token'];

    // Unauthenticated state: Return empty state safely without exposing any other user's records
    if (!accessToken) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        tastings: {
          upcoming: [],
          needsAction: [],
          completed: [],
          all: [],
        },
      });
    }

    let dinerFlynetId: string;
    try {
      const member = createFlynetMemberClient(accessToken);
      const profile = await member.getProfile();
      dinerFlynetId = profile.id;
    } catch {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        tastings: {
          upcoming: [],
          needsAction: [],
          completed: [],
          all: [],
        },
      });
    }

    const userApps = await db.getUserApplications(dinerFlynetId);

    const upcoming = userApps.filter(
      a => a.status === 'QUALIFIED' || a.status === 'JOINED' || a.status === 'ATTENDANCE_PENDING'
    );
    const needsAction = userApps.filter(a => a.status === 'ATTENDANCE_VERIFIED');
    const completed = userApps.filter(
      a => a.status === 'SUBMITTED' || a.status === 'REWARD_PENDING' || a.status === 'REWARDED'
    );

    return NextResponse.json({
      ok: true,
      authenticated: true,
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
