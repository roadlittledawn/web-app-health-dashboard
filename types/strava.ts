import { ObjectId } from 'mongodb';

/**
 * Strava Activity (raw API response)
 * Based on Strava API v3 Activity schema
 */
export interface StravaActivity {
  id: number;
  athlete: {
    id: number;
  };
  name: string;
  type: string; // 'Run', 'Ride', 'Swim', 'Hike', etc.
  sport_type: string; // More specific: 'TrailRun', 'MountainBikeRide', etc.
  start_date: string; // ISO 8601 format
  start_date_local: string;
  timezone: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  elev_high?: number;
  elev_low?: number;
  average_speed?: number; // m/s
  max_speed?: number; // m/s
  average_heartrate?: number; // bpm
  max_heartrate?: number; // bpm
  calories?: number;
  device_name?: string;
  gear_id?: string;
  description?: string;
  private: boolean;
  trainer: boolean;
  commute: boolean;
}

/**
 * Strava Workout (MongoDB cached version)
 * Simplified and optimized for our dashboard
 */
export interface StravaWorkout {
  _id?: ObjectId;
  strava_id: number; // Strava activity ID
  athlete_id: number;
  name: string;
  type: string; // Activity type
  sport_type: string; // Specific sport type
  start_date: Date;
  start_date_local: Date;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number; // meters
  average_speed?: number; // m/s
  max_speed?: number; // m/s
  average_heartrate?: number; // bpm
  max_heartrate?: number; // bpm
  calories?: number;
  device_name?: string;
  description?: string;
  trainer: boolean;
  commute: boolean;
  sync_date: Date; // When we last synced this activity
  created_at: Date;
  updated_at: Date;
}

/**
 * Fitness Goal
 * User-defined goals for tracking progress
 */
export interface FitnessGoal {
  _id?: ObjectId;
  goal_type: 'distance' | 'frequency' | 'duration' | 'elevation' | 'custom';
  activity_type?: string; // 'Run', 'Ride', etc. (optional - all activities if omitted)
  sport_type?: string; // More specific filter (optional)
  target_value: number;
  current_value: number; // Auto-calculated from workouts
  unit: string; // 'km', 'mi', 'hours', 'meters', 'activities', etc.
  time_period: 'week' | 'month' | 'year' | 'custom';
  start_date: Date;
  end_date?: Date; // Required for custom time periods
  status: 'active' | 'completed' | 'abandoned';
  description?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Strava OAuth Tokens
 * Stored securely in environment variables or database
 */
export interface StravaOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  athlete_id: number;
}

/**
 * Strava Athlete Info
 */
export interface StravaAthlete {
  id: number;
  username?: string;
  firstname: string;
  lastname: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: 'M' | 'F';
  premium: boolean;
  created_at: string;
  updated_at: string;
  profile_medium?: string;
  profile?: string;
}

/**
 * Workout Summary Statistics
 * For dashboard and analytics
 */
export interface WorkoutStats {
  total_activities: number;
  total_distance: number; // meters
  total_moving_time: number; // seconds
  total_elevation_gain: number; // meters
  average_distance: number; // meters
  average_moving_time: number; // seconds
  by_type: {
    [type: string]: {
      count: number;
      total_distance: number;
      total_moving_time: number;
      total_elevation_gain: number;
    };
  };
}

/**
 * Goal Progress Calculation
 */
export interface GoalProgress {
  goal_id: string;
  current_value: number;
  target_value: number;
  percentage: number;
  remaining: number;
  on_track: boolean; // Based on time elapsed vs progress
  projected_completion?: Date;
}
