import { NextResponse } from 'next/server';
import { createFlynetMemberClient, normalizeFlynetError } from '@/lib/flynet';
import { verifyOperatorSession, resolveOrCreateFlynetDinerUser } from '@/lib/auth';
import { db } from '@/lib/db/repository';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, decodeURIComponent(v || '')];
    })
  );

  const operatorToken = cookies['bp_operator_token'];
  const accessToken = cookies['bp_access_token'];

  // Check 1: Restaurant Operator Session
  if (operatorToken) {
    const operatorPayload = verifyOperatorSession(operatorToken);
    if (operatorPayload) {
      const user = await db.getUserById(operatorPayload.userId);
      const memberships = await db.getMembershipsByUserId(operatorPayload.userId);
      const restaurants = await Promise.all(
        memberships.map(m => db.getRestaurantById(m.restaurantId))
      );

      return NextResponse.json({
        authenticated: true,
        role: 'RESTAURANT',
        user: user || {
          id: operatorPayload.userId,
          displayName: operatorPayload.displayName,
          email: operatorPayload.email,
        },
        memberships,
        workspaces: restaurants.filter(Boolean),
      });
    }
  }

  // Check 2: Flynet Diner Session
  if (accessToken) {
    const member = createFlynetMemberClient(accessToken);
    try {
      const profile = await member.getProfile();
      const checkInsList = await member.listCheckIns({ page: 0, pageSize: 25 });
      const user = await resolveOrCreateFlynetDinerUser({
        id: profile.id,
        displayName: (profile as any).display_name || (profile as any).name,
      });

      return NextResponse.json({
        authenticated: true,
        role: 'DINER',
        user,
        profile,
        checkIns: checkInsList.checkIns || [],
        checkInsPagination: checkInsList.pagination,
      });
    } catch (err: any) {
      const norm = normalizeFlynetError(err);
      return NextResponse.json(
        {
          authenticated: false,
          error: norm.message,
          kind: norm.kind,
          code: norm.code,
        },
        { status: norm.kind === 'unauthorized' ? 401 : norm.kind === 'forbidden' ? 403 : 500 }
      );
    }
  }

  // Unauthenticated
  return NextResponse.json({
    authenticated: false,
    role: null,
    user: null,
  });
}
