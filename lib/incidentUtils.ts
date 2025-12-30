/**
 * Utility functions for handling health incidents
 */

/**
 * Generates a human-readable incident ID from date and pain locations
 * Format: YYYY-MM-DD_painLocation1-painLocation2
 * Example: 2025-12-10_right-knee
 */
export function generateIncidentId(date: Date, painLocations: string[]): string {
  // Format date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  // Format pain locations: convert to lowercase, replace spaces with hyphens
  const locationsStr = painLocations
    .map(location => location.toLowerCase().trim().replace(/\s+/g, '-'))
    .join('-');

  return `${dateStr}_${locationsStr}`;
}

/**
 * Validates an incident ID format
 * Returns true if the format matches YYYY-MM-DD_location
 */
export function validateIncidentIdFormat(incidentId: string): boolean {
  // Pattern: YYYY-MM-DD_location(s)
  const pattern = /^\d{4}-\d{2}-\d{2}_[a-z0-9-]+$/;
  return pattern.test(incidentId);
}

/**
 * Formats an incident ID for display (capitalizes words, replaces hyphens with spaces in location part)
 */
export function formatIncidentIdForDisplay(incidentId: string): string {
  const [datePart, locationPart] = incidentId.split('_');
  if (!locationPart) return incidentId;

  // Capitalize each word in location
  const formattedLocation = locationPart
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `${datePart} - ${formattedLocation}`;
}
