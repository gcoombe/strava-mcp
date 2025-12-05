import { z } from 'zod';
import { StravaClient } from '../strava-client.js';

export function createAthleteTools(client: StravaClient) {
  return {
    get_athlete: {
      description: 'Get the authenticated athlete profile',
      inputSchema: z.object({}),
      handler: async () => {
        const athlete = await client.getAthlete();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(athlete, null, 2),
            },
          ],
        };
      },
    },

    get_athlete_stats: {
      description: 'Get athlete statistics (totals and recent activities)',
      inputSchema: z.object({
        athlete_id: z.number().describe('Athlete ID'),
      }),
      handler: async (args: { athlete_id: number }) => {
        const stats = await client.getAthleteStats(args.athlete_id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      },
    },

    get_athlete_zones: {
      description: 'Get athlete zones (heart rate and power zones)',
      inputSchema: z.object({}),
      handler: async () => {
        const zones = await client.getAthleteZones();
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(zones, null, 2),
            },
          ],
        };
      },
    },
  };
}
