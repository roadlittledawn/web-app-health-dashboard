import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { LabResult } from "../../types/labs";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/lab-results-query
 * Query lab results with filtering and pagination
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
      test_type,
      ordered_by,
      start_date,
      end_date,
      limit = "50",
      skip = "0",
      sort_by = "test_date",
      sort_order = "desc",
    } = params;

    // Build filter
    const filter: any = {};

    if (test_type) filter.test_type = test_type;
    if (ordered_by) filter.ordered_by = ordered_by;

    if (start_date || end_date) {
      filter.test_date = {};
      if (start_date) filter.test_date.$gte = new Date(start_date);
      if (end_date) filter.test_date.$lte = new Date(end_date);
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<LabResult>('lab-results');

    // Execute query
    const sortField = sort_by || 'test_date';
    const sortDirection = sort_order === 'asc' ? 1 : -1;

    const results = await collection
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
        data: results,
        pagination: {
          total,
          returned: results.length,
          skip: parseInt(skip),
          limit: parseInt(limit),
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Query lab results error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while querying lab results",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
