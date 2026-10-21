import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { ObjectId } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { WorkoutProgram, Exercise } from "../../types/workout-programs";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
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
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    const db = await getDatabase();
    const programsCollection = db.collection<WorkoutProgram>('workout-programs');
    const exercisesCollection = db.collection<Exercise>('exercises');

    // GET - Query programs
    if (event.httpMethod === "GET") {
      const params = event.queryStringParameters || {};
      const { status, id } = params;

      // Get single program by ID
      if (id) {
        const program = await programsCollection.findOne({ _id: new ObjectId(id) });
        
        if (!program) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: { code: "NOT_FOUND", message: "Program not found" },
            } as ErrorResponse),
            headers: { "Content-Type": "application/json" },
          };
        }

        // Populate exercise details
        const populatedExercises = await Promise.all(
          program.exercises.map(async (pe) => {
            const exercise = await exercisesCollection.findOne({ _id: new ObjectId(pe.exercise_id) });
            return { ...pe, exercise };
          })
        );

        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            data: { ...program, exercises: populatedExercises } 
          }),
          headers: { "Content-Type": "application/json" },
        };
      }

      // Query all programs
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;

      const programs = await programsCollection.find(filter).sort({ created_at: -1 }).toArray();

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, data: programs }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // POST - Create program
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

      if (!data.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_FIELDS", message: "name is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      // Validate exercise references if provided
      if (data.exercises && data.exercises.length > 0) {
        const exerciseIds = data.exercises.map((e: Record<string, unknown>) => new ObjectId(e.exercise_id as string));
        const existingExercises = await exercisesCollection.find({ _id: { $in: exerciseIds } }).toArray();
        
        if (existingExercises.length !== exerciseIds.length) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: { code: "INVALID_EXERCISE", message: "One or more exercise IDs are invalid" },
            } as ErrorResponse),
            headers: { "Content-Type": "application/json" },
          };
        }
      }

      const now = new Date();
      const exercises = (data.exercises || []).map((e: Record<string, unknown>) => ({
        ...e,
        exercise_id: new ObjectId(e.exercise_id as string),
      }));
      const program: WorkoutProgram = {
        name: data.name,
        description: data.description || '',
        exercises,
        status: 'active',
        created_at: now,
        updated_at: now,
      };

      const result = await programsCollection.insertOne(program);
      const created = await programsCollection.findOne({ _id: result.insertedId });

      return {
        statusCode: 201,
        body: JSON.stringify({ success: true, message: "Program created successfully", data: created }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // PATCH - Update program
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
            error: { code: "MISSING_ID", message: "Program ID is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      // Validate exercise references if exercises are being updated
      if (updates.exercises && updates.exercises.length > 0) {
        const exerciseIds = updates.exercises.map((e: Record<string, unknown>) => new ObjectId(e.exercise_id as string));
        const existingExercises = await exercisesCollection.find({ _id: { $in: exerciseIds } }).toArray();

        if (existingExercises.length !== exerciseIds.length) {
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: { code: "INVALID_EXERCISE", message: "One or more exercise IDs are invalid" },
            } as ErrorResponse),
            headers: { "Content-Type": "application/json" },
          };
        }

        updates.exercises = updates.exercises.map((e: Record<string, unknown>) => ({
          ...e,
          exercise_id: new ObjectId(e.exercise_id as string),
        }));
      }

      const updateData = { ...updates, updated_at: new Date() };

      const result = await programsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "Program not found" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Program updated successfully", data: result }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // DELETE - Delete program
    if (event.httpMethod === "DELETE") {
      const params = event.queryStringParameters || {};
      const { id } = params;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: { code: "MISSING_ID", message: "Program ID is required" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      const result = await programsCollection.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "Program not found" },
          } as ErrorResponse),
          headers: { "Content-Type": "application/json" },
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Program deleted successfully" }),
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
    console.error("Workout programs error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: { code: "INTERNAL_SERVER_ERROR", message: "An error occurred while processing workout programs" },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
