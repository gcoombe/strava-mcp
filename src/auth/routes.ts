import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { StravaAuth } from '../auth.js';
import {
  saveTokens,
  getTokens,
  deleteTokens,
  savePendingAuth,
  getPendingAuth,
  saveAuthCode,
  getAuthCode
} from '../db.js';
import { generateToken } from './jwt.js';
import { requireAuth } from './middleware.js';
import { StravaTokenResponse } from '../types/strava.js';

const router = Router();

/**
 * Get Strava client credentials from environment
 */
function getStravaCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET are required');
  }

  return { clientId, clientSecret };
}

/**
 * Get OAuth client credentials from environment (for ChatGPT/external clients)
 */
function getOAuthClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET are required for HTTP mode');
  }

  return { clientId, clientSecret };
}

/**
 * Validate client credentials from request (Basic auth header or body)
 */
function validateClientCredentials(req: Request): boolean {
  const { clientId, clientSecret } = getOAuthClientCredentials();

  // Check Authorization header (Basic auth)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [headerClientId, headerClientSecret] = credentials.split(':');
    console.log('[OAuth] Basic auth - received client_id:', headerClientId);
    console.log('[OAuth] Basic auth - expected client_id:', clientId);
    console.log('[OAuth] Basic auth - credentials match:', headerClientId === clientId && headerClientSecret === clientSecret);
    return headerClientId === clientId && headerClientSecret === clientSecret;
  }

  // Check request body
  const { client_id: bodyClientId, client_secret: bodyClientSecret } = req.body;
  if (bodyClientId && bodyClientSecret) {
    console.log('[OAuth] Body auth - received client_id:', bodyClientId);
    console.log('[OAuth] Body auth - expected client_id:', clientId);
    console.log('[OAuth] Body auth - credentials match:', bodyClientId === clientId && bodyClientSecret === clientSecret);
    return bodyClientId === clientId && bodyClientSecret === clientSecret;
  }

  console.log('[OAuth] No credentials found in request');
  console.log('[OAuth] Auth header:', authHeader);
  console.log('[OAuth] Body keys:', Object.keys(req.body || {}));
  return false;
}

/**
 * Get the base URL for this server
 */
function getBaseUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

/**
 * Generate a random string for state/code
 */
function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify PKCE code_verifier against code_challenge
 */
function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
  if (method === 'plain') {
    return codeVerifier === codeChallenge;
  } else if (method === 'S256') {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }
  return false;
}

// ============================================
// OAuth 2.0 Authorization Server Endpoints
// ============================================

/**
 * GET /authorize - OAuth 2.0 Authorization Endpoint
 * Client redirects user here to start authorization
 */
router.get('/authorize', (req: Request, res: Response) => {
  const {
    response_type,
    client_id: _clientId, // Not validated - we're a public OAuth server
    redirect_uri,
    state: clientState,
    code_challenge,
    code_challenge_method,
  } = req.query;

  // Validate required parameters
  if (response_type !== 'code') {
    res.status(400).json({ error: 'invalid_request', error_description: 'response_type must be "code"' });
    return;
  }

  if (!redirect_uri || typeof redirect_uri !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'redirect_uri is required' });
    return;
  }

  try {
    const { clientId, clientSecret } = getStravaCredentials();
    const auth = new StravaAuth(clientId, clientSecret);

    // Generate our internal state to track this authorization
    const internalState = generateRandomString();

    // Save pending authorization
    savePendingAuth(
      internalState,
      redirect_uri,
      typeof clientState === 'string' ? clientState : undefined,
      typeof code_challenge === 'string' ? code_challenge : undefined,
      typeof code_challenge_method === 'string' ? code_challenge_method : undefined
    );

    // Our callback URL (Strava will redirect here)
    const baseUrl = getBaseUrl(req);
    const ourCallbackUri = `${baseUrl}/auth/callback`;

    // Build Strava authorization URL with our internal state
    const stravaAuthUrl = auth.getAuthorizationUrl(ourCallbackUri);
    const url = new URL(stravaAuthUrl);
    url.searchParams.set('state', internalState);

    res.redirect(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'server_error', error_description: message });
  }
});

/**
 * GET /callback - Our internal callback from Strava
 * After Strava auth, redirect to client's redirect_uri with our code
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code: stravaCode, state: internalState, error: oauthError } = req.query;

  if (typeof internalState !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'Missing state parameter' });
    return;
  }

  // Look up the pending authorization
  const pending = getPendingAuth(internalState);
  if (!pending) {
    res.status(400).json({ error: 'invalid_request', error_description: 'Invalid or expired state' });
    return;
  }

  const redirectUrl = new URL(pending.client_redirect_uri);

  // If Strava returned an error, pass it to the client
  if (oauthError) {
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('error_description', String(oauthError));
    if (pending.client_state) {
      redirectUrl.searchParams.set('state', pending.client_state);
    }
    res.redirect(redirectUrl.toString());
    return;
  }

  if (!stravaCode || typeof stravaCode !== 'string') {
    redirectUrl.searchParams.set('error', 'server_error');
    redirectUrl.searchParams.set('error_description', 'Missing authorization code from Strava');
    if (pending.client_state) {
      redirectUrl.searchParams.set('state', pending.client_state);
    }
    res.redirect(redirectUrl.toString());
    return;
  }

  try {
    const { clientId, clientSecret } = getStravaCredentials();

    // Exchange Strava code for tokens
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: stravaCode,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      redirectUrl.searchParams.set('error', 'server_error');
      redirectUrl.searchParams.set('error_description', `Strava token exchange failed: ${error.message || response.statusText}`);
      if (pending.client_state) {
        redirectUrl.searchParams.set('state', pending.client_state);
      }
      res.redirect(redirectUrl.toString());
      return;
    }

    const data = (await response.json()) as StravaTokenResponse;

    if (!data.athlete) {
      redirectUrl.searchParams.set('error', 'server_error');
      redirectUrl.searchParams.set('error_description', 'No athlete data in Strava response');
      if (pending.client_state) {
        redirectUrl.searchParams.set('state', pending.client_state);
      }
      res.redirect(redirectUrl.toString());
      return;
    }

    const athleteId = data.athlete.id;
    const athleteName = `${data.athlete.firstname} ${data.athlete.lastname}`.trim();

    // Save Strava tokens to our database
    saveTokens(athleteId, data.access_token, data.refresh_token, data.expires_at, athleteName);

    // Generate our authorization code
    const ourCode = generateRandomString();
    saveAuthCode(
      ourCode,
      athleteId,
      pending.client_redirect_uri,
      pending.code_challenge || undefined,
      pending.code_challenge_method || undefined
    );

    // Redirect to client with our code
    redirectUrl.searchParams.set('code', ourCode);
    if (pending.client_state) {
      redirectUrl.searchParams.set('state', pending.client_state);
    }
    res.redirect(redirectUrl.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    redirectUrl.searchParams.set('error', 'server_error');
    redirectUrl.searchParams.set('error_description', message);
    if (pending.client_state) {
      redirectUrl.searchParams.set('state', pending.client_state);
    }
    res.redirect(redirectUrl.toString());
  }
});

/**
 * POST /token - OAuth 2.0 Token Endpoint
 * Client exchanges authorization code for access token
 */
router.post('/token', async (req: Request, res: Response) => {
  // Validate client credentials first
  if (!validateClientCredentials(req)) {
    res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials' });
    return;
  }

  const { grant_type, code, redirect_uri, code_verifier } = req.body;

  if (grant_type !== 'authorization_code') {
    res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Only authorization_code is supported' });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'invalid_request', error_description: 'code is required' });
    return;
  }

  // Look up the authorization code
  const authCode = getAuthCode(code);
  if (!authCode) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' });
    return;
  }

  // Verify redirect_uri matches
  if (redirect_uri && redirect_uri !== authCode.client_redirect_uri) {
    res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' });
    return;
  }

  // Verify PKCE if code_challenge was provided during authorization
  if (authCode.code_challenge) {
    if (!code_verifier) {
      res.status(400).json({ error: 'invalid_request', error_description: 'code_verifier is required' });
      return;
    }
    const method = authCode.code_challenge_method || 'plain';
    if (!verifyPKCE(code_verifier, authCode.code_challenge, method)) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' });
      return;
    }
  }

  // Generate access token (JWT)
  const accessToken = generateToken(authCode.athlete_id);

  // Return OAuth 2.0 token response
  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    // We don't issue refresh tokens - users re-auth via Strava
  });
});

// ============================================
// Additional Endpoints
// ============================================

/**
 * GET /me - Get current athlete info
 * Requires JWT authentication
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const athleteId = req.athleteId!;
  const tokens = getTokens(athleteId);

  if (!tokens) {
    res.status(404).json({ error: 'Athlete not found. Please re-authenticate with Strava.' });
    return;
  }

  res.json({
    athlete_id: tokens.athlete_id,
    athlete_name: tokens.athlete_name,
    created_at: tokens.created_at,
    updated_at: tokens.updated_at,
  });
});

/**
 * POST /logout - Revoke tokens
 * Requires JWT authentication
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  const athleteId = req.athleteId!;
  const tokens = getTokens(athleteId);

  if (tokens) {
    // Optionally revoke token with Strava
    try {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `access_token=${tokens.access_token}`,
      });
    } catch {
      // Ignore revocation errors
    }

    deleteTokens(athleteId);
  }

  res.json({ message: 'Logged out successfully' });
});

export default router;
