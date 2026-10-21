import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { Filter, Document } from "mongodb";
import { getDatabase } from "../../lib/mongodb";
import { verifyToken, extractToken } from "../../lib/auth";
import { HealthIncident } from "../../types/health";
import {
  SearchFieldConfig,
  buildRules,
  searchAndRank,
} from "../../lib/searchRanking";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Search field configuration for HealthIncident
 * Priority 1: description, injurySource
 * Priority 2: incidentId, painLocations[]
 * Priority 3: symptoms.painQuality[], symptoms.otherSymptoms[], symptoms.sensations[]
 */
const incidentSearchFields: SearchFieldConfig<HealthIncident>[] = [
  {
    name: "description",
    getter: (i) => i.description,
    priority: 1,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
  {
    name: "injurySource",
    getter: (i) => i.injurySource,
    priority: 1,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
  {
    name: "incidentId",
    getter: (i) => i.incidentId,
    priority: 2,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
  {
    name: "painLocations",
    getter: (i) => i.painLocations,
    priority: 2,
    matcherTypes: ["exact", "startsWith", "containsWord", "containsSubstring"],
  },
  {
    name: "painQuality",
    getter: (i) => i.symptoms?.painQuality,
    priority: 3,
    matcherTypes: ["exact", "containsWord", "containsSubstring"],
  },
  {
    name: "otherSymptoms",
    getter: (i) => i.symptoms?.otherSymptoms,
    priority: 3,
    matcherTypes: ["exact", "containsWord", "containsSubstring"],
  },
  {
    name: "sensations",
    getter: (i) => i.symptoms?.sensations,
    priority: 3,
    matcherTypes: ["exact", "containsWord", "containsSubstring"],
  },
];

const searchRules = buildRules(incidentSearchFields);

/**
 * Map pain severity labels to intensity ranges
 */
function getPainSeverityRange(
  severity: string
): { min: number; max: number } | null {
  switch (severity.toLowerCase()) {
    case "mild":
      return { min: 0, max: 3 };
    case "moderate":
      return { min: 4, max: 6 };
    case "severe":
      return { min: 7, max: 10 };
    default:
      return null;
  }
}

/**
 * GET /api/incidents-search
 * Search health incidents with text search ranking and filtering
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET requests are allowed",
        },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json", Allow: "GET" },
    };
  }

  try {
    // Verify authentication
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "NO_TOKEN", message: "No authentication token provided" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    try {
      verifyToken(token);
    } catch {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
        } as ErrorResponse),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Get query parameters
    const params = event.queryStringParameters || {};
    const {
      q,
      painLocations,
      painSeverity,
      dateStartedFrom,
      dateStartedTo,
      status,
      limit = "50",
      skip = "0",
    } = params;

    // Build MongoDB filter
    const filter: Filter<Document> = {};

    // Pain locations filter (comma-separated)
    if (painLocations) {
      const locations = painLocations.split(",").map((l) => l.trim());
      filter.painLocations = { $in: locations };
    }

    // Pain severity filter (maps to painIntensity range)
    if (painSeverity) {
      const range = getPainSeverityRange(painSeverity);
      if (range) {
        filter.painIntensity = { $gte: range.min, $lte: range.max };
      }
    }

    // Date range filter
    if (dateStartedFrom || dateStartedTo) {
      filter.dateStarted = {};
      if (dateStartedFrom) filter.dateStarted.$gte = new Date(dateStartedFrom);
      if (dateStartedTo) filter.dateStarted.$lte = new Date(dateStartedTo);
    }

    // Status filter (array field)
    if (status) {
      filter.status = { $in: [status] };
    }

    // Get database and collection
    const db = await getDatabase();
    const collection = db.collection<HealthIncident>("health-incidents");

    // Fetch all matching incidents (filtering done in DB, ranking done in memory)
    const incidents = await collection
      .find(filter)
      .sort({ dateStarted: -1 })
      .toArray();

    let results: Array<HealthIncident & { _searchScore?: number }>;
    let totalMatches: number;

    if (q && q.trim()) {
      // Apply text search ranking
      const rankedResults = searchAndRank(incidents, q.trim(), searchRules, 1);
      totalMatches = rankedResults.length;

      // Apply pagination
      const skipNum = parseInt(skip);
      const limitNum = parseInt(limit);
      const paginatedResults = rankedResults.slice(skipNum, skipNum + limitNum);

      // Remove internal _scoreBreakdown from response
      results = paginatedResults.map((item) => {
        const { _scoreBreakdown, ...rest } = item;
        return rest;
      });
    } else {
      // No search query - return filtered results without scoring
      totalMatches = incidents.length;
      const skipNum = parseInt(skip);
      const limitNum = parseInt(limit);
      results = incidents.slice(skipNum, skipNum + limitNum);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: results,
        pagination: {
          total: totalMatches,
          returned: results.length,
          skip: parseInt(skip),
          limit: parseInt(limit),
        },
        searchMeta: q ? { query: q, totalMatches } : undefined,
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("Search incidents error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while searching incidents",
        },
      } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }
};
