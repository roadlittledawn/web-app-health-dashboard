import { LabMeasurement } from "../types/labs";

export const LIPID_FIELDS = [
  "total_cholesterol",
  "ldl_cholesterol",
  "hdl_cholesterol",
  "triglycerides",
] as const;

export function calculateFlag(value: number, refRange: { min: number; max: number }): 'high' | 'low' | 'normal' {
  if (value < refRange.min) return 'low';
  if (value > refRange.max) return 'high';
  return 'normal';
}

export function withFlag(measurement: LabMeasurement): LabMeasurement {
  return {
    ...measurement,
    flag: calculateFlag(measurement.value, measurement.reference_range),
  };
}
