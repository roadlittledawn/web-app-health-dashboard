import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { Exercise } from "../../types/workout-programs";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  try {
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "NO_TOKEN", message: "No authentication token provided" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    try {
      verifyToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    const db = await getDatabase();
    const exercisesCollection = db.collection<Exercise>('exercises');

    // GET - Query exercises
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const { name, targetArea, requiredEquipment } = params;

      const filter: any = {};
      if (name) filter.name = { $regex: name, $options: 'i' };
      if (targetArea) filter.targetArea = targetArea;
      if (requiredEquipment) filter.requiredEquipment = requiredEquipment;

      const exercises = await exercisesCollection.find(filter).sort({ name: 1 }).toArray();

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: exercises }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // POST - Create exercise
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_BODY", message: "Request body is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      const data = JSON.parse(event.body);

      if (!data.name || !data.targetArea || data.isTimeBased === undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_FIELDS", message: "name, targetArea, and isTimeBased are required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      const now = new Date();
      const exercise: Exercise = {
        name: data.name,
        aliases: data.aliases || [],
        media: data.media || [],
        requiredEquipment: data.requiredEquipment || [],
        targetArea: data.targetArea,
        description: data.description || '',
        difficulty: data.difficulty || 'beginner',
        isTimeBased: data.isTimeBased,
        created_at: now,
        updated_at: now,
      };

      const result = await exercisesCollection.insertOne(exercise);
      const created = await exercisesCollection.findOne({ _id: result.insertedId });

      return {
        statusCode: 201,
        body: JSON.stringify({ success: true, message: "Exercise created successfully", data: created }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // PATCH - Update exercise
    if (event.httpMethod === "PATCH") {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_BODY", message: "Request body is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      const { id, updates } = JSON.parse(event.body);

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_ID", message: "Exercise ID is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      const updateData = { ...updates, updated_at: new Date() };

      const result = await exercisesCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "Exercise not found" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Exercise updated successfully", data: result }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // DELETE - Delete exercise
    if (event.httpMethod === "DELETE") {
      const params = event.queryStringParameters || {};
      const { id } = params;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_ID", message: "Exercise ID is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      const result = await exercisesCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "Exercise not found" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Exercise deleted successfully" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({
        error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json", "Allow": "GET, POST, PATCH, DELETE" },
    };
  } catch (error) {
    console.error("Exercises error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while processing exercises" },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
