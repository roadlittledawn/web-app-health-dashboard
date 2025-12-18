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

interface AutocompleteData {
  issue_types: string[];
  body_areas: string[];
  symptoms: string[];
  triggers: string[];
  activities: string[];
  incident_ids: Array<{
    incident_id: string;
    issue_type: string;
    last_log: Date;
    status: string;
  }>;
}

/**
 * GET /api/health-logs-autocomplete
 * Get unique values for autocomplete fields from existing health logs
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

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<HealthLog>('health-logs');

    // Get unique issue types
    const issue_types = await collection.distinct('issue_type');

    // Get unique body areas
    const body_areas = await collection.distinct('body_area');

    // Get all unique symptoms (from array fields)
    const symptomsAgg = await collection.aggregate([
      { $unwind: '$symptoms' },
      { $group: { _id: '$symptoms' } },
      { $sort: { _id: 1 } }
    ]).toArray();
    const symptoms = symptomsAgg.map(doc => doc._id).filter(Boolean);

    // Get all unique triggers (from array fields)
    const triggersAgg = await collection.aggregate([
      { $unwind: '$triggers' },
      { $group: { _id: '$triggers' } },
      { $sort: { _id: 1 } }
    ]).toArray();
    const triggers = triggersAgg.map(doc => doc._id).filter(Boolean);

    // Get all unique activities (from array fields)
    const activitiesAgg = await collection.aggregate([
      { $unwind: '$activities' },
      { $group: { _id: '$activities' } },
      { $sort: { _id: 1 } }
    ]).toArray();
    const activities = activitiesAgg.map(doc => doc._id).filter(Boolean);

    // Get recent incident IDs with metadata
    const incidentsAgg = await collection.aggregate([
      {
        $group: {
          _id: '$incident_id',
          issue_type: { $first: '$issue_type' },
          last_log: { $max: '$timestamp' },
          status: { $last: '$status' },
        }
      },
      { $sort: { last_log: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 0,
          incident_id: '$_id',
          issue_type: 1,
          last_log: 1,
          status: 1,
        }
      }
    ]).toArray();

    const autocompleteData: AutocompleteData = {
      issue_types: issue_types.filter(Boolean).sort(),
      body_areas: body_areas.filter(Boolean).sort(),
      symptoms,
      triggers,
      activities,
      incident_ids: incidentsAgg,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: autocompleteData,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Get autocomplete data error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while fetching autocomplete data",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};
