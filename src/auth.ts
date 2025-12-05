import { StravaTokens, StravaTokenResponse } from './types/strava.js';

export class StravaAuth {
  private clientId: string;
  private clientSecret: string;
  private tokens: StravaTokens | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Set tokens manually (e.g., from environment variables)
   */
  setTokens(accessToken: string, refreshToken: string, expiresAt: number): void {
    this.tokens = {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(code: string): Promise<StravaTokens> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to exchange token: ${error.message || response.statusText}`);
    }

    const data = (await response.json()) as StravaTokenResponse;

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };

    return this.tokens;
  }

  /**
   * Refresh the access token if expired
   */
  async refreshAccessToken(): Promise<StravaTokens> {
    if (!this.tokens) {
      throw new Error('No tokens available to refresh');
    }

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.tokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to refresh token: ${error.message || response.statusText}`);
    }

    const data = (await response.json()) as StravaTokenResponse;

    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };

    return this.tokens;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate first.');
    }

    // Check if token is expired or will expire in the next 5 minutes
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 300; // 5 minutes

    if (this.tokens.expiresAt <= now + bufferTime) {
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(redirectUri: string, scope: string = 'read,activity:read_all,activity:write,profile:read_all'): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
    });

    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Check if tokens are available
   */
  hasTokens(): boolean {
    return this.tokens !== null;
  }
}
