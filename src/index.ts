#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { StravaAuth } from './auth.js';
import { StravaClient } from './strava-client.js';
import { createActivityTools } from './tools/activities.js';
import { createAthleteTools } from './tools/athlete.js';
import { createRouteTools } from './tools/routes.js';
import { createSegmentTools } from './tools/segments.js';
import { createClubTools } from './tools/clubs.js';
import { createGearTools } from './tools/gear.js';

// Load environment variables from .env file (relative to this script's location)
// This allows .env to work even when run from a different working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Validate required environment variables
const requiredEnvVars = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize Strava authentication
const auth = new StravaAuth(
  process.env.STRAVA_CLIENT_ID!,
  process.env.STRAVA_CLIENT_SECRET!
);

// Check for existing tokens or provide OAuth instructions
if (process.env.STRAVA_ACCESS_TOKEN && process.env.STRAVA_REFRESH_TOKEN && process.env.STRAVA_EXPIRES_AT) {
  auth.setTokens(
    process.env.STRAVA_ACCESS_TOKEN,
    process.env.STRAVA_REFRESH_TOKEN,
    parseInt(process.env.STRAVA_EXPIRES_AT, 10)
  );
} else {
  console.error('\nNo Strava tokens found in environment variables.');
  console.error('\nPlease run the setup script to authenticate:');
  console.error('  npm run setup');
  console.error('\nThis will guide you through the OAuth flow and save your tokens to .env');
  process.exit(1);
}

// Initialize Strava client
const client = new StravaClient(auth);

// Create MCP server
const server = new Server(
  {
    name: 'strava-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = {
  ...createActivityTools(client),
  ...createAthleteTools(client),
  ...createRouteTools(client),
  ...createSegmentTools(client),
  ...createClubTools(client),
  ...createGearTools(client),
};

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.entries(allTools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    })),
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const tool = allTools[toolName as keyof typeof allTools];

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    // Validate input with zod schema
    const validatedArgs = tool.inputSchema.parse(request.params.arguments);

    // Call the tool handler
    return await tool.handler(validatedArgs as never);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
    throw error;
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Strava MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
