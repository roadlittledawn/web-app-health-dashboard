import { Handler, HandlerEvent, HandlerResponse } from "@netlify/functions";
import { authenticate } from "../../lib/authenticate";

/**
 * GET /api/me
 * The signed-in user and token expiry, from the clang-auth cookie. Drives
 * AuthProvider (sign-in state and proactive refresh). 401 without a valid
 * token, 403 with a token that has no `health` grant.
 */
export const handler: Handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "Only GET requests are allowed" } }),
      headers: { "Content-Type": "application/json", Allow: "GET" },
    };
  }

  const auth = await authenticate(event);
  if (!auth.ok) return auth.response;
  if (auth.principal.kind !== "user") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: { code: "NOT_A_USER", message: "/api/me needs a browser session" } }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const { sub, email, name, roles, exp } = auth.principal.identity;
  return {
    statusCode: 200,
    body: JSON.stringify({ sub, email, name, roles, exp }),
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  };
};
