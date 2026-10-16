import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const searchWorkoutsShape = {
  q: z
    .string()
    .optional()
    .describe(
      "Free-text search over workout name/description, e.g. 'morning run'. Omit to just filter/list without ranking."
    ),
  type: z
    .string()
    .optional()
    .describe("Strava activity type, e.g. 'Run', 'Ride', 'Swim', 'Hike'."),
  sport_type: z
    .string()
    .optional()
    .describe(
      "More specific Strava sport type, e.g. 'TrailRun', 'MountainBikeRide'. Use get_workout_types to see available values."
    ),
  start_date: z
    .string()
    .optional()
    .describe("ISO date (YYYY-MM-DD), inclusive lower bound on workout start date."),
  end_date: z
    .string()
    .optional()
    .describe("ISO date (YYYY-MM-DD), inclusive upper bound on workout start date."),
  has_geo: z
    .boolean()
    .optional()
    .describe(
      "Filter to workouts that do (true) or don't (false) have GPS map data. Ignored when q is set."
    ),
  limit: z.number().int().min(1).max(200).optional().describe("Max results (default 20)."),
  skip: z.number().int().min(0).optional().describe("Results to skip, for pagination (default 0)."),
};
const searchWorkoutsSchema = z.object(searchWorkoutsShape);
type SearchWorkoutsArgs = z.infer<typeof searchWorkoutsSchema>;

const syncShape = {
  page: z.number().int().min(1).optional().describe("Strava API page number (default 1)."),
  perPage: z.number().int().min(1).max(200).optional().describe("Activities per page (default 30)."),
  after: z.number().int().optional().describe("Unix timestamp; only sync activities after this time."),
  before: z.number().int().optional().describe("Unix timestamp; only sync activities before this time."),
};
const syncSchema = z.object(syncShape);
type SyncArgs = z.infer<typeof syncSchema>;

export function registerWorkoutTools(server: McpServer) {
  server.registerTool(
    "search_workouts",
    {
      description:
        "Search and/or filter cached Strava workouts. Pass 'q' for a ranked text search over the workout name/description; omit it to just filter/list by type, sport_type, date range, or has_geo, sorted most-recent-first.",
      inputSchema: searchWorkoutsShape,
    },
    wrapTool(async (args: SearchWorkoutsArgs) => {
      const { q, type, sport_type, start_date, end_date, has_geo, limit, skip } = args;
      if (q) {
        return apiClient.get("/strava-workouts-search", {
          q,
          type,
          sport_type,
          start_date,
          end_date,
          limit,
          skip,
        });
      }
      return apiClient.get("/strava-workouts", {
        type,
        sport_type,
        start_date,
        end_date,
        has_geo,
        limit,
        skip,
      });
    })
  );

  server.registerTool(
    "get_workout_types",
    {
      description:
        "List the distinct Strava activity types and sport types present in the synced workout data (e.g. 'Run', 'TrailRun', 'Ride'). Useful before filtering search_workouts by type/sport_type.",
      inputSchema: {},
    },
    wrapTool(async () => apiClient.get("/strava-workout-types"))
  );

  server.registerTool(
    "sync_strava_workouts",
    {
      description:
        "Trigger a sync of recent activities from Strava into the local cache before analyzing them, so newly-recorded workouts are included. Refreshes the Strava OAuth token if needed.",
      inputSchema: syncShape,
    },
    wrapTool(async (args: SyncArgs) => apiClient.post("/strava-sync", args))
  );
}
