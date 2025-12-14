# Health Dashboard

Personal health tracking dashboard with AI-powered insights and analytics.

## Features

- **Health Issue Tracking**: Log and monitor health issues with detailed incident tracking
- **Lab Results**: Track lab results over time with trend visualization (lipid panels, custom tests)
- **Strava Integration**: Sync workouts and track fitness goals
- **AI Chat**: Ask natural language questions about your health data using Claude AI
- **Doctor Visit Preparation**: Generate summaries and discussion outlines for appointments

## Tech Stack

- **Frontend**: Next.js 15+ with TypeScript
- **Backend**: Netlify Functions (serverless)
- **Database**: MongoDB
- **Authentication**: JWT + bcrypt
- **UI**: TailwindCSS
- **AI**: Anthropic Claude API
- **Charts**: Recharts

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

- `MONGODB_CONNECTION_STRING`: Your MongoDB connection string
- `ADMIN_USERNAME`: Your admin username
- `ADMIN_PASSWORD_HASH`: Bcrypt hash of your password (see below)
- `JWT_SECRET`: Secret key for JWT signing
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `STRAVA_CLIENT_ID` & `STRAVA_CLIENT_SECRET`: (Optional) For Strava integration

### 3. Generate Secrets

Run the built-in script to generate your JWT secret and password hash:

```bash
npm run generate-secrets
```

This will:

- Generate a secure random JWT secret
- Prompt you for your admin password
- Generate a bcrypt hash of your password (salt rounds = 12)
- Display both values to copy into your `.env` file

Copy the generated values into your `.env` file.

### 4. Database Setup

The application uses the following MongoDB collections in the `health-fitness` database:

- `health-logs`: Health issue tracking (should already exist with data)
- `lab-results`: Lab test results (empty, will be populated)
- `strava-workouts`: Cached Strava workout data
- `fitness-goals`: Fitness goals and tracking

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production

```bash
npm run build
```

## Deployment on Netlify

1. Connect your Git repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add all environment variables in Netlify dashboard
5. Deploy!

## Project Structure

```
/
├── app/                      # Next.js app directory
│   ├── dashboard/           # Main dashboard
│   ├── login/               # Login page
│   ├── health-logs/         # Health issue tracking
│   ├── lab-results/         # Lab results tracking
│   ├── workouts/            # Strava workouts and goals
│   └── ...
├── components/              # React components
├── lib/                     # Utilities
│   ├── auth.ts             # Authentication helpers
│   ├── mongodb.ts          # Database connection
│   └── ...
├── netlify/functions/       # Serverless API
│   ├── auth-login.ts       # Login endpoint
│   ├── auth-verify.ts      # Token verification
│   └── ...
├── types/                   # TypeScript definitions
└── middleware.ts            # Route protection
```

## API Endpoints

### Authentication

- `POST /api/auth-login` - Authenticate and get JWT token
- `GET /api/auth-verify` - Verify JWT token

### Health Logs

- `GET /api/health-logs-query` - Query health logs with filtering
- `POST /api/health-logs-create` - Create new health log
- `PATCH /api/health-logs-update` - Update health log
- `GET /api/health-incidents` - Get incident analytics

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

- AI chat and summaries
- Doctor visit preparation

## Development Roadmap

- [x] Phase 1: Project Setup & Authentication
- [x] Phase 2: Health Logs Integration
- [x] Phase 3: Lab Results Tracking
- [x] Phase 4: Strava Integration
- [ ] Phase 5: AI Chat & Summaries
- [ ] Phase 6: Dashboard & Analytics

## Strava Setup

To enable Strava integration, see the detailed setup guide: [docs/strava-setup.md](docs/strava-setup.md)

## License

Private project for personal use.
