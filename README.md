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
│   ├── health-logs/         # (Coming soon)
│   ├── lab-results/         # (Coming soon)
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
- `POST /api/auth/login` - Authenticate and get JWT token
- `GET /api/auth/verify` - Verify JWT token

### (Coming Soon)
- Health logs CRUD
- Lab results CRUD
- Strava integration
- AI chat and summaries

## Development Roadmap

- [x] Phase 1: Project Setup & Authentication
- [ ] Phase 2: Health Logs Integration
- [ ] Phase 3: Lab Results Tracking
- [ ] Phase 4: Strava Integration
- [ ] Phase 5: AI Chat & Summaries
- [ ] Phase 6: Dashboard & Analytics

## License

Private project for personal use.
