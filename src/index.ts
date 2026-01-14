#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { initializeServer } from './create-tools.js';

// Load environment variables from .env file (relative to this script's location)
// This allows .env to work even when run from a different working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Parse command-line arguments
const args = process.argv.slice(2);
const useHttpMode = args.includes('--http');

// Start server in appropriate mode
async function main() {
  try {
    if (useHttpMode) {
      // HTTP mode for ChatGPT and other REST clients
      // Uses database for per-user tokens, dynamic import to avoid loading DB in stdio mode
      const { startHttpServer } = await import('./http-server.js');
      startHttpServer();
    } else {
      // stdio mode for Claude Desktop (default)
      // Uses env-based tokens for single user
      const { tools } = initializeServer();
      await startStdioServer(tools);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Start MCP server with stdio transport
async function startStdioServer(tools: ReturnType<typeof initializeServer>['tools']) {
  const mcpServer = new McpServer(
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

  const server = mcpServer.server;

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.entries(tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: zodToJsonSchema(tool.inputSchema),
      })),
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const tool = tools[toolName];

    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    try {
      const validatedArgs = tool.inputSchema.parse(request.params.arguments);
      const result = await tool.handler(validatedArgs);
      return {
        content: result.content,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Tool execution failed: ${error.message}`);
      }
      throw error;
    }
  });

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error('Strava MCP Server running on stdio');
}

main();
