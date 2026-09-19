import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { resolveRequestIdentity } from '@/lib/auth/resolve';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const identity = await resolveRequestIdentity(req);

  if (!identity.authenticated) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      user: null,
    });
  }

  if (identity.role === 'RESTAURANT') {
    const restaurants = await Promise.all(
      identity.memberships.map(m => db.getRestaurantById(m.restaurantId))
    );
    return NextResponse.json({
      authenticated: true,
      role: 'RESTAURANT',
      user: identity.user,
      memberships: identity.memberships,
      workspaces: restaurants.filter(Boolean),
    });
  }

  return NextResponse.json({
    authenticated: true,
    role: 'DINER',
    user: identity.user,
    profile: identity.profile,
    checkIns: identity.checkIns,
    checkInsPagination: null,
  });
}
