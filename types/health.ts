import { ObjectId } from 'mongodb';

export interface HealthLog {
  _id?: ObjectId;
  timestamp: Date;
  issue_type: string;
  pain_level: number;          // 1-10 scale
  description: string;
  incident_id: string;          // Groups related logs
  activities: string[];
  triggers: string[];
  symptoms: string[];
  body_area: string;
  status: 'active' | 'improving' | 'resolved';
  created_at: Date;
  updated_at: Date;
}

export interface HealthIncident {
  incident_id: string;
  issue_type: string;
  first_log: Date;
  last_log: Date;
  duration_hours: number;
  log_count: number;
  max_pain_level: number;
  avg_pain_level: number;
  status: string;
  all_symptoms: string[];
  all_activities: string[];
  all_triggers: string[];
}

export interface HealthAnalytics {
  analysis_type: 'incident_frequency' | 'symptom_patterns' | 'trigger_analysis' | 'pain_trends' | 'duration_analysis';
  data: any[];
  filters_applied: any;
}
