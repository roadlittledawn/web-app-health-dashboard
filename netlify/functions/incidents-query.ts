import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthIncident } from "../../types/health";

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Only GET requests are allowed" } }),
      headers: { "Content-Type": "application/json", "Allow": "GET" },
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

    const params = event.queryStringParameters || {};
    const { _id, status, limit = "50", skip = "0", sort_by = "dateStarted", sort_order = "desc" } = params;

    const filter: any = {};
    if (_id) filter._id = new ObjectId(_id);
    if (status) filter.status = status;

    const db = await getDatabase();
    const collection = db.collection<HealthIncident>('health-incidents');

    const sortField = sort_by || 'dateStarted';
    const sortDirection = sort_order === 'asc' ? 1 : -1;

    const incidents = await collection
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
        data: incidents,
        pagination: { total, returned: incidents.length, skip: parseInt(skip), limit: parseInt(limit) },
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Query incidents error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while querying incidents" } }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
