"use client";

/**
 * AuthProvider / useAuth
 *
 * One source of truth for "who is signed in" in the browser, backed by
 * GET /api/me. Also keeps the 15-minute clang-auth token fresh while a tab is
 * open, so long workout sessions and idle tabs don't hit an expired token.
 *
 * Every page needs a session: when there is none (and a refresh fails) it
 * sends the browser to the clang-auth sign-in page. A signed-in user without
 * a `health` grant sees a notice instead (redirecting would loop).
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { logout as endSession, redirectToLogin, refreshSession, setAuthBaseUrl } from "@/lib/authClient";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "forbidden";

export interface AuthUser {
  sub: string;
  email: string;
  name: string | null;
  roles: string[];
  exp: number;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Refresh this long before the token expires. */
const REFRESH_LEAD_MS = 60_000;

type MeResult = { status: 200; user: AuthUser } | { status: 401 | 403 };

async function fetchMe(): Promise<MeResult> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) return { status: 200, user: (await res.json()) as AuthUser };
    return { status: res.status === 403 ? 403 : 401 };
  } catch {
    return { status: 401 };
  }
}

interface AuthProviderProps {
  authBaseUrl: string;
  children: React.ReactNode;
}

export function AuthProvider({ authBaseUrl, children }: AuthProviderProps) {
  // Set synchronously so children's effects (authFetch calls) see it.
  setAuthBaseUrl(authBaseUrl);

  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The refresh timer calls the latest applyMe() through this ref.
  const applyRef = useRef<(me: MeResult) => Promise<void>>(async () => {});

  /**
   * Act on a /api/me result: on 401, try one refresh, then update state and
   * schedule the next proactive refresh. Passing { status: 401 } forces a
   * refresh.
   */
  const applyMe = useCallback(async (initial: MeResult) => {
    let me = initial;
    if (me.status === 401 && (await refreshSession())) me = await fetchMe();

    if (timer.current) clearTimeout(timer.current);
    if (me.status === 200) {
      const signedIn = me.user;
      setUser(signedIn);
      setStatus("authenticated");
      const delay = Math.max(signedIn.exp * 1000 - Date.now() - REFRESH_LEAD_MS, 5_000);
      timer.current = setTimeout(() => void applyRef.current({ status: 401 }), delay);
    } else if (me.status === 403) {
      setUser(null);
      setStatus("forbidden");
    } else {
      setUser(null);
      setStatus("anonymous");
      redirectToLogin();
    }
  }, []);

  useEffect(() => {
    applyRef.current = applyMe;
    void fetchMe().then(applyMe);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [applyMe]);

  // Timers are throttled in background tabs: re-check when the tab returns.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") void fetchMe().then(applyMe);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [applyMe]);

  const signOut = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await endSession();
    setUser(null);
    setStatus("anonymous");
    redirectToLogin(`${window.location.origin}/`);
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, signOut }}>
      {status === "forbidden" ? <NoAccess onSignOut={signOut} /> : children}
    </AuthContext.Provider>
  );
}

function NoAccess({ onSignOut }: { onSignOut: () => Promise<void> }) {
  return (
    <Box sx={{ maxWidth: 480, mx: "auto", mt: 12, px: 2, textAlign: "center" }}>
      <Typography variant="h5" gutterBottom>
        No access
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        You&apos;re signed in, but your account doesn&apos;t have access to the Health Dashboard.
      </Typography>
      <Button variant="outlined" onClick={() => void onSignOut()}>
        Sign out
      </Button>
    </Box>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
