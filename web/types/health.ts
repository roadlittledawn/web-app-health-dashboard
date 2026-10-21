import { ObjectId } from "mongodb";

// New Incident Schema (Primary Entity)
export interface HealthIncident {
  _id?: ObjectId;
  incidentId: string; // Human-readable unique identifier (e.g., "2025-12-10_right-knee")
  painLocations: string[]; // Array to support multiple pain locations
  painIntensity: number | null; // Optional 0-10 pain level (max pain intensity)
  painIntensityOverTime?: Array<{
    date: Date;
    intensity: number;
  }>; // Pain levels tracked over time
  dateStarted: Date;
  endDate?: Date | null; // Optional end date for resolved incidents
  injurySource: string;
  description: string;
  symptoms: {
    painQuality: string[]; // e.g., ['sharp', 'dull', 'throbbing', 'stabbing', 'aching', 'heavy', 'burning', ...]
    otherSymptoms: string[]; // e.g., ['stiffness', 'instability', 'catching', 'popping', 'locking', ...]
    sensations: string[]; // e.g., ['bruising', 'swelling', 'numbness', 'tingling', 'weakness']
    timing: {
      whenMostSevere: string[]; // e.g., ['morning', 'afternoon', 'evening', 'consistentAllDay', 'interruptsSleep', ...]
      whatMakesWorse: string[]; // e.g., ['rest', 'activity', 'sleeping', 'kneeling', ...]
      whatMakesBetter: string[]; // e.g., ['rest', 'activity', 'ice', 'medication', 'brace', ...]
    };
  };
  treatments: {
    priorPhysician: string[]; // e.g., ['seen', 'provider: Dr. Smith', 'when: 2024-01-15'] or ['not_seen']
    priorSurgery: string[]; // e.g., ['had', 'surgery: ACL reconstruction', 'when: 2023-06-10'] or ['not_had']
    treatmentsTried: string[]; // e.g., ['massageTherapy', 'massageTherapy_helpful', 'physicalTherapy', 'physicalTherapy_not_helpful', ...]
    studiesCompleted: string[]; // e.g., ['xRays', 'mri', 'ctScan', 'emgNerveStudy', 'boneScan', 'ultrasound', ...]
  };
  status: string[]; // e.g., ['worsening'], ['resolved'], ['improving'], ['constant', 'occasional'], etc.
  created_at: Date;
  updated_at: Date;
}

// Refactored Health Log (Secondary Entity)
export interface HealthLog {
  _id?: ObjectId;
  incident_id: ObjectId; // Reference to HealthIncident
  issue_type: "update" | "doctor_visit_notes";
  description: string;
  timestamp: Date; // User-editable timestamp for when the log entry occurred
}

export interface HealthAnalytics {
  analysis_type:
    | "incident_frequency"
    | "symptom_patterns"
    | "trigger_analysis"
    | "pain_trends"
    | "duration_analysis";
  data: unknown[];
  filters_applied: Record<string, unknown>;
}
