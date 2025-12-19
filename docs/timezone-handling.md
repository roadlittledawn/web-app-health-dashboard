# Timezone Handling Documentation

## Overview

The Health Dashboard application properly handles timezone conversion to ensure all timestamps are displayed in the user's local browser timezone, regardless of where the server is located or what timezone the data was originally stored in.

## Implementation

### Date Utility Functions (`lib/dateUtils.ts`)

The application uses centralized utility functions for consistent date formatting:

- **`formatLocalDateTime(date)`**: Formats a date with full date and time in the user's local timezone
  - Format: "Dec 19, 2024, 12:30 PM"
  - Use for: Health log timestamps, workout times

- **`formatLocalDate(date)`**: Formats a date with date only in the user's local timezone  
  - Format: "Dec 19, 2024"
  - Use for: Lab test dates, date-only displays

- **`formatRelativeTime(date)`**: Formats a date as relative time
  - Format: "2 hours ago", "3 days ago", or falls back to date
  - Use for: Recent activity indicators

### Browser Timezone Detection

The utility functions use the browser's built-in `Intl.DateTimeFormat` API through `toLocaleString()` and `toLocaleDateString()` methods. This automatically:

1. Detects the user's system timezone
2. Converts UTC/server timestamps to local time
3. Formats according to the user's locale preferences
4. Handles daylight saving time transitions

### Data Storage

- **Database**: All timestamps are stored in UTC format as `Date` objects
- **API**: Timestamps are transmitted as ISO 8601 strings (UTC)
- **Frontend**: Timestamps are converted to local timezone only for display

## Usage Examples

### Health Logs
```typescript
// Before (shows server/UTC time)
{new Date(log.timestamp).toLocaleDateString()}

// After (shows user's local time)
{formatLocalDateTime(log.timestamp)}
```

### Lab Results
```typescript
// Before (manual formatting)
{new Date(result.test_date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long', 
  day: 'numeric',
})}

// After (consistent utility)
{formatLocalDate(result.test_date)}
```

## Testing

Run the test suite to verify timezone conversion:

```bash
node lib/dateUtils.test.js
```

This will show how UTC timestamps are converted to your local timezone.

## International Users

The implementation automatically works for international users:

- **Timezone**: Automatically detected from browser
- **Date Format**: Uses browser's locale preferences
- **DST**: Handled automatically by browser APIs
- **No Configuration**: No user settings required

## Validation

To verify correct timezone handling:

1. Check browser developer tools for the actual timestamp values
2. Compare displayed times with your system clock
3. Test with different timezone settings (change system timezone)
4. Verify historical data shows consistent local times

## Migration Notes

This update affects display only - no database changes are required. All existing timestamps will automatically display in the correct local timezone.
