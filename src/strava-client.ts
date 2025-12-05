import { StravaAuth } from './auth.js';
import {
  StravaActivity,
  StravaAthlete,
  StravaAthleteStats,
  StravaRoute,
  StravaSegment,
  StravaLeaderboard,
  StravaClub,
  StravaGear,
  StravaZones,
  StravaActivityStream,
  CreateActivityParams,
  UpdateActivityParams,
} from './types/strava.js';

export class StravaClient {
  private auth: StravaAuth;
  private baseUrl = 'https://www.strava.com/api/v3';

  constructor(auth: StravaAuth) {
    this.auth = auth;
  }

  /**
   * Make authenticated request to Strava API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const accessToken = await this.auth.getValidAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText
      }));
      throw new Error(
        `Strava API error: ${error.message || response.statusText} (${response.status})`
      );
    }

    return response.json() as Promise<T>;
  }

  // ========== ATHLETE APIs ==========

  /**
   * Get the authenticated athlete
   */
  async getAthlete(): Promise<StravaAthlete> {
    return this.request<StravaAthlete>('/athlete');
  }

  /**
   * Get athlete stats
   */
  async getAthleteStats(athleteId: number): Promise<StravaAthleteStats> {
    return this.request<StravaAthleteStats>(`/athletes/${athleteId}/stats`);
  }

  /**
   * Get athlete zones
   */
  async getAthleteZones(): Promise<StravaZones> {
    return this.request<StravaZones>('/athlete/zones');
  }

  // ========== ACTIVITY APIs ==========

  /**
   * Get logged-in athlete activities
   */
  async getActivities(params?: {
    before?: number;
    after?: number;
    page?: number;
    per_page?: number;
  }): Promise<StravaActivity[]> {
    const queryParams = new URLSearchParams();
    if (params?.before) queryParams.set('before', params.before.toString());
    if (params?.after) queryParams.set('after', params.after.toString());
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString());

    const query = queryParams.toString();
    return this.request<StravaActivity[]>(
      `/athlete/activities${query ? `?${query}` : ''}`
    );
  }

  /**
   * Get activity by ID
   */
  async getActivity(id: number, includeAllEfforts: boolean = false): Promise<StravaActivity> {
    return this.request<StravaActivity>(
      `/activities/${id}?include_all_efforts=${includeAllEfforts}`
    );
  }

  /**
   * Create a new activity
   */
  async createActivity(params: CreateActivityParams): Promise<StravaActivity> {
    return this.request<StravaActivity>('/activities', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Update an activity
   */
  async updateActivity(
    id: number,
    params: UpdateActivityParams
  ): Promise<StravaActivity> {
    return this.request<StravaActivity>(`/activities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  /**
   * Delete an activity
   */
  async deleteActivity(id: number): Promise<void> {
    await this.request<void>(`/activities/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get activity streams (GPS, heart rate, power, etc.)
   */
  async getActivityStreams(
    id: number,
    keys: string[] = ['time', 'latlng', 'distance', 'altitude', 'heartrate', 'watts'],
    keyByType: boolean = true
  ): Promise<StravaActivityStream[]> {
    const keysParam = keys.join(',');
    return this.request<StravaActivityStream[]>(
      `/activities/${id}/streams?keys=${keysParam}&key_by_type=${keyByType}`
    );
  }

  /**
   * Get activity comments
   */
  async getActivityComments(
    id: number,
    page: number = 1,
    perPage: number = 30
  ): Promise<unknown[]> {
    return this.request<unknown[]>(
      `/activities/${id}/comments?page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Get activity kudos
   */
  async getActivityKudos(
    id: number,
    page: number = 1,
    perPage: number = 30
  ): Promise<unknown[]> {
    return this.request<unknown[]>(
      `/activities/${id}/kudos?page=${page}&per_page=${perPage}`
    );
  }

  // ========== ROUTE APIs ==========

  /**
   * Get athlete routes
   */
  async getRoutes(athleteId: number, page: number = 1, perPage: number = 30): Promise<StravaRoute[]> {
    return this.request<StravaRoute[]>(
      `/athletes/${athleteId}/routes?page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Get route by ID
   */
  async getRoute(id: number): Promise<StravaRoute> {
    return this.request<StravaRoute>(`/routes/${id}`);
  }

  // ========== SEGMENT APIs ==========

  /**
   * Get starred segments
   */
  async getStarredSegments(page: number = 1, perPage: number = 30): Promise<StravaSegment[]> {
    return this.request<StravaSegment[]>(
      `/segments/starred?page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Get segment by ID
   */
  async getSegment(id: number): Promise<StravaSegment> {
    return this.request<StravaSegment>(`/segments/${id}`);
  }

  /**
   * Get segment leaderboard
   */
  async getSegmentLeaderboard(
    id: number,
    params?: {
      gender?: 'M' | 'F';
      age_group?: string;
      weight_class?: string;
      following?: boolean;
      club_id?: number;
      date_range?: string;
      page?: number;
      per_page?: number;
    }
  ): Promise<StravaLeaderboard> {
    const queryParams = new URLSearchParams();
    if (params?.gender) queryParams.set('gender', params.gender);
    if (params?.age_group) queryParams.set('age_group', params.age_group);
    if (params?.weight_class) queryParams.set('weight_class', params.weight_class);
    if (params?.following !== undefined) queryParams.set('following', params.following.toString());
    if (params?.club_id) queryParams.set('club_id', params.club_id.toString());
    if (params?.date_range) queryParams.set('date_range', params.date_range);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString());

    const query = queryParams.toString();
    return this.request<StravaLeaderboard>(
      `/segments/${id}/leaderboard${query ? `?${query}` : ''}`
    );
  }

  /**
   * Explore segments in a geographic area
   */
  async exploreSegments(params: {
    bounds: [number, number, number, number]; // [sw_lat, sw_lng, ne_lat, ne_lng]
    activity_type?: 'running' | 'riding';
    min_cat?: number;
    max_cat?: number;
  }): Promise<{ segments: StravaSegment[] }> {
    const queryParams = new URLSearchParams({
      bounds: params.bounds.join(','),
    });
    if (params.activity_type) queryParams.set('activity_type', params.activity_type);
    if (params.min_cat !== undefined) queryParams.set('min_cat', params.min_cat.toString());
    if (params.max_cat !== undefined) queryParams.set('max_cat', params.max_cat.toString());

    return this.request<{ segments: StravaSegment[] }>(
      `/segments/explore?${queryParams.toString()}`
    );
  }

  // ========== CLUB APIs ==========

  /**
   * Get athlete clubs
   */
  async getAthleteClubs(page: number = 1, perPage: number = 30): Promise<StravaClub[]> {
    return this.request<StravaClub[]>(
      `/athlete/clubs?page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Get club by ID
   */
  async getClub(id: number): Promise<StravaClub> {
    return this.request<StravaClub>(`/clubs/${id}`);
  }

  /**
   * Get club members
   */
  async getClubMembers(
    id: number,
    page: number = 1,
    perPage: number = 30
  ): Promise<StravaAthlete[]> {
    return this.request<StravaAthlete[]>(
      `/clubs/${id}/members?page=${page}&per_page=${perPage}`
    );
  }

  /**
   * Get club activities
   */
  async getClubActivities(
    id: number,
    page: number = 1,
    perPage: number = 30
  ): Promise<StravaActivity[]> {
    return this.request<StravaActivity[]>(
      `/clubs/${id}/activities?page=${page}&per_page=${perPage}`
    );
  }

  // ========== GEAR APIs ==========

  /**
   * Get gear by ID
   */
  async getGear(id: string): Promise<StravaGear> {
    return this.request<StravaGear>(`/gear/${id}`);
  }
}
