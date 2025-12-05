import { z } from 'zod';
import { StravaClient } from '../strava-client.js';

export function createGearTools(client: StravaClient) {
  return {
    get_gear: {
      description: 'Get detailed information about a specific piece of gear (bike, shoes, etc.)',
      inputSchema: z.object({
        id: z.string().describe('Gear ID'),
      }),
      handler: async (args: { id: string }) => {
        const gear = await client.getGear(args.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(gear, null, 2),
            },
          ],
        };
      },
    },
  };
}
