import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { verifyToken, extractToken } from "../../lib/auth";

// MCP Server configuration
const MCP_SERVER_URL = process.env.MCP_SERVER_URL;

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface ChatRequest {
  message: string;
}

// Convert MCP tool schema to Anthropic tool format
interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

function mcpToolToAnthropicTool(mcpTool: McpTool): Anthropic.Tool {
  return {
    name: mcpTool.name,
    description: mcpTool.description || "",
    input_schema: {
      type: "object" as const,
      properties: mcpTool.inputSchema?.properties || {},
      required: mcpTool.inputSchema?.required || [],
    },
  };
}

// MCP CallTool result type
interface McpToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

/**
 * POST /api/ai-chat
 * Process user chat messages with AI assistant
 * Requires authentication
 */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
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
        Allow: "POST",
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
    const { message } = requestBody;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
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

    // Connect to MCP server and get tools
    const mcpClient = new Client({
      name: "health-dashboard-ai-chat",
      version: "1.0.0",
    });

    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
    );

    try {
      await mcpClient.connect(transport);
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: {
            code: "MCP_CONNECTION_ERROR",
            message: "Failed to connect to health data service",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    try {
      // List available tools from MCP server
      const toolsResult = await mcpClient.listTools();
      const anthropicTools = toolsResult.tools.map((tool) =>
        mcpToolToAnthropicTool(tool as McpTool),
      );

      // Build system prompt
      const systemPrompt = buildSystemPrompt();

      // Start conversation with Claude
      const messages: Anthropic.MessageParam[] = [
        {
          role: "user",
          content: message,
        },
      ];

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      // Tool use loop - keep calling Claude until we get a final response
      let response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: systemPrompt,
        tools: anthropicTools,
        messages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      // Process tool calls until Claude gives a final response
      while (response.stop_reason === "tool_use") {
        // Find all tool use blocks
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        );

        // Add assistant message with tool use
        messages.push({
          role: "assistant",
          content: response.content,
        });

        // Execute each tool and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          try {
            const result = (await mcpClient.callTool({
              name: toolUse.name,
              arguments: toolUse.input as Record<string, unknown>,
            })) as McpToolResult;

            // Extract text content from MCP result
            const resultContent = result.content
              .map((c: { type: string; text?: string }) => {
                if (c.type === "text" && c.text) {
                  return c.text;
                }
                return JSON.stringify(c);
              })
              .join("\n");

            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: resultContent,
              is_error: result.isError === true,
            });
          } catch (error) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: `Error calling tool: ${error instanceof Error ? error.message : String(error)}`,
              is_error: true,
            });
          }
        }

        // Add tool results
        messages.push({
          role: "user",
          content: toolResults,
        });

        // Call Claude again with tool results
        response = await anthropic.messages.create({
          model: "claude-sonnet-4-5",
          max_tokens: 2048,
          system: systemPrompt,
          tools: anthropicTools,
          messages,
        });

        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;
      }

      // Extract final text response
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      const assistantMessage =
        textBlocks.length > 0
          ? textBlocks.map((b) => b.text).join("\n")
          : "I apologize, but I couldn't generate a response.";

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: assistantMessage,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      };
    } finally {
      // Always close the MCP connection
      await mcpClient.close();
    }
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
 * Build system prompt for the AI assistant
 */
function buildSystemPrompt(): string {
  return `You are a helpful health and fitness assistant for a personal health tracking dashboard. Your role is to help the user understand their health data, including workouts from Strava, health incidents, lab results, and fitness goals.

You have access to tools that can query the user's health data dynamically. Use these tools to answer questions about:

1. **Workouts** - Query workout data from Strava including runs, rides, swims, and other activities. You can filter by activity type, sport type, date range, and get detailed statistics.

2. **Health Incidents** - Query health incident records to find patterns, track recovery from injuries or issues, and analyze symptom history over time.

3. **Lab Results** - Query lab test results including lipid panels, metabolic panels, and other tests. You can track health markers over time.

4. **Fitness Goals** - Get information about fitness goals and current progress calculated from workout data.

5. **Exercises Library** - Query the exercises database to find exercises by name, target area (e.g., chest, back, legs), or required equipment (e.g., barbell, dumbbell, cable). Use this to help the user find exercises for specific muscle groups or build workout routines.

6. **Workout Programs** - Query workout programs to see active, completed, or draft training plans. You can get a specific program by ID to see its full exercise details including sets, reps, and notes.

## Guidelines

When answering questions:
1. Use the available tools to query specific data - don't guess or make up statistics
2. Be conversational and friendly, but precise with numbers
3. When discussing dates, use natural language (e.g., "3 months ago" or "in January 2024")
4. If a query returns no results, let the user know and suggest alternative queries
5. Provide context and insights, not just raw numbers
6. When appropriate, mention trends or patterns you notice in the data
7. For workout questions, consider filtering by sport_type for more specific results (e.g., "Run", "Ride", "Swim", "TrailRun")

Always query the data first before providing answers - this ensures accuracy and up-to-date information.
`;
}
