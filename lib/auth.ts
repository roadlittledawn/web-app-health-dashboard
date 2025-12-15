import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

const SALT_ROUNDS = 12;
const JWT_SECRET: string = process.env.JWT_SECRET || "fallback-secret-for-development";
const JWT_EXPIRATION: StringValue | number = (process.env.JWT_EXPIRATION || "24h") as StringValue;

/**
 * Hash a password using bcrypt with work factor 12
 * @param password - Plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token with 24-hour expiration
 * @param payload - Data to encode in the token
 * @returns The signed JWT token
 */
export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
  });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns The decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractToken(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
