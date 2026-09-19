import { NextResponse } from 'next/server';
import { resolveOrCreateRestaurantUser, signOperatorSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email || 'operator@blackpalate.demo';
    const displayName = body.displayName || 'Chef Marco / Operator';
    const restaurantAuthUserId = body.restaurantAuthUserId || `auth_google_${Buffer.from(email).toString('hex').slice(0, 12)}`;

    // Resolve or create internal BlackPalate user and restaurant membership
    const { user, memberships } = await resolveOrCreateRestaurantUser({
      restaurantAuthUserId,
      email,
      displayName,
      avatarUrl: body.avatarUrl || null,
    });

    // Sign session token
    const token = signOperatorSession({
      userId: user.id,
      email: user.email || email,
      displayName: user.displayName,
      restaurantAuthUserId,
    });

    const response = NextResponse.json({
      ok: true,
      user,
      memberships,
      message: 'Restaurant operator session established.',
    });

    // Set HttpOnly operator session cookie
    response.cookies.set({
      name: 'bp_operator_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Operator login failed' },
      { status: 500 }
    );
  }
}

