# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Model Context Protocol (MCP) server for Strava API integration. It provides comprehensive access to Strava data including activities, athlete profiles, routes, segments, clubs, and gear through MCP tools that can be used by Claude Desktop and other MCP clients.

## Development Commands

### Building and Running
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development (recompiles on changes)
- `npm start` - Start the MCP server (requires build first)
- `npm run setup` - Interactive OAuth setup wizard to configure Strava API tokens

### Code Quality
- `npm run lint` - Run ESLint on the codebase
- `npm test` - Run Jest test suite

## Architecture

### Core Components

**Three-layer architecture:**

1. **StravaAuth** (`src/auth.ts`): OAuth 2.0 token management
   - Handles token refresh automatically with 5-minute buffer
   - `getValidAccessToken()` is called before every API request
   - Never manually refresh tokens in API calls

2. **StravaClient** (`src/strava-client.ts`): Strava API wrapper
   - All API calls go through the private `request<T>()` method
   - Uses native `fetch` API (no axios)
   - Automatically adds Bearer token authentication
   - Organized by API category (athlete, activities, routes, segments, clubs, gear)

3. **Tool Definitions** (`src/tools/`): MCP tool implementations
   - Each file exports a creator function that takes StravaClient
   - Tools are defined with: description, Zod inputSchema, and async handler
   - All tools registered automatically in `src/index.ts`

### Adding New Strava Endpoints

Follow this exact pattern:

1. **Add TypeScript types** to `src/types/strava.ts`:
   ```typescript
   export interface StravaNewType {
     id: number;
     // ... fields
   }
   ```

2. **Add client method** to `StravaClient` class in `src/strava-client.ts`:
   ```typescript
   async getNewData(id: number): Promise<StravaNewType> {
     return this.request<StravaNewType>(`/endpoint/${id}`);
   }
   ```

3. **Create/update tool** in appropriate file in `src/tools/`:
   ```typescript
   export function createNewTools(client: StravaClient) {
     return {
       get_new_data: {
         description: 'Clear description of what this tool does',
         inputSchema: z.object({
           id: z.number().describe('Parameter description'),
         }),
         handler: async (args: { id: number }) => {
           const data = await client.getNewData(args.id);
           return {
             content: [
               {
                 type: 'text' as const,
                 text: JSON.stringify(data, null, 2),
               },
             ],
           };
         },
       },
     };
   }
   ```

4. **Register tools** in `src/index.ts`:
   ```typescript
   import { createNewTools } from './tools/new.js';

   const allTools = {
     ...createActivityTools(client),
     ...createNewTools(client),
     // ...
   };
   ```

### Critical Code Patterns

**Always use `.js` extensions in imports** (TypeScript ESM requirement):
```typescript
import { StravaClient } from './strava-client.js';  // ✅ CORRECT
import { StravaClient } from './strava-client';     // ❌ WRONG
```

**MCP tool response format** (must be exact):
```typescript
return {
  content: [
    {
      type: 'text' as const,  // Must use 'as const'
      text: JSON.stringify(data, null, 2),
    },
  ],
};
```

**Use native fetch** (not axios):
```typescript
const response = await fetch(url, options);
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
const data = await response.json();
```

**Zod schema validation** for all tool inputs:
```typescript
inputSchema: z.object({
  id: z.number().describe('Activity ID'),
  optional: z.string().optional().describe('Optional parameter'),
})
```

### Data Reduction Pattern

For tools that may return large datasets, use the `minimal` parameter pattern (see `src/tools/activities.ts`):

```typescript
inputSchema: z.object({
  // ... other params
  minimal: z.boolean().optional().describe('Return minimal data to reduce context usage'),
})
```

The `reduceActivity()` and `reduceActivities()` functions in `src/utils/data-reducer.ts` strip social metrics, metadata, and privacy flags while keeping core training data. This prevents Claude from exceeding context windows when analyzing many activities.

## Important Conventions

**Naming:**
- Tool names: `snake_case` (e.g., `get_activity`, `create_activity`)
- File names: `lowercase.ts` (e.g., `activities.ts`, `strava-client.ts`)
- Class names: `PascalCase` (e.g., `StravaClient`, `StravaAuth`)
- Type names: `PascalCase` with `Strava` prefix (e.g., `StravaActivity`)

**TypeScript:**
- Strict mode is enabled (noImplicitAny, noUnusedLocals, etc.)
- Always use explicit types for function parameters and return values
- Use `const` for immutable values, never use `var`
- Prefer async/await over Promise chains

**Environment Variables:**
Required in `.env` (automatically loaded from project root):
- `STRAVA_CLIENT_ID` - From Strava API settings
- `STRAVA_CLIENT_SECRET` - From Strava API settings
- `STRAVA_ACCESS_TOKEN` - Obtained via OAuth flow
- `STRAVA_REFRESH_TOKEN` - Obtained via OAuth flow
- `STRAVA_EXPIRES_AT` - Unix timestamp of token expiration

Run `npm run setup` to configure these interactively.

## Strava API Details

- **Base URL**: `https://www.strava.com/api/v3`
- **OAuth URL**: `https://www.strava.com/oauth/authorize`
- **Rate Limits**: 100 requests per 15 minutes, 1,000 requests per day (not enforced by this server)
- **Documentation**: https://developers.strava.com/docs/reference/

## Testing

Use Jest with ts-jest for TypeScript support. Test pattern:

```typescript
describe('Feature', () => {
  it('should handle success case', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    const result = await client.getData();
    expect(result).toEqual({ id: 1 });
  });

  it('should handle error case', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(client.getData()).rejects.toThrow('Not Found');
  });
});
```

## Common Issues

- **"No tokens available" error**: Run `npm run setup` to authenticate with Strava
- **Build errors**: Ensure Node.js 18+ is installed, run `npm install`
- **Tools not showing up in MCP**: Verify `zodToJsonSchema()` is called when registering tools
- **Token refresh failures**: Refresh token may be revoked - run `npm run setup` again
