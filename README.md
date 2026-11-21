# Health Dashboard

Personal health tracking dashboard. Sign-in is handled by [clang-auth](https://auth.clintonlangosch.com), shared with the other `*.clintonlangosch.com` apps.

## Features

- **Health Issue Tracking**: Log and monitor health issues with detailed incident tracking
- **Lab Results**: Track lab results over time with trend visualization (lipid panels, custom tests)
- **Strava Integration**: Sync workouts and track fitness goals
- **Claude Code access**: the local MCP server in `mcp-server/` lets Claude Code query and update your data
- **Doctor Visit Preparation**: Generate summaries and discussion outlines for appointments

## Tech Stack

- **Frontend**: Next.js 15+ with TypeScript
- **Backend**: Netlify Functions (serverless)
- **Database**: MongoDB
- **Authentication**: clang-auth (ES256 `ca_access` cookie verified with `jose`); an API key for the local MCP server
- **UI**: TailwindCSS
- **Charts**: Recharts

## Project Layout

This is an npm workspaces monorepo:

- `web/` — the Next.js app and Netlify Functions described below.
- `mcp-server/` — a local MCP server exposing the app's API to Claude Code (see [mcp-server/README.md](mcp-server/README.md)).

## Setup

### 1. Install Dependencies

From the repo root (installs and hoists dependencies for all workspaces):

```bash
npm install
```

### 2. Configure Environment Variables

Copy `web/.env.example` to `.env.local` **at the repo root** (not inside
`web/`) and fill in your values:

```bash
cp web/.env.example .env.local
```

**Important:** `netlify dev` injects environment variables into Netlify
Functions based on `.env`/`.env.local` files found at the monorepo's
workspace root (the directory with the top-level `package.json`), not inside
`web/`. Next.js itself also gets these via `netlify dev`'s env injection, so
a root-level file is sufficient — no `web/.env` needed.

Required environment variables:

- `MONGODB_CONNECTION_STRING`: Your MongoDB connection string
- `AUTH_BASE_URL`: the clang-auth service, `https://auth.clintonlangosch.com` (locally `http://auth.localtest.me:4000`)
- `AUTH_APP_SLUG`: `health`
- `MCP_API_KEY_SHA256`: SHA-256 of the local MCP server's API key (see below)
- `STRAVA_CLIENT_ID` & `STRAVA_CLIENT_SECRET`: (Optional) For Strava integration

### 3. Sign-in and the MCP API key

There's no login page or password in this app. Register it with clang-auth and grant yourself access (from outside the clang-auth repo for production):

```bash
clang-auth app create health --name Health --origin https://health.clintonlangosch.com
clang-auth grant set <your email> health --role admin
```

For local development, register `http://health.localtest.me:8888` in your **local** clang-auth instead and grant `dev@localtest.me`.

The local MCP server authenticates with an API key. Generate one:

```bash
npm run generate-mcp-key
```

Put `MCP_API_TOKEN=<key>` in `mcp-server/.env`, and `MCP_API_KEY_SHA256=<hash>` in Netlify (and your root `.env.local`). API-key requests can read and write but can't delete.

### 4. Database Setup

The application uses the following MongoDB collections in the `health-fitness` database:

- `health-logs`: Health issue tracking (should already exist with data)
- `lab-results`: Lab test results (empty, will be populated)
- `strava-workouts`: Cached Strava workout data
- `fitness-goals`: Fitness goals and tracking

### 5. Run Development Server

**Important:** This app uses Netlify Functions for API endpoints. You must use Netlify Dev, not `next dev` directly.

From the repo root:

```bash
npm run dev
```

(this runs `netlify dev` inside the `web/` workspace)

Open [http://health.localtest.me:8888](http://health.localtest.me:8888) in your browser (with your local clang-auth running). `*.localtest.me` resolves to `127.0.0.1`, so it shares the login cookie with `auth.localtest.me`.

**Note:** The app runs on port 8888 (not 3000) when using Netlify Dev. This is required for the API endpoints to work correctly.

### 6. Build for Production

```bash
npm run build
```

## Deployment on Netlify

**Important:** since this is now an npm workspaces monorepo, you must set
**Package directory** to `web` in the Netlify dashboard (Project configuration
> Build & deploy > Continuous deployment > Build settings). Leave **Base
directory** unset (defaults to the repo root). `web/netlify.toml` holds the
actual build/functions/redirects config for the site and is picked up
automatically once the package directory is set correctly.

1. Connect your Git repository to Netlify
2. Set **Package directory**: `web`
3. Set build command: `npm run build`
4. Set publish directory: `.next`
5. Add all environment variables in Netlify dashboard
5. Deploy!

## Project Structure

```
/
├── web/                      # The Next.js app (this is the Netlify site)
│   ├── app/                  # Next.js app directory
│   │   ├── dashboard/       # Main dashboard
│   │   ├── health-logs/     # Health issue tracking
│   │   ├── lab-results/     # Lab results tracking
│   │   ├── workouts/        # Strava workouts and goals
│   │   └── ...
│   ├── components/           # React components
│   ├── lib/                  # Utilities
│   │   ├── clang-auth.ts    # clang-auth token verification
│   │   ├── authenticate.ts  # Function auth: cookie or MCP API key
│   │   ├── authClient.ts    # Browser: authFetch, refresh, logout
│   │   ├── mongodb.ts       # Database connection
│   │   └── ...
│   ├── netlify/functions/    # Serverless API
│   │   ├── me.ts            # Signed-in user (drives AuthProvider)
│   │   └── ...
│   ├── types/                 # TypeScript definitions
│   └── proxy.ts               # Route protection
└── mcp-server/                # Local MCP server exposing the app's API to Claude Code
```

## API Endpoints

### Authentication

Every endpoint requires either the clang-auth `ca_access` cookie (browser) or `Authorization: Bearer <MCP API key>` (no `DELETE`). Cookie-authenticated writes must come from the app's own origin.

- `GET /api/me` - The signed-in user and token expiry

### Health Logs

- `GET /api/health-logs-query` - Query health logs with filtering
- `POST /api/health-logs-create` - Create new health log
- `PATCH /api/health-logs-update` - Update health log

### Lab Results

- `GET /api/lab-results-query` - Query lab results
- `POST /api/lab-results-create` - Create lab result
- `PATCH /api/lab-results-update` - Update lab result
- `GET /api/lab-results-trends` - Get trend data for charts

### Strava Integration

- `GET /api/strava-oauth` - OAuth callback handler
- `POST /api/strava-sync` - Sync activities from Strava
- `GET /api/strava-workouts` - Query cached workouts
- `GET /api/fitness-goals` - Query fitness goals
- `POST /api/fitness-goals` - Create fitness goal
- `PATCH /api/fitness-goals` - Update fitness goal
- `DELETE /api/fitness-goals` - Delete fitness goal

### Coming Soon

- Doctor visit preparation

## Development Roadmap

- [x] Phase 1: Project Setup & Authentication
- [x] Phase 2: Health Logs Integration
- [x] Phase 3: Lab Results Tracking
- [x] Phase 4: Strava Integration
- [ ] Phase 6: Dashboard & Analytics

## Strava Setup

To enable Strava integration, see the detailed setup guide: [docs/strava-setup.md](docs/strava-setup.md)

## License

Private project for personal use.
