import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { StravaWorkout } from "../../types/strava";
import {
  SearchFieldConfig,
  buildRules,
  searchAndRank,
} from "../../lib/searchRanking";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Search field configuration for StravaWorkout
 * Priority 1: name
 * Priority 2: description
 */
const workoutSearchFields: SearchFieldConfig<StravaWorkout>[] = [
  {
    name: "name",
    getter: (w) => w.name,
    priority: 1,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
  {
    name: "description",
    getter: (w) => w.description,
    priority: 2,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
];

const searchRules = buildRules(workoutSearchFields);

/**
 * GET /api/strava-workouts-search
 * Search Strava workouts with text search ranking and filtering
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

    // Get query parameters
    const params = event.queryStringParameters || {};
    const {
      q,
      type,
      sport_type,
      start_date,
      end_date,
      limit = "20",
      skip = "0",
    } = params;

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

    // Build MongoDB filter
    const filter: Record<string, unknown> = {};

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Sport type filter
    if (sport_type) {
      filter.sport_type = sport_type;
    }

    // Date range filter
    if (start_date || end_date) {
      filter.start_date_local = {};
      if (start_date) filter.start_date_local.$gte = new Date(start_date);
      if (end_date) filter.start_date_local.$lte = new Date(end_date);
    }

    const collection = db.collection<StravaWorkout>("strava-workouts");

    // Fetch all matching workouts (filtering done in DB, ranking done in memory)
    const workouts = await collection
      .find(filter)
      .sort({ start_date_local: -1 })
      .toArray();

    let results: Array<StravaWorkout & { _searchScore?: number }>;
    let totalMatches: number;

    if (q && q.trim()) {
      // Apply text search ranking
      const rankedResults = searchAndRank(workouts, q.trim(), searchRules, 1);
      totalMatches = rankedResults.length;

      // Apply pagination
      const skipNum = parseInt(skip);
      const limitNum = parseInt(limit);
      const paginatedResults = rankedResults.slice(skipNum, skipNum + limitNum);

      // Remove internal _scoreBreakdown from response
      results = paginatedResults.map((item) => {
        const { _scoreBreakdown, ...rest } = item;
        return rest;
      });
    } else {
      // No search query - return filtered results without scoring
      totalMatches = workouts.length;
      const skipNum = parseInt(skip);
      const limitNum = parseInt(limit);
      results = workouts.slice(skipNum, skipNum + limitNum);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: results,
        pagination: {
          total: totalMatches,
          returned: results.length,
          skip: parseInt(skip),
          limit: parseInt(limit),
        },
        searchMeta: q ? { query: q, totalMatches } : undefined,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Search workouts error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while searching workouts",
        },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
