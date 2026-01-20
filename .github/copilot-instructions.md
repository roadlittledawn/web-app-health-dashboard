# GitHub Copilot Instructions

## Project Overview

This is a personal health tracking dashboard with AI-powered insights and analytics. It's built with Next.js 15+, TypeScript, and serverless functions on Netlify, backed by MongoDB.

## Tech Stack

- **Frontend**: Next.js 15+ with App Router, TypeScript, React 19+
- **Backend**: Netlify Functions (serverless)
- **Database**: MongoDB (database name: `health-fitness`)
- **Authentication**: JWT + bcrypt
- **UI**: TailwindCSS, Material-UI (MUI)
- **AI**: Anthropic Claude API, MCP (Model Context Protocol) server integration
- **Charts**: Recharts
- **Third-party APIs**: Strava (optional)

## Project Structure

```
/
├── app/                      # Next.js app directory (App Router)
│   ├── chat/                # AI chat interface
│   ├── dashboard/           # Main dashboard
│   ├── login/               # Login page
│   ├── incidents/           # Health issue tracking
│   ├── lab-results/         # Lab results tracking
│   ├── workouts/            # Strava workouts and goals
│   ├── layout.tsx           # Root layout with ThemeRegistry
│   └── globals.css          # Global styles
├── components/              # React components
├── lib/                     # Shared utilities
│   ├── auth.ts             # Authentication helpers (JWT, bcrypt)
│   ├── mongodb.ts          # Database connection
│   ├── searchRanking.ts    # Search result ranking algorithms
│   ├── workoutUtils.ts     # Workout calculations (distance, elevation, pace)
│   └── ...
├── netlify/functions/       # Serverless API endpoints
│   ├── ai-chat.ts          # AI chat endpoint (Claude integration with MCP)
│   ├── *-search.ts         # Search endpoints (health logs, incidents, workouts)
│   └── ...
├── types/                   # TypeScript type definitions
│   ├── ai-chat.ts          # AI chat types and interfaces
│   └── ...
├── scripts/                 # Utility scripts
│   └── generate-mcp-token.mjs  # Generate MCP authentication tokens
└── middleware.ts            # Route protection
```

## Build, Lint, and Test Commands

```bash
npm run dev              # Start development server on localhost:3000
npm run build            # Production build
npm run lint             # Run ESLint (uses next/core-web-vitals and next/typescript configs)
npm run generate-secrets # Generate JWT secret and password hash
```

**Note**: This project currently does not have automated tests. When adding tests in the future, follow Next.js testing conventions with Jest and React Testing Library.

## Code Style and Conventions

### TypeScript

- **Strict mode enabled**: All TypeScript strict checks are on
- **Path aliases**: Use `@/` for imports from project root (e.g., `import { auth } from '@/lib/auth'`)
- **Type safety**: Always define interfaces for API responses, function parameters, and component props
- **Explicit typing**: Prefer explicit return types for functions

### Code Organization

- **Serverless functions**: Located in `netlify/functions/`, each file exports a `handler` function
- **API endpoints**: Each Netlify function maps to `/api/{function-name}` 
- **Database collections**: `health-logs`, `lab-results`, `strava-workouts`, `fitness-goals`, `incidents`
- **Database name**: Always use `health-fitness` as the database name

### Authentication

- **JWT tokens**: 24-hour expiration by default (configurable via `JWT_EXPIRATION` env var)
- **Password hashing**: bcrypt with 12 salt rounds
- **Token format**: Bearer tokens in Authorization header
- **Token extraction**: Use `extractToken()` from `lib/auth.ts`
- **Token verification**: Use `verifyToken()` from `lib/auth.ts`

### API Response Format

Serverless functions should return consistent response structures:

```typescript
// Success response
{
  statusCode: 200,
  body: JSON.stringify({ data: ... }),
  headers: { "Content-Type": "application/json" }
}

// Error response
{
  statusCode: 4xx/5xx,
  body: JSON.stringify({
    error: {
      code: "ERROR_CODE",
      message: "Human-readable message"
    }
  }),
  headers: { "Content-Type": "application/json" }
}
```

### MongoDB Patterns

- **Connection**: Use `getDatabase()` from `lib/mongodb.ts` to get database instance
- **Connection pooling**: In development, connections are cached globally; in production, new connections per function
- **Database name**: `health-fitness`
- **Error handling**: Always wrap database operations in try-catch blocks
- **Example**:
  ```typescript
  try {
    const db = await getDatabase();
    const collection = db.collection('health-logs');
    const result = await collection.find({}).toArray();
    return { statusCode: 200, body: JSON.stringify({ data: result }) };
  } catch (error) {
    console.error('Database error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: { code: 'DATABASE_ERROR', message: 'Failed to query database' } 
      }) 
    };
  }
  ```

### React/Next.js Patterns

- **App Router**: Use Next.js App Router patterns (not Pages Router)
- **Server Components**: Default to Server Components unless client interactivity needed
- **Client Components**: Mark with `'use client'` directive when using hooks or browser APIs
- **Styling**: Use TailwindCSS utility classes; MUI components for complex UI elements
- **Layout**: Root layout includes ThemeRegistry for MUI theme support

### Environment Variables

Required environment variables (see `.env.example`):
- `MONGODB_CONNECTION_STRING`: MongoDB connection URI
- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`: Authentication credentials
- `JWT_SECRET`: Secret for JWT signing
- `ANTHROPIC_API_KEY`: For AI chat features
- `MCP_SERVER_URL` (optional): MCP server URL for AI chat (defaults to remote server)
- `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` (optional): For Strava integration

### Documentation

- **JSDoc comments**: Use JSDoc for exported functions, especially in `lib/` utilities
- **Inline comments**: Minimal; code should be self-documenting
- **Comment style**: When needed, explain "why" not "what"
- **Example**:
  ```typescript
  /**
   * Validates and extracts JWT token from request headers.
   * @param headers - HTTP headers from the request
   * @returns Extracted token string or null if not found/invalid format
   */
  export function extractToken(headers: Record<string, string | undefined>): string | null {
    const authHeader = headers.authorization || headers.Authorization;
    // Bearer token format is required by our authentication system
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
  }
  ```

### Security

- **No secrets in code**: All secrets must be in environment variables
- **Input validation**: Validate all user inputs before database operations
- **Authentication**: Protect all API endpoints except `/api/auth-login` and `/api/strava-oauth`
- **Error messages**: Don't expose sensitive information in error messages

## Common Patterns

### Adding a New API Endpoint

1. Create a new file in `netlify/functions/` (e.g., `my-endpoint.ts`)
2. Export a `handler` function with type `Handler` from `@netlify/functions`
3. Validate HTTP method and authentication
4. Use `getDatabase()` to access MongoDB
5. Return consistent response format
6. The endpoint will be available at `/api/my-endpoint`

**Example**:
```typescript
import { Handler } from '@netlify/functions';
import { extractToken, verifyToken } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const handler: Handler = async (event) => {
  // Validate HTTP method
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET allowed' } }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Authenticate
  const token = extractToken(event.headers);
  if (!token || !verifyToken(token)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Database operation
  try {
    const db = await getDatabase();
    const data = await db.collection('my-collection').find({}).toArray();
    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'Internal error' } }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
```

### Adding a New Page

1. Create a new directory or file in `app/` following App Router conventions
2. Use Server Components by default
3. Add `'use client'` only if needed for interactivity
4. Protected routes are handled by `middleware.ts`

### Working with Forms

- Use controlled components with React state
- Validate inputs client-side before API calls
- Handle loading and error states
- Show user feedback with appropriate UI components

### AI Chat Integration

The AI chat feature uses Claude AI with MCP (Model Context Protocol) server integration:

- **AI Chat API** (`/api/ai-chat`): Processes user messages using Claude AI with MCP tool integration
- **MCP Server**: Remote server provides tools for dynamically querying health data (incidents, workouts, labs)
- **MCP Tools**: AI can call tools on the MCP server to fetch specific health data as needed
- **Response Format**: Markdown-formatted responses with proper error handling

**Key Patterns**:
- MCP server handles data retrieval through tool calls (replaces pre-computed statistics approach)
- Use helper functions from `lib/workoutUtils.ts` for workout calculations
- Use `lib/searchRanking.ts` for search result relevance scoring
- Include proper TypeScript types from `types/ai-chat.ts`

### Search Endpoints

Search endpoints provide fuzzy text search with relevance ranking:

- **Pattern**: Files named `*-search.ts` in `netlify/functions/`
- **Query Parameter**: `q` (required) - search query string
- **Response**: Array of results with relevance scores, sorted by score descending
- **Ranking Algorithm**: Uses `calculateRelevanceScore()` from `lib/searchRanking.ts`
- **Examples**: 
  - `/api/health-logs-search?q=back pain`
  - `/api/incidents-search?q=knee`
  - `/api/strava-workouts-search?q=long ride`

**Relevance Scoring Factors**:
- Exact matches score higher than partial matches
- Case-insensitive matching
- Multiple field matching (title, description, notes, etc.)
- Position of match within text affects score

## Development Workflow

1. **Setup**: Copy `.env.example` to `.env` and configure
2. **Install**: `npm install`
3. **Generate secrets**: `npm run generate-secrets` for JWT and password hash
4. **Run**: `npm run dev` for local development
5. **Lint**: `npm run lint` before committing

## Deployment

- **Platform**: Netlify
- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Environment variables**: Configure in Netlify dashboard

## Known Patterns to Follow

- Serverless functions use `@netlify/functions` types
- MongoDB operations use async/await pattern
- Authentication token extraction follows Bearer token standard
- API responses always include `Content-Type: application/json` header
- Error responses use consistent error object structure with `code` and `message`
- Use environment variables for all configuration (never hardcode secrets or config)
- Prefer functional components over class components for React
- Use TypeScript interfaces over types for object shapes
- AI chat features aggregate data before sending to Claude (never send raw database dumps)
- Search endpoints use relevance scoring from `lib/searchRanking.ts`
- Workout calculations use helper functions from `lib/workoutUtils.ts` (distance, elevation, pace)
- MCP (Model Context Protocol) integration for AI tool use with remote server
