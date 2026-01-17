import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { verifyToken, extractToken } from "../../lib/auth";
import { AIChatStats } from "../../types/ai-chat";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface ChatRequest {
  message: string;
  stats?: AIChatStats;
}

/**
 * POST /api/ai-chat
 * Process user chat messages with AI assistant
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST requests are allowed",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
        "Allow": "POST",
      },
    };
  }

  try {
    // Verify authentication
    const token = extractToken(event.headers.authorization);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "NO_TOKEN",
            message: "No authentication token provided",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    try {
      verifyToken(token);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Validate Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: {
            code: "API_KEY_MISSING",
            message: "Anthropic API key is not configured",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Parse request body
    const requestBody: ChatRequest = JSON.parse(event.body || "{}");
    const { message, stats } = requestBody;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "INVALID_MESSAGE",
            message: "Message is required and must be a non-empty string",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey,
    });

    // Build system prompt with health data context
    const systemPrompt = buildSystemPrompt(stats);

    // Call Claude API
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    // Extract text response
    const assistantMessage = response.content[0].type === "text" 
      ? response.content[0].text 
      : "I apologize, but I couldn't generate a response.";

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: assistantMessage,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("AI chat error:", error);

    // Handle specific Anthropic errors
    if (error instanceof Anthropic.APIError) {
      return {
        statusCode: error.status || 500,
        body: JSON.stringify({
          error: {
            code: "ANTHROPIC_API_ERROR",
            message: error.message || "An error occurred with the AI service",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An error occurred while processing your message",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  }
};

/**
 * Build system prompt with health data context
 */
function buildSystemPrompt(stats: AIChatStats | undefined): string {
  const currentYear = new Date().getFullYear();
  
  let prompt = `You are a helpful health and fitness assistant for a personal health tracking dashboard. Your role is to help the user understand their health data, including health incidents, workout statistics, and lab results.

You have access to the following aggregated statistics about the user's health data:

`;

  // Add incidents data if available
  if (stats?.incidents) {
    prompt += `## Health Incidents
Total Incidents: ${stats.incidents.totalIncidents}
Active Incidents: ${stats.incidents.activeIncidents}
Resolved Incidents: ${stats.incidents.resolvedIncidents}

### Incidents by Location:
`;
    
    Object.entries(stats.incidents.byLocation || {}).forEach(([location, data]: [string, any]) => {
      prompt += `
**${location}**:
- Total occurrences: ${data.totalCount}
- Active: ${data.activeCount}, Resolved: ${data.resolvedCount}
- Average incidents per year: ${data.averageIncidentsPerYear}
`;
      
      if (data.lastOccurrence) {
        prompt += `- Last occurrence: ${new Date(data.lastOccurrence.date).toLocaleDateString()} (Status: ${data.lastOccurrence.status.join(', ')})\n`;
        if (data.lastOccurrence.painIntensity !== null) {
          prompt += `  Pain intensity: ${data.lastOccurrence.painIntensity}/10\n`;
        }
      }
      
      if (data.averageDurationDays !== null) {
        prompt += `- Average duration until resolved: ${data.averageDurationDays} days\n`;
      }
      
      if (data.averageDaysToLowPain !== null) {
        prompt += `- Average time until pain drops below 3/10: ${data.averageDaysToLowPain} days\n`;
      }
      
      if (data.incidentsByYear && Object.keys(data.incidentsByYear).length > 0) {
        prompt += `- Incidents by year: ${JSON.stringify(data.incidentsByYear)}\n`;
      }
    });
  }

  // Add workout data if available
  if (stats?.workouts) {
    prompt += `\n## Workout Statistics
Total Workouts (All Time): ${stats.workouts.totalWorkouts}
Workouts in ${currentYear}: ${stats.workouts.workoutsThisYear}

### By Sport Type:
`;
    
    Object.entries(stats.workouts.bySport || {}).forEach(([sport, data]: [string, any]) => {
      prompt += `
**${sport}**:
- All-time: ${data.allTime.count} workouts, ${data.allTime.totalDistanceMiles} miles (${data.allTime.totalDistanceKm} km), ${data.allTime.totalMovingTimeHours} hours
`;
      if (data.allTime.totalElevationGainMeters > 0) {
        prompt += `  Elevation gain: ${data.allTime.totalElevationGainFeet} feet (${data.allTime.totalElevationGainMeters} meters)\n`;
      }
      if (data.allTime.longestWorkout) {
        prompt += `  Longest (all-time): ${data.allTime.longestWorkout.distanceMiles} miles on ${new Date(data.allTime.longestWorkout.date).toLocaleDateString()}\n`;
      }
      
      prompt += `- ${currentYear}: ${data.thisYear.count} workouts, ${data.thisYear.totalDistanceMiles} miles (${data.thisYear.totalDistanceKm} km), ${data.thisYear.totalMovingTimeHours} hours\n`;
      if (data.thisYear.totalElevationGainMeters > 0) {
        prompt += `  Elevation gain: ${data.thisYear.totalElevationGainFeet} feet (${data.thisYear.totalElevationGainMeters} meters)\n`;
      }
      if (data.thisYear.longestWorkout) {
        prompt += `  Longest (${currentYear}): ${data.thisYear.longestWorkout.distanceMiles} miles on ${new Date(data.thisYear.longestWorkout.date).toLocaleDateString()}\n`;
      }
    });
  } else {
    prompt += `\n## Workout Statistics
No Strava account connected. Workout data is not available.
`;
  }

  // Add lab results data if available
  if (stats?.labs) {
    prompt += `\n## Lab Results
Total Lab Results: ${stats.labs.totalResults}
`;
    
    if (stats.labs.mostRecent) {
      prompt += `Most Recent Test: ${stats.labs.mostRecent.testType} on ${new Date(stats.labs.mostRecent.date).toLocaleDateString()}\n`;
    }
    
    if (stats.labs.latestLipidPanel) {
      const lipid = stats.labs.latestLipidPanel;
      prompt += `\nLatest Lipid Panel (${new Date(lipid.date).toLocaleDateString()}):
`;
      if (lipid.totalCholesterol) {
        prompt += `- Total Cholesterol: ${lipid.totalCholesterol.value} ${lipid.totalCholesterol.unit} (Reference: ${lipid.totalCholesterol.reference_range.min}-${lipid.totalCholesterol.reference_range.max}, Flag: ${lipid.totalCholesterol.flag || 'normal'})\n`;
      }
      if (lipid.ldlCholesterol) {
        prompt += `- LDL Cholesterol: ${lipid.ldlCholesterol.value} ${lipid.ldlCholesterol.unit} (Reference: ${lipid.ldlCholesterol.reference_range.min}-${lipid.ldlCholesterol.reference_range.max}, Flag: ${lipid.ldlCholesterol.flag || 'normal'})\n`;
      }
      if (lipid.hdlCholesterol) {
        prompt += `- HDL Cholesterol: ${lipid.hdlCholesterol.value} ${lipid.hdlCholesterol.unit} (Reference: ${lipid.hdlCholesterol.reference_range.min}-${lipid.hdlCholesterol.reference_range.max}, Flag: ${lipid.hdlCholesterol.flag || 'normal'})\n`;
      }
      if (lipid.triglycerides) {
        prompt += `- Triglycerides: ${lipid.triglycerides.value} ${lipid.triglycerides.unit} (Reference: ${lipid.triglycerides.reference_range.min}-${lipid.triglycerides.reference_range.max}, Flag: ${lipid.triglycerides.flag || 'normal'})\n`;
      }
    }
  }

  prompt += `\n## Your Role
When answering questions:
1. Use the statistics provided above to answer questions accurately
2. Be conversational and friendly, but precise with numbers
3. If asked about specific body parts or sports, refer to the relevant section above
4. When discussing dates, use natural language (e.g., "3 months ago" or "in January 2024")
5. If you don't have enough information to answer a question, say so clearly
6. Provide context and insights, not just raw numbers
7. When appropriate, mention trends or patterns you notice in the data

Remember: All statistics are pre-computed and aggregated. You should NOT request raw data or individual records.
`;

  return prompt;
}
