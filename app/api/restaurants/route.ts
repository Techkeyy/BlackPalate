import { NextResponse } from 'next/server';
import { db } from '@/lib/db/repository';
import { getAuthenticatedOperator } from '@/lib/auth';
import { safeError, safeCatch } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const restaurants = await db.getRestaurants();
    return NextResponse.json({ ok: true, restaurants });
  } catch (err: any) {
    return safeCatch(err);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate operator via real Neon Auth session
    const operatorCtx = await getAuthenticatedOperator(req);
    if (!operatorCtx) {
      return safeError(401, 'UNAUTHORIZED', 'workspace creation without session');
    }

    const body = await req.json();
    if (!body.name || !body.cuisine) {
      return safeError(400, 'VALIDATION');
    }

    // 2. Create Restaurant entity
    const restId = `rest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const restaurant = await db.createRestaurant({
      id: restId,
      name: body.name,
      cuisine: Array.isArray(body.cuisine) ? body.cuisine : [body.cuisine],
      neighborhood: body.neighborhood || 'NYC',
      priceTier: Number(body.priceTier) || 2,
      isDemo: false,
    });

    // 3. Grant OWNER role to the authenticated user
    const membership = await db.createMembership({
      userId: operatorCtx.user.id,
      restaurantId: restaurant.id,
      role: 'OWNER',
    });

    return NextResponse.json({
      ok: true,
      restaurant,
      membership,
      message: 'Restaurant workspace created and ownership assigned.',
    }, { status: 201 });
  } catch (err: any) {
    return safeCatch(err);
  }
}
