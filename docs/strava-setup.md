# Strava Integration Setup Guide

This guide explains how to set up Strava OAuth integration for the Health Dashboard application.

## Overview

The Strava integration allows you to:
- Import workout activities from Strava
- Sync activities automatically or manually
- Set and track fitness goals
- View workout statistics and trends
- Filter activities by type

## Prerequisites

Before setting up Strava integration, ensure you have:
1. A Strava account ([create one here](https://www.strava.com/register))
2. Access to create Strava API applications
3. A deployed version of this application (for OAuth callback)

## Step 1: Create a Strava API Application

1. **Navigate to Strava API Settings**
   - Go to https://www.strava.com/settings/api
   - Log in with your Strava credentials

2. **Create a New Application**
   - Click "Create" or "My API Application"
   - Fill in the required fields:
     - **Application Name**: `Health Dashboard` (or your preferred name)
     - **Category**: Choose `Training`
     - **Club**: Leave blank
     - **Website**: Your application URL (e.g., `https://yourdomain.com`)
     - **Application Description**: Brief description of your app
     - **Authorization Callback Domain**: Your deployment domain
       - For Netlify: `yourapp.netlify.app`
       - For custom domain: `yourdomain.com`
       - **Important**: Do NOT include `https://` or paths, just the domain

3. **Note Your Credentials**
   After creating the application, you'll receive:
   - **Client ID**: A numeric ID (e.g., `140054`)
   - **Client Secret**: A long alphanumeric string

   **Keep these secure!** Never commit them to version control.

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env.local` file (for development) and Netlify environment settings (for production):

```env
# Strava API Credentials
STRAVA_CLIENT_ID=your_client_id_here
STRAVA_CLIENT_SECRET=your_client_secret_here
STRAVA_REDIRECT_URI=https://yourapp.netlify.app/api/strava-oauth

# For development
NEXT_PUBLIC_STRAVA_CLIENT_ID=your_client_id_here
```

### For Local Development

1. Create or update `.env.local`:
   ```bash
   echo "STRAVA_CLIENT_ID=your_client_id" >> .env.local
   echo "STRAVA_CLIENT_SECRET=your_client_secret" >> .env.local
   echo "STRAVA_REDIRECT_URI=http://localhost:8888/api/strava-oauth" >> .env.local
   echo "NEXT_PUBLIC_STRAVA_CLIENT_ID=your_client_id" >> .env.local
   ```

2. Restart your development server:
   ```bash
   netlify dev
   ```

### For Production (Netlify)

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add the following variables:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI` (e.g., `https://yourapp.netlify.app/api/strava-oauth`)
   - `NEXT_PUBLIC_STRAVA_CLIENT_ID`
4. Trigger a new deployment to apply changes

## Step 3: Connect Your Strava Account

1. **Navigate to Workouts Page**
   - Log in to your Health Dashboard
   - Go to **Dashboard** → **Workouts**

2. **Authorize Strava**
   - Click the **"Connect Strava"** button
   - You'll be redirected to Strava's authorization page
   - Review the permissions:
     - Read all of your activities
     - View data about your activities
   - Click **"Authorize"**

3. **Complete Authorization**
   - You'll be redirected back to your app
   - If successful, you'll see a success message
   - Your Strava tokens are now stored securely in MongoDB

## Step 4: Sync Your Workouts

1. **Manual Sync**
   - On the Workouts page, click **"Sync Activities"**
   - This will fetch your recent activities from Strava
   - Default: Fetches last 50 activities
   - Activities are cached in MongoDB for fast access

2. **Verify Sync**
   - You should see your activities listed
   - Each activity shows:
     - Activity name and type
     - Distance, duration, and pace
     - Elevation gain
     - Heart rate (if available)

## Step 5: Set Fitness Goals (Optional)

1. **Create a Goal**
   - Navigate to **Workouts** → **Goals**
   - Click **"New Goal"**
   - Select goal type:
     - **Distance**: Total miles/km to cover
     - **Duration**: Total hours/minutes of activity
     - **Elevation**: Total elevation gain
     - **Frequency**: Number of activities
   - Choose time period (week/month/year)
   - Optionally filter by activity type (Run, Ride, etc.)

2. **Track Progress**
   - Goals automatically calculate progress from synced workouts
   - View progress bars and completion percentages
   - Mark goals as complete or delete them

## OAuth Flow Architecture

```
User clicks "Connect Strava"
       ↓
Redirect to Strava OAuth
       ↓
User authorizes app
       ↓
Strava redirects to /api/strava-oauth with code
       ↓
Exchange code for access/refresh tokens
       ↓
Store tokens in MongoDB (strava-tokens collection)
       ↓
Redirect to /workouts with success message
```

## API Endpoints

### POST /api/strava-sync
Syncs activities from Strava to MongoDB.

**Request:**
```json
{
  "page": 1,
  "perPage": 30,
  "after": 1609459200,  // Unix timestamp (optional)
  "before": 1640995200  // Unix timestamp (optional)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Strava activities synced successfully",
  "data": {
    "fetched": 50,
    "new": 45,
    "updated": 5,
    "page": 1,
    "perPage": 50
  }
}
```

### GET /api/strava-workouts
Queries cached workouts from MongoDB.

**Query Parameters:**
- `type`: Activity type filter (e.g., "Run", "Ride")
- `sport_type`: Specific sport type
- `start_date`: ISO date string
- `end_date`: ISO date string
- `limit`: Number of results (default: 20)
- `skip`: Pagination offset
- `sort_by`: Field to sort by (default: "start_date")
- `sort_order`: "asc" or "desc" (default: "desc")

### Fitness Goals Endpoints

**GET /api/fitness-goals** - Query goals
**POST /api/fitness-goals** - Create goal
**PATCH /api/fitness-goals** - Update goal
**DELETE /api/fitness-goals?id={goalId}** - Delete goal

## MongoDB Collections

### strava-tokens
Stores OAuth tokens for the authenticated user.

```javascript
{
  athlete_id: 12345678,
  access_token: "...",
  refresh_token: "...",
  expires_at: 1640995200,
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-01T00:00:00Z")
}
```

### strava-workouts
Caches workout activities from Strava.

```javascript
{
  strava_id: 10234567890,
  athlete_id: 12345678,
  name: "Morning Run",
  type: "Run",
  sport_type: "TrailRun",
  start_date: ISODate("2024-01-15T08:30:00Z"),
  distance: 8046.72,  // meters
  moving_time: 2400,  // seconds
  total_elevation_gain: 100,  // meters
  average_heartrate: 145,
  sync_date: ISODate("2024-01-15T10:00:00Z"),
  created_at: ISODate("2024-01-15T10:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
}
```

### fitness-goals
Stores user-defined fitness goals.

```javascript
{
  goal_type: "distance",
  activity_type: "Run",
  target_value: 100,
  current_value: 45.2,  // Auto-calculated
  unit: "mi",
  time_period: "month",
  start_date: ISODate("2024-01-01T00:00:00Z"),
  status: "active",
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T10:00:00Z")
}
```

## Troubleshooting

### Issue: "Strava account not connected" error

**Solution:**
1. Check environment variables are set correctly
2. Verify redirect URI matches exactly in:
   - Strava API application settings
   - Environment variables
   - No trailing slashes
3. Clear browser cache and try authorization again

### Issue: Token expired errors

**Solution:**
Tokens are automatically refreshed when expired. If issues persist:
1. Disconnect and reconnect Strava account
2. Check MongoDB for strava-tokens collection
3. Verify refresh_token is present

### Issue: Activities not syncing

**Solution:**
1. Check Strava API rate limits (100 requests per 15 minutes, 1000 per day)
2. Verify authentication is valid
3. Check MongoDB connection
4. Review Netlify function logs for errors

### Issue: Local development OAuth redirect fails

**Solution:**
1. Ensure `netlify dev` is running (not `npm run dev`)
2. Update Strava API callback domain to include `localhost:8888`
3. Check `STRAVA_REDIRECT_URI` uses correct port

## Rate Limits

Strava API has the following rate limits:
- **15-minute limit**: 100 requests
- **Daily limit**: 1,000 requests

The app handles this by:
- Caching all activities in MongoDB
- Only syncing when user clicks "Sync" button
- Recommend syncing once per day or after new activities

## Security Best Practices

1. **Never commit credentials**: Use `.gitignore` for `.env` files
2. **Use environment variables**: Store all secrets in env vars
3. **Rotate secrets periodically**: Update tokens if compromised
4. **Monitor API usage**: Check Strava API dashboard for unusual activity
5. **Secure MongoDB**: Use strong passwords and IP whitelisting

## Additional Resources

- [Strava API Documentation](https://developers.strava.com/docs/reference/)
- [OAuth 2.0 Overview](https://developers.strava.com/docs/authentication/)
- [Strava Activity Types](https://developers.strava.com/docs/reference/#api-models-ActivityType)
- [Rate Limiting Details](https://developers.strava.com/docs/rate-limits/)
