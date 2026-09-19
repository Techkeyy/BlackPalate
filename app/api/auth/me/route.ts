import { NextResponse } from 'next/server';
import { createFlynetMemberClient, normalizeFlynetError } from '@/lib/flynet';
import { neonAuth, resolveOrCreateRestaurantUser, resolveOrCreateFlynetDinerUser } from '@/lib/auth';
import { db } from '@/lib/db/repository';
import { safeError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Check 1: Real Managed Neon Auth Session
  try {
    const sessionRes = await neonAuth.getSession({
      headers: req.headers,
    } as any).catch(() => null);

    const sessionData = (sessionRes as any)?.data || sessionRes;
    const neonUser = sessionData?.user || sessionData?.session?.user;

    if (neonUser && neonUser.id) {
      const user = await resolveOrCreateRestaurantUser({
        id: neonUser.id,
        email: neonUser.email,
        name: neonUser.name || neonUser.displayName,
        avatarUrl: neonUser.image || neonUser.avatarUrl,
      });

      const memberships = await db.getMembershipsByUserId(user.id);
      const restaurants = await Promise.all(
        memberships.map(m => db.getRestaurantById(m.restaurantId))
      );

      return NextResponse.json({
        authenticated: true,
        role: 'RESTAURANT',
        user,
        memberships,
        workspaces: restaurants.filter(Boolean),
      });
    }
  } catch (err) {
    console.warn('[auth/me] Neon Auth session lookup error:', err);
  }

  // Check 2: Flynet Diner OAuth Session
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, decodeURIComponent(v || '')];
    })
  );

  const accessToken = cookies['bp_access_token'];
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
      return safeError(
        norm.kind === 'unauthorized' ? 401 : norm.kind === 'forbidden' ? 403 : 500,
        norm.kind === 'unauthorized' ? 'UNAUTHORIZED' : 'FLYNET_UNAVAILABLE',
        norm
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
