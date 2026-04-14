import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthLog } from "../../types/health";
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
 * Search field configuration for HealthLog
 * Priority 1: description
 */
const healthLogSearchFields: SearchFieldConfig<HealthLog>[] = [
  {
    name: "description",
    getter: (log) => log.description,
    priority: 1,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
];

const searchRules = buildRules(healthLogSearchFields);

/**
 * GET /api/health-logs-search
 * Search health logs with text search ranking and filtering
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
      issue_type,
      incident_id,
      start_date,
      end_date,
      limit = "50",
      skip = "0",
    } = params;

    // Build MongoDB filter
    const filter: Record<string, unknown> = {};

    // Issue type filter
    if (issue_type) {
      filter.issue_type = issue_type;
    }

    // Incident ID filter
    if (incident_id) {
      try {
        filter.incident_id = new ObjectId(incident_id);
      } catch {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "INVALID_INCIDENT_ID",
              message: "Invalid incident_id ObjectId format",
            },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }
    }

    // Date range filter
    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) filter.timestamp.$gte = new Date(start_date);
      if (end_date) filter.timestamp.$lte = new Date(end_date);
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<HealthLog>("health-logs");

    // Fetch all matching logs (filtering done in DB, ranking done in memory)
    const logs = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .toArray();

    let results: Array<HealthLog & { _searchScore?: number }>;
    let totalMatches: number;

    if (q && q.trim()) {
      // Apply text search ranking
      const rankedResults = searchAndRank(logs, q.trim(), searchRules, 1);
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
      totalMatches = logs.length;
      const skipNum = parseInt(skip);
      const limitNum = parseInt(limit);
      results = logs.slice(skipNum, skipNum + limitNum);
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
    console.error("Search health logs error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while searching health logs",
        },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
