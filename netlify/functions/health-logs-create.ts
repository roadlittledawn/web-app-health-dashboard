import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
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
 * POST /api/health-logs/create
 * Create a new health log entry
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
    const requiredFields = [
      'issue_type',
      'pain_level',
      'description',
      'incident_id',
      'body_area',
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: {
              code: "MISSING_FIELD",
              message: `Missing required field: ${field}`,
            },
          } as ErrorResponse),
          headers: {
            "Content-Type": "application/json",
          },
        };
      }
    }

    // Validate pain level
    if (data.pain_level < 1 || data.pain_level > 10) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "INVALID_PAIN_LEVEL",
            message: "Pain level must be between 1 and 10",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Create health log object
    const now = new Date();
    const healthLog: HealthLog = {
      timestamp: data.timestamp ? new Date(data.timestamp) : now,
      issue_type: data.issue_type,
      pain_level: data.pain_level,
      description: data.description,
      incident_id: data.incident_id,
      activities: data.activities || [],
      triggers: data.triggers || [],
      symptoms: data.symptoms || [],
      body_area: data.body_area,
      status: data.status || 'active',
      created_at: now,
      updated_at: now,
    };

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<HealthLog>('health-logs');

    // Insert the log
    const result = await collection.insertOne(healthLog);
    const created = await collection.findOne({ _id: result.insertedId });

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        message: "Health log created successfully",
        data: created,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Create health log error:", error);

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
          message: "An error occurred while creating health log",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
