import { NextRequest, NextResponse } from 'next/server';
import { neonAuth } from '@/lib/auth/neon-server';

const NEON_SESSION_VERIFIER = 'neon_auth_session_verifier';
const NEON_SESSION_CHALLENGE_COOKIES = [
  '__Secure-neon-auth.session_challenge',
  '__Secure-neon-auth.session_challange',
];

function hasCookie(cookieHeader: string, name: string): boolean {
  return cookieHeader.split(';').some((part) => part.trim().startsWith(`${name}=`));
}

function getSetCookieHeaders(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();

  const combined = response.headers.get('set-cookie');
  return combined ? [combined] : [];
}

function getSetCookieNames(response: Response): string[] {
  const names = new Set<string>();
  for (const header of getSetCookieHeaders(response)) {
    const name = header.match(/^\s*([^=;,\s]+)=/)?.[1];
    if (name?.startsWith('__Secure-neon-auth')) names.add(name);
  }
  return Array.from(names);
}

const neonVerifierMiddleware = neonAuth.middleware({ loginUrl: '/auth/sign-in' });

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const verifierPresent = request.nextUrl.searchParams.has(NEON_SESSION_VERIFIER);
  if (!verifierPresent) return NextResponse.next();

  const cookieHeader = request.headers.get('cookie') || '';
  const challengeCookiePresent = NEON_SESSION_CHALLENGE_COOKIES.some((name) =>
    hasCookie(cookieHeader, name)
  );

  console.info(
    `[Neon OAuth] verifier_request_received ${JSON.stringify({
      middlewareEntered: true,
      verifierPresent: true,
      challengeCookiePresent,
    })}`
  );

  // The SDK only exchanges a verifier when the OAuth challenge cookie from the
  // initiating request is present. Do not invoke its route-protection fallback
  // for a malformed public request.
  if (!challengeCookiePresent) {
    console.info(
      `[Neon OAuth] verifier_request_skipped ${JSON.stringify({
        verifierPresent: true,
        challengeCookiePresent: false,
      })}`
    );
    return NextResponse.next();
  }

  const response = await neonVerifierMiddleware(request);
  const setCookieNames = getSetCookieNames(response);
  const redirectComplete = response.status >= 300 && response.status < 400;

  console.info(
    `[Neon OAuth] middleware_response_created ${JSON.stringify({
      verifierPresent: true,
      setCookieHeaderPresent: setCookieNames.length > 0,
      setCookieCount: setCookieNames.length,
      setCookieNames,
      redirectComplete,
    })}`
  );

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
