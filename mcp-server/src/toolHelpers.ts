import { ApiError } from "./apiClient.js";

type ToolTextResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function toToolResult(data: unknown): ToolTextResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function toErrorResult(error: unknown): ToolTextResult {
  const message =
    error instanceof ApiError
      ? `${error.code} (HTTP ${error.status}): ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/**
 * Wraps a tool implementation so API/validation errors become a tool error
 * result instead of crashing the server process.
 */
export function wrapTool<Args>(
  fn: (args: Args) => Promise<unknown>
): (args: Args) => Promise<ToolTextResult> {
  return async (args: Args) => {
    try {
      const result = await fn(args);
      return toToolResult(result);
    } catch (error) {
      return toErrorResult(error);
    }
  };
}
