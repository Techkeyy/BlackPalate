import { NextResponse } from 'next/server';
import { getFlynetConfig } from '@/lib/flynet';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, req.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=missing_code', req.url)
    );
  }

  // Retrieve code_verifier and state from cookies
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, v] = c.trim().split('=');
      return [k, decodeURIComponent(v || '')];
    })
  );

  const storedVerifier = cookies['bp_oauth_verifier'];
  const storedState = cookies['bp_oauth_state'];

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL('/?error=invalid_oauth_state', req.url)
    );
  }

  const config = getFlynetConfig();

  // Exchange code at /oauth/token
  const tokenUrl = `${config.oauthBaseUrl}/token`;
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId || '',
    client_secret: config.clientSecret || '',
    code,
    redirect_uri: config.redirectUri || '',
    code_verifier: storedVerifier || '',
  });

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text().catch(() => '');
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(`Token exchange failed: ${tokenRes.status} ${errText}`)}`, req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    const response = NextResponse.redirect(new URL('/?oauth_success=true', req.url));

    // Stash access token in HttpOnly session cookie (short-lived)
    response.cookies.set('bp_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in || 3600,
    });

    // Stash refresh token in HttpOnly cookie (up to 30 days)
    if (refresh_token) {
      response.cookies.set('bp_refresh_token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 3600,
      });
    }

    // Clean up temporary verifier cookies
    response.cookies.delete('bp_oauth_verifier');
    response.cookies.delete('bp_oauth_state');

    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(err.message || 'Token exchange network error')}`, req.url)
    );
  }
}
