# Plan: migrate Health Dashboard auth to clang-auth

Reference docs, in the clang-auth repo (`~/Projects/service-clang-auth-claude`): `docs/integration-guide.md`, `docs/migrating-apps.md` and `docs/how-it-works.md`. Lexicon, the Knowledgebase, App Cooking and the photo manager (`clang-photo-manager/docs/clang-auth-migration.md`) were migrated the same way. This plan reuses their patterns: the token verifier, `authFetch`, `AuthProvider` with early refresh, and the CSRF origin check.

## Status

Decisions confirmed 2026-11-21. R0 done 2026-11-21 (Render service suspended, claude.ai connector removed). Implemented on `feat/clang-auth-migration`; local end-to-end checks passed 2026-11-21 (netlify dev + local clang-auth: sign-in redirect, `/api/me`, cookie reads, CSRF refusals, API key read/write, key `DELETE` refused, old JWT refused, Strava callback redirect, refresh CORS, MCP server over stdio). Still to do: browser checks of AuthProvider refresh and sign-out, then P1–P4 and cutover.

## Goal

- Sign in once at `https://auth.clintonlangosch.com` and land on `https://health.clintonlangosch.com` already signed in, like the other apps.
- Remove the app's own login, including `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`, the HS256 JWT in `localStorage`, `bcrypt` and `jsonwebtoken`. The app keeps no passwords and no signing secret. It verifies the 15-minute ES256 `ca_access` cookie against clang-auth's JWKS.
- Keep the local Claude Code MCP server (`mcp-server/`) working, using an app API key instead of a year-long JWT.
- Remove the in-app AI Chat, and retire the remote MCP server it used (`clang-mcp-remote` on Render).

## Current state (what changes)

- **Login:** `POST /api/auth-login` checks the env username and bcrypt hash, then returns a 24 h HS256 JWT. `login/page.tsx` stores it in `localStorage` *and* in a non-HttpOnly `auth-token` cookie.
- **Pages:** `proxy.ts` only checks that *some* `auth-token` cookie or header exists. Pages never verify the token. They read it from `localStorage` and send `Authorization: Bearer …` in 39 places across 16 files.
- **API:** 22 data functions verify the bearer JWT inline, with `jsonwebtoken` or `lib/auth.ts`. The two exceptions are `auth-login` and `strava-oauth`, and **`strava-oauth` has no auth at all**: anyone who reaches it with a Strava code can replace the stored Strava tokens.
- **Machine access:** `web/scripts/generate-mcp-token.mjs` signs a 365-day JWT with `JWT_SECRET`. Two clients use these tokens: the local `mcp-server` (`MCP_API_TOKEN`) and the Render-hosted `clang-mcp-remote` (`API_TOKEN`).
- **⚠ `clang-mcp-remote` has no auth on `/mcp`.** Anyone who knows the Render URL can call its tools, and it calls the API with a full-access token. Fix this today, before any of the work below (see R0).
- **Hosting:** the Netlify site `clang-health` (`clang-health.netlify.app`) has no custom domain and deploys `main`. Feature branches merge into `develop`, and `develop` merges into `main`.

## How it works after the change

```text
browser ─▶ health.clintonlangosch.com
  │  page (proxy.ts):  no/invalid ca_access   → 302 auth.clintonlangosch.com/login?redirect_uri=<url>
  │                    token but no `health`  → 403 (no redirect: it would loop)
  │  /api/* (each function, via authenticate()):
  │       Cookie ca_access, valid + health grant → OK  (writes also need same-origin Origin, D6)
  │       Authorization: Bearer <MCP key>        → OK  (no DELETE, D3)
  │       otherwise                              → 401 JSON → authFetch refreshes once, retries
  └─ AuthProvider refreshes ~60 s before exp via POST auth…/api/session/refresh

Claude Code ─ stdio ─▶ mcp-server ─ Bearer <MCP key> ─▶ health.clintonlangosch.com/api/*
```

## Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Subdomain and slug | **`health.clintonlangosch.com`, slug `health`** (confirmed) | Matches the subdomain = slug convention. `health` is unused in the Netlify DNS zone (checked 2026-11-21). |
| D2 | Access rule | Valid token whose `apps` contains `health`, **with any role**. No grant → `403`. | Single user, same as photos. Grant it only to yourself: the data is medical. |
| D3 | Machine access (local MCP) | **App-local API key** (confirmed). `scripts/generate-mcp-key.mjs` prints a random 32-byte key and its SHA-256. Netlify stores only `MCP_API_KEY_SHA256`, and `authenticate()` compares the hash in constant time. Key requests can't use `DELETE`. | clang-auth has no long-lived or service tokens by design, and minted access tokens last 15 minutes. A hashed static key is how clang-auth treats its own admin key. Blocking `DELETE` matches the MCP README's rule that deletes stay in the web UI. Rotate by generating a new key and updating one env var. |
| D4 | `AUTH_MODE` switch | **None.** Cut over directly. | Single user. Netlify can re-publish the previous production deploy in seconds, and the old env vars stay until cleanup. |
| D5 | How the browser learns `AUTH_BASE_URL` | The root layout passes it as a prop to `AuthProvider`. | No `NEXT_PUBLIC_` variable, same as the other apps. |
| D6 | CSRF | Cookie-authenticated `POST/PATCH/PUT/DELETE` require `Origin` (or the origin of `Referer`) to equal the request's own origin, else `403`. Bearer-key requests are exempt. | `ca_access` is `SameSite=Lax` and shared across the domain, so a sibling subdomain could otherwise post with it. A bearer key is never sent automatically. |
| D7 | AI Chat | Delete the UI (`app/chat/`, the dashboard tile) **and its backend**: `ai-chat.ts`, `mcp-status.ts`, `types/ai-chat.ts`, the `@anthropic-ai/sdk` and `@modelcontextprotocol/sdk` deps from `web`, and `ANTHROPIC_API_KEY`/`MCP_SERVER_URL`. **Keep `ai-chat-stats.ts`**, because the MCP `get_health_stats` tool uses it. | You asked for UI-only removal. Without a caller, though, the two functions would still need porting to the new auth, and they hold an Anthropic key behind the old auth. Deleting them costs less than porting them. `git revert` brings them back. |
| D8 | Old domain | Make `health.clintonlangosch.com` the site's **primary domain**. Netlify then redirects `clang-health.netlify.app` there automatically. | No code. Bookmarks keep working. |
| D9 | Strava | The OAuth callback moves to `https://health.clintonlangosch.com/api/strava-oauth`, built from `window.location.origin`, so no code change. Set the Strava app's **Authorization Callback Domain** to `health.clintonlangosch.com` (P4). The callback now also **requires a valid `ca_access`**, and redirects to login if it's missing. | It's a browser navigation, so the cookie arrives with it. This closes the current unauthenticated write. |
| D9a | Strava scope | **Minimum only.** Strava is being deprecated in favor of Apple Health data synced to MongoDB by the iOS app. Port the Strava functions mechanically like the others and update the callback domain. Nothing more. Strava access may already be broken (subscription lapsed), so its V1 check is best-effort. | Not worth investing in a path that's going away. |
| D10 | Previews | Deploy previews on `*.netlify.app` can't authenticate. Test locally and on prod. | `ca_access` can't reach `*.netlify.app` (migrating-apps §5). |
| D11 | Tests | One `tsx` script, `web/scripts/test/auth.test.ts` (`node:assert`), run by `npm run test:auth`. | No test framework today. Same approach as the other apps. |

## Prerequisites (outside this repo)

| Step | Action |
|---|---|
| R0 | **Do this now, separately from this plan.** Suspend the Render service `health-dashboard-mcp`, and remove the "Clang MCP Remote" connector in claude.ai → Settings → Connectors. Nothing else uses them once D7 lands. |
| P1 | **Domain.** In Netlify → `clang-health` → Domain management, add `health.clintonlangosch.com` and set it as primary. DNS is on Netlify, so Netlify creates the record itself. Wait for TLS, then check that the current app loads at the new URL. Login still works, because nothing has changed yet. |
| P2 | **Register with prod clang-auth.** Run from outside the clang-auth repo: `clang-auth app create health --name Health --origin https://health.clintonlangosch.com`, then `clang-auth grant set <your email> health --role admin`. |
| P3 | **Netlify env vars (all contexts):** `AUTH_BASE_URL=https://auth.clintonlangosch.com`, `AUTH_APP_SLUG=health`, `MCP_API_KEY_SHA256=<from generate-mcp-key>`. Keep `JWT_SECRET`, `ADMIN_*` and `ANTHROPIC_API_KEY` until cleanup, so a rollback still has them. |
| P4 | **Strava** → My API Application → Authorization Callback Domain: `health.clintonlangosch.com`. |

## Part 1: server side (`web/`)

| # | Change |
|---|---|
| 1.1 | **`lib/clang-auth.ts`** (new), ported from photos: `ACCESS_COOKIE = "ca_access"`, `authSettings()`, `verifyAccessToken()` (module-scoped `createRemoteJWKSet`, `ES256`, `issuer`, `clockTolerance: 30`, checks `sub`/`apps`), `setJwksForTesting()`, `loginUrl(returnTo)`. Add `jose` as a direct `web` dependency (it's only transitive today). |
| 1.2 | **`lib/authenticate.ts`** (new): `authenticate(event): { principal } \| HandlerResponse`. Tries the cookie (D2, with the CSRF check from D6), then the bearer key (D3). Returns `401 {"error":"Unauthorized"}`, or `403`. |
| 1.3 | **Port the 21 remaining data functions**: exercises, fitness-goals, health-logs-{autocomplete,create,query,search,update}, incidents-{create,query,search,update}, lab-results-{create,query,trends,update}, strava-{sync,workout-types,workouts,workouts-search}, workout-programs, ai-chat-stats. Each one's inline `jwt.verify` block becomes `const auth = authenticate(event); if ("statusCode" in auth) return auth;`. Response shapes stay the same. |
| 1.4 | **`strava-oauth.ts`**: require a cookie session, and redirect to `loginUrl` if it's missing (D9). |
| 1.5 | **`/api/me`** (new function `me.ts`): returns `{ email, name, roles, exp }` from the cookie, or `401`. |
| 1.6 | **Rewrite `proxy.ts`** to verify the token with `verifyAccessToken`: redirect to `loginUrl` if it's missing or invalid, `403` if there's no grant. Exclude `/api/*` from the matcher, because each function checks for itself and Netlify routes `/api/*` to functions. Drop `/login` from the public paths. |
| 1.7 | **Delete** `auth-login.ts`, `auth-verify.ts`, `lib/auth.ts`, `scripts/generate-secrets.js` and `scripts/generate-mcp-token.mjs`, and the `bcrypt`, `jsonwebtoken` and `@types/*` packages for them. Add `scripts/generate-mcp-key.mjs`. |
| 1.8 | **AI Chat (D7):** delete `app/chat/`, `ai-chat.ts`, `mcp-status.ts`, `types/ai-chat.ts` and the two SDK deps. Remove the dashboard's "AI Chat" tile. |

## Part 2: client side

| # | Change |
|---|---|
| 2.1 | **`lib/authClient.ts`** (new, browser only), ported from photos: `refreshSession()` (single in-flight request), `authFetch()` (on a `401`, refresh and retry once, else redirect to login), `redirectToLogin()`, `logout()`. |
| 2.2 | **`components/AuthProvider.tsx`** + `useAuth()`, mounted in `app/layout.tsx` (D5). Loads `/api/me` once per page load, refreshes ~60 s before `exp` and on `visibilitychange`. This matters for long sessions such as `workouts/session/[programId]`. |
| 2.3 | **Replace all 39 `localStorage.getItem('auth-token')` + `Authorization` sites** in the 16 files with `authFetch(url, init)`. The cookie goes along automatically because requests are same-origin. Delete the `localStorage`/cookie writes and removals. |
| 2.4 | **Delete `app/login/page.tsx`.** The dashboard's sign-out calls `logout()`, labelled "Signs you out of all clintonlangosch.com apps", and shows `useAuth().user.name`. |

## Part 3: local MCP server, local dev, tests

| # | Change |
|---|---|
| 3.1 | `mcp-server`: no code change, because `apiClient.ts` already sends `Bearer ${MCP_API_TOKEN}`. Update `.env.example` and the README so `MCP_API_TOKEN` is the raw key from `generate-mcp-key.mjs` and `API_BASE_URL` is `https://health.clintonlangosch.com/api`. Remove the README's mention of the remote server. |
| 3.2 | Local dev: browse `http://health.localtest.me:8888` (netlify dev). Register `health` in local clang-auth with that origin and grant `dev@localtest.me`. Root `.env.local`: `AUTH_BASE_URL=http://auth.localtest.me:4000`, `AUTH_APP_SLUG=health`, and a local `MCP_API_KEY_SHA256`. |
| 3.3 | `scripts/test/auth.test.ts` (D11): uses a throwaway ES256 key with `setJwksForTesting`. Pass: valid cookie; valid key on GET/PATCH. Fail: missing, expired, wrong `iss`, HS256/forged, unknown `kid`, no `health` grant, wrong key, key with `DELETE`, cookie `PATCH` with a foreign `Origin`. Add it to CI if there is CI, otherwise run it before merging. |

## Part 4: docs

README: remove AI Chat from Features, the `ANTHROPIC_API_KEY`/`ADMIN_*`/`JWT_SECRET` setup and `generate-secrets`. Add the clang-auth env vars, local-dev steps and the auth endpoint table. Delete `docs/AI_CHAT_FEATURE.md` and `docs/AI_CHAT_IMPLEMENTATION_SUMMARY.md`. Update `web/.env.example`.

## Rollout

1. R0 now. P1–P4 next. The app works unchanged on the new domain.
2. PR `feat/clang-auth-migration` → `develop`, then `develop` → `main`. The `main` deploy is the cutover.
3. Generate the real MCP key. Put its hash in Netlify (P3) and the raw key in `mcp-server/.env`.
4. Verify (V1).
5. **Rollback:** Netlify → Deploys → previous production deploy → *Publish deploy*. Old code and old env vars are still there.

## Verification (V1)

- [ ] Private window → `https://health.clintonlangosch.com/incidents` → clang-auth login → back on `/incidents`, signed in.
- [ ] Already signed in to photos → opening the dashboard shows no form.
- [ ] Create an incident, add a pain reading, edit a lab result, run a workout session for more than 15 minutes, then save. Each one succeeds without a re-login.
- [ ] `curl -i https://health.clintonlangosch.com/api/incidents-query` → `401`. The same request with `Authorization: Bearer <old year-long JWT>` → `401`.
- [ ] A cookie `PATCH` with `Origin: https://evil.clintonlangosch.com` → `403`.
- [ ] Bearer key: `GET /api/incidents-query` → `200`. `DELETE /api/exercises` → `403`.
- [ ] Claude Code in this repo: `/mcp` lists `health-dashboard`. "What's my latest incident?" works, and so does adding a pain reading.
- [ ] Strava connect → callback works. A signed-out request to `/api/strava-oauth?code=x` → redirect to login.
- [ ] Sign out → reload any app → login form.
- [ ] `clang-health.netlify.app/dashboard` → redirects to the new domain.

## Cleanup (after ~2 weeks)

| # | Action |
|---|---|
| C1 | Delete Netlify env vars `JWT_SECRET`, `JWT_EXPIRATION`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ANTHROPIC_API_KEY` and `MCP_SERVER_URL`. |
| C2 | Delete the Render service, and archive the `clang-mcp-remote` repo (or reuse it, see below). |
| C3 | Revoke the Anthropic API key that was used only by AI Chat. |

## Risks

| Risk | Mitigation |
|---|---|
| A missed `localStorage` call site sends no credentials and gets `401`s. | `grep -rn "auth-token" web/` must return nothing before the PR. Cookies go along on same-origin requests anyway, so a missed site only loses the retry-after-refresh. |
| The MCP key leaks. It gives read/write to all data (no deletes). | It's stored only as a hash in Netlify and in a gitignored `.env`. Rotate it by changing one env var. |
| The auth service is down. | Issued tokens keep working for up to 15 minutes. The MCP key path doesn't depend on clang-auth. |

## Commit sequence

1. Add `clang-auth.ts`, `authenticate.ts`, the key script and the auth test (1.1, 1.2, 1.7 script, 3.3).
2. Port the API functions, Strava and `/api/me` (1.3–1.5).
3. Add the client auth (`authClient`, `AuthProvider`, `authFetch` everywhere, logout) and delete login (2.x, 1.6).
4. Remove AI Chat (1.8).
5. Delete the old auth (1.7).
6. Docs and env examples (Part 4, 3.1, 3.2).

## Follow-up (separate PR): Health assistant on your phone

Goal: in the Claude iOS app, ask about your health data, create incidents and logs, and update an incident (resolve it, log today's pain as 3/10). This should work as reliably as Claude Code does locally.

**Shape:** one MCP server, two transports. Add a Streamable HTTP entrypoint to `mcp-server/`, deployed as a stateless Netlify function at `https://health.clintonlangosch.com/mcp`. It reuses the same tool files the local stdio server uses, so they can't drift apart (as `clang-mcp-remote` did). In claude.ai, add it as a custom connector. Connectors added on the web are also available in the iOS app. Then create a Claude **Project** ("Health") whose instructions hold what you've taught Claude Code locally: incident IDs, the pain scale, "append a reading, don't overwrite", and when to ask before writing.

**Auth:** claude.ai connectors authenticate with OAuth 2.1, and clang-auth deliberately isn't an OAuth provider. Add a minimal OAuth layer **in this app**:

- protected-resource and authorization-server metadata under `/.well-known/`
- `/oauth/authorize`, which requires a valid `ca_access` with the `health` grant, so the sign-in screen you see while connecting is clang-auth's own
- `/oauth/token` with PKCE, issuing opaque tokens stored hashed in Mongo, with a long-lived refresh token you can revoke
- one pre-registered client, whose ID and secret go into the connector's advanced settings, so no dynamic client registration

If a second app ever wants a connector, move this layer into clang-auth itself. That would be a deliberate change to clang-auth's non-goals.

**Write safety:** the tools already have no deletes. Keep it that way for the remote server too. The Claude app shows each tool call, and you can require approval for write tools in the connector settings.
