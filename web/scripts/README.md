# Scripts

Collection of utility scripts for the Health Dashboard project.

## Strava Full Sync

### `sync-strava-full.ts`

One-time script to sync **all** Strava activities to MongoDB with full pagination support.

**Features:**
- ✅ Fetches all activities across all pages from Strava API
- ✅ Real-time progress display showing each activity as it syncs
- ✅ Idempotent operations (no duplicate entries created)
- ✅ Error handling for API failures and rate limits
- ✅ Automatic token refresh if expired
- ✅ Respects Strava API rate limits (100 requests/15 min, 1000/day)

**Prerequisites:**
1. Strava account must be connected (OAuth tokens in database)
2. MongoDB connection string configured in `.env.local`
3. Strava API credentials configured

**Usage:**
```bash
npm run sync-strava-full
```

Or directly:
```bash
npx ts-node scripts/sync-strava-full.ts
```

**Output Example:**
```
✓ Connected to MongoDB

✓ Found Strava tokens for athlete 12345678
⟳ Refreshing expired access token...
✓ Access token refreshed

Starting full sync of Strava activities...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Fetching page 1 (200 activities per page)...
   Retrieved 200 activities
   ✓ NEW | 2024-01-15 | Run         | Morning Run
   = SKP | 2024-01-14 | Ride        | Evening Ride
   ↻ UPD | 2024-01-13 | Swim        | Pool Workout
   ...

   Page 1 summary: 150 new, 25 updated, 25 unchanged

📥 Fetching page 2 (200 activities per page)...
   ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

=== Sync Summary ===
Total activities fetched: 847
New activities: 820
Updated activities: 27
Unchanged activities: 0
Errors: 0
Total pages processed: 5

Total activities now in database: 847

✓ Disconnected from MongoDB

🎉 Sync completed successfully!
```

**Status Indicators:**
- `✓ NEW` - New activity added to database
- `↻ UPD` - Existing activity updated
- `= SKP` - Activity unchanged (already in sync)
- `✗` - Error syncing activity

**Rate Limiting:**
The script automatically:
- Waits 1 second between pages
- If rate limit (429) is hit, waits 15 minutes before retrying
- Uses maximum page size (200) to minimize API calls

**Notes:**
- This is intended as a **one-time sync** for historical data
- Once run, the normal `strava-sync` API endpoint can be used for incremental syncs
- The script is idempotent - safe to run multiple times
- All activities are stored/updated using upsert operations based on `strava_id`
- Activities are processed page-by-page to manage memory usage
- For users with thousands of activities, the sync may take several minutes

## Other Migration Scripts

### `migrate-add-incident-ids.ts`
Adds `incidentId` field to existing health incidents.

### `migrate-health-data.ts`
Migrates health data structure (if needed).

### `migrate-health-to-arrays.ts`
Converts health data to array format (if needed).
