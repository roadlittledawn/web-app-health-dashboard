import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";

config();

interface MigrationOptions {
  dryRun?: boolean;
  checkOnly?: boolean;
}

interface OldHealthLog {
  _id?: ObjectId;
  timestamp: Date;
  issue_type: string;
  pain_level: number;
  description: string;
  incident_id: string;
  activities: string[];
  triggers: string[];
  symptoms: string[];
  body_area: string;
  status: "active" | "improving" | "resolved";
  created_at: Date;
  updated_at: Date;
}

interface NewHealthIncident {
  _id?: ObjectId;
  painLocations: string;
  painIntensity: number;
  dateStarted: Date;
  injurySource: string;
  description: string;
  symptoms: any;
  treatments: any;
  status: "active" | "improving" | "resolved";
  created_at: Date;
  updated_at: Date;
}

interface NewHealthLog {
  _id?: ObjectId;
  timestamp: Date;
  incident_id: ObjectId;
  issue_type: "update" | "doctor_visit_notes";
  description: string;
  created_at: Date;
  updated_at: Date;
}

async function checkMigration() {
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);

  try {
    console.log("=== Migration Pre-Check ===\n");

    // Test connection
    console.log("1. Testing database connection...");
    await client.connect();
    const db = client.db("health-fitness");
    console.log("   ✓ Connected to database\n");

    // Check collections
    console.log("2. Checking collections...");
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    const healthLogsExists = collectionNames.includes("health-logs");
    console.log(
      `   ${healthLogsExists ? "✓" : "✗"} health-logs collection ${
        healthLogsExists ? "exists" : "not found"
      }`
    );

    if (!healthLogsExists) {
      console.log("   ⚠ No health-logs collection found. Nothing to migrate.\n");
      return;
    }

    const incidentsExists = collectionNames.includes("health-incidents");
    const backupExists = collectionNames.includes("health-logs-backup");

    if (incidentsExists) {
      const incidentCount = await db.collection("health-incidents").countDocuments();
      console.log(
        `   ⚠ health-incidents collection already exists with ${incidentCount} documents`
      );
    } else {
      console.log("   ✓ health-incidents collection does not exist (will be created)");
    }

    if (backupExists) {
      const backupCount = await db.collection("health-logs-backup").countDocuments();
      console.log(
        `   ⚠ health-logs-backup collection already exists with ${backupCount} documents`
      );
    } else {
      console.log("   ✓ health-logs-backup collection does not exist (will be created)");
    }
    console.log();

    // Analyze existing data
    console.log("3. Analyzing existing health logs...");
    const oldLogs = await db
      .collection<OldHealthLog>("health-logs")
      .find({})
      .toArray();
    console.log(`   ✓ Found ${oldLogs.length} health logs\n`);

    if (oldLogs.length === 0) {
      console.log("   ⚠ No health logs to migrate.\n");
      return;
    }

    // Group by incident
    const incidentGroups = new Map<string, OldHealthLog[]>();
    oldLogs.forEach((log) => {
      if (!incidentGroups.has(log.incident_id)) {
        incidentGroups.set(log.incident_id, []);
      }
      incidentGroups.get(log.incident_id)!.push(log);
    });

    console.log("4. Migration summary:");
    console.log(`   • ${incidentGroups.size} unique incidents will be created`);
    console.log(`   • ${oldLogs.length} health logs will be transformed`);
    console.log(`   • ${oldLogs.length} records will be backed up\n`);

    // Show incident details
    console.log("5. Incident breakdown:");
    const incidentDetails: Array<{
      id: string;
      count: number;
      firstDate: Date;
      lastDate: Date;
      bodyArea: string;
    }> = [];

    for (const [incidentId, logs] of incidentGroups) {
      logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      incidentDetails.push({
        id: incidentId,
        count: logs.length,
        firstDate: logs[0].timestamp,
        lastDate: logs[logs.length - 1].timestamp,
        bodyArea: logs[0].body_area || "unknown",
      });
    }

    incidentDetails.forEach((detail) => {
      console.log(`   • ${detail.id}:`);
      console.log(`     - ${detail.count} log(s)`);
      console.log(`     - Body area: ${detail.bodyArea}`);
      console.log(
        `     - Date range: ${detail.firstDate.toISOString().split("T")[0]} to ${
          detail.lastDate.toISOString().split("T")[0]
        }`
      );
    });
    console.log();

    // Validation checks
    console.log("6. Data validation:");
    const logsWithoutIncidentId = oldLogs.filter((log) => !log.incident_id);
    const logsWithoutTimestamp = oldLogs.filter((log) => !log.timestamp);

    if (logsWithoutIncidentId.length > 0) {
      console.log(
        `   ✗ ${logsWithoutIncidentId.length} logs missing incident_id (migration will fail)`
      );
    } else {
      console.log("   ✓ All logs have incident_id");
    }

    if (logsWithoutTimestamp.length > 0) {
      console.log(
        `   ✗ ${logsWithoutTimestamp.length} logs missing timestamp (migration will fail)`
      );
    } else {
      console.log("   ✓ All logs have timestamp");
    }
    console.log();

    const hasErrors =
      logsWithoutIncidentId.length > 0 || logsWithoutTimestamp.length > 0;

    if (hasErrors) {
      console.log("❌ Pre-check FAILED. Please fix the issues above before migrating.\n");
    } else {
      console.log("✅ Pre-check PASSED. Ready to migrate!\n");
      console.log("To run the migration:");
      console.log("  • Dry run: npm run migrate -- --dry-run");
      console.log("  • Actual migration: npm run migrate\n");
    }
  } catch (error) {
    console.error("❌ Pre-check failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

async function migrateHealthData(options: MigrationOptions = {}) {
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

    // Get existing health logs
    console.log("1. Fetching existing health logs...");
    const oldLogs = await db
      .collection<OldHealthLog>("health-logs")
      .find({})
      .toArray();
    console.log(`   ✓ Found ${oldLogs.length} existing health logs\n`);

    // Group logs by incident_id
    console.log("2. Grouping logs by incident...");
    const incidentGroups = new Map<string, OldHealthLog[]>();
    oldLogs.forEach((log) => {
      if (!incidentGroups.has(log.incident_id)) {
        incidentGroups.set(log.incident_id, []);
      }
      incidentGroups.get(log.incident_id)!.push(log);
    });

    console.log(`   ✓ Found ${incidentGroups.size} unique incidents\n`);

    // Create new incidents collection
    console.log("3. Transforming data...");
    const incidents: NewHealthIncident[] = [];
    const newLogs: NewHealthLog[] = [];

    for (const [incidentId, logs] of incidentGroups) {
      // Sort logs by timestamp to get first log
      logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const firstLog = logs[0];
      const lastLog = logs[logs.length - 1];

      // Create incident from first log data
      const incident: NewHealthIncident = {
        _id: new ObjectId(),
        painLocations: firstLog.body_area || "",
        painIntensity: firstLog.pain_level || 0,
        dateStarted: firstLog.timestamp,
        injurySource: "", // Will need manual input
        description: firstLog.description,
        symptoms: {
          painQuality: {
            sharp: false,
            dull: false,
            throbbing: false,
            stabbing: false,
            aching: false,
            heavy: false,
            burning: false,
            other: "",
          },
          otherSymptoms: {
            stiffness: false,
            instability: false,
            catching: false,
            popping: false,
            locking: false,
            other: "",
          },
          sensations: {
            bruising: false,
            swelling: false,
            numbness: false,
            tingling: false,
            weakness: false,
          },
          status: {
            worsening: false,
            resolved: firstLog.status === "resolved",
            improving: firstLog.status === "improving",
            constant: firstLog.status === "active",
            occasional: false,
          },
          timing: {
            whenMostSevere: {
              morning: false,
              afternoon: false,
              evening: false,
              consistentAllDay: false,
              interruptsSleep: false,
              other: "",
            },
            whatMakesWorse: {
              rest: false,
              activity: false,
              sleeping: false,
              kneeling: false,
              other: "",
            },
            whatMakesBetter: {
              rest: false,
              activity: false,
              ice: false,
              medication: false,
              brace: false,
              other: "",
            },
          },
        },
        treatments: {
          priorPhysician: { seen: null, provider: "", when: "" },
          priorSurgery: { had: null, surgery: "", when: "" },
          treatmentsTried: {
            massageTherapy: { tried: false, helpful: null },
            physicalTherapy: { tried: false, helpful: null },
            chiropracticTherapy: { tried: false, helpful: null },
            acupuncture: { tried: false, helpful: null },
            bracing: { tried: false, helpful: null },
            injections: { tried: false, helpful: null },
            medication: { tried: false, helpful: null },
            other: { tried: false, helpful: null, description: "" },
          },
          studiesCompleted: {
            xRays: false,
            mri: false,
            ctScan: false,
            emgNerveStudy: false,
            boneScan: false,
            ultrasound: false,
            other: "",
          },
        },
        status:
          lastLog.status === "active"
            ? {
                worsening: true,
                resolved: false,
                improving: false,
                constant: false,
                occasional: false,
              }
            : lastLog.status === "resolved"
            ? {
                worsening: false,
                resolved: true,
                improving: false,
                constant: false,
                occasional: false,
              }
            : {
                worsening: false,
                resolved: false,
                improving: true,
                constant: false,
                occasional: false,
              },
        created_at: firstLog.created_at,
        updated_at: lastLog.updated_at,
      };

      incidents.push(incident);

      // Create new logs for this incident
      logs.forEach((oldLog) => {
        const newLog: NewHealthLog = {
          _id: oldLog._id,
          timestamp: oldLog.timestamp,
          incident_id: incident._id!,
          issue_type: "update",
          description: oldLog.description,
          created_at: oldLog.created_at,
          updated_at: oldLog.updated_at,
        };
        newLogs.push(newLog);
      });
    }

    console.log(
      `   ✓ Created ${incidents.length} incidents and ${newLogs.length} logs\n`
    );

    if (dryRun) {
      console.log("4. [DRY RUN] Skipping backup...");
      console.log(`   Would backup ${oldLogs.length} records to health-logs-backup\n`);

      console.log("5. [DRY RUN] Skipping incident insertion...");
      console.log(
        `   Would insert ${incidents.length} documents into health-incidents\n`
      );

      console.log("6. [DRY RUN] Skipping health logs update...");
      console.log(`   Would delete ${oldLogs.length} old health logs`);
      console.log(`   Would insert ${newLogs.length} new health logs\n`);

      console.log("✅ DRY RUN COMPLETE\n");
      console.log("Summary of changes that would be made:");
      console.log(`  • ${oldLogs.length} records backed up to health-logs-backup`);
      console.log(`  • ${incidents.length} new incidents created`);
      console.log(`  • ${oldLogs.length} old health logs replaced with ${newLogs.length} new logs`);
      console.log("\nTo perform the actual migration, run without --dry-run flag\n");
    } else {
      // Backup existing data
      console.log("4. Creating backup...");
      await db.collection("health-logs-backup").insertMany(oldLogs);
      console.log(`   ✓ Backed up ${oldLogs.length} records\n`);

      // Insert new data
      console.log("5. Inserting incidents...");
      await db.collection("health-incidents").insertMany(incidents);
      console.log(`   ✓ Inserted ${incidents.length} incidents\n`);

      console.log("6. Updating health logs...");
      await db.collection("health-logs").deleteMany({});
      console.log(`   ✓ Deleted ${oldLogs.length} old logs`);
      await db.collection("health-logs").insertMany(newLogs);
      console.log(`   ✓ Inserted ${newLogs.length} new logs\n`);

      console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!\n");
      console.log("Summary:");
      console.log(`  • Created ${incidents.length} incidents`);
      console.log(`  • Created ${newLogs.length} logs`);
      console.log(`  • Backed up ${oldLogs.length} records to health-logs-backup\n`);
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
Health Data Migration Script

Usage:
  npm run migrate [options]

Options:
  --check     Run pre-migration checks without migrating
  --dry-run   Simulate the migration without making changes
  --help, -h  Show this help message

Examples:
  npm run migrate -- --check     # Check if ready to migrate
  npm run migrate -- --dry-run   # Preview migration changes
  npm run migrate                # Perform actual migration
`);
    process.exit(0);
  }

  if (checkOnly) {
    checkMigration().catch(console.error);
  } else {
    migrateHealthData({ dryRun, checkOnly }).catch(console.error);
  }
}

export { migrateHealthData, checkMigration };
