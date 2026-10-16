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
}
