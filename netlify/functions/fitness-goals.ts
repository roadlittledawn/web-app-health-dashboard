import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { FitnessGoal, StravaWorkout } from "../../types/strava";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Calculate current progress for a goal based on workouts
 */
async function calculateGoalProgress(
  goal: FitnessGoal,
  workoutsCollection: any
): Promise<number> {
  // Build filter for workouts within goal time period
  const filter: any = {
    start_date: {
      $gte: goal.start_date,
      $lte: goal.end_date || new Date(),
    },
  };

  if (goal.activity_type) filter.type = goal.activity_type;
  if (goal.sport_type) filter.sport_type = goal.sport_type;

  // Get matching workouts
  const workouts = await workoutsCollection.find(filter).toArray();

  // Calculate based on goal type
  let currentValue = 0;

  switch (goal.goal_type) {
    case 'distance':
      currentValue = workouts.reduce((sum: number, w: StravaWorkout) => sum + (w.distance || 0), 0);
      // Convert to goal units if needed (assume meters in DB)
      if (goal.unit === 'km') currentValue = currentValue / 1000;
      if (goal.unit === 'mi') currentValue = currentValue * 0.000621371;
      break;

    case 'duration':
      currentValue = workouts.reduce((sum: number, w: StravaWorkout) => sum + (w.moving_time || 0), 0);
      // Convert to goal units if needed (assume seconds in DB)
      if (goal.unit === 'hours') currentValue = currentValue / 3600;
      if (goal.unit === 'minutes') currentValue = currentValue / 60;
      break;

    case 'elevation':
      currentValue = workouts.reduce((sum: number, w: StravaWorkout) => sum + (w.total_elevation_gain || 0), 0);
      // Convert to goal units if needed (assume meters in DB)
      if (goal.unit === 'ft') currentValue = currentValue * 3.28084;
      break;

    case 'frequency':
      currentValue = workouts.length;
      break;

    default:
      currentValue = 0;
  }

  return Math.round(currentValue * 100) / 100; // Round to 2 decimals
}

/**
 * Fitness Goals CRUD endpoint
 * GET - Query goals
 * POST - Create goal
 * PATCH - Update goal
 * DELETE - Delete goal
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
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

    const db = await getDatabase();
    const goalsCollection = db.collection<FitnessGoal>('fitness-goals');
    const workoutsCollection = db.collection<StravaWorkout>('strava-workouts');

    // Handle GET - Query goals
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const { status, goal_type, activity_type } = params;

      const filter: any = {};
      if (status) filter.status = status;
      if (goal_type) filter.goal_type = goal_type;
      if (activity_type) filter.activity_type = activity_type;

      const goals = await goalsCollection.find(filter).sort({ created_at: -1 }).toArray();

      // Calculate current progress for each goal
      const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
          const currentValue = await calculateGoalProgress(goal, workoutsCollection);
          const percentage = Math.min((currentValue / goal.target_value) * 100, 100);
          const remaining = Math.max(goal.target_value - currentValue, 0);

          return {
            ...goal,
            current_value: currentValue,
            progress: {
              percentage: Math.round(percentage * 10) / 10,
              remaining,
            },
          };
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: goalsWithProgress,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Handle POST - Create goal
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "MISSING_BODY",
              message: "Request body is required",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      const data = JSON.parse(event.body);

      // Validate required fields
      if (!data.goal_type || !data.target_value || !data.unit || !data.time_period || !data.start_date) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "MISSING_FIELDS",
              message: "goal_type, target_value, unit, time_period, and start_date are required",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      const now = new Date();
      const goal: FitnessGoal = {
        goal_type: data.goal_type,
        activity_type: data.activity_type,
        sport_type: data.sport_type,
        target_value: data.target_value,
        current_value: 0,
        unit: data.unit,
        time_period: data.time_period,
        start_date: new Date(data.start_date),
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        status: 'active',
        description: data.description,
        created_at: now,
        updated_at: now,
      };

      const result = await goalsCollection.insertOne(goal);
      const created = await goalsCollection.findOne({ _id: result.insertedId });

      return {
        statusCode: 201,
        body: JSON.stringify({
          success: true,
          message: "Goal created successfully",
          data: created,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Handle PATCH - Update goal
    if (event.httpMethod === "PATCH") {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "MISSING_BODY",
              message: "Request body is required",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      const { id, updates } = JSON.parse(event.body);

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "MISSING_ID",
              message: "Goal ID is required",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      const updateData = {
        ...updates,
        updated_at: new Date(),
      };

      const result = await goalsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Goal not found",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Goal updated successfully",
          data: result,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Handle DELETE - Delete goal
    if (event.httpMethod === "DELETE") {
      const params = event.queryStringParameters || {};
      const { id } = params;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "MISSING_ID",
              message: "Goal ID is required",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      const result = await goalsCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: {
              code: "NOT_FOUND",
              message: "Goal not found",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Goal deleted successfully",
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Method not allowed",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
        "Allow": "GET, POST, PATCH, DELETE",
      },
    };
  } catch (error) {
    console.error("Fitness goals error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while processing fitness goals",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
