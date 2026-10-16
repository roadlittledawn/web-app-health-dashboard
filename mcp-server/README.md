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
   JWT_SECRET=<your JWT_SECRET> node ../scripts/generate-mcp-token.mjs
   ```
   (run from `mcp-server/`, or drop the `../` if run from the repo root)
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

## Adding a tool

Each domain has its own file under `src/tools/`. A tool is a thin wrapper: a
zod input shape describing its arguments, and a handler that calls
`apiClient.get/post/patch/delete` against the corresponding `/api/*` endpoint
in `netlify/functions/`. Register new tool files in `src/index.ts`.
