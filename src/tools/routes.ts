import { z } from 'zod';
import { StravaClient } from '../strava-client.js';

export function createRouteTools(client: StravaClient) {
  return {
    get_routes: {
      description: 'Get athlete routes',
      inputSchema: z.object({
        athlete_id: z.number().describe('Athlete ID'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: {
        athlete_id: number;
        page?: number;
        per_page?: number;
      }) => {
        const routes = await client.getRoutes(
          args.athlete_id,
          args.page,
          args.per_page
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(routes, null, 2),
            },
          ],
        };
      },
    },

    get_route: {
      description: 'Get detailed information about a specific route',
      inputSchema: z.object({
        id: z.number().describe('Route ID'),
      }),
      handler: async (args: { id: number }) => {
        const route = await client.getRoute(args.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(route, null, 2),
            },
          ],
        };
      },
    },
  };
}
