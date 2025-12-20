import { StravaActivity } from '../types/strava.js';

/**
 * Minimal activity data for training analysis
 * Strips out social metrics, metadata, and privacy flags while keeping core training data
 */
export interface MinimalActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  trainer: boolean;
  commute: boolean;
  // Location data for geographic searches
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
}

/**
 * Reduce activity to minimal fields for training analysis
 * Removes: social data (kudos, comments), metadata, privacy flags, map polylines
 */
export function reduceActivity(activity: StravaActivity): MinimalActivity {
  return {
    id: activity.id,
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: activity.start_date,
    start_date_local: activity.start_date_local,
    distance: activity.distance,
    moving_time: activity.moving_time,
    elapsed_time: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    average_cadence: activity.average_cadence,
    average_watts: activity.average_watts,
    weighted_average_watts: activity.weighted_average_watts,
    kilojoules: activity.kilojoules,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    trainer: activity.trainer,
    commute: activity.commute,
    location_city: activity.location_city,
    location_state: activity.location_state,
    location_country: activity.location_country,
    start_latlng: activity.start_latlng,
    end_latlng: activity.end_latlng,
  };
}

/**
 * Reduce an array of activities to minimal fields
 */
export function reduceActivities(activities: StravaActivity[]): MinimalActivity[] {
  return activities.map(reduceActivity);
}
