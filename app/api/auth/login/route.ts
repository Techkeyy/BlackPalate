import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFlynetConfig } from '@/lib/flynet';

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET(req: Request) {
  const config = getFlynetConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: 'NEXT_PUBLIC_FLYNET_CLIENT_ID is not configured.' },
      { status: 400 }
    );
  }

  // Generate PKCE code_verifier and code_challenge (S256)
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(hash);
  const state = base64UrlEncode(crypto.randomBytes(16));

  const scopes = process.env.NEXT_PUBLIC_FLYNET_SCOPES || 'read:profile read:user_checkins read:wallets';

  const authUrl = new URL(`${config.oauthBaseUrl}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri || '');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl.toString());

  // Stash state and code_verifier in HttpOnly cookies
  response.cookies.set('bp_oauth_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  response.cookies.set('bp_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  return response;
}
