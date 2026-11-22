import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  ACCESS_COOKIE,
  isSameOrigin,
  readCookie,
  resolveToken,
  type AuthSettings,
  type Identity,
} from "./clang-auth";

/**
 * Authentication for Netlify Functions. Two ways in:
 *
 * 1. Browser: the clang-auth `ca_access` cookie, with a `health` grant.
 *    State-changing methods must also come from this app's own origin (CSRF:
 *    the cookie is shared across *.clintonlangosch.com).
 * 2. Local MCP server: `Authorization: Bearer <key>`, where sha256(key) equals
 *    `MCP_API_KEY_SHA256`. Never sent automatically by a browser, so no CSRF
 *    check. DELETE is refused: deletes stay in the web UI.
 *
 * See docs/clang-auth-migration.md (D3, D6).
 */

export type Principal = { kind: "user"; identity: Identity } | { kind: "api-key" };

export type AuthResult = { ok: true; principal: Principal } | { ok: false; response: HandlerResponse };

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function fail(statusCode: 401 | 403, code: string, message: string): AuthResult {
  return {
    ok: false,
    response: {
      statusCode,
      body: JSON.stringify({ error: { code, message } }),
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  };
}

/** Header lookup that doesn't depend on the runtime lower-casing names. */
export function header(event: Pick<HandlerEvent, "headers">, name: string): string | undefined {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (key.toLowerCase() === wanted) return value ?? undefined;
  }
  return undefined;
}

/** This request's own origin, e.g. https://health.clintonlangosch.com. */
export function requestOrigin(event: Pick<HandlerEvent, "headers" | "rawUrl">): string | null {
  const host = header(event, "host");
  if (host) {
    const proto =
      header(event, "x-forwarded-proto")?.split(",")[0].trim() ??
      (event.rawUrl?.startsWith("http://") ? "http" : "https");
    return `${proto}://${host.trim()}`;
  }
  try {
    return new URL(event.rawUrl).origin;
  } catch {
    return null;
  }
}

/** Constant-time check of a presented key against the stored hex SHA-256. */
export function apiKeyMatches(presented: string, expectedSha256Hex: string | undefined): boolean {
  if (!expectedSha256Hex || !/^[0-9a-f]{64}$/i.test(expectedSha256Hex)) return false;
  const actual = createHash("sha256").update(presented, "utf8").digest();
  const expected = Buffer.from(expectedSha256Hex, "hex");
  return timingSafeEqual(actual, expected);
}

export async function authenticate(
  event: Pick<HandlerEvent, "headers" | "httpMethod" | "rawUrl">,
  settings?: AuthSettings,
): Promise<AuthResult> {
  const method = (event.httpMethod || "GET").toUpperCase();

  const authorization = header(event, "authorization");
  if (authorization !== undefined) {
    // A bearer header means the key path, even if a cookie is also present.
    const key = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!key || !apiKeyMatches(key, process.env.MCP_API_KEY_SHA256)) {
      return fail(401, "UNAUTHORIZED", "Invalid API key");
    }
    if (method === "DELETE") {
      return fail(403, "FORBIDDEN", "Deletes are only available in the web UI");
    }
    return { ok: true, principal: { kind: "api-key" } };
  }

  const state = await resolveToken(readCookie(header(event, "cookie"), ACCESS_COOKIE), settings);
  if (state.status === "anonymous") return fail(401, "UNAUTHORIZED", "Sign in required");
  if (state.status === "forbidden") return fail(403, "FORBIDDEN", "No access to this app");

  if (!SAFE_METHODS.has(method)) {
    const origin = requestOrigin(event);
    if (!origin || !isSameOrigin(header(event, "origin"), header(event, "referer"), origin)) {
      return fail(403, "FORBIDDEN", "Cross-origin request refused");
    }
  }
  return { ok: true, principal: { kind: "user", identity: state.identity } };
}
