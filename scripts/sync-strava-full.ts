/**
 * One-time script to sync ALL Strava activities to MongoDB with full pagination
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Retrieves Strava OAuth tokens from database
 * 3. Refreshes token if needed
 * 4. Fetches all activities from Strava API with pagination
 * 5. Updates or inserts activities in MongoDB (idempotent)
 * 6. Displays real-time progress as activities sync
 * 7. Handles API errors and rate limits
 *
 * Run with: npx ts-node scripts/sync-strava-full.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { getStravaActivities, refreshStravaToken } from '../lib/strava';
import { StravaOAuthTokens, StravaWorkout, StravaActivity } from '../types/strava';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Convert Strava API activity to our MongoDB workout format
 */
function convertActivityToWorkout(activity: StravaActivity): Omit<StravaWorkout, '_id'> {
  return {
    strava_id: activity.id,
    athlete_id: activity.athlete.id,
    name: activity.name,
    type: activity.type,
    sport_type: activity.sport_type,
    start_date: new Date(activity.start_date),
    start_date_local: new Date(activity.start_date_local),
    distance: activity.distance,
    moving_time: activity.moving_time,
    elapsed_time: activity.elapsed_time,
    total_elevation_gain: activity.total_elevation_gain,
    average_speed: activity.average_speed,
    max_speed: activity.max_speed,
    average_heartrate: activity.average_heartrate,
    max_heartrate: activity.max_heartrate,
    calories: activity.calories,
    device_name: activity.device_name,
    description: activity.description,
    trainer: activity.trainer,
    commute: activity.commute,
    sync_date: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Sleep for specified milliseconds (for rate limiting)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sync all Strava activities with full pagination
 */
async function syncAllStravaActivities() {
  const connectionString = process.env.MONGODB_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('MONGODB_CONNECTION_STRING environment variable is not set');
  }

  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db('health-fitness');
    const tokensCollection = db.collection<StravaOAuthTokens>('strava-tokens');
    const workoutsCollection = db.collection<StravaWorkout>('strava-workouts');

    // Get Strava tokens from database
    const stravaTokens = await tokensCollection.findOne({});

    if (!stravaTokens) {
      throw new Error('Strava tokens not found in database. Please connect your Strava account first.');
    }

    console.log(`✓ Found Strava tokens for athlete ${stravaTokens.athlete_id}`);

    // Check if token needs refresh
    const now = Math.floor(Date.now() / 1000);
    let accessToken = stravaTokens.access_token;

    if (stravaTokens.expires_at <= now) {
      console.log('⟳ Refreshing expired access token...');
      const refreshedTokens = await refreshStravaToken(stravaTokens.refresh_token);

      // Update tokens in database
      await tokensCollection.updateOne(
        { athlete_id: stravaTokens.athlete_id },
        {
          $set: {
            access_token: refreshedTokens.access_token,
            refresh_token: refreshedTokens.refresh_token,
            expires_at: refreshedTokens.expires_at,
            updated_at: new Date(),
          },
        }
      );

      accessToken = refreshedTokens.access_token;
      console.log('✓ Access token refreshed\n');
    }

    // Pagination settings
    const perPage = 200; // Max allowed by Strava API
    let currentPage = 1;
    let hasMorePages = true;
    let totalFetched = 0;
    let totalNew = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;
    let totalErrors = 0;

    console.log('Starting full sync of Strava activities...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    while (hasMorePages) {
      try {
        console.log(`📥 Fetching page ${currentPage} (${perPage} activities per page)...`);

        // Fetch activities from Strava API
        const activities = await getStravaActivities(accessToken, {
          page: currentPage,
          perPage: perPage,
        });

        // If no activities returned, we've reached the end
        if (activities.length === 0) {
          console.log(`\n✓ No more activities on page ${currentPage}. Sync complete!\n`);
          hasMorePages = false;
          break;
        }

        console.log(`   Retrieved ${activities.length} activities`);
        totalFetched += activities.length;

        // Store activities in database
        let pageNewCount = 0;
        let pageUpdatedCount = 0;
        let pageUnchangedCount = 0;

        for (const activity of activities) {
          try {
            const workout = convertActivityToWorkout(activity);

            const result = await workoutsCollection.updateOne(
              { strava_id: activity.id },
              {
                $set: {
                  ...workout,
                  updated_at: new Date(),
                },
                $setOnInsert: {
                  created_at: new Date(),
                },
              },
              { upsert: true }
            );

            if (result.upsertedCount > 0) {
              pageNewCount++;
              totalNew++;
            } else if (result.modifiedCount > 0) {
              pageUpdatedCount++;
              totalUpdated++;
            } else {
              pageUnchangedCount++;
              totalUnchanged++;
            }

            // Display progress for each activity
            const status = result.upsertedCount > 0 ? '✓ NEW' : 
                          result.modifiedCount > 0 ? '↻ UPD' : '= SKP';
            const dateStr = new Date(activity.start_date_local).toISOString().split('T')[0];
            console.log(`   ${status} | ${dateStr} | ${activity.type.padEnd(12)} | ${activity.name}`);

          } catch (error) {
            totalErrors++;
            console.error(`   ✗ Error syncing activity ${activity.id}:`, error);
          }
        }

        console.log(`\n   Page ${currentPage} summary: ${pageNewCount} new, ${pageUpdatedCount} updated, ${pageUnchangedCount} unchanged\n`);

        // Move to next page
        currentPage++;

        // Rate limiting: Strava has limits of 100 requests per 15 minutes, 1000 per day
        // Add a small delay between pages to be respectful
        if (hasMorePages && activities.length === perPage) {
          console.log('   ⏳ Waiting 1 second before next page...\n');
          await sleep(1000);
        }

      } catch (error) {
        console.error(`\n✗ Error fetching page ${currentPage}:`, error);
        
        // Check if it's a rate limit error
        if (error instanceof Error && error.message.includes('429')) {
          console.log('\n⚠️  Rate limit reached. Waiting 15 minutes before retrying...\n');
          await sleep(15 * 60 * 1000); // Wait 15 minutes
          continue; // Retry same page
        }
        
        // For other errors, break the loop
        console.error('   Stopping sync due to error.\n');
        hasMorePages = false;
        break;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('=== Sync Summary ===');
    console.log(`Total activities fetched: ${totalFetched}`);
    console.log(`New activities: ${totalNew}`);
    console.log(`Updated activities: ${totalUpdated}`);
    console.log(`Unchanged activities: ${totalUnchanged}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`Total pages processed: ${currentPage - 1}`);

    // Display current database stats
    const totalInDb = await workoutsCollection.countDocuments();
    console.log(`\nTotal activities now in database: ${totalInDb}`);

  } catch (error) {
    console.error('\n✗ Sync failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run the sync
syncAllStravaActivities()
  .then(() => {
    console.log('\n🎉 Sync completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  });
