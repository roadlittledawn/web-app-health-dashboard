import { ObjectId } from "mongodb";

// New Incident Schema (Primary Entity)
export interface HealthIncident {
  _id?: ObjectId;
  painLocations: string[]; // Array to support multiple pain locations
  painIntensity: number; // 0-10
  dateStarted: Date;
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

// Refactored Health Log (Secondary Entity)
export interface HealthLog {
  _id?: ObjectId;
  timestamp: Date;
  incident_id: ObjectId; // Reference to HealthIncident
  issue_type: "update" | "doctor_visit_notes";
  description: string;
  created_at: Date;
  updated_at: Date;
}

export interface HealthAnalytics {
  analysis_type:
    | "incident_frequency"
    | "symptom_patterns"
    | "trigger_analysis"
    | "pain_trends"
    | "duration_analysis";
  data: any[];
  filters_applied: any;
}
