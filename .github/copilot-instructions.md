# GitHub Copilot Instructions - Strava MCP Server

## Project Context
You are working on a Model Context Protocol (MCP) server that provides integration with the Strava API. This server allows Claude Desktop and other MCP clients to interact with Strava data.

## Tech Stack
- TypeScript with ES modules and strict type checking
- Node.js 18+ (uses native fetch, no axios)
- Zod for schema validation and type inference
- MCP SDK for server implementation
- Jest for testing

## Code Patterns to Follow

### 1. Use Native Fetch
```typescript
// ✅ GOOD
const response = await fetch(url, { method: 'POST', ... });
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
const data = await response.json();

// ❌ BAD - Don't use axios
import axios from 'axios';
```

### 2. Zod Schema Validation
```typescript
// ✅ GOOD - Define schema and use for validation
const schema = z.object({
  id: z.number(),
  name: z.string(),
});

// ❌ BAD - Don't skip validation
function handler(args: any) { ... }
```

### 3. MCP Tool Response Format
```typescript
// ✅ GOOD - Proper MCP response format
return {
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify(data, null, 2),
    },
  ],
};

// ❌ BAD - Don't return raw data
return data;
```

### 4. TypeScript Strict Mode
```typescript
// ✅ GOOD - Explicit types
async function getActivity(id: number): Promise<StravaActivity> {
  ...
}

// ❌ BAD - Implicit any
async function getActivity(id) {
  ...
}
```

### 5. Error Handling
```typescript
// ✅ GOOD - Proper error handling
try {
  const response = await fetch(...);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Failed: ${error.message}`);
  }
} catch (error) {
  if (error instanceof Error) {
    throw new Error(`API error: ${error.message}`);
  }
  throw error;
}
```

## File Structure Conventions

### Adding a New Strava API Endpoint
1. Add types to `src/types/strava.ts`:
   ```typescript
   export interface StravaNewType {
     id: number;
     // ... fields
   }
   ```

2. Add client method to `src/strava-client.ts`:
   ```typescript
   async getNewData(id: number): Promise<StravaNewType> {
     return this.request<StravaNewType>(`/endpoint/${id}`);
   }
   ```

3. Create tool in appropriate file in `src/tools/`:
   ```typescript
   export function createNewTools(client: StravaClient) {
     return {
       get_new_data: {
         description: 'Get new data from Strava',
         inputSchema: z.object({
           id: z.number().describe('Item ID'),
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

4. Import and register in `src/index.ts`:
   ```typescript
   import { createNewTools } from './tools/new.js';

   const allTools = {
     ...createActivityTools(client),
     ...createNewTools(client), // Add here
     ...
   };
   ```

## Naming Conventions
- Tool names: `snake_case` (e.g., `get_activity`, `create_activity`)
- File names: `lowercase.ts` (e.g., `activities.ts`, `strava-client.ts`)
- Class names: `PascalCase` (e.g., `StravaClient`, `StravaAuth`)
- Type names: `PascalCase` with `Strava` prefix (e.g., `StravaActivity`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `ACTIVITY_TYPES`)

## Important Reminders
- Always use `.js` extensions in imports (TypeScript ESM requirement)
- Never commit `.env` file
- Use `zodToJsonSchema()` when registering tools with MCP
- All API calls must go through `StravaClient.request()` method
- Token refresh is automatic via `StravaAuth.getValidAccessToken()`
- Use `const` enum arrays for Zod validation (e.g., `ACTIVITY_TYPES`)

## Testing Pattern
```typescript
describe('ToolName', () => {
  it('should handle success case', async () => {
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: 'Test' }),
    });

    const result = await client.getData();
    expect(result).toEqual({ id: 1, name: 'Test' });
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

## Common Tasks

### Add a Query Parameter to Existing Endpoint
```typescript
// In strava-client.ts
async getActivities(params?: {
  page?: number;
  per_page?: number;
  newParam?: string; // Add here
}): Promise<StravaActivity[]> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.newParam) queryParams.set('new_param', params.newParam); // Add here

  const query = queryParams.toString();
  return this.request<StravaActivity[]>(
    `/athlete/activities${query ? `?${query}` : ''}`
  );
}
```

### Add Input Validation to Tool
```typescript
// In tools file
inputSchema: z.object({
  id: z.number().min(1).describe('Activity ID must be positive'),
  name: z.string().min(1).max(100).describe('Name (1-100 chars)'),
  optional: z.string().optional().describe('Optional parameter'),
})
```

## Strava API Quick Reference
- Base URL: `https://www.strava.com/api/v3`
- OAuth: `https://www.strava.com/oauth/authorize`
- Rate Limits: 100/15min, 1000/day
- Common scopes: `read`, `activity:read`, `activity:read_all`, `activity:write`, `profile:read_all`
