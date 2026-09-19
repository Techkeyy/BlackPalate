import { NextResponse } from 'next/server';
import { flynetMemberFetch } from '@/lib/flynet';

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, decodeURIComponent(v || '')];
    })
  );

  const accessToken = cookies['bp_access_token'];

  if (!accessToken) {
    return NextResponse.json(
      {
        authenticated: false,
        error: 'Not authenticated with Flynet. Please connect Blackbird account.',
      },
      { status: 401 }
    );
  }

  // 1. Fetch Profile (Proof C)
  const profileRes = await flynetMemberFetch<any>('/users/me', accessToken);

  // 2. Fetch Check-ins (Proof D)
  const checkInsRes = await flynetMemberFetch<any>('/users/me/check_ins?page=0&page_size=25', accessToken);

  return NextResponse.json({
    authenticated: true,
    profile: profileRes.ok ? profileRes.data : null,
    profileStatus: profileRes.status,
    profileError: profileRes.error,
    checkIns: checkInsRes.ok ? checkInsRes.data?.check_ins || [] : [],
    checkInsPagination: checkInsRes.ok ? checkInsRes.data?.pagination || {} : null,
    checkInsStatus: checkInsRes.status,
    checkInsError: checkInsRes.error,
  });
}
