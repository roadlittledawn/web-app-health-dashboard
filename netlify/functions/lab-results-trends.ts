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
 * GET /api/lab-results-trends
 * Get lab result trends formatted for charting
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
      test_type = "lipid_panel",
      start_date,
      end_date,
      limit = "100",
    } = params;

    // Build filter
    const filter: any = { test_type };

    if (start_date || end_date) {
      filter.test_date = {};
      if (start_date) filter.test_date.$gte = new Date(start_date);
      if (end_date) filter.test_date.$lte = new Date(end_date);
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<LabResult>('lab-results');

    // Get results sorted by date
    const results = await collection
      .find(filter)
      .sort({ test_date: 1 })
      .limit(parseInt(limit))
      .toArray();

    // Format for charting
    const trendData = results.map(result => ({
      date: result.test_date.toISOString().split('T')[0], // YYYY-MM-DD
      dateLabel: new Date(result.test_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      total_cholesterol: result.total_cholesterol?.value,
      total_cholesterol_flag: result.total_cholesterol?.flag,
      ldl: result.ldl_cholesterol?.value,
      ldl_flag: result.ldl_cholesterol?.flag,
      hdl: result.hdl_cholesterol?.value,
      hdl_flag: result.hdl_cholesterol?.flag,
      triglycerides: result.triglycerides?.value,
      triglycerides_flag: result.triglycerides?.flag,
      ordered_by: result.ordered_by,
      notes: result.notes,
    }));

    // Get reference ranges from most recent result
    const referenceRanges = results.length > 0 ? {
      total_cholesterol: results[results.length - 1].total_cholesterol?.reference_range,
      ldl: results[results.length - 1].ldl_cholesterol?.reference_range,
      hdl: results[results.length - 1].hdl_cholesterol?.reference_range,
      triglycerides: results[results.length - 1].triglycerides?.reference_range,
    } : null;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: trendData,
        referenceRanges,
        count: trendData.length,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Get lab trends error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching lab trends",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
