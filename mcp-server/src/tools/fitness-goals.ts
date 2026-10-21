import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const queryFitnessGoalsShape = {
  status: z.enum(["active", "completed", "abandoned", "archived"]).optional(),
  goal_type: z.enum(["distance", "frequency", "duration", "elevation", "custom"]).optional(),
  activity_type: z.string().optional().describe("e.g. 'Run', 'Ride'."),
};
const queryFitnessGoalsSchema = z.object(queryFitnessGoalsShape);
type QueryFitnessGoalsArgs = z.infer<typeof queryFitnessGoalsSchema>;

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
}
