# health-dashboard MCP server

A local [MCP](https://modelcontextprotocol.io) server that gives Claude Code
tools to read and write your Strava workouts, health incidents/logs, lab
results, exercise library, and workout programs — by calling this repo's
existing `/api/*` Netlify Functions over HTTP.

It's a separate, local-only (stdio) server. It is unrelated to the remote MCP
server the in-app "AI Chat" feature talks to via `MCP_SERVER_URL`.

## Setup

1. Install dependencies from the repo root (this package is an npm workspace):
   ```
   npm install
   ```
2. Generate a long-lived API token for this server, using the same
   `JWT_SECRET` your deployed site uses:
   ```
   JWT_SECRET=<your JWT_SECRET> node ../web/scripts/generate-mcp-token.mjs
   ```
   (run from `mcp-server/`, or use `web/scripts/generate-mcp-token.mjs` if run from the repo root)
3. Copy `.env.example` to `.env` and fill in:
   - `API_BASE_URL` — your deployed site's API base, e.g.
     `https://your-site.netlify.app/api` (or `http://localhost:8888/api` for
     `netlify dev`)
   - `MCP_API_TOKEN` — the token from step 2
4. Build it:
   ```
   npm run build
   ```
5. From the repo root, `.mcp.json` already registers this server with Claude
   Code as `health-dashboard`. Restart Claude Code (or run `/mcp`) in this
   project and it should connect and list its tools.

## Development

- `npm run dev` — run directly from TypeScript source with `tsx` (useful for
  quick local testing; rebuild+restart Claude Code to pick up changes since
  `.mcp.json` runs the compiled `dist/index.js`).
- `npm run build` — compile to `dist/`.

## Tools

| Area | Tool | API endpoint |
|---|---|---|
| Incidents | `search_incidents` | `GET /incidents-search` |
| | `query_incidents` | `GET /incidents-query` |
| | `create_incident` | `POST /incidents-create` |
| | `update_incident` | `PATCH /incidents-update` |
| | `add_pain_intensity_reading` | `GET /incidents-query`, then `PATCH /incidents-update` |
| Health logs | `search_health_logs` | `GET /health-logs-search` |
| | `query_health_logs` | `GET /health-logs-query` |
| | `create_health_log` | `POST /health-logs-create` (plus a pain reading if `pain_intensity` is set) |
| | `update_health_log` | `PATCH /health-logs-update` |
| | `get_health_log_autocomplete_values` | `GET /health-logs-autocomplete` |
| Lab results | `query_lab_results` | `GET /lab-results-query` |
| | `get_lab_trends` | `GET /lab-results-trends` |
| | `create_lab_result` | `POST /lab-results-create` |
| | `update_lab_result` | `PATCH /lab-results-update` |
| Fitness goals | `query_fitness_goals` | `GET /fitness-goals` |
| | `create_fitness_goal` | `POST /fitness-goals` |
| | `update_fitness_goal` | `PATCH /fitness-goals` |
| Workouts | `search_workouts` | `GET /strava-workouts-search` or `GET /strava-workouts` |
| | `get_workout_types` | `GET /strava-workout-types` |
| | `sync_strava_workouts` | `POST /strava-sync` |
| Exercises | `search_exercises` | `GET /exercises` |
| | `add_exercise` / `bulk_add_exercises` | `POST /exercises` |
| | `update_exercise` | `PATCH /exercises` |
| Workout programs | `list_workout_programs` / `get_workout_program` | `GET /workout-programs` |
| | `create_workout_program` | `POST /workout-programs` |
| | `update_workout_program` | `PATCH /workout-programs` |
| Stats | `get_health_stats` | `GET /ai-chat-stats` |

### Pain readings

The API only replaces an incident's whole `painIntensityOverTime` array, so
`add_pain_intensity_reading` (and `create_health_log` with `pain_intensity`)
reads the incident, appends the reading and writes the array back, the same
way the web UI's pain level form does. Two writes to the same incident at
the same moment can drop a reading.

### Not exposed

These endpoints intentionally have no tool:

- `DELETE /exercises`, `DELETE /workout-programs`, `DELETE /fitness-goals`:
  these permanently delete records, so deletes stay in the web UI.
- `auth-login`, `auth-verify`, `strava-oauth`, `mcp-status`, `ai-chat`:
  auth, OAuth and infrastructure endpoints, not data actions.

## Adding a tool

Each domain has its own file under `src/tools/`. A tool is a thin wrapper: a
zod input shape describing its arguments, and a handler that calls
`apiClient.get/post/patch/delete` against the corresponding `/api/*` endpoint
in `web/netlify/functions/`. Register new tool files in `src/index.ts`, and
add the tool to the table above.
