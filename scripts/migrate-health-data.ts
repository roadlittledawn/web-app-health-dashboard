import { MongoClient, ObjectId } from 'mongodb';
import { config } from 'dotenv';

config();

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
  status: 'active' | 'improving' | 'resolved';
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
  status: 'active' | 'improving' | 'resolved';
  created_at: Date;
  updated_at: Date;
}

interface NewHealthLog {
  _id?: ObjectId;
  timestamp: Date;
  incident_id: ObjectId;
  issue_type: 'update' | 'doctor_visit_notes';
  description: string;
  created_at: Date;
  updated_at: Date;
}

async function migrateHealthData() {
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING!);
  
  try {
    await client.connect();
    const db = client.db('health-fitness');
    
    // Get existing health logs
    const oldLogs = await db.collection<OldHealthLog>('health-logs').find({}).toArray();
    console.log(`Found ${oldLogs.length} existing health logs`);
    
    // Group logs by incident_id
    const incidentGroups = new Map<string, OldHealthLog[]>();
    oldLogs.forEach(log => {
      if (!incidentGroups.has(log.incident_id)) {
        incidentGroups.set(log.incident_id, []);
      }
      incidentGroups.get(log.incident_id)!.push(log);
    });
    
    console.log(`Found ${incidentGroups.size} unique incidents`);
    
    // Create new incidents collection
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
        painLocations: firstLog.body_area || '',
        painIntensity: firstLog.pain_level || 0,
        dateStarted: firstLog.timestamp,
        injurySource: '', // Will need manual input
        description: firstLog.description,
        symptoms: {
          painQuality: {
            sharp: false, dull: false, throbbing: false, stabbing: false,
            aching: false, heavy: false, burning: false, other: ''
          },
          otherSymptoms: {
            stiffness: false, instability: false, catching: false,
            popping: false, locking: false, other: ''
          },
          sensations: {
            bruising: false, swelling: false, numbness: false,
            tingling: false, weakness: false
          },
          status: {
            worsening: firstLog.status === 'active',
            resolved: firstLog.status === 'resolved',
            improving: firstLog.status === 'improving',
            constant: false, occasional: false
          },
          timing: {
            whenMostSevere: {
              morning: false, afternoon: false, evening: false,
              consistentAllDay: false, interruptsSleep: false, other: ''
            },
            whatMakesWorse: {
              rest: false, activity: false, sleeping: false,
              kneeling: false, other: ''
            },
            whatMakesBetter: {
              rest: false, activity: false, ice: false,
              medication: false, brace: false, other: ''
            }
          }
        },
        treatments: {
          priorPhysician: { seen: null, provider: '', when: '' },
          priorSurgery: { had: null, surgery: '', when: '' },
          treatmentsTried: {
            massageTherapy: { tried: false, helpful: null },
            physicalTherapy: { tried: false, helpful: null },
            chiropracticTherapy: { tried: false, helpful: null },
            acupuncture: { tried: false, helpful: null },
            bracing: { tried: false, helpful: null },
            injections: { tried: false, helpful: null },
            medication: { tried: false, helpful: null },
            other: { tried: false, helpful: null, description: '' }
          },
          studiesCompleted: {
            xRays: false, mri: false, ctScan: false,
            emgNerveStudy: false, boneScan: false, ultrasound: false, other: ''
          }
        },
        status: lastLog.status === 'active' ? { worsening: true, resolved: false, improving: false, constant: false, occasional: false } :
                lastLog.status === 'resolved' ? { worsening: false, resolved: true, improving: false, constant: false, occasional: false } :
                { worsening: false, resolved: false, improving: true, constant: false, occasional: false },
        created_at: firstLog.created_at,
        updated_at: lastLog.updated_at
      };
      
      incidents.push(incident);
      
      // Create new logs for this incident
      logs.forEach(oldLog => {
        const newLog: NewHealthLog = {
          _id: oldLog._id,
          timestamp: oldLog.timestamp,
          incident_id: incident._id!,
          issue_type: 'update',
          description: oldLog.description,
          created_at: oldLog.created_at,
          updated_at: oldLog.updated_at
        };
        newLogs.push(newLog);
      });
    }
    
    // Backup existing data
    console.log('Creating backup...');
    await db.collection('health-logs-backup').insertMany(oldLogs);
    
    // Insert new data
    console.log('Inserting incidents...');
    await db.collection('health-incidents').insertMany(incidents);
    
    console.log('Updating health logs...');
    await db.collection('health-logs').deleteMany({});
    await db.collection('health-logs').insertMany(newLogs);
    
    console.log('Migration completed successfully!');
    console.log(`Created ${incidents.length} incidents and ${newLogs.length} logs`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  migrateHealthData().catch(console.error);
}

export { migrateHealthData };
