import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { resolveRequestIdentity } from '@/lib/auth/resolve';
import { safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Same session source as every protected route: shared identity resolution.
    const identity = await resolveRequestIdentity(req);

    // Unauthenticated state: Return empty state safely without exposing any other user's records
    if (!identity.authenticated) {
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

    const userId = identity.user.id;

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
      authenticated: true,
      tastings: {
        upcoming,
        needsAction,
        completed,
        all: userApps,
      },
    });
  } catch (err: any) {
    return safeCatch(err);
  }
}
