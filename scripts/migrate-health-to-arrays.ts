import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";

config();

interface MigrationOptions {
  dryRun?: boolean;
  checkOnly?: boolean;
}

// Old schema with boolean-based fields
interface OldHealthIncident {
  _id?: ObjectId;
  painLocations: string[];
  painIntensity: number | null;
  dateStarted: Date;
  endDate?: Date | null;
  injurySource: string;
  description: string;
  symptoms: {
    painQuality: {
      sharp: boolean;
      dull: boolean;
      throbbing: boolean;
      stabbing: boolean;
      aching: boolean;
      heavy: boolean;
      burning: boolean;
      other: string;
    };
    otherSymptoms: {
      stiffness: boolean;
      instability: boolean;
      catching: boolean;
      popping: boolean;
      locking: boolean;
      other: string;
    };
    sensations: {
      bruising: boolean;
      swelling: boolean;
      numbness: boolean;
      tingling: boolean;
      weakness: boolean;
    };
    timing: {
      whenMostSevere: {
        morning: boolean;
        afternoon: boolean;
        evening: boolean;
        consistentAllDay: boolean;
        interruptsSleep: boolean;
        other: string;
      };
      whatMakesWorse: {
        rest: boolean;
        activity: boolean;
        sleeping: boolean;
        kneeling: boolean;
        other: string;
      };
      whatMakesBetter: {
        rest: boolean;
        activity: boolean;
        ice: boolean;
        medication: boolean;
        brace: boolean;
        other: string;
      };
    };
  };
  treatments: {
    priorPhysician: {
      seen: boolean | null;
      provider: string;
      when: string;
    };
    priorSurgery: {
      had: boolean | null;
      surgery: string;
      when: string;
    };
    treatmentsTried: {
      massageTherapy: { tried: boolean; helpful: boolean | null };
      physicalTherapy: { tried: boolean; helpful: boolean | null };
      chiropracticTherapy: { tried: boolean; helpful: boolean | null };
      acupuncture: { tried: boolean; helpful: boolean | null };
      bracing: { tried: boolean; helpful: boolean | null };
      injections: { tried: boolean; helpful: boolean | null };
      medication: { tried: boolean; helpful: boolean | null };
      other: { tried: boolean; helpful: boolean | null; description: string };
    };
    studiesCompleted: {
      xRays: boolean;
      mri: boolean;
      ctScan: boolean;
      emgNerveStudy: boolean;
      boneScan: boolean;
      ultrasound: boolean;
      other: string;
    };
  };
  status: {
    worsening: boolean;
    resolved: boolean;
    improving: boolean;
    constant: boolean;
    occasional: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

// New schema with array-based fields
interface NewHealthIncident {
  _id?: ObjectId;
  painLocations: string[];
  painIntensity: number | null;
  dateStarted: Date;
  endDate?: Date | null;
  injurySource: string;
  description: string;
  symptoms: {
    painQuality: string[];
    otherSymptoms: string[];
    sensations: string[];
    timing: {
      whenMostSevere: string[];
      whatMakesWorse: string[];
      whatMakesBetter: string[];
    };
  };
  treatments: {
    priorPhysician: string[];
    priorSurgery: string[];
    treatmentsTried: string[];
    studiesCompleted: string[];
  };
  status: string[];
  created_at: Date;
  updated_at: Date;
}

// Helper functions to convert boolean objects to string arrays
function booleanObjToArray(obj: Record<string, boolean | string>, otherKey: string = 'other'): string[] {
  const result: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (key === otherKey) {
      // Handle the "other" field - add its value if it's a non-empty string
      if (typeof value === 'string' && value.trim()) {
        result.push(value.trim());
      }
    } else if (value === true) {
      // Add the key if the boolean value is true
      result.push(key);
    }
  }

  return result;
}

function convertPriorPhysician(data: OldHealthIncident['treatments']['priorPhysician']): string[] {
  const result: string[] = [];

  if (data.seen === true) {
    result.push('seen');
    if (data.provider && data.provider.trim()) {
      result.push(`provider: ${data.provider.trim()}`);
    }
    if (data.when && data.when.trim()) {
      result.push(`when: ${data.when.trim()}`);
    }
  } else if (data.seen === false) {
    result.push('not_seen');
  }

  return result;
}

function convertPriorSurgery(data: OldHealthIncident['treatments']['priorSurgery']): string[] {
  const result: string[] = [];

  if (data.had === true) {
    result.push('had');
    if (data.surgery && data.surgery.trim()) {
      result.push(`surgery: ${data.surgery.trim()}`);
    }
    if (data.when && data.when.trim()) {
      result.push(`when: ${data.when.trim()}`);
    }
  } else if (data.had === false) {
    result.push('not_had');
  }

  return result;
}

function convertTreatmentsTried(data: OldHealthIncident['treatments']['treatmentsTried']): string[] {
  const result: string[] = [];

  for (const [treatment, info] of Object.entries(data)) {
    if (info.tried) {
      result.push(treatment);

      if (info.helpful === true) {
        result.push(`${treatment}_helpful`);
      } else if (info.helpful === false) {
        result.push(`${treatment}_not_helpful`);
      }

      if (treatment === 'other' && 'description' in info && info.description && info.description.trim()) {
        result.push(`other: ${info.description.trim()}`);
      }
    }
  }

  return result;
}

async function checkMigration() {
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);

  try {
    console.log("=== Migration Pre-Check: Convert to Array-Based Schema ===\n");

    console.log("1. Testing database connection...");
    await client.connect();
    const db = client.db("health-fitness");
    console.log("   ✓ Connected to database\n");

    console.log("2. Checking collections...");
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const incidentsExists = collectionNames.includes("health-incidents");
    console.log(
      `   ${incidentsExists ? "✓" : "✗"} health-incidents collection ${
        incidentsExists ? "exists" : "not found"
      }`
    );

    if (!incidentsExists) {
      console.log("   ⚠ No health-incidents collection found. Nothing to migrate.\n");
      return;
    }

    const backupExists = collectionNames.includes("health-incidents-backup-arrays");
    if (backupExists) {
      const backupCount = await db.collection("health-incidents-backup-arrays").countDocuments();
      console.log(
        `   ⚠ health-incidents-backup-arrays collection already exists with ${backupCount} documents`
      );
      console.log("   This migration may have already been run.\n");
    } else {
      console.log("   ✓ health-incidents-backup-arrays collection does not exist (will be created)");
    }
    console.log();

    console.log("3. Analyzing existing health incidents...");
    const incidents = await db
      .collection<OldHealthIncident>("health-incidents")
      .find({})
      .toArray();
    console.log(`   ✓ Found ${incidents.length} health incidents\n`);

    if (incidents.length === 0) {
      console.log("   ⚠ No health incidents to migrate.\n");
      return;
    }

    console.log("4. Analyzing data structure...");
    let hasOldStructure = 0;
    let hasNewStructure = 0;

    incidents.forEach((incident) => {
      // Check if it has the old boolean-based structure
      if (
        incident.symptoms &&
        typeof incident.symptoms.painQuality === 'object' &&
        !Array.isArray(incident.symptoms.painQuality) &&
        'sharp' in incident.symptoms.painQuality
      ) {
        hasOldStructure++;
      } else if (
        incident.symptoms &&
        Array.isArray(incident.symptoms.painQuality)
      ) {
        hasNewStructure++;
      }
    });

    console.log(`   • ${hasOldStructure} incidents with old boolean-based structure`);
    console.log(`   • ${hasNewStructure} incidents with new array-based structure`);
    console.log();

    if (hasOldStructure === 0) {
      console.log("✅ No incidents need migration. All incidents already use array-based structure.\n");
      return;
    }

    console.log("5. Migration summary:");
    console.log(`   • ${hasOldStructure} incidents will be converted to array-based structure`);
    console.log(`   • ${incidents.length} total incidents will be backed up\n`);

    console.log("✅ Pre-check PASSED. Ready to migrate!\n");
    console.log("To run the migration:");
    console.log("  • Dry run: npm run migrate:arrays -- --dry-run");
    console.log("  • Actual migration: npm run migrate:arrays\n");
  } catch (error) {
    console.error("❌ Pre-check failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

async function migrateToArrays(options: MigrationOptions = {}) {
  const { dryRun = false, checkOnly = false } = options;
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);

  try {
    await client.connect();
    const db = client.db("health-fitness");

    if (checkOnly) {
      await client.close();
      return checkMigration();
    }

    if (dryRun) {
      console.log("=== DRY RUN MODE - No changes will be made ===\n");
    } else {
      console.log("=== MIGRATION MODE - Changes will be made ===\n");
    }

    console.log("1. Fetching existing health incidents...");
    const oldIncidents = await db
      .collection<OldHealthIncident>("health-incidents")
      .find({})
      .toArray();
    console.log(`   ✓ Found ${oldIncidents.length} existing health incidents\n`);

    if (oldIncidents.length === 0) {
      console.log("   ⚠ No health incidents to migrate.\n");
      return;
    }

    console.log("2. Converting incidents to array-based structure...");
    const newIncidents: NewHealthIncident[] = [];
    let convertedCount = 0;
    let skippedCount = 0;

    for (const incident of oldIncidents) {
      // Check if already migrated
      if (Array.isArray(incident.symptoms?.painQuality)) {
        skippedCount++;
        continue;
      }

      const newIncident: NewHealthIncident = {
        _id: incident._id,
        painLocations: incident.painLocations,
        painIntensity: incident.painIntensity,
        dateStarted: incident.dateStarted,
        endDate: incident.endDate,
        injurySource: incident.injurySource,
        description: incident.description,
        symptoms: {
          painQuality: booleanObjToArray(incident.symptoms.painQuality),
          otherSymptoms: booleanObjToArray(incident.symptoms.otherSymptoms),
          sensations: booleanObjToArray(incident.symptoms.sensations),
          timing: {
            whenMostSevere: booleanObjToArray(incident.symptoms.timing.whenMostSevere),
            whatMakesWorse: booleanObjToArray(incident.symptoms.timing.whatMakesWorse),
            whatMakesBetter: booleanObjToArray(incident.symptoms.timing.whatMakesBetter),
          },
        },
        treatments: {
          priorPhysician: convertPriorPhysician(incident.treatments.priorPhysician),
          priorSurgery: convertPriorSurgery(incident.treatments.priorSurgery),
          treatmentsTried: convertTreatmentsTried(incident.treatments.treatmentsTried),
          studiesCompleted: booleanObjToArray(incident.treatments.studiesCompleted),
        },
        status: booleanObjToArray(incident.status, ''),
        created_at: incident.created_at,
        updated_at: incident.updated_at,
      };

      newIncidents.push(newIncident);
      convertedCount++;
    }

    console.log(`   ✓ Converted ${convertedCount} incidents`);
    if (skippedCount > 0) {
      console.log(`   ⓘ Skipped ${skippedCount} incidents (already migrated)`);
    }
    console.log();

    if (dryRun) {
      console.log("3. [DRY RUN] Skipping backup...");
      console.log(`   Would backup ${oldIncidents.length} records to health-incidents-backup-arrays\n`);

      console.log("4. [DRY RUN] Skipping incident updates...");
      console.log(`   Would update ${convertedCount} incidents with array-based structure\n`);

      console.log("✅ DRY RUN COMPLETE\n");
      console.log("Summary of changes that would be made:");
      console.log(`  • ${oldIncidents.length} records backed up to health-incidents-backup-arrays`);
      console.log(`  • ${convertedCount} incidents converted to array-based structure`);
      if (skippedCount > 0) {
        console.log(`  • ${skippedCount} incidents skipped (already migrated)`);
      }
      console.log("\nTo perform the actual migration, run without --dry-run flag\n");

      // Show sample conversion
      if (newIncidents.length > 0) {
        console.log("Sample conversion (first incident):");
        console.log("Old structure (symptoms.painQuality):", JSON.stringify(oldIncidents[0].symptoms.painQuality, null, 2));
        console.log("New structure (symptoms.painQuality):", JSON.stringify(newIncidents[0].symptoms.painQuality, null, 2));
        console.log();
        console.log("Old structure (status):", JSON.stringify(oldIncidents[0].status, null, 2));
        console.log("New structure (status):", JSON.stringify(newIncidents[0].status, null, 2));
        console.log();
      }
    } else {
      console.log("3. Creating backup...");
      await db.collection("health-incidents-backup-arrays").insertMany(oldIncidents);
      console.log(`   ✓ Backed up ${oldIncidents.length} records\n`);

      console.log("4. Updating incidents...");
      for (const newIncident of newIncidents) {
        await db.collection("health-incidents").replaceOne(
          { _id: newIncident._id },
          newIncident
        );
      }
      console.log(`   ✓ Updated ${convertedCount} incidents\n`);

      console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!\n");
      console.log("Summary:");
      console.log(`  • Backed up ${oldIncidents.length} records to health-incidents-backup-arrays`);
      console.log(`  • Converted ${convertedCount} incidents to array-based structure`);
      if (skippedCount > 0) {
        console.log(`  • Skipped ${skippedCount} incidents (already migrated)`);
      }
      console.log();
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const checkOnly = args.includes("--check");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Health Data Array Migration Script

This script converts the health incidents schema from boolean-based fields
to array-based fields for more flexible data storage.

Usage:
  npm run migrate:arrays [options]

Options:
  --check     Run pre-migration checks without migrating
  --dry-run   Simulate the migration without making changes
  --help, -h  Show this help message

Examples:
  npm run migrate:arrays -- --check     # Check if ready to migrate
  npm run migrate:arrays -- --dry-run   # Preview migration changes
  npm run migrate:arrays                # Perform actual migration
`);
    process.exit(0);
  }

  if (checkOnly) {
    checkMigration().catch(console.error);
  } else {
    migrateToArrays({ dryRun, checkOnly }).catch(console.error);
  }
}

export { migrateToArrays, checkMigration };
