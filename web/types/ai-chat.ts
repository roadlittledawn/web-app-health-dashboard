/**
 * Type definitions for AI Chat statistics
 */

export interface IncidentLocationStats {
  totalCount: number;
  resolvedCount: number;
  activeCount: number;
  lastOccurrence: {
    date: Date;
    description: string;
    painIntensity: number | null;
    status: string[];
  } | null;
  averageDurationDays: number | null;
  averageDaysToLowPain: number | null;
  averageIncidentsPerYear: number;
  incidentsByYear: Record<number, number>;
}

export interface IncidentStats {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  byLocation: Record<string, IncidentLocationStats>;
}

export interface WorkoutDistance {
  meters: number;
  miles: number;
  km: number;
}

export interface WorkoutElevation {
  meters: number;
  feet: number;
}

export interface LongestWorkout {
  name: string;
  date: Date;
  distanceMeters: number;
  distanceMiles: number;
  distanceKm: number;
}

export interface SportPeriodStats {
  count: number;
  totalDistanceMeters: number;
  totalDistanceMiles: number;
  totalDistanceKm: number;
  totalMovingTimeHours: number;
  totalElevationGainMeters: number;
  totalElevationGainFeet: number;
  longestWorkout: LongestWorkout | null;
}

export interface SportStats {
  allTime: SportPeriodStats;
  thisYear: SportPeriodStats;
}

export interface WorkoutStats {
  totalWorkouts: number;
  workoutsThisYear: number;
  bySport: Record<string, SportStats>;
  currentYear: number;
}

export interface LabMeasurementData {
  value: number;
  unit: string;
  reference_range: { min: number; max: number };
  flag?: 'high' | 'low' | 'normal';
}

export interface LipidPanelData {
  date: Date;
  totalCholesterol?: LabMeasurementData;
  ldlCholesterol?: LabMeasurementData;
  hdlCholesterol?: LabMeasurementData;
  triglycerides?: LabMeasurementData;
  orderedBy: string;
}

export interface LabStats {
  totalResults: number;
  mostRecent: {
    date: Date;
    testType: string;
    orderedBy: string;
  } | null;
  latestLipidPanel: LipidPanelData | null;
}

export interface AIChatStats {
  incidents: IncidentStats;
  workouts: WorkoutStats | null;
  labs: LabStats;
  generatedAt: string;
}
