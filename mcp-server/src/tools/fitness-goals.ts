import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const goalStatusEnum = z.enum(["active", "completed", "abandoned", "archived"]);
const goalTypeEnum = z.enum(["distance", "frequency", "duration", "elevation", "custom"]);
const timePeriodEnum = z.enum(["week", "month", "year", "custom"]);

const queryFitnessGoalsShape = {
  status: goalStatusEnum.optional(),
  goal_type: goalTypeEnum.optional(),
  activity_type: z.string().optional().describe("e.g. 'Run', 'Ride'."),
};
const queryFitnessGoalsSchema = z.object(queryFitnessGoalsShape);
type QueryFitnessGoalsArgs = z.infer<typeof queryFitnessGoalsSchema>;

const createFitnessGoalShape = {
  goal_type: goalTypeEnum.describe("Progress is calculated from Strava workouts for every type except 'custom'."),
  target_value: z.number().positive(),
  unit: z
    .string()
    .describe(
      "Must match goal_type for progress to calculate: distance 'km' | 'mi' | 'meters', duration 'hours' | 'minutes' | 'seconds', elevation 'ft' | 'meters', frequency 'activities'."
    ),
  time_period: timePeriodEnum,
  start_date: z.string().describe("ISO date the goal period starts."),
  end_date: z
    .string()
    .optional()
    .describe("ISO date the goal period ends. Calculated from time_period if omitted; required for 'custom'."),
  activity_type: z.string().optional().describe("Only count this Strava activity type, e.g. 'Run'. All activities if omitted."),
  sport_type: z.string().optional().describe("Narrower Strava sport type filter, e.g. 'TrailRun'."),
  description: z.string().optional(),
};
const createFitnessGoalSchema = z.object(createFitnessGoalShape);
type CreateFitnessGoalArgs = z.infer<typeof createFitnessGoalSchema>;

const updateFitnessGoalShape = {
  id: z.string().describe("The goal's _id (from query_fitness_goals)."),
  updates: z
    .object({
      status: goalStatusEnum.optional(),
      target_value: z.number().positive().optional(),
      unit: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      activity_type: z.string().optional(),
      sport_type: z.string().optional(),
      description: z.string().optional(),
    })
    .describe(
      "Fields to change. Changing time_period is not supported because end_date is not recalculated; set end_date directly instead."
    ),
};
const updateFitnessGoalSchema = z.object(updateFitnessGoalShape);
type UpdateFitnessGoalArgs = z.infer<typeof updateFitnessGoalSchema>;

export function registerFitnessGoalTools(server: McpServer) {
  server.registerTool(
    "query_fitness_goals",
    {
      description:
        "List fitness goals with their live progress calculated from workout data (percentage complete, remaining amount).",
      inputSchema: queryFitnessGoalsShape,
    },
    wrapTool(async (args: QueryFitnessGoalsArgs) => apiClient.get("/fitness-goals", args))
  );

  server.registerTool(
    "create_fitness_goal",
    {
      description:
        "Create a fitness goal, e.g. run 50 km this month. New goals start as 'active', and progress is calculated from synced Strava workouts in the goal's date range.",
      inputSchema: createFitnessGoalShape,
    },
    wrapTool(async (args: CreateFitnessGoalArgs) => apiClient.post("/fitness-goals", args))
  );

  server.registerTool(
    "update_fitness_goal",
    {
      description:
        "Update a fitness goal, e.g. mark it 'completed' or 'abandoned', archive it, or adjust the target or dates.",
      inputSchema: updateFitnessGoalShape,
    },
    wrapTool(async (args: UpdateFitnessGoalArgs) => apiClient.patch("/fitness-goals", args))
  );
}
