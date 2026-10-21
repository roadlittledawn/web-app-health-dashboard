import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const programExerciseShape = z.object({
  exercise_id: z.string().describe("The exercise's _id from the exercise library (from search_exercises)."),
  order: z.number().int().min(0).describe("Position in the program, starting at 0."),
  sets: z.number().int().min(1).optional(),
  reps: z.number().int().min(1).optional(),
  duration_seconds: z.number().int().min(1).optional().describe("For time-based exercises."),
  notes: z.string().optional(),
});

const listProgramsShape = {
  status: z.enum(["active", "archived"]).optional(),
};
const listProgramsSchema = z.object(listProgramsShape);
type ListProgramsArgs = z.infer<typeof listProgramsSchema>;

const getProgramShape = {
  id: z.string().describe("The workout program's _id."),
};
const getProgramSchema = z.object(getProgramShape);
type GetProgramArgs = z.infer<typeof getProgramSchema>;

const createProgramShape = {
  name: z.string().describe("Program name, e.g. 'Shoulder Rehab - Phase 1'."),
  description: z.string().optional(),
  exercises: z
    .array(programExerciseShape)
    .optional()
    .describe(
      "Exercises in this program, referencing exercise library _ids from search_exercises. Omit to create an empty program and add exercises via update_workout_program later."
    ),
};
const createProgramSchema = z.object(createProgramShape);
type CreateProgramArgs = z.infer<typeof createProgramSchema>;

const updateProgramShape = {
  id: z.string().describe("The workout program's _id to update."),
  updates: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["active", "archived"]).optional(),
      exercises: z.array(programExerciseShape).optional().describe("Replaces the full exercise list."),
    })
    .describe("Fields to change."),
};
const updateProgramSchema = z.object(updateProgramShape);
type UpdateProgramArgs = z.infer<typeof updateProgramSchema>;

export function registerWorkoutProgramTools(server: McpServer) {
  server.registerTool(
    "list_workout_programs",
    {
      description: "List workout programs, optionally filtered by status (active/archived).",
      inputSchema: listProgramsShape,
    },
    wrapTool(async (args: ListProgramsArgs) => apiClient.get("/workout-programs", args))
  );

  server.registerTool(
    "get_workout_program",
    {
      description:
        "Get a single workout program by ID, with its exercises populated with full exercise details (name, target area, instructions, etc.).",
      inputSchema: getProgramShape,
    },
    wrapTool(async (args: GetProgramArgs) => apiClient.get("/workout-programs", args))
  );

  server.registerTool(
    "create_workout_program",
    {
      description:
        "Create a new workout program. Look up exercise _ids with search_exercises first, then reference them here with sets/reps/duration/notes and an order.",
      inputSchema: createProgramShape,
    },
    wrapTool(async (args: CreateProgramArgs) => apiClient.post("/workout-programs", args))
  );

  server.registerTool(
    "update_workout_program",
    {
      description:
        "Update an existing workout program's name, description, status, or exercise list. Note: providing 'exercises' replaces the entire list, not merges.",
      inputSchema: updateProgramShape,
    },
    wrapTool(async (args: UpdateProgramArgs) => apiClient.patch("/workout-programs", args))
  );
}
