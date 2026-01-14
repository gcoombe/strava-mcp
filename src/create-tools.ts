import { z } from 'zod';
import { StravaAuth } from './auth.js';
import { StravaClient } from './strava-client.js';
import { createActivityTools } from './tools/activities.js';
import { createAthleteTools } from './tools/athlete.js';
import { createRouteTools } from './tools/routes.js';
import { createSegmentTools } from './tools/segments.js';
import { createClubTools } from './tools/clubs.js';
import { createGearTools } from './tools/gear.js';

/**
 * MCP tool response format
 */
export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Tool definition with Zod schema validation
 */
export interface ToolDefinition {
  description: string;
  inputSchema: z.ZodType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<ToolResponse>;
}

/**
 * All tools indexed by name
 */
export type AllTools = Record<string, ToolDefinition>;

/**
 * Initialize Strava auth from environment variables
 */
export function initializeAuth(): StravaAuth {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing required environment variables: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET');
  }

  const auth = new StravaAuth(clientId, clientSecret);

  const accessToken = process.env.STRAVA_ACCESS_TOKEN;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN;
  const expiresAt = process.env.STRAVA_EXPIRES_AT;

  if (accessToken && refreshToken && expiresAt) {
    auth.setTokens(accessToken, refreshToken, parseInt(expiresAt, 10));
  } else {
    throw new Error(
      'No Strava tokens found in environment variables. Please run: npm run setup'
    );
  }

  return auth;
}

/**
 * Create all tools with the given Strava client
 */
export function createAllTools(client: StravaClient): AllTools {
  return {
    ...createActivityTools(client),
    ...createAthleteTools(client),
    ...createRouteTools(client),
    ...createSegmentTools(client),
    ...createClubTools(client),
    ...createGearTools(client),
  };
}

/**
 * Initialize auth, client, and tools from environment variables
 */
export function initializeServer(): { auth: StravaAuth; client: StravaClient; tools: AllTools } {
  const auth = initializeAuth();
  const client = new StravaClient(auth);
  const tools = createAllTools(client);
  return { auth, client, tools };
}
