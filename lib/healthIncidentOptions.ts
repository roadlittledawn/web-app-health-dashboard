/**
 * Shared constants for health incident form options
 * These define the available values for array-based fields in the health incident schema
 */

export const PAIN_QUALITY_OPTIONS = [
  "sharp",
  "dull",
  "throbbing",
  "stabbing",
  "aching",
  "heavy",
  "burning",
];

export const OTHER_SYMPTOMS_OPTIONS = [
  "stiffness",
  "instability",
  "catching",
  "popping",
  "locking",
];

export const SENSATIONS_OPTIONS = [
  "bruising",
  "swelling",
  "numbness",
  "tingling",
  "weakness",
];

export const WHEN_MOST_SEVERE_OPTIONS = [
  "morning",
  "afternoon",
  "evening",
  "consistentAllDay",
  "interruptsSleep",
];

export const WHAT_MAKES_WORSE_OPTIONS = ["rest", "activity", "sleeping", "kneeling"];

export const WHAT_MAKES_BETTER_OPTIONS = [
  "rest",
  "activity",
  "ice",
  "medication",
  "brace",
];

export const PRIOR_PHYSICIAN_OPTIONS = ["seen", "not_seen"];

export const PRIOR_SURGERY_OPTIONS = ["had", "not_had"];

export const TREATMENTS_TRIED_OPTIONS = [
  "massageTherapy",
  "physicalTherapy",
  "chiropracticTherapy",
  "acupuncture",
  "bracing",
  "injections",
  "medication",
];

export const STUDIES_COMPLETED_OPTIONS = [
  "xRays",
  "mri",
  "ctScan",
  "emgNerveStudy",
  "boneScan",
  "ultrasound",
];

export const STATUS_OPTIONS = [
  "worsening",
  "resolved",
  "improving",
  "constant",
  "occasional",
];

/**
 * Helper function to format option labels for display
 * Converts camelCase to Title Case
 */
export function formatOptionLabel(option: string): string {
  // Handle snake_case
  if (option.includes('_')) {
    return option
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Handle camelCase
  return option
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
