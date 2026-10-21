/**
 * Conversion factors for common units
 */
export const METERS_TO_MILES = 0.000621371;
export const METERS_TO_KM = 0.001;
export const METERS_TO_FEET = 3.28084;

/**
 * Calculate total distance from an array of workouts
 */
export function calculateWorkoutDistances(workouts: { distance: number }[]) {
  const totalMeters = workouts.reduce((sum, w) => sum + w.distance, 0);
  
  return {
    meters: totalMeters,
    miles: Math.round(totalMeters * METERS_TO_MILES * 10) / 10,
    km: Math.round(totalMeters * METERS_TO_KM * 10) / 10,
  };
}

/**
 * Calculate total moving time from an array of workouts
 */
export function calculateTotalMovingTime(workouts: { moving_time: number }[]) {
  const totalSeconds = workouts.reduce((sum, w) => sum + w.moving_time, 0);
  return Math.round(totalSeconds / 3600 * 10) / 10; // Convert to hours
}

/**
 * Calculate total elevation gain from an array of workouts
 */
export function calculateElevationGain(workouts: { total_elevation_gain?: number }[]) {
  const totalMeters = Math.round(
    workouts.reduce((sum, w) => sum + (w.total_elevation_gain || 0), 0)
  );
  
  return {
    meters: totalMeters,
    feet: Math.round(totalMeters * METERS_TO_FEET),
  };
}

/**
 * Format workout distance for display
 */
export function formatWorkoutDistance(distanceMeters: number) {
  return {
    meters: distanceMeters,
    miles: Math.round(distanceMeters * METERS_TO_MILES * 10) / 10,
    km: Math.round(distanceMeters * METERS_TO_KM * 10) / 10,
  };
}
