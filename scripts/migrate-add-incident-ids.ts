/**
 * Migration script to add incidentId field to existing health incidents
 *
 * This script:
 * 1. Connects to MongoDB
 * 2. Finds all incidents without an incidentId
 * 3. Generates an incidentId for each based on dateStarted and painLocations
 * 4. Updates each incident with the generated incidentId
 *
 * Run with: npx ts-node scripts/migrate-add-incident-ids.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface HealthIncident {
  _id: any;
  incidentId?: string;
  painLocations: string[];
  dateStarted: Date;
  created_at?: Date;
}

/**
 * Generates a human-readable incident ID from date and pain locations
 * Format: YYYY-MM-DD_painLocation1-painLocation2
 */
function generateIncidentId(date: Date, painLocations: string[]): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const locationsStr = painLocations
    .map(location => location.toLowerCase().trim().replace(/\s+/g, '-'))
    .join('-');

  return `${dateStr}_${locationsStr}`;
}

async function migrateIncidentIds() {
  const connectionString = process.env.MONGODB_CONNECTION_STRING;

  if (!connectionString) {
    throw new Error('MONGODB_CONNECTION_STRING environment variable is not set');
  }

  const client = new MongoClient(connectionString);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('health-fitness');
    const collection = db.collection<HealthIncident>('health-incidents');

    // Find all incidents without an incidentId
    const incidentsWithoutId = await collection.find({
      $or: [
        { incidentId: { $exists: false } },
        { incidentId: null },
        { incidentId: '' }
      ]
    }).toArray();

    console.log(`Found ${incidentsWithoutId.length} incidents without incidentId`);

    if (incidentsWithoutId.length === 0) {
      console.log('No incidents to migrate');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: { id: string; error: string }[] = [];

    for (const incident of incidentsWithoutId) {
      try {
        // Use dateStarted, fall back to created_at if dateStarted is not available
        const date = incident.dateStarted ? new Date(incident.dateStarted) :
                     incident.created_at ? new Date(incident.created_at) :
                     new Date();

        // Generate incident ID
        const incidentId = generateIncidentId(date, incident.painLocations || []);

        // Check if this incidentId already exists
        const existingIncident = await collection.findOne({
          incidentId: incidentId,
          _id: { $ne: incident._id }
        });

        let finalIncidentId = incidentId;

        // If duplicate, append a counter
        if (existingIncident) {
          let counter = 1;
          let uniqueId = `${incidentId}-${counter}`;

          while (await collection.findOne({ incidentId: uniqueId })) {
            counter++;
            uniqueId = `${incidentId}-${counter}`;
          }

          finalIncidentId = uniqueId;
          console.log(`  Duplicate found, using: ${finalIncidentId}`);
        }

        // Update the incident
        await collection.updateOne(
          { _id: incident._id },
          { $set: { incidentId: finalIncidentId, updated_at: new Date() } }
        );

        console.log(`✓ Updated incident ${incident._id} with incidentId: ${finalIncidentId}`);
        successCount++;

      } catch (error) {
        console.error(`✗ Error updating incident ${incident._id}:`, error);
        errors.push({
          id: incident._id.toString(),
          error: error instanceof Error ? error.message : String(error)
        });
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total incidents processed: ${incidentsWithoutId.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach(({ id, error }) => {
        console.log(`Incident ${id}: ${error}`);
      });
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
migrateIncidentIds()
  .then(() => {
    console.log('\nMigration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
