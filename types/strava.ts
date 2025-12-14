import { ObjectId } from 'mongodb';

export interface StravaWorkout {
  _id?: ObjectId;
  strava_id: number;            // Strava activity ID
  athlete_id: number;
  name: string;
  type: string;                 // 'Run', 'Ride', 'Swim', etc.
  start_date: Date;
  distance: number;             // meters
  moving_time: number;          // seconds
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed?: number;
  max_speed?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  sync_date: Date;              // When we fetched this
}

export interface FitnessGoal {
  _id?: ObjectId;
  goal_type: string;            // 'distance', 'frequency', 'duration', etc.
  activity_type?: string;       // 'Run', 'Ride', etc.
  target_value: number;
  current_value: number;
  unit: string;
  time_period: 'week' | 'month' | 'year';
  start_date: Date;
  end_date?: Date;
  status: 'active' | 'completed' | 'abandoned';
  created_at: Date;
  updated_at: Date;
}

export interface StravaOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;           // Unix timestamp
  athlete_id: number;
}
