// Strava API Type Definitions

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
}

export interface StravaAthlete {
  id: number;
  username: string | null;
  resource_state: number;
  firstname: string;
  lastname: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: 'M' | 'F' | null;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight: number | null;
  profile_medium: string;
  profile: string;
  friend: string | null;
  follower: string | null;
}

export interface StravaAthleteStats {
  biggest_ride_distance: number;
  biggest_climb_elevation_gain: number;
  recent_ride_totals: ActivityTotal;
  recent_run_totals: ActivityTotal;
  recent_swim_totals: ActivityTotal;
  ytd_ride_totals: ActivityTotal;
  ytd_run_totals: ActivityTotal;
  ytd_swim_totals: ActivityTotal;
  all_ride_totals: ActivityTotal;
  all_run_totals: ActivityTotal;
  all_swim_totals: ActivityTotal;
}

export interface ActivityTotal {
  count: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_gain: number;
  achievement_count?: number;
}

export interface StravaActivity {
  id: number;
  resource_state: number;
  external_id: string | null;
  upload_id: number | null;
  athlete: {
    id: number;
    resource_state: number;
  };
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: ActivityType;
  sport_type: string;
  workout_type: number | null;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: {
    id: string;
    summary_polyline: string | null;
    resource_state: number;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: string;
  flagged: boolean;
  gear_id: string | null;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  average_speed: number;
  max_speed: number;
  average_cadence?: number;
  average_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high?: number;
  elev_low?: number;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
}

export const ACTIVITY_TYPES = [
  'AlpineSki',
  'BackcountrySki',
  'Canoeing',
  'Crossfit',
  'EBikeRide',
  'Elliptical',
  'Golf',
  'Handcycle',
  'Hike',
  'IceSkate',
  'InlineSkate',
  'Kayaking',
  'Kitesurf',
  'NordicSki',
  'Ride',
  'RockClimbing',
  'RollerSki',
  'Rowing',
  'Run',
  'Sail',
  'Skateboard',
  'Snowboard',
  'Snowshoe',
  'Soccer',
  'StairStepper',
  'StandUpPaddling',
  'Surfing',
  'Swim',
  'Velomobile',
  'VirtualRide',
  'VirtualRun',
  'Walk',
  'WeightTraining',
  'Wheelchair',
  'Windsurf',
  'Workout',
  'Yoga',
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

export interface StravaActivityStream {
  type: string;
  data: number[] | [number, number][];
  series_type: string;
  original_size: number;
  resolution: string;
}

export interface StravaRoute {
  id: number;
  resource_state: number;
  name: string;
  description: string | null;
  athlete: {
    id: number;
    resource_state: number;
  };
  distance: number;
  elevation_gain: number;
  map: {
    id: string;
    summary_polyline: string | null;
    resource_state: number;
  };
  type: number;
  sub_type: number;
  private: boolean;
  starred: boolean;
  timestamp: number;
  segments: StravaSegment[];
}

export interface StravaSegment {
  id: number;
  resource_state: number;
  name: string;
  activity_type: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  start_latlng: [number, number];
  end_latlng: [number, number];
  climb_category: number;
  city: string | null;
  state: string | null;
  country: string;
  private: boolean;
  hazardous: boolean;
  starred: boolean;
  created_at: string;
  updated_at: string;
  total_elevation_gain: number;
  map: {
    id: string;
    polyline: string | null;
    resource_state: number;
  };
  effort_count: number;
  athlete_count: number;
  star_count: number;
}

export interface StravaSegmentEffort {
  id: number;
  resource_state: number;
  name: string;
  activity: {
    id: number;
    resource_state: number;
  };
  athlete: {
    id: number;
    resource_state: number;
  };
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  start_index: number;
  end_index: number;
  average_cadence?: number;
  average_watts?: number;
  device_watts?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  segment: StravaSegment;
  kom_rank: number | null;
  pr_rank: number | null;
  achievements: unknown[];
  hidden: boolean;
}

export interface StravaLeaderboard {
  effort_count: number;
  entry_count: number;
  entries: StravaLeaderboardEntry[];
}

export interface StravaLeaderboardEntry {
  athlete_name: string;
  athlete_id: number;
  athlete_gender: 'M' | 'F';
  average_hr: number | null;
  average_watts: number | null;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  activity_id: number;
  effort_id: number;
  rank: number;
}

export interface StravaClub {
  id: number;
  resource_state: number;
  name: string;
  profile_medium: string;
  profile: string;
  cover_photo: string | null;
  cover_photo_small: string | null;
  sport_type: string;
  activity_types: ActivityType[];
  city: string;
  state: string;
  country: string;
  private: boolean;
  member_count: number;
  featured: boolean;
  verified: boolean;
  url: string;
  membership: string;
  admin: boolean;
  owner: boolean;
  description: string | null;
  club_type: string;
  post_count: number;
  owner_id: number;
  following_count: number;
}

export interface StravaGear {
  id: string;
  primary: boolean;
  name: string;
  resource_state: number;
  retired: boolean;
  distance: number;
  converted_distance: number;
  brand_name: string | null;
  model_name: string | null;
  frame_type: number | null;
  description: string | null;
}

export interface StravaZones {
  heart_rate?: {
    custom_zones: boolean;
    zones: Zone[];
  };
  power?: {
    zones: Zone[];
  };
}

export interface Zone {
  min: number;
  max: number;
}

export interface CreateActivityParams {
  name: string;
  sport_type: string;
  start_date_local: string;
  elapsed_time: number;
  type?: ActivityType;
  description?: string;
  distance?: number;
  trainer?: boolean;
  commute?: boolean;
}

export interface UpdateActivityParams {
  commute?: boolean;
  trainer?: boolean;
  hide_from_home?: boolean;
  description?: string;
  name?: string;
  type?: ActivityType;
  sport_type?: string;
  gear_id?: string;
}
