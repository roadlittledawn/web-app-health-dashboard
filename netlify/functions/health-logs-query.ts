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

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/health-logs/query
 * Query health logs with filtering and pagination
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
      _id,
      issue_type,
      incident_id,
      body_area,
      status,
      pain_level_min,
      pain_level_max,
      start_date,
      end_date,
      limit = "50",
      skip = "0",
      sort_by = "timestamp",
      sort_order = "desc",
    } = params;

    // Build filter
    const filter: any = {};

    // Support filtering by MongoDB ObjectId
    if (_id) {
      try {
        filter._id = new ObjectId(_id);
      } catch (error) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "INVALID_ID",
              message: "Invalid MongoDB ObjectId format",
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }
    }

    if (issue_type) filter.issue_type = issue_type;
    if (incident_id) filter.incident_id = incident_id;
    if (body_area) filter.body_area = body_area;
    if (status) filter.status = status;

    if (pain_level_min || pain_level_max) {
      filter.pain_level = {};
      if (pain_level_min) filter.pain_level.$gte = parseInt(pain_level_min);
      if (pain_level_max) filter.pain_level.$lte = parseInt(pain_level_max);
    }

    if (start_date || end_date) {
      filter.timestamp = {};
      if (start_date) filter.timestamp.$gte = new Date(start_date);
      if (end_date) filter.timestamp.$lte = new Date(end_date);
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<HealthLog>('health-logs');

    // Execute query
    const sortField = sort_by || 'timestamp';
    const sortDirection = sort_order === 'asc' ? 1 : -1;

    const logs = await collection
      .find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .toArray();

    const total = await collection.countDocuments(filter);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: logs,
        pagination: {
          total,
          returned: logs.length,
          skip: parseInt(skip),
          limit: parseInt(limit),
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Query health logs error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while querying health logs",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
