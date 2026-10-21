import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const difficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);
const exerciseTypeEnum = z.enum(["strength", "flexibility"]);

const exerciseMediaShape = z.object({
  type: z.literal("youtube"),
  url: z.string().url(),
});

const searchExercisesShape = {
  name: z.string().optional().describe("Case-insensitive substring match on exercise name."),
  targetArea: z
    .string()
    .optional()
    .describe("Filter to exercises targeting this body area, e.g. 'shoulder', 'core', 'hamstring'."),
  requiredEquipment: z
    .string()
    .optional()
    .describe("Filter to exercises requiring this equipment, e.g. 'dumbbell', 'resistance band', 'none'."),
  exerciseType: exerciseTypeEnum.optional(),
};
const searchExercisesSchema = z.object(searchExercisesShape);
type SearchExercisesArgs = z.infer<typeof searchExercisesSchema>;

const newExerciseShape = {
  name: z.string().describe("Exercise name, e.g. 'Side-Lying Clamshell'."),
  targetArea: z.array(z.string()).min(1).describe("Body areas this targets, e.g. ['hip', 'glutes']."),
  isTimeBased: z
    .boolean()
    .describe("true if performed for a duration (e.g. a plank), false if performed for reps."),
  aliases: z.array(z.string()).optional().describe("Alternate names, e.g. from a PT handout."),
  requiredEquipment: z
    .array(z.string())
    .optional()
    .describe("e.g. ['resistance band']. Omit or [] for bodyweight exercises."),
  description: z.string().optional().describe("Cues/instructions, e.g. from physical therapy notes."),
  difficulty: difficultyEnum.optional().describe("Defaults to 'beginner' if omitted."),
  exerciseType: exerciseTypeEnum.optional(),
  media: z.array(exerciseMediaShape).optional().describe("Reference videos, e.g. YouTube demonstrations."),
};
const newExerciseSchema = z.object(newExerciseShape);
type NewExerciseArgs = z.infer<typeof newExerciseSchema>;

const bulkAddExercisesShape = {
  exercises: z
    .array(newExerciseSchema)
    .min(1)
    .describe("One or more exercises to add, in the same shape as add_exercise's arguments."),
};
const bulkAddExercisesSchema = z.object(bulkAddExercisesShape);
type BulkAddExercisesArgs = z.infer<typeof bulkAddExercisesSchema>;

const updateExerciseShape = {
  id: z.string().describe("The exercise's _id to update."),
  updates: z
    .object({
      name: z.string().optional(),
      aliases: z.array(z.string()).optional(),
      media: z.array(exerciseMediaShape).optional(),
      requiredEquipment: z.array(z.string()).optional(),
      targetArea: z.array(z.string()).optional(),
      description: z.string().optional(),
      difficulty: difficultyEnum.optional(),
      isTimeBased: z.boolean().optional(),
      exerciseType: exerciseTypeEnum.optional(),
    })
    .describe("Fields to change."),
};
const updateExerciseSchema = z.object(updateExerciseShape);
type UpdateExerciseArgs = z.infer<typeof updateExerciseSchema>;

export function registerExerciseTools(server: McpServer) {
  server.registerTool(
    "search_exercises",
    {
      description: "Search the exercise library by name, target body area, required equipment, or exercise type.",
      inputSchema: searchExercisesShape,
    },
    wrapTool(async (args: SearchExercisesArgs) => apiClient.get("/exercises", args))
  );

  server.registerTool(
    "add_exercise",
    {
      description: "Add a single new exercise to the library.",
      inputSchema: newExerciseShape,
    },
    wrapTool(async (args: NewExerciseArgs) => apiClient.post("/exercises", args))
  );

  server.registerTool(
    "bulk_add_exercises",
    {
      description:
        "Add multiple exercises to the library in one call, e.g. a full list handed out by a physical therapist. Each exercise is created independently, so if one entry fails the others still succeed. Returns a per-item summary of what was created and what failed.",
      inputSchema: bulkAddExercisesShape,
    },
    wrapTool(async (args: BulkAddExercisesArgs) => {
      const created: unknown[] = [];
      const failed: Array<{ index: number; name: string; error: string }> = [];

      for (let i = 0; i < args.exercises.length; i++) {
        const exercise = args.exercises[i];
        try {
          const res = (await apiClient.post("/exercises", exercise)) as { data?: unknown };
          created.push(res.data ?? res);
        } catch (error) {
          failed.push({
            index: i,
            name: exercise.name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        requested: args.exercises.length,
        createdCount: created.length,
        failedCount: failed.length,
        created,
        failed,
      };
    })
  );

  server.registerTool(
    "update_exercise",
    {
      description: "Update fields on an existing exercise.",
      inputSchema: updateExerciseShape,
    },
    wrapTool(async (args: UpdateExerciseArgs) => apiClient.patch("/exercises", args))
  );
}
