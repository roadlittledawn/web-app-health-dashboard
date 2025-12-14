import {
  Handler,
  HandlerEvent,
  HandlerContext,
  HandlerResponse,
} from "@netlify/functions";
import { verifyToken, extractToken } from "../../lib/auth";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

interface VerifyResponse {
  valid: boolean;
  user?: {
    userId: string;
    username: string;
  };
}

/**
 * GET /api/auth/verify
 * Verify JWT token and return user info
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
    // Extract token from Authorization header
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

    // Verify token
    const decoded = verifyToken(token);

    // Return user info
    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        user: {
          userId: decoded.userId,
          username: decoded.username,
        },
      } as VerifyResponse),
      headers: {
        "Content-Type": "application/json",
      },
    };
  } catch (error) {
    console.error("Token verification error:", error);

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
};
