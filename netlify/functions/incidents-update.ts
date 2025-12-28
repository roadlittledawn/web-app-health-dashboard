import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthIncident } from "../../types/health";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  if (event.httpMethod !== "PATCH") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only PATCH requests are allowed"
        }
      } as ErrorResponse),
      headers: { "Content-Type": "application/json", "Allow": "PATCH" },
    };
  }

  try {
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "NO_TOKEN",
            message: "No authentication token provided"
          }
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    verifyToken(token);

    const { id, updates } = JSON.parse(event.body || '{}');

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "MISSING_ID",
            message: "Incident ID is required"
          }
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Validate MongoDB ObjectId format
    if (!ObjectId.isValid(id)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "INVALID_ID",
            message: "Invalid incident ID format"
          }
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    const db = await getDatabase();

    // Convert date fields to Date objects if they exist
    const updateData: any = { ...updates };
    if (updateData.dateStarted) {
      updateData.dateStarted = new Date(updateData.dateStarted);
    }
    updateData.updated_at = new Date();

    const result = await db.collection<HealthIncident>('health-incidents').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: {
            code: "NOT_FOUND",
            message: "Incident not found"
          }
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Update incident error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while updating incident"
        }
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
