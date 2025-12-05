import { z } from 'zod';
import { StravaClient } from '../strava-client.js';
import { ACTIVITY_TYPES, ActivityType } from '../types/strava.js';

const activityTypeSchema = z.enum(ACTIVITY_TYPES);

export function createActivityTools(client: StravaClient) {
  return {
    get_activities: {
      description: 'Get logged-in athlete activities with optional filters',
      inputSchema: z.object({
        before: z.number().optional().describe('Unix timestamp to retrieve activities before'),
        after: z.number().optional().describe('Unix timestamp to retrieve activities after'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30, max: 200)'),
      }),
      handler: async (args: {
        before?: number;
        after?: number;
        page?: number;
        per_page?: number;
      }) => {
        const activities = await client.getActivities(args);
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

    get_activity: {
      description: 'Get detailed information about a specific activity by ID',
      inputSchema: z.object({
        id: z.number().describe('Activity ID'),
        include_all_efforts: z.boolean().optional().describe('Include all segment efforts (default: false)'),
      }),
      handler: async (args: { id: number; include_all_efforts?: boolean }) => {
        const activity = await client.getActivity(args.id, args.include_all_efforts);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(activity, null, 2),
            },
          ],
        };
      },
    },

    create_activity: {
      description: 'Create a new manual activity',
      inputSchema: z.object({
        name: z.string().describe('Activity name'),
        sport_type: activityTypeSchema.describe('Sport type (e.g., Run, Ride, Swim)'),
        start_date_local: z.string().describe('ISO 8601 formatted date time'),
        elapsed_time: z.number().describe('Activity elapsed time in seconds'),
        type: activityTypeSchema.optional().describe('Activity type'),
        description: z.string().optional().describe('Activity description'),
        distance: z.number().optional().describe('Activity distance in meters'),
        trainer: z.boolean().optional().describe('Whether activity was on a trainer'),
        commute: z.boolean().optional().describe('Whether activity was a commute'),
      }),
      handler: async (args: {
        name: string;
        sport_type: string;
        start_date_local: string;
        elapsed_time: number;
        type?: ActivityType;
        description?: string;
        distance?: number;
        trainer?: boolean;
        commute?: boolean;
      }) => {
        const activity = await client.createActivity(args);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Activity created successfully:\n${JSON.stringify(activity, null, 2)}`,
            },
          ],
        };
      },
    },

    update_activity: {
      description: 'Update an existing activity',
      inputSchema: z.object({
        id: z.number().describe('Activity ID'),
        commute: z.boolean().optional().describe('Whether activity was a commute'),
        trainer: z.boolean().optional().describe('Whether activity was on a trainer'),
        hide_from_home: z.boolean().optional().describe('Hide activity from home feed'),
        description: z.string().optional().describe('Activity description'),
        name: z.string().optional().describe('Activity name'),
        type: activityTypeSchema.optional().describe('Activity type'),
        sport_type: activityTypeSchema.optional().describe('Sport type'),
        gear_id: z.string().optional().describe('Gear ID'),
      }),
      handler: async (args: {
        id: number;
        commute?: boolean;
        trainer?: boolean;
        hide_from_home?: boolean;
        description?: string;
        name?: string;
        type?: ActivityType;
        sport_type?: string;
        gear_id?: string;
      }) => {
        const { id, ...updateParams } = args;
        const activity = await client.updateActivity(id, updateParams);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Activity updated successfully:\n${JSON.stringify(activity, null, 2)}`,
            },
          ],
        };
      },
    },

    delete_activity: {
      description: 'Delete an activity',
      inputSchema: z.object({
        id: z.number().describe('Activity ID to delete'),
      }),
      handler: async (args: { id: number }) => {
        await client.deleteActivity(args.id);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Activity ${args.id} deleted successfully`,
            },
          ],
        };
      },
    },

    get_activity_streams: {
      description: 'Get activity streams (GPS, heart rate, power, cadence, etc.)',
      inputSchema: z.object({
        id: z.number().describe('Activity ID'),
        keys: z.array(z.string()).optional().describe('Stream types to retrieve (time, latlng, distance, altitude, heartrate, watts, cadence, etc.)'),
        key_by_type: z.boolean().optional().describe('Return streams keyed by type (default: true)'),
      }),
      handler: async (args: {
        id: number;
        keys?: string[];
        key_by_type?: boolean;
      }) => {
        const streams = await client.getActivityStreams(
          args.id,
          args.keys,
          args.key_by_type
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(streams, null, 2),
            },
          ],
        };
      },
    },

    get_activity_comments: {
      description: 'Get comments for an activity',
      inputSchema: z.object({
        id: z.number().describe('Activity ID'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: {
        id: number;
        page?: number;
        per_page?: number;
      }) => {
        const comments = await client.getActivityComments(
          args.id,
          args.page,
          args.per_page
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(comments, null, 2),
            },
          ],
        };
      },
    },

    get_activity_kudos: {
      description: 'Get kudos for an activity',
      inputSchema: z.object({
        id: z.number().describe('Activity ID'),
        page: z.number().optional().describe('Page number (default: 1)'),
        per_page: z.number().optional().describe('Number of items per page (default: 30)'),
      }),
      handler: async (args: {
        id: number;
        page?: number;
        per_page?: number;
      }) => {
        const kudos = await client.getActivityKudos(
          args.id,
          args.page,
          args.per_page
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(kudos, null, 2),
            },
          ],
        };
      },
    },
  };
}
