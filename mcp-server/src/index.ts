#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerStatsTools } from "./tools/stats.js";
import { registerWorkoutTools } from "./tools/workouts.js";
import { registerIncidentTools } from "./tools/incidents.js";
import { registerHealthLogTools } from "./tools/health-logs.js";
import { registerExerciseTools } from "./tools/exercises.js";
import { registerWorkoutProgramTools } from "./tools/workout-programs.js";
import { registerLabTools } from "./tools/labs.js";
import { registerFitnessGoalTools } from "./tools/fitness-goals.js";

const server = new McpServer({
  name: "health-dashboard",
  version: "0.1.0",
});

registerStatsTools(server);
registerWorkoutTools(server);
registerIncidentTools(server);
registerHealthLogTools(server);
registerExerciseTools(server);
registerWorkoutProgramTools(server);
registerLabTools(server);
registerFitnessGoalTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error starting health-dashboard MCP server:", error);
  process.exit(1);
});
