import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

export function registerStatsTools(server: McpServer) {
  server.registerTool(
    "get_health_stats",
    {
      description:
        "Get pre-aggregated statistics across health incidents, Strava workouts, and lab results in one call: incident counts and trends by body location (last occurrence, average duration in days, average days to low pain, incidents per year), workout totals by sport type (all-time and this year: distance, moving time, elevation, longest workout), and the most recent lab results. Use this FIRST for questions like 'when did I last have knee pain', 'how long does my back pain usually last', or 'how many miles have I run this year' -- it's much cheaper than pulling raw records. Fall back to search_incidents / query_health_logs / search_workouts for details this doesn't cover.",
      inputSchema: {},
    },
    wrapTool(async () => apiClient.get("/ai-chat-stats"))
  );
}
