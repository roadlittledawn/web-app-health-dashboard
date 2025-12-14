import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthLog, HealthIncident } from "../../types/health";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/health-incidents
 * Get health incidents (grouped logs) with analytics
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
      issue_type,
      start_date,
      end_date,
      status,
      limit = "50",
    } = params;

    // Build match filter
    const matchFilter: any = {};

    if (issue_type) matchFilter.issue_type = issue_type;
    if (status) matchFilter.status = status;

    if (start_date || end_date) {
      matchFilter.timestamp = {};
      if (start_date) matchFilter.timestamp.$gte = new Date(start_date);
      if (end_date) matchFilter.timestamp.$lte = new Date(end_date);
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<HealthLog>('health-logs');

    // Aggregation pipeline
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: '$incident_id',
          issue_type: { $first: '$issue_type' },
          first_log: { $min: '$timestamp' },
          last_log: { $max: '$timestamp' },
          log_count: { $sum: 1 },
          max_pain_level: { $max: '$pain_level' },
          avg_pain_level: { $avg: '$pain_level' },
          status: { $last: '$status' },
          all_symptoms: { $addToSet: { $concatArrays: ['$symptoms'] } },
          all_activities: { $addToSet: { $concatArrays: ['$activities'] } },
          all_triggers: { $addToSet: { $concatArrays: ['$triggers'] } },
        },
      },
      {
        $project: {
          incident_id: '$_id',
          issue_type: 1,
          first_log: 1,
          last_log: 1,
          duration_hours: {
            $divide: [{ $subtract: ['$last_log', '$first_log'] }, 3600000],
          },
          log_count: 1,
          max_pain_level: 1,
          avg_pain_level: { $round: ['$avg_pain_level', 1] },
          status: 1,
          all_symptoms: {
            $reduce: {
              input: '$all_symptoms',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] },
            },
          },
          all_activities: {
            $reduce: {
              input: '$all_activities',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] },
            },
          },
          all_triggers: {
            $reduce: {
              input: '$all_triggers',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] },
            },
          },
          _id: 0,
        },
      },
      { $sort: { first_log: -1 } },
      { $limit: parseInt(limit) },
    ];

    const incidents = await collection.aggregate<HealthIncident>(pipeline).toArray();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: incidents,
        count: incidents.length,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Get health incidents error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching health incidents",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
