import { Request, Response } from 'express';
import { StravaAuth } from './auth.js';
import { StravaClient } from './strava-client.js';
import { createAllTools } from './create-tools.js';
import { getTokens, saveTokens } from './db.js';
import { zodToJsonSchema } from 'zod-to-json-schema';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Get Strava credentials from environment
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
 * Create StravaClient for an authenticated user
 */
function createClientForUser(athleteId: number): StravaClient {
  const tokens = getTokens(athleteId);
  if (!tokens) {
    throw new Error('No tokens found for user. Please re-authenticate with Strava.');
  }

  const { clientId, clientSecret } = getStravaCredentials();

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
 * Get tool definitions (for tools/list)
 */
function getToolDefinitions() {
  const { clientId, clientSecret } = getStravaCredentials();
  const auth = new StravaAuth(clientId, clientSecret);
  auth.setTokens('dummy', 'dummy', Date.now() + 3600);
  const client = new StravaClient(auth);
  const tools = createAllTools(client);

  return Object.entries(tools).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema),
  }));
}

/**
 * Handle MCP JSON-RPC requests
 */
export async function handleMcpRequest(
  req: Request,
  res: Response,
  athleteId?: number
): Promise<void> {
  const rpcRequest = req.body as JsonRpcRequest;

  console.log('[MCP] Received:', JSON.stringify(rpcRequest, null, 2));

  if (!rpcRequest.jsonrpc || rpcRequest.jsonrpc !== '2.0') {
    res.status(400).json({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request - not JSON-RPC 2.0' },
    });
    return;
  }

  const response: JsonRpcResponse = {
    jsonrpc: '2.0',
    id: rpcRequest.id,
  };

  try {
    switch (rpcRequest.method) {
      case 'initialize': {
        response.result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'strava-mcp',
            version: '1.0.0',
          },
        };
        break;
      }

      case 'notifications/initialized': {
        // Client acknowledged initialization - no response needed for notifications
        // But since we received an id, respond with empty result
        response.result = {};
        break;
      }

      case 'tools/list': {
        const tools = getToolDefinitions();
        response.result = { tools };
        break;
      }

      case 'tools/call': {
        if (!athleteId) {
          response.error = {
            code: -32001,
            message: 'Authentication required',
          };
          break;
        }

        const params = rpcRequest.params as { name: string; arguments?: Record<string, unknown> };
        if (!params?.name) {
          response.error = {
            code: -32602,
            message: 'Invalid params - tool name required',
          };
          break;
        }

        const client = createClientForUser(athleteId);
        const tools = createAllTools(client);
        const tool = tools[params.name];

        if (!tool) {
          response.error = {
            code: -32602,
            message: `Unknown tool: ${params.name}`,
          };
          break;
        }

        const validatedArgs = tool.inputSchema.parse(params.arguments || {});
        const result = await tool.handler(validatedArgs);
        response.result = result;
        break;
      }

      case 'ping': {
        response.result = {};
        break;
      }

      default: {
        response.error = {
          code: -32601,
          message: `Method not found: ${rpcRequest.method}`,
        };
      }
    }
  } catch (error) {
    console.error('[MCP] Error:', error);
    response.error = {
      code: -32603,
      message: error instanceof Error ? error.message : 'Internal error',
    };
  }

  console.log('[MCP] Response:', JSON.stringify(response, null, 2));
  res.json(response);
}
