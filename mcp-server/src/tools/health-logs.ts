import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";
import { addPainReading } from "./incidents.js";

const issueTypeEnum = z.enum(["update", "doctor_visit_notes"]);

const searchHealthLogsShape = {
  q: z.string().optional().describe("Free-text search over the log description."),
  issue_type: issueTypeEnum.optional(),
  incident_id: z
    .string()
    .optional()
    .describe("Filter to logs belonging to this incident's _id (from search_incidents / create_incident)."),
  start_date: z.string().optional().describe("ISO date, inclusive lower bound on the log's timestamp."),
  end_date: z.string().optional().describe("ISO date, inclusive upper bound on the log's timestamp."),
  limit: z.number().int().min(1).max(200).optional(),
  skip: z.number().int().min(0).optional(),
};
const searchHealthLogsSchema = z.object(searchHealthLogsShape);
type SearchHealthLogsArgs = z.infer<typeof searchHealthLogsSchema>;

const queryHealthLogsShape = {
  _id: z.string().optional().describe("Exact health log MongoDB _id."),
  issue_type: issueTypeEnum.optional(),
  incident_id: z
    .string()
    .optional()
    .describe(
      "Filter to logs belonging to this incident's _id. This is the main way to pull the full history for one incident."
    ),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  skip: z.number().int().min(0).optional(),
  sort_by: z.string().optional().describe("Default 'timestamp'."),
  sort_order: z.enum(["asc", "desc"]).optional(),
};
const queryHealthLogsSchema = z.object(queryHealthLogsShape);
type QueryHealthLogsArgs = z.infer<typeof queryHealthLogsSchema>;

const createHealthLogShape = {
  incident_id: z
    .string()
    .describe("The incident's _id this log entry belongs to (from search_incidents / create_incident)."),
  issue_type: issueTypeEnum.describe(
    "'update' for a general progress note, 'doctor_visit_notes' for notes from a medical appointment."
  ),
  description: z
    .string()
    .describe("Free-text log content, e.g. symptoms, what happened, pain level, doctor's notes."),
  timestamp: z.string().optional().describe("ISO datetime this entry occurred. Defaults to now."),
  pain_intensity: z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional()
    .describe(
      "Pain level 0-10 mentioned in this entry. If set, it is also added to the incident's pain-over-time chart, dated at the log's timestamp."
    ),
};
const createHealthLogSchema = z.object(createHealthLogShape);
type CreateHealthLogArgs = z.infer<typeof createHealthLogSchema>;

const updateHealthLogShape = {
  id: z.string().describe("The health log's _id to update."),
  updates: z
    .object({
      description: z.string().optional(),
      issue_type: issueTypeEnum.optional(),
      timestamp: z.string().optional(),
      incident_id: z.string().optional(),
      pain_level: z.number().min(1).max(10).optional().describe("Pain level 1-10, if tracked for this log."),
    })
    .passthrough()
    .describe("Fields to change."),
};
const updateHealthLogSchema = z.object(updateHealthLogShape);
type UpdateHealthLogArgs = z.infer<typeof updateHealthLogSchema>;

export function registerHealthLogTools(server: McpServer) {
  server.registerTool(
    "search_health_logs",
    {
      description:
        "Search health log entries (progress notes / doctor visit notes attached to an incident) with ranked text search and/or filters.",
      inputSchema: searchHealthLogsShape,
    },
    wrapTool(async (args: SearchHealthLogsArgs) => apiClient.get("/health-logs-search", args))
  );

  server.registerTool(
    "query_health_logs",
    {
      description:
        "Look up health log entries by exact ID, incident, issue type, or date range, without text ranking. Pass incident_id to get the full log history for one incident, e.g. to see all symptom updates and how long it lasted.",
      inputSchema: queryHealthLogsShape,
    },
    wrapTool(async (args: QueryHealthLogsArgs) => apiClient.get("/health-logs-query", args))
  );

  server.registerTool(
    "create_health_log",
    {
      description:
        "Add a new log entry (progress note or doctor visit note) to an existing health incident. Get the incident_id from search_incidents or create_incident first. If the entry mentions a pain level, pass pain_intensity so the incident's pain-over-time chart is updated too.",
      inputSchema: createHealthLogShape,
    },
    wrapTool(async ({ pain_intensity, ...log }: CreateHealthLogArgs) => {
      const created = (await apiClient.post("/health-logs-create", log)) as {
        data?: { timestamp?: string };
      };
      if (pain_intensity === undefined) return created;

      try {
        const painReading = await addPainReading(log.incident_id, pain_intensity, created.data?.timestamp);
        return { ...created, painReading };
      } catch (error) {
        // The log is already saved; report the pain reading failure without hiding that.
        const message = error instanceof Error ? error.message : String(error);
        return { ...created, painReadingError: `Log created, but adding the pain reading failed: ${message}` };
      }
    })
  );

  server.registerTool(
    "update_health_log",
    {
      description: "Update fields on an existing health log entry.",
      inputSchema: updateHealthLogShape,
    },
    wrapTool(async (args: UpdateHealthLogArgs) => apiClient.patch("/health-logs-update", args))
  );

  server.registerTool(
    "get_health_log_autocomplete_values",
    {
      description:
        "Get the existing vocabulary used across health logs and incidents: issue types, body areas, injury sources, symptoms, triggers, activities, and recent incident IDs. Check this before creating a new incident or log so you reuse existing terminology instead of introducing near-duplicate variants (e.g. 'lower back' vs 'lower-back').",
      inputSchema: {},
    },
    wrapTool(async () => apiClient.get("/health-logs-autocomplete"))
  );
}
