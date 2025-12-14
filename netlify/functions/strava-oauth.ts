import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { getDatabase } from "../../lib/mongodb";
import { exchangeStravaCode } from "../../lib/strava";
import { StravaOAuthTokens } from "../../types/strava";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * GET /api/strava-oauth
 * OAuth callback handler for Strava authentication
 * Receives authorization code and exchanges for tokens
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
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

  try {
    const params = event.queryStringParameters || {};
    const { code, error, error_description, scope } = params;

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
