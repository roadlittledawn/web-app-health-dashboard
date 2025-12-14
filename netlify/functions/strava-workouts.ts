import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { StravaWorkout } from "../../types/strava";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/strava-workouts
 * Query cached Strava workouts with filtering and pagination
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET requests are allowed",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
        "Allow": "GET",
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

    // Get query parameters
    const params = event.queryStringParameters || {};
    const {
      type,
      sport_type,
      start_date,
      end_date,
      limit = "20",
      skip = "0",
      sort_by = "start_date",
      sort_order = "desc",
    } = params;

    // Build filter
    const filter: any = {};

    if (type) filter.type = type;
    if (sport_type) filter.sport_type = sport_type;

    if (start_date || end_date) {
      filter.start_date = {};
      if (start_date) filter.start_date.$gte = new Date(start_date);
      if (end_date) filter.start_date.$lte = new Date(end_date);
    }

    // Build sort
    const sortDirection = sort_order === "asc" ? 1 : -1;
    const sort: any = { [sort_by]: sortDirection };

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<StravaWorkout>('strava-workouts');

    // Execute query with pagination
    const workouts = await collection
      .find(filter)
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    // Get total count for pagination
    const totalCount = await collection.countDocuments(filter);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: workouts,
        pagination: {
          total: totalCount,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: parseInt(skip) + workouts.length < totalCount,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Query workouts error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while querying workouts",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
