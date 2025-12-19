import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthIncident } from "../../types/health";

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
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
    
    const now = new Date();
    const incident: HealthIncident = {
      ...incidentData,
      dateStarted: new Date(incidentData.dateStarted || now),
      created_at: now,
      updated_at: now,
    } as HealthIncident;

    const db = await getDatabase();
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
