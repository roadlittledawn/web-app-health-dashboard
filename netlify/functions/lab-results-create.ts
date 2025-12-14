import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { LabResult, LabMeasurement } from "../../types/labs";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Helper function to calculate flag based on reference range
function calculateFlag(value: number, refRange: { min: number; max: number }): 'high' | 'low' | 'normal' {
  if (value < refRange.min) return 'low';
  if (value > refRange.max) return 'high';
  return 'normal';
}

/**
 * POST /api/lab-results-create
 * Create a new lab result entry
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

    // Parse request body
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
    if (!data.test_date || !data.test_type || !data.ordered_by) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "MISSING_FIELDS",
            message: "test_date, test_type, and ordered_by are required",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Create lab result object
    const now = new Date();
    const labResult: LabResult = {
      test_date: new Date(data.test_date),
      test_type: data.test_type,
      ordered_by: data.ordered_by,
      lab_name: data.lab_name,
      notes: data.notes,
      created_at: now,
      updated_at: now,
    };

    // Add lipid panel fields if present (with auto-calculated flags)
    if (data.total_cholesterol) {
      labResult.total_cholesterol = {
        ...data.total_cholesterol,
        flag: calculateFlag(
          data.total_cholesterol.value,
          data.total_cholesterol.reference_range
        ),
      };
    }

    if (data.ldl_cholesterol) {
      labResult.ldl_cholesterol = {
        ...data.ldl_cholesterol,
        flag: calculateFlag(
          data.ldl_cholesterol.value,
          data.ldl_cholesterol.reference_range
        ),
      };
    }

    if (data.hdl_cholesterol) {
      labResult.hdl_cholesterol = {
        ...data.hdl_cholesterol,
        flag: calculateFlag(
          data.hdl_cholesterol.value,
          data.hdl_cholesterol.reference_range
        ),
      };
    }

    if (data.triglycerides) {
      labResult.triglycerides = {
        ...data.triglycerides,
        flag: calculateFlag(
          data.triglycerides.value,
          data.triglycerides.reference_range
        ),
      };
    }

    // Add custom results if present
    if (data.custom_results) {
      labResult.custom_results = data.custom_results;
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<LabResult>('lab-results');

    // Insert the result
    const result = await collection.insertOne(labResult);
    const created = await collection.findOne({ _id: result.insertedId });

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: "Lab result created successfully",
        data: created,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Create lab result error:", error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while creating lab result",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
