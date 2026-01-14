#!/usr/bin/env node
import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ZodError } from 'zod';
import { StravaAuth } from './auth.js';
import { StravaClient } from './strava-client.js';
import { createAllTools, ToolDefinition } from './create-tools.js';
import { getTokens, saveTokens, getDatabase } from './db.js';
import authRoutes from './auth/routes.js';
import { requireAuth, optionalAuth } from './auth/middleware.js';
import { handleMcpRequest } from './mcp-http-handler.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const DEFAULT_PORT = 3000;

/**
 * Get Strava app credentials from environment
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
 * Create StravaClient for an authenticated user using their tokens from DB
 */
function createClientForUser(athleteId: number): StravaClient {
  const tokens = getTokens(athleteId);
  if (!tokens) {
    throw new Error('No tokens found for user. Please re-authenticate with Strava.');
  }

  const { clientId, clientSecret } = getStravaCredentials();

  // Create auth with token refresh callback to update database
  const auth = StravaAuth.createWithTokens(
    clientId,
    clientSecret,
    tokens.access_token,
    tokens.refresh_token,
    tokens.expires_at,
    (newTokens) => {
      saveTokens(
        athleteId,
        newTokens.accessToken,
        newTokens.refreshToken,
        newTokens.expiresAt
      );
    }
  );

  return new StravaClient(auth);
}

/**
 * Get tool definitions without a client (for schema endpoints)
 */
function getToolDefinitions(): Record<string, { description: string; inputSchema: ToolDefinition['inputSchema'] }> {
  // Create a dummy client just to get tool definitions
  const { clientId, clientSecret } = getStravaCredentials();
  const auth = new StravaAuth(clientId, clientSecret);
  auth.setTokens('dummy', 'dummy', Date.now() + 3600);
  const client = new StravaClient(auth);
  const tools = createAllTools(client);

  // Extract just description and schema
  const definitions: Record<string, { description: string; inputSchema: ToolDefinition['inputSchema'] }> = {};
  for (const [name, tool] of Object.entries(tools)) {
    definitions[name] = {
      description: tool.description,
      inputSchema: tool.inputSchema,
    };
  }
  return definitions;
}

/**
 * Create and configure Express HTTP server
 */
export function createHttpServer(port: number = DEFAULT_PORT) {
  const app = express();

  // Initialize database
  getDatabase();

  // Validate credentials on startup
  getStravaCredentials();

  // Get tool definitions for schema endpoints
  const toolDefinitions = getToolDefinitions();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Root endpoint - for MCP discovery
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'strava-mcp',
      version: '1.0.0',
      description: 'Strava MCP Server',
    });
  });

  // MCP JSON-RPC endpoint
  app.post('/', optionalAuth, (req: Request, res: Response) => {
    handleMcpRequest(req, res, req.athleteId);
  });

  // OAuth 2.0 Authorization Server Metadata (RFC 8414)
  app.get('/.well-known/oauth-authorization-server', (req: Request, res: Response) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const baseUrl = `${protocol}://${host}`;

    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/auth/authorize`,
      token_endpoint: `${baseUrl}/auth/token`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['plain', 'S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    });
  });

  // Auth routes
  app.use('/auth', authRoutes);

  // List all available tools (public - schema doesn't require auth)
  app.get('/tools', (_req: Request, res: Response) => {
    const toolList = Object.entries(toolDefinitions).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    }));
    res.json({ tools: toolList });
  });

  // Get a specific tool's schema (public)
  app.get('/tools/:toolName', (req: Request<{ toolName: string }>, res: Response) => {
    const { toolName } = req.params;
    const tool = toolDefinitions[toolName];

    if (!tool) {
      res.status(404).json({ error: `Unknown tool: ${toolName}` });
      return;
    }

    res.json({
      name: toolName,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    });
  });

  // Execute a tool by name (requires auth)
  app.post('/tools/:toolName', requireAuth, async (req: Request<{ toolName: string }>, res: Response) => {
    const { toolName } = req.params;
    const athleteId = req.athleteId!;

    // Check tool exists
    if (!toolDefinitions[toolName]) {
      res.status(404).json({ error: `Unknown tool: ${toolName}` });
      return;
    }

    try {
      // Create client and tools for this user
      const client = createClientForUser(athleteId);
      const tools = createAllTools(client);
      const tool = tools[toolName]!; // Safe because we checked toolDefinitions above

      const validatedArgs = tool.inputSchema.parse(req.body || {});
      const result = await tool.handler(validatedArgs);
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
        return;
      }
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return { app, port };
}

/**
 * Start the HTTP server
 */
export function startHttpServer(port?: number) {
  const httpPort = port || parseInt(process.env.HTTP_PORT || String(DEFAULT_PORT), 10);
  const { app } = createHttpServer(httpPort);

  const server = app.listen(httpPort, () => {
    console.log(`Strava MCP HTTP Server running on http://localhost:${httpPort}`);
    console.log(`\nOAuth 2.0 endpoints:`);
    console.log(`  GET  /.well-known/oauth-authorization-server - OAuth metadata`);
    console.log(`  GET  /auth/authorize       - Start OAuth flow`);
    console.log(`  POST /auth/token           - Exchange code for JWT`);
    console.log(`  GET  /auth/me              - Get current athlete info`);
    console.log(`\nTool endpoints (POST requires JWT):`);
    console.log(`  GET  /tools                - List all tools`);
    console.log(`  GET  /tools/:name          - Get tool schema`);
    console.log(`  POST /tools/:name          - Execute tool`);
    console.log(`\nOther:`);
    console.log(`  GET  /health               - Health check`);
  });

  return server;
}

// Run as standalone HTTP server if executed directly
async function main() {
  try {
    startHttpServer();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly
const isMainModule = process.argv[1]?.includes('http-server');
if (isMainModule) {
  main();
}
