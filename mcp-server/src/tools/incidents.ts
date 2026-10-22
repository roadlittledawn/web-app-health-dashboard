import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const searchIncidentsShape = {
  q: z
    .string()
    .optional()
    .describe(
      "Free-text search over description, injury source, incident ID, pain locations, and symptoms."
    ),
  painLocations: z
    .array(z.string())
    .optional()
    .describe("Filter to incidents affecting any of these body locations, e.g. ['lower back', 'right knee']."),
  painSeverity: z
    .enum(["mild", "moderate", "severe"])
    .optional()
    .describe("mild = 0-3, moderate = 4-6, severe = 7-10 peak pain intensity."),
  dateStartedFrom: z.string().optional().describe("ISO date, inclusive lower bound on dateStarted."),
  dateStartedTo: z.string().optional().describe("ISO date, inclusive upper bound on dateStarted."),
  status: z
    .string()
    .optional()
    .describe("Filter to incidents whose status array includes this value, e.g. 'resolved', 'worsening', 'improving'."),
  limit: z.number().int().min(1).max(200).optional(),
  skip: z.number().int().min(0).optional(),
};
const searchIncidentsSchema = z.object(searchIncidentsShape);
type SearchIncidentsArgs = z.infer<typeof searchIncidentsSchema>;

const queryIncidentsShape = {
  _id: z.string().optional().describe("Exact incident MongoDB _id."),
  status: z.string().optional().describe("Filter to incidents whose status array includes this value."),
  limit: z.number().int().min(1).max(200).optional(),
  skip: z.number().int().min(0).optional(),
  sort_by: z.string().optional().describe("Field to sort by (default 'dateStarted')."),
  sort_order: z.enum(["asc", "desc"]).optional(),
};
const queryIncidentsSchema = z.object(queryIncidentsShape);
type QueryIncidentsArgs = z.infer<typeof queryIncidentsSchema>;

const timingShape = z.object({
  whenMostSevere: z.array(z.string()).optional().describe("e.g. ['morning', 'interruptsSleep']."),
  whatMakesWorse: z.array(z.string()).optional().describe("e.g. ['activity', 'kneeling']."),
  whatMakesBetter: z.array(z.string()).optional().describe("e.g. ['rest', 'ice']."),
});

const createIncidentShape = {
  incidentId: z
    .string()
    .describe(
      "Unique human-readable ID. Suggested format: '{YYYY-MM-DD}_{body-area-kebab-case}', e.g. '2026-08-25_right-knee'. Must not already exist."
    ),
  painLocations: z
    .array(z.string())
    .describe(
      "Body areas affected, e.g. ['lower back']. Check get_health_log_autocomplete_values first to reuse existing location names instead of inventing new ones."
    ),
  injurySource: z.string().describe("What caused it, e.g. 'deadlifting', 'running', 'unknown'."),
  description: z.string().describe("Free-text description of the incident."),
  dateStarted: z.string().optional().describe("ISO date the incident started. Defaults to today if omitted."),
  endDate: z.string().optional().describe("ISO date the incident resolved, if already known."),
  painIntensity: z.number().min(0).max(10).nullable().optional().describe("Peak pain intensity, 0-10."),
  status: z
    .array(z.string())
    .optional()
    .describe("e.g. ['worsening'], ['improving'], ['resolved'], ['constant'], ['occasional']."),
  symptoms: z
    .object({
      painQuality: z
        .array(z.string())
        .optional()
        .describe("e.g. ['sharp', 'dull', 'throbbing', 'aching', 'burning']."),
      otherSymptoms: z
        .array(z.string())
        .optional()
        .describe("e.g. ['stiffness', 'instability', 'popping', 'locking']."),
      sensations: z
        .array(z.string())
        .optional()
        .describe("e.g. ['bruising', 'swelling', 'numbness', 'tingling', 'weakness']."),
      timing: timingShape.optional(),
    })
    .optional(),
  treatments: z
    .object({
      priorPhysician: z.array(z.string()).optional().describe("e.g. ['seen'] or ['not_seen']."),
      priorSurgery: z.array(z.string()).optional().describe("e.g. ['had'] or ['not_had']."),
      treatmentsTried: z.array(z.string()).optional().describe("e.g. ['physicalTherapy', 'massageTherapy']."),
      studiesCompleted: z.array(z.string()).optional().describe("e.g. ['xRays', 'mri']."),
    })
    .optional(),
};
const createIncidentSchema = z.object(createIncidentShape);
type CreateIncidentArgs = z.infer<typeof createIncidentSchema>;

const updateIncidentShape = {
  _id: z.string().describe("The incident's MongoDB _id (from search_incidents / query_incidents)."),
  incidentId: z.string().optional().describe("New human-readable ID. Must not already exist on another incident."),
  painLocations: z.array(z.string()).optional().describe("Replaces the full list of body areas."),
  injurySource: z.string().optional(),
  description: z.string().optional(),
  dateStarted: z.string().optional().describe("ISO date the incident started."),
  endDate: z
    .string()
    .nullable()
    .optional()
    .describe("ISO date the incident resolved. Pass null to clear it when reopening an incident."),
  painIntensity: z.number().min(0).max(10).nullable().optional().describe("Peak pain intensity, 0-10."),
  status: z
    .array(z.string())
    .optional()
    .describe("Replaces the full status array, e.g. ['resolved'] or ['improving']."),
  symptoms: createIncidentShape.symptoms.describe(
    "Replaces the whole symptoms object; include every sub-field you want to keep."
  ),
  treatments: createIncidentShape.treatments.describe(
    "Replaces the whole treatments object; include every sub-field you want to keep."
  ),
};
const updateIncidentSchema = z.object(updateIncidentShape);
type UpdateIncidentArgs = z.infer<typeof updateIncidentSchema>;

export function registerIncidentTools(server: McpServer) {
  server.registerTool(
    "search_incidents",
    {
      description:
        "Search health incidents (injuries/pain episodes) with ranked text search and/or filters by pain location, severity, date range, and status. Use this to find a specific past incident, e.g. to answer 'when did I last have neck pain'.",
      inputSchema: searchIncidentsShape,
    },
    wrapTool(async (args: SearchIncidentsArgs) =>
      apiClient.get("/incidents-search", {
        q: args.q,
        painLocations: args.painLocations?.join(","),
        painSeverity: args.painSeverity,
        dateStartedFrom: args.dateStartedFrom,
        dateStartedTo: args.dateStartedTo,
        status: args.status,
        limit: args.limit,
        skip: args.skip,
      })
    )
  );

  server.registerTool(
    "query_incidents",
    {
      description:
        "Look up health incidents by exact ID or status, without text ranking. Prefer search_incidents for anything text-based.",
      inputSchema: queryIncidentsShape,
    },
    wrapTool(async (args: QueryIncidentsArgs) => apiClient.get("/incidents-query", args))
  );

  server.registerTool(
    "create_incident",
    {
      description:
        "Create a new health incident record (an injury or pain episode). After creating it, use create_health_log with the returned incident's _id to attach follow-up notes/updates over time.",
      inputSchema: createIncidentShape,
    },
    wrapTool(async (args: CreateIncidentArgs) => apiClient.post("/incidents-create", args))
  );

  server.registerTool(
    "update_incident",
    {
      description:
        "Update fields on an existing health incident. Only the fields you pass are changed; arrays and the symptoms/treatments objects are replaced wholesale, so fetch the incident first with query_incidents if you need to merge. Keep status and endDate consistent: when marking an incident ['resolved'], also set endDate; when reopening it, change status and pass endDate: null. To record a pain reading, use add_pain_intensity_reading instead.",
      inputSchema: updateIncidentShape,
    },
    wrapTool(async (args: UpdateIncidentArgs) => apiClient.patch("/incidents-update", args))
  );
}
