import { NextResponse } from 'next/server';
import { createFlynetMemberClient, normalizeFlynetError } from '@/lib/flynet';

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

  const member = createFlynetMemberClient(accessToken);

  try {
    const profile = await member.getProfile();
    const checkInsList = await member.listCheckIns({ page: 0, pageSize: 25 });

    return NextResponse.json({
      authenticated: true,
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
