import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthIncident } from "../../types/health";

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext): Promise<HandlerResponse> => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Only POST requests are allowed" } }),
      headers: { "Content-Type": "application/json", "Allow": "POST" },
    };
  }

  try {
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: { code: "NO_TOKEN", message: "No authentication token provided" } }),
        headers: { "Content-Type": "application/json" },
      };
    }

    verifyToken(token);

    const incidentData: Partial<HealthIncident> = JSON.parse(event.body || '{}');

    // Validate that incidentId is provided
    if (!incidentData.incidentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: { code: "MISSING_INCIDENT_ID", message: "Incident ID is required" } }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const db = await getDatabase();

    // Check if incident ID already exists
    const existingIncident = await db.collection<HealthIncident>('health-incidents').findOne({
      incidentId: incidentData.incidentId
    });

    if (existingIncident) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: { code: "DUPLICATE_INCIDENT_ID", message: "An incident with this ID already exists" } }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const now = new Date();
    const incident: HealthIncident = {
      ...incidentData,
      dateStarted: new Date(incidentData.dateStarted || now),
      created_at: now,
      updated_at: now,
    } as HealthIncident;

    const result = await db.collection<HealthIncident>('health-incidents').insertOne(incident);

    return {
      statusCode: 201,
      body: JSON.stringify({
        success: true,
        data: { _id: result.insertedId, ...incident },
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Create incident error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while creating incident" } }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
