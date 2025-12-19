/**
 * Utility functions for date formatting and timezone handling
 */

/**
 * Formats a date to the user's local timezone with full date and time
 * @param date - Date object or ISO string
 * @returns Formatted date string in user's local timezone
 */
export function formatLocalDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date to the user's local timezone with date only
 * @param date - Date object or ISO string
 * @returns Formatted date string in user's local timezone
 */
export function formatLocalDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date to a relative time string (e.g., "2 hours ago", "3 days ago")
 * @param date - Date object or ISO string
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
  } else {
    return formatLocalDate(dateObj);
  }
}

/**
 * Formats a date for datetime-local input fields (YYYY-MM-DDTHH:mm)
 * Converts to user's local timezone
 * @param date - Date object or ISO string
 * @returns Formatted string for datetime-local input
 */
export function formatForDateTimeLocal(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Get local date components
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
