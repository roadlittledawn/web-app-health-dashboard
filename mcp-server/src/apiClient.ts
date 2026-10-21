import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import nodePath from "node:path";

// Load mcp-server/.env regardless of the process's cwd (Claude Code spawns
// this from the repo root via .mcp.json, not from inside mcp-server/).
const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: nodePath.resolve(__dirname, "../.env") });

const API_BASE_URL = process.env.API_BASE_URL;
const MCP_API_TOKEN = process.env.MCP_API_TOKEN;

if (!API_BASE_URL) {
  throw new Error(
    "API_BASE_URL is not set. Copy mcp-server/.env.example to mcp-server/.env and configure it."
  );
}
if (!MCP_API_TOKEN) {
  throw new Error(
    "MCP_API_TOKEN is not set. Generate one with `node scripts/generate-mcp-token.mjs` (from the repo root) and add it to mcp-server/.env."
  );
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: QueryParams): string {
  const base = API_BASE_URL!.replace(/\/+$/, "");
  const url = new URL(`${base}/${path.replace(/^\/+/, "")}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T = unknown>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: { params?: QueryParams; body?: unknown } = {}
): Promise<T> {
  const url = buildUrl(path, options.params);
  const hasBody = options.body !== undefined;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${MCP_API_TOKEN}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError(
        res.status,
        "INVALID_RESPONSE",
        `Non-JSON response from API (status ${res.status}): ${text.slice(0, 200)}`
      );
    }
  }

  if (!res.ok) {
    const body = json as { error?: { code?: string; message?: string } };
    throw new ApiError(
      res.status,
      body.error?.code ?? "UNKNOWN_ERROR",
      body.error?.message ?? `Request failed with status ${res.status}`
    );
  }

  return json as T;
}

export const apiClient = {
  get: <T = unknown>(path: string, params?: QueryParams) =>
    request<T>("GET", path, { params }),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>("POST", path, { body }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>("PATCH", path, { body }),
  delete: <T = unknown>(path: string, params?: QueryParams) =>
    request<T>("DELETE", path, { params }),
};
