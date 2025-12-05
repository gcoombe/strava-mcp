import { z } from 'zod';
import { StravaClient } from '../strava-client.js';

export function createClubTools(client: StravaClient) {
  return {
    get_athlete_clubs: {
      description: 'Get clubs the authenticated athlete belongs to',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: { page?: number; per_page?: number }) => {
        const clubs = await client.getAthleteClubs(args.page, args.per_page);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(clubs, null, 2),
            },
          ],
        };
      },
    },

    get_club: {
      description: 'Get detailed information about a specific club',
      inputSchema: z.object({
        id: z.number().describe('Club ID'),
      }),
      handler: async (args: { id: number }) => {
        const club = await client.getClub(args.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(club, null, 2),
            },
          ],
        };
      },
    },

    get_club_members: {
      description: 'Get members of a club',
      inputSchema: z.object({
        id: z.number().describe('Club ID'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: { id: number; page?: number; per_page?: number }) => {
        const members = await client.getClubMembers(
          args.id,
          args.page,
          args.per_page
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(members, null, 2),
            },
          ],
        };
      },
    },

    get_club_activities: {
      description: 'Get recent activities from club members',
      inputSchema: z.object({
        id: z.number().describe('Club ID'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: { id: number; page?: number; per_page?: number }) => {
        const activities = await client.getClubActivities(
          args.id,
          args.page,
          args.per_page
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(activities, null, 2),
            },
          ],
        };
      },
    },
  };
}
