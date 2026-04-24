import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/strava-workout-types
 * Returns distinct workout types and sport types for UI dropdowns and AI agents
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET requests are allowed",
        },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json", Allow: "GET" },
    };
  }

  try {
    // Verify authentication
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "NO_TOKEN", message: "No authentication token provided" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    try {
      verifyToken(token);
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Get database and collection
    const db = await getDatabase();

    // Check if Strava is connected (tokens exist)
    const tokensCollection = db.collection("strava-tokens");
    const stravaTokens = await tokensCollection.findOne({});

    if (!stravaTokens) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: {
            code: "STRAVA_NOT_CONNECTED",
            message: "Strava account not connected. Please authorize first.",
          },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    const collection = db.collection("strava-workouts");

    // Get distinct types and sport_types
    const [types, sportTypes] = await Promise.all([
      collection.distinct("type"),
      collection.distinct("sport_type"),
    ]);

    // Sort alphabetically
    types.sort();
    sportTypes.sort();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          types,
          sport_types: sportTypes,
        },
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Get workout types error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching workout types",
        },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
