/**
 * Migration script to backfill geo location data for existing Strava workout records
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Pages through all Strava activities via the API
 * 3. For each activity that has geo data (start_latlng, end_latlng, map.summary_polyline),
 *    updates the existing MongoDB record with only those fields
 * 4. Skips activities with no geo data — no records are created or deleted
 *
 * Run with: npx ts-node scripts/backfill-strava-geo.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { getStravaActivities, refreshStravaToken, STRAVA_MAX_PER_PAGE } from '../lib/strava';
import { StravaOAuthTokens, StravaWorkout } from '../types/strava';

dotenv.config({ path: '.env.local' });

const RATE_LIMIT_WAIT_MS = 15 * 60 * 1000; // 15 minutes
const PAGE_DELAY_MS = 1000; // 1 second between pages

// Optional --limit N argument to process only N activities (for testing)
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfillStravaGeo() {
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

    // Refresh token if expired
    const now = Math.floor(Date.now() / 1000);
    let accessToken = stravaTokens.access_token;

    if (stravaTokens.expires_at <= now) {
      console.log('⟳ Refreshing expired access token...');
      const refreshedTokens = await refreshStravaToken(stravaTokens.refresh_token);

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

    // Stats
    let totalFetched = 0;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalSkippedNoGeo = 0;
    let totalSkippedNotInDb = 0;
    let totalErrors = 0;
    let currentPage = 1;
    let hasMorePages = true;

    if (isFinite(LIMIT)) {
      console.log(`⚠️  Limit mode: processing first ${LIMIT} activity/activities only.\n`);
    }
    console.log('Starting geo backfill for all Strava activities...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    while (hasMorePages) {
      try {
        console.log(`📥 Fetching page ${currentPage} (${STRAVA_MAX_PER_PAGE} activities per page)...`);

        const activities = await getStravaActivities(accessToken, {
          page: currentPage,
          perPage: STRAVA_MAX_PER_PAGE,
        });

        if (activities.length === 0) {
          console.log(`\n✓ No more activities on page ${currentPage}. Backfill complete!\n`);
          hasMorePages = false;
          break;
        }

        console.log(`   Retrieved ${activities.length} activities`);
        totalFetched += activities.length;

        for (const activity of activities) {
          if (totalProcessed >= LIMIT) {
            console.log(`\n   Reached limit of ${LIMIT}. Stopping.\n`);
            hasMorePages = false;
            break;
          }
          totalProcessed++;
          try {
            const dateStr = new Date(activity.start_date_local).toISOString().split('T')[0];

            // Build the geo update — only include fields that have actual data
            const geoFields: Record<string, unknown> = {};

            if (activity.start_latlng?.length === 2) {
              geoFields.start_latlng = activity.start_latlng;
            }
            if (activity.end_latlng?.length === 2) {
              geoFields.end_latlng = activity.end_latlng;
            }
            if (activity.map?.summary_polyline) {
              geoFields.map = {
                id: activity.map.id,
                summary_polyline: activity.map.summary_polyline,
              };
            }

            // No geo data from Strava for this activity — skip it
            if (Object.keys(geoFields).length === 0) {
              totalSkippedNoGeo++;
              console.log(`   - SKP | ${dateStr} | ${activity.type.padEnd(12)} | ${activity.name} (no geo data)`);
              continue;
            }

            // Update only the geo fields on the existing record — do NOT upsert
            const result = await workoutsCollection.updateOne(
              { strava_id: activity.id },
              {
                $set: {
                  ...geoFields,
                  updated_at: new Date(),
                },
              },
              { upsert: false }
            );

            if (result.matchedCount === 0) {
              totalSkippedNotInDb++;
              console.log(`   ? MIS | ${dateStr} | ${activity.type.padEnd(12)} | ${activity.name} (not in DB)`);
            } else if (result.modifiedCount > 0) {
              totalUpdated++;
              const fields = Object.keys(geoFields).join(', ');
              console.log(`   ✓ GEO | ${dateStr} | ${activity.type.padEnd(12)} | ${activity.name} [${fields}]`);
            } else {
              // Matched but not modified — already had identical geo data
              console.log(`   = SKP | ${dateStr} | ${activity.type.padEnd(12)} | ${activity.name} (geo unchanged)`);
            }
          } catch (error) {
            totalErrors++;
            console.error(`   ✗ Error processing activity ${activity.id}:`, error);
          }
        }

        console.log(`\n   Page ${currentPage} done.\n`);
        currentPage++;

        if (hasMorePages) {
          console.log(`   ⏳ Waiting ${PAGE_DELAY_MS / 1000} second(s) before next page...\n`);
          await sleep(PAGE_DELAY_MS);
        }
      } catch (error) {
        console.error(`\n✗ Error fetching page ${currentPage}:`, error);

        if (error instanceof Error && (error.message.includes('429') || error.message.includes('Rate limit'))) {
          console.log(`\n⚠️  Rate limit reached. Waiting ${RATE_LIMIT_WAIT_MS / 1000 / 60} minutes before retrying...\n`);
          await sleep(RATE_LIMIT_WAIT_MS);
          continue;
        }

        console.error('   Stopping backfill due to error.\n');
        hasMorePages = false;
        break;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('=== Backfill Summary ===');
    console.log(`Total activities fetched from Strava: ${totalFetched}`);
    console.log(`Records updated with geo data:        ${totalUpdated}`);
    console.log(`Skipped (no geo data in Strava):      ${totalSkippedNoGeo}`);
    console.log(`Skipped (not found in DB):            ${totalSkippedNotInDb}`);
    console.log(`Errors:                               ${totalErrors}`);

    const withGeo = await workoutsCollection.countDocuments({ 'map.summary_polyline': { $exists: true } });
    const total = await workoutsCollection.countDocuments();
    console.log(`\nDatabase: ${withGeo} of ${total} records now have geo data`);

  } catch (error) {
    console.error('\n✗ Backfill failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

backfillStravaGeo()
  .then(() => {
    console.log('\n🎉 Geo backfill completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Backfill failed:', error);
    process.exit(1);
  });
