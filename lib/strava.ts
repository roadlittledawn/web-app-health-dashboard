import { StravaActivity, StravaOAuthTokens, StravaAthlete } from '../types/strava';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_OAUTH_BASE = 'https://www.strava.com/oauth';
const STRAVA_MAX_PER_PAGE = 200; // Max allowed by Strava API

/**
 * Refresh Strava access token
 */
export async function refreshStravaToken(refreshToken: string): Promise<StravaOAuthTokens> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Strava credentials not configured');
  }

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Strava token: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete?.id,
  };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeStravaCode(code: string): Promise<StravaOAuthTokens & { athlete: StravaAthlete }> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Strava credentials not configured');
  }

  const response = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Strava code: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete?.id,
    athlete: data.athlete,
  };
}

/**
 * Fetch authenticated athlete info
 */
export async function getStravaAthlete(accessToken: string): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Strava athlete: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch activities from Strava
 * @param accessToken Strava access token
 * @param page Page number (default 1)
 * @param perPage Activities per page (default 30, max 200)
 * @param after Unix timestamp to filter activities after
 * @param before Unix timestamp to filter activities before
 */
export async function getStravaActivities(
  accessToken: string,
  options: {
    page?: number;
    perPage?: number;
    after?: number;
    before?: number;
  } = {}
): Promise<StravaActivity[]> {
  const { page = 1, perPage = 30, after, before } = options;

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: Math.min(perPage, STRAVA_MAX_PER_PAGE).toString(),
  });

  if (after) params.append('after', after.toString());
  if (before) params.append('before', before.toString());

  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // Include status code in error message for better error handling (e.g., rate limits)
    throw new Error(`Failed to fetch Strava activities: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch all activities from Strava with automatic pagination
 * @param accessToken Strava access token
 * @param options Optional filters (after, before)
 * @param onProgress Optional callback for progress updates (page, activities fetched)
 */
export async function getAllStravaActivities(
  accessToken: string,
  options: {
    after?: number;
    before?: number;
  } = {},
  onProgress?: (page: number, activities: StravaActivity[]) => void
): Promise<StravaActivity[]> {
  const allActivities: StravaActivity[] = [];
  const perPage = STRAVA_MAX_PER_PAGE;
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const activities = await getStravaActivities(accessToken, {
      page: currentPage,
      perPage,
      after: options.after,
      before: options.before,
    });

    // If no activities returned, we've reached the end
    if (activities.length === 0) {
      hasMorePages = false;
      break;
    }

    allActivities.push(...activities);

    // Call progress callback if provided
    if (onProgress) {
      onProgress(currentPage, activities);
    }

    currentPage++;
  }

  return allActivities;
}

/**
 * Fetch a single activity by ID
 */
export async function getStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity> {
  const response = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Strava activity: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Convert meters to miles
 */
export function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

/**
 * Convert meters to kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

/**
 * Convert seconds to hours
 */
export function secondsToHours(seconds: number): number {
  return seconds / 3600;
}

/**
 * Format seconds as HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace (min/mile or min/km)
 */
export function formatPace(metersPerSecond: number, unit: 'mi' | 'km' = 'mi'): string {
  if (!metersPerSecond || metersPerSecond === 0) return '--:--';

  const metersPerUnit = unit === 'mi' ? 1609.34 : 1000;
  const secondsPerUnit = metersPerUnit / metersPerSecond;
  const minutes = Math.floor(secondsPerUnit / 60);
  const seconds = Math.floor(secondsPerUnit % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format distance with appropriate unit
 */
export function formatDistance(meters: number, unit: 'mi' | 'km' = 'mi'): string {
  const distance = unit === 'mi' ? metersToMiles(meters) : metersToKilometers(meters);
  return `${distance.toFixed(2)} ${unit}`;
}

/**
 * Get activity icon/emoji based on type
 */
export function getActivityIcon(type: string): string {
  const icons: { [key: string]: string } = {
    'Run': '🏃',
    'Ride': '🚴',
    'Swim': '🏊',
    'Hike': '🥾',
    'Walk': '🚶',
    'AlpineSki': '⛷️',
    'BackcountrySki': '⛷️',
    'NordicSki': '⛷️',
    'Snowboard': '🏂',
    'Rowing': '🚣',
    'Kayaking': '🛶',
    'Canoeing': '🛶',
    'Surfing': '🏄',
    'WeightTraining': '🏋️',
    'Yoga': '🧘',
    'Workout': '💪',
    'Elliptical': '🏃',
    'StairStepper': '🪜',
    'RockClimbing': '🧗',
    'IceSkate': '⛸️',
    'InlineSkate': '🛼',
    'Golf': '⛳',
  };

  return icons[type] || '🏃';
}

/**
 * Calculate activity summary statistics
 */
export function calculateActivityStats(activities: StravaActivity[]) {
  const stats = {
    totalDistance: 0,
    totalMovingTime: 0,
    totalElevation: 0,
    totalActivities: activities.length,
    byType: {} as { [type: string]: { count: number; distance: number; time: number } },
  };

  activities.forEach(activity => {
    stats.totalDistance += activity.distance || 0;
    stats.totalMovingTime += activity.moving_time || 0;
    stats.totalElevation += activity.total_elevation_gain || 0;

    if (!stats.byType[activity.type]) {
      stats.byType[activity.type] = { count: 0, distance: 0, time: 0 };
    }

    stats.byType[activity.type].count++;
    stats.byType[activity.type].distance += activity.distance || 0;
    stats.byType[activity.type].time += activity.moving_time || 0;
  });

  return stats;
}
