import { z } from 'zod';
import { StravaClient } from '../strava-client.js';

export function createSegmentTools(client: StravaClient) {
  return {
    get_starred_segments: {
      description: 'Get athlete starred segments',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: { page?: number; per_page?: number }) => {
        const segments = await client.getStarredSegments(args.page, args.per_page);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(segments, null, 2),
            },
          ],
        };
      },
    },

    get_segment: {
      description: 'Get detailed information about a specific segment',
      inputSchema: z.object({
        id: z.number().describe('Segment ID'),
      }),
      handler: async (args: { id: number }) => {
        const segment = await client.getSegment(args.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(segment, null, 2),
            },
          ],
        };
      },
    },

    get_segment_leaderboard: {
      description: 'Get segment leaderboard with optional filters',
      inputSchema: z.object({
        id: z.number().describe('Segment ID'),
        gender: z.enum(['M', 'F']).optional().describe('Filter by gender'),
        age_group: z.string().optional().describe('Age group (e.g., "25_34")'),
        weight_class: z.string().optional().describe('Weight class (kg)'),
        following: z.boolean().optional().describe('Filter by athletes you follow'),
        club_id: z.number().optional().describe('Filter by club ID'),
        date_range: z.string().optional().describe('Date range (e.g., "this_year", "this_month")'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: {
        id: number;
        gender?: 'M' | 'F';
        age_group?: string;
        weight_class?: string;
        following?: boolean;
        club_id?: number;
        date_range?: string;
        page?: number;
        per_page?: number;
      }) => {
        const { id, ...params } = args;
        const leaderboard = await client.getSegmentLeaderboard(id, params);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(leaderboard, null, 2),
            },
          ],
        };
      },
    },

    explore_segments: {
      description: 'Explore segments in a geographic area',
      inputSchema: z.object({
        bounds: z.array(z.number()).length(4).describe('Geographic bounds [sw_lat, sw_lng, ne_lat, ne_lng]'),
        activity_type: z.enum(['running', 'riding']).optional().describe('Activity type filter'),
        min_cat: z.number().optional().describe('Minimum climb category'),
        max_cat: z.number().optional().describe('Maximum climb category'),
      }),
      handler: async (args: {
        bounds: [number, number, number, number];
        activity_type?: 'running' | 'riding';
        min_cat?: number;
        max_cat?: number;
      }) => {
        const result = await client.exploreSegments(args);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      },
    },
  };
}
