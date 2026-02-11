import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { verifyToken, extractToken } from "../../lib/auth";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL;

/**
 * GET /api/mcp-status
 * Check if the MCP server is ready by connecting and listing tools.
 * Requires authentication.
 */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext,
): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
      headers: { "Content-Type": "application/json", Allow: "GET" },
    };
  }

  const token = extractToken(event.headers.authorization);
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "No authentication token provided" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    verifyToken(token);
  } catch {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Invalid or expired token" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  if (!MCP_SERVER_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ status: "error", message: "MCP server URL not configured" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const mcpClient = new Client({
    name: "health-dashboard-status-check",
    version: "1.0.0",
  });

  try {
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL),
    );

    await mcpClient.connect(transport);
    const { tools } = await mcpClient.listTools();

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "ready", toolCount: tools.length }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "starting", message }),
      headers: { "Content-Type": "application/json" },
    };
  } finally {
    try {
      await mcpClient.close();
    } catch {
      // ignore close errors
    }
  }
};
