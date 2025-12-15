import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { getStravaActivities, refreshStravaToken } from "../../lib/strava";
import { StravaOAuthTokens, StravaWorkout, StravaActivity } from "../../types/strava";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Convert Strava API activity to our MongoDB workout format
 */
function convertActivityToWorkout(activity: StravaActivity): Omit<StravaWorkout, '_id'> {
  return {
    strava_id: activity.id,
    athlete_id: activity.athlete.id,
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: new Date(activity.start_date),
    start_date_local: new Date(activity.start_date_local),
    distance: activity.distance,
    moving_time: activity.moving_time,
    elapsed_time: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    calories: activity.calories,
    device_name: activity.device_name,
    description: activity.description,
    trainer: activity.trainer,
    commute: activity.commute,
    sync_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * POST /api/strava-sync
 * Sync activities from Strava to local database
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
        "Allow": "POST",
      },
    };
  }

  try {
    // Verify authentication
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "NO_TOKEN",
            message: "No authentication token provided",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    try {
      verifyToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Get Strava tokens from database
    const db = await getDatabase();
    const tokensCollection = db.collection<StravaOAuthTokens>('strava-tokens');

    let stravaTokens = await tokensCollection.findOne({});

    if (!stravaTokens) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: {
            code: "STRAVA_NOT_CONNECTED",
            message: "Strava account not connected. Please authorize first.",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Check if token needs refresh
    const now = Math.floor(Date.now() / 1000);
    let accessToken = stravaTokens.access_token;

    if (stravaTokens.expires_at <= now) {
      const refreshedTokens = await refreshStravaToken(stravaTokens.refresh_token);

      // Update tokens in database
      await tokensCollection.updateOne(
        { athlete_id: stravaTokens.athlete_id },
        {
          $set: {
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token,
            expires_at: refreshedTokens.expires_at,
            updated_at: new Date(),
          },
        }
      );

      accessToken = refreshedTokens.access_token;
    }

    // Parse request body for sync options
    const { page = 1, perPage = 30, after, before } = event.body
      ? JSON.parse(event.body)
      : {};

    // Fetch activities from Strava
    const activities = await getStravaActivities(accessToken, {
      page,
      perPage,
      after,
      before,
    });

    // Store activities in database
    const workoutsCollection = db.collection<StravaWorkout>('strava-workouts');

    let newCount = 0;
    let updatedCount = 0;

    for (const activity of activities) {
      const workout = convertActivityToWorkout(activity);

      const result = await workoutsCollection.updateOne(
        { strava_id: activity.id },
        {
          $set: {
            ...workout,
            updated_at: new Date(),
          },
          $setOnInsert: {
            created_at: new Date(),
          },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) {
        newCount++;
      } else if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Strava activities synced successfully",
        data: {
          fetched: activities.length,
          new: newCount,
          updated: updatedCount,
          page,
          perPage,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Strava sync error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while syncing Strava activities",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
