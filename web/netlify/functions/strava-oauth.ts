import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { exchangeStravaCode } from "../../lib/strava";
import { StravaOAuthTokens } from "../../types/strava";
import { header, requestOrigin } from "../../lib/authenticate";
import { ACCESS_COOKIE, loginUrl, readCookie, resolveToken } from "../../lib/clang-auth";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/strava-oauth
 * OAuth callback handler for Strava authentication
 * Receives authorization code and exchanges for tokens.
 * A browser navigation, so it requires the clang-auth cookie: without it,
 * anyone holding a Strava code could replace the stored tokens.
 */
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
): Promise<HandlerResponse> => {
  // Only allow GET requests
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only GET requests are allowed",
        },
      } as ErrorResponse),
      headers: {
        "Content-Type": "application/json",
        "Allow": "GET",
      },
    };
  }

  // Require a signed-in user with access before touching stored tokens.
  const state = await resolveToken(readCookie(header(event, "cookie"), ACCESS_COOKIE));
  if (state.status === "anonymous") {
    const origin = requestOrigin(event) ?? "";
    const path = event.rawUrl ? new URL(event.rawUrl).search : "";
    return {
      statusCode: 302,
      headers: { Location: loginUrl(`${origin}/api/strava-oauth${path}`), "Cache-Control": "no-store" },
      body: "",
    };
  }
  if (state.status === "forbidden") {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: { code: "FORBIDDEN", message: "No access to this app" } } as ErrorResponse),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { code, error, error_description, scope: _scope } = params;

    // Handle authorization errors
    if (error) {
      return {
        statusCode: 302,
        headers: {
          Location: `/workouts?error=${encodeURIComponent(error_description || error)}`,
        },
        body: "",
      };
    }

    // Check for authorization code
    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: {
            code: "MISSING_CODE",
            message: "Authorization code is required",
          },
        } as ErrorResponse),
        headers: {
          "Content-Type": "application/json",
        },
      };
    }

    // Exchange code for tokens
    const tokenData = await exchangeStravaCode(code);

    // Store tokens in MongoDB
    const db = await getDatabase();
    const tokensCollection = db.collection<StravaOAuthTokens>('strava-tokens');

    // Upsert tokens (single user, so we replace any existing tokens)
    await tokensCollection.updateOne(
      { athlete_id: tokenData.athlete_id },
      {
        $set: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          athlete_id: tokenData.athlete_id,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        },
      },
      { upsert: true }
    );

    // Redirect to workouts page with success message
    return {
      statusCode: 302,
      headers: {
        Location: "/workouts?connected=true",
      },
      body: "",
    };
  } catch (error) {
    console.error("Strava OAuth error:", error);

    return {
      statusCode: 302,
      headers: {
        Location: `/workouts?error=${encodeURIComponent('Failed to connect Strava account')}`,
      },
      body: "",
    };
  }
};
