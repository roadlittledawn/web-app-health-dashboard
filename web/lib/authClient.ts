/**
 * Browser-side helpers for clang-auth.
 *
 * The access token lives in an HttpOnly cookie (`ca_access`) that frontend code
 * can't read. Same-origin requests to our API send it automatically. When it
 * expires (every 15 minutes) we ask the auth service for a new one using the
 * auth service's own session cookie, then retry.
 *
 * AUTH_BASE_URL is server-only; AuthProvider (root layout) passes it in via
 * setAuthBaseUrl() so it isn't baked into the bundle.
 */

let authBaseUrl = "";

export function setAuthBaseUrl(url: string): void {
  authBaseUrl = url.replace(/\/$/, "");
}

/** The auth service's sign-in page, returning to `returnTo` afterwards. */
export function loginUrl(returnTo: string = window.location.href): string {
  return `${authBaseUrl}/login?redirect_uri=${encodeURIComponent(returnTo)}`;
}

let redirecting = false;

export function redirectToLogin(returnTo?: string): void {
  if (redirecting) return;
  redirecting = true;
  window.location.assign(loginUrl(returnTo));
}

// Concurrent 401s (parallel page loads) share one refresh call: the auth
// service is rate-limited across all apps.
let inFlight: Promise<boolean> | null = null;

/** Get a fresh access-token cookie. Resolves false if there's no session. */
export function refreshSession(): Promise<boolean> {
  inFlight ??= fetch(`${authBaseUrl}/api/session/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

/**
 * fetch() for our protected API routes. On 401 it refreshes the session and
 * retries once; if there's no session it sends the user to sign in. A 403
 * (signed in without access) is returned as-is: redirecting would loop.
 */
export async function authFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;
  if (await refreshSession()) {
    return fetch(input, init);
  }
  redirectToLogin();
  return res;
}

/** End the clang-auth session. This signs out of every app on the domain. */
export async function logout(): Promise<void> {
  try {
    await fetch(`${authBaseUrl}/logout`, {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  } catch {
    // The 15-minute access token still expires on its own.
  }
}
