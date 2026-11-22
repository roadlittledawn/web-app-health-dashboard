import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Verification of clang-auth access tokens (the `ca_access` cookie).
 *
 * clang-auth (https://auth.clintonlangosch.com) signs a short-lived ES256 JWT
 * and sets it on the parent domain, so every *.clintonlangosch.com app receives
 * it. We verify it locally against the service's public JWKS: no call to the
 * auth service per request. See docs/clang-auth-migration.md.
 *
 * No database, Next.js or Netlify imports on purpose: used by proxy.ts,
 * lib/authenticate.ts (Netlify Functions) and scripts/test/auth.test.ts.
 */

export const ACCESS_COOKIE = "ca_access";

export interface AccessClaims {
  sub: string;
  email: string;
  name: string | null;
  /** app slug -> roles, e.g. { health: ["admin"] } */
  apps: Record<string, string[]>;
  exp: number;
}

/** A verified token that grants access to this app. */
export interface Identity {
  sub: string;
  email: string;
  name: string | null;
  /** This app's roles from the grant. Any grant (even no roles) means access. */
  roles: string[];
  /** Token expiry, seconds since the epoch. */
  exp: number;
}

/**
 * - `ok`: valid token with a grant for this app.
 * - `anonymous`: no token, or an expired / invalid one.
 * - `forbidden`: a valid token without a grant for this app. Answered with
 *   403, never a redirect, which would loop: the user is signed in, just not
 *   allowed.
 */
export type AuthState =
  | { status: "ok"; identity: Identity }
  | { status: "anonymous" }
  | { status: "forbidden"; email: string };

export interface AuthSettings {
  authBaseUrl: string;
  appSlug: string;
}

export function authSettings(): AuthSettings {
  const authBaseUrl = process.env.AUTH_BASE_URL;
  const appSlug = process.env.AUTH_APP_SLUG;
  if (!authBaseUrl || !appSlug) {
    throw new Error("AUTH_BASE_URL and AUTH_APP_SLUG must be set");
  }
  return { authBaseUrl: authBaseUrl.replace(/\/$/, ""), appSlug };
}

// One JWKS fetcher per server instance. jose caches the keys and re-fetches
// when it sees an unknown `kid` (after a key rotation).
let jwks: JWTVerifyGetKey | undefined;
let jwksFor: string | undefined;
let testKeys: JWTVerifyGetKey | undefined;

function keySet(authBaseUrl: string): JWTVerifyGetKey {
  if (testKeys) return testKeys;
  if (!jwks || jwksFor !== authBaseUrl) {
    jwks = createRemoteJWKSet(new URL(`${authBaseUrl}/.well-known/jwks.json`));
    jwksFor = authBaseUrl;
  }
  return jwks;
}

/** Tests only: verify against a local key set instead of fetching the JWKS. */
export function setJwksForTesting(keys: JWTVerifyGetKey | undefined): void {
  testKeys = keys;
}

/**
 * Verify signature (ES256 only, key chosen by `kid`), `iss` and `exp`.
 * Throws on any failure.
 */
export async function verifyAccessToken(token: string, authBaseUrl: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, keySet(authBaseUrl), {
    issuer: authBaseUrl,
    algorithms: ["ES256"],
    clockTolerance: 30,
  });
  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    typeof payload.email !== "string" ||
    typeof payload.exp !== "number" ||
    typeof payload.apps !== "object" ||
    payload.apps === null
  ) {
    throw new Error("token is missing required claims");
  }
  return payload as unknown as AccessClaims;
}

/** This app's roles if the claims grant access to it, else null. */
export function grantFor(claims: Pick<AccessClaims, "apps">, appSlug: string): string[] | null {
  const roles = claims.apps?.[appSlug];
  return Array.isArray(roles) ? roles : null;
}

/** Turn a raw cookie value (or its absence) into this app's auth state. */
export async function resolveToken(
  token: string | undefined,
  settings: AuthSettings = authSettings(),
): Promise<AuthState> {
  if (!token) return { status: "anonymous" };
  let claims: AccessClaims;
  try {
    claims = await verifyAccessToken(token, settings.authBaseUrl);
  } catch {
    // Expired, forged, or signed by an unknown key: treat as signed out.
    return { status: "anonymous" };
  }
  const roles = grantFor(claims, settings.appSlug);
  if (!roles) return { status: "forbidden", email: claims.email };
  return {
    status: "ok",
    identity: {
      sub: claims.sub,
      email: claims.email.toLowerCase(),
      name: claims.name ?? null,
      roles,
      exp: claims.exp,
    },
  };
}

/** The auth service's sign-in page, returning to `returnTo` afterwards. */
export function loginUrl(returnTo: string, authBaseUrl: string = authSettings().authBaseUrl): string {
  return `${authBaseUrl}/login?redirect_uri=${encodeURIComponent(returnTo)}`;
}

/** Read one cookie from a raw `Cookie` header. */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return undefined;
}

function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF check for state-changing requests: the `Origin` header (or, when a
 * browser omits it, the `Referer`'s origin) must equal this app's origin.
 * Neither header present means refuse.
 */
export function isSameOrigin(
  originHeader: string | null | undefined,
  refererHeader: string | null | undefined,
  appOrigin: string,
): boolean {
  const source = originOf(originHeader) ?? originOf(refererHeader);
  return source !== null && source === appOrigin;
}
