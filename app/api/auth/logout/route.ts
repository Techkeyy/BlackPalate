import { NextResponse } from 'next/server';
import { clearFlynetCookies } from '@/lib/auth/session-cookies';

/**
 * Clears the Flynet diner session cookies (HttpOnly, Path-mirrored).
 * Restaurant logout is handled separately via the Neon Auth client signOut.
 * The frontend invokes both on explicit sign-out.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true, message: 'Flynet session cleared.' });
  const isProd = process.env.NODE_ENV === 'production';
  for (const cleared of clearFlynetCookies(isProd)) {
    res.cookies.set(cleared.name, '', cleared.options as any);
  }
  return res;
}
