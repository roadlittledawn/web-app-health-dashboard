import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiClient } from "../apiClient.js";
import { wrapTool } from "../toolHelpers.js";

const queryLabResultsShape = {
  test_type: z.string().optional().describe("e.g. 'lipid_panel', 'metabolic', 'custom'."),
  ordered_by: z.string().optional().describe("Doctor/provider name."),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  skip: z.number().int().min(0).optional(),
  sort_by: z.string().optional().describe("Default 'test_date'."),
  sort_order: z.enum(["asc", "desc"]).optional(),
};
const queryLabResultsSchema = z.object(queryLabResultsShape);
type QueryLabResultsArgs = z.infer<typeof queryLabResultsSchema>;

const labTrendsShape = {
  test_type: z.string().optional().describe("Defaults to 'lipid_panel'."),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
};
const labTrendsSchema = z.object(labTrendsShape);
type LabTrendsArgs = z.infer<typeof labTrendsSchema>;

const measurementShape = z
  .object({
    value: z.number(),
    unit: z.string().describe("e.g. 'mg/dL'."),
    reference_range: z.object({ min: z.number(), max: z.number() }),
  })
  .describe("The high/low/normal flag is calculated from value and reference_range.");

const customResultShape = z.object({
  test_name: z.string().describe("e.g. 'Vitamin D, 25-Hydroxy'."),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  reference_range: z.object({ min: z.number().optional(), max: z.number().optional() }).optional(),
  flag: z.enum(["high", "low", "normal", "critical"]).optional(),
});

const labResultFields = {
  lab_name: z.string().optional().describe("Lab facility name."),
  notes: z.string().optional().describe("Doctor notes or observations."),
  total_cholesterol: measurementShape.optional(),
  ldl_cholesterol: measurementShape.optional(),
  hdl_cholesterol: measurementShape.optional(),
  triglycerides: measurementShape.optional(),
  custom_results: z
    .array(customResultShape)
    .optional()
    .describe("Results for any test not covered by the lipid fields. Replaces the whole list on update."),
};

const createLabResultShape = {
  test_date: z.string().describe("ISO date the sample was taken."),
  test_type: z.string().describe("e.g. 'lipid_panel', 'metabolic', 'custom'. Reuse existing types from query_lab_results."),
  ordered_by: z.string().describe("Doctor/provider name."),
  ...labResultFields,
};
const createLabResultSchema = z.object(createLabResultShape);
type CreateLabResultArgs = z.infer<typeof createLabResultSchema>;

const updateLabResultShape = {
  id: z.string().describe("The lab result's _id (from query_lab_results)."),
  updates: z
    .object({
      test_date: z.string().optional(),
      test_type: z.string().optional(),
      ordered_by: z.string().optional(),
      ...labResultFields,
    })
    .describe("Fields to change. Only these fields are updated."),
};
const updateLabResultSchema = z.object(updateLabResultShape);
type UpdateLabResultArgs = z.infer<typeof updateLabResultSchema>;

export function registerLabTools(server: McpServer) {
  server.registerTool(
    "query_lab_results",
    {
      description: "Query lab test results (e.g. lipid panels, metabolic panels) with filtering and pagination.",
      inputSchema: queryLabResultsShape,
    },
    wrapTool(async (args: QueryLabResultsArgs) => apiClient.get("/lab-results-query", args))
  );

  server.registerTool(
    "get_lab_trends",
    {
      description:
        "Get a chart-ready time series of a lab test type (default lipid panel: total/LDL/HDL cholesterol, triglycerides) with reference ranges and high/low/normal flags, for tracking trends over time.",
      inputSchema: labTrendsShape,
    },
    wrapTool(async (args: LabTrendsArgs) => apiClient.get("/lab-results-trends", args))
  );

  server.registerTool(
    "create_lab_result",
    {
      description:
        "Record a new lab test result. Use the lipid fields for lipid panels and custom_results for anything else; a single result can have both.",
      inputSchema: createLabResultShape,
    },
    wrapTool(async (args: CreateLabResultArgs) => apiClient.post("/lab-results-create", args))
  );

  server.registerTool(
    "update_lab_result",
    {
      description:
        "Update fields on an existing lab result, e.g. to fix a typo in a value or add notes. Lipid measurement flags are recalculated.",
      inputSchema: updateLabResultShape,
    },
    wrapTool(async (args: UpdateLabResultArgs) => apiClient.patch("/lab-results-update", args))
  );
}
