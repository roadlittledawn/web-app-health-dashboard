# AI Chat Feature Documentation

## Overview

The AI Chat feature provides a conversational interface for users to ask questions about their health data, including health incidents, workout statistics, and lab results. The system uses Claude AI (Anthropic) to provide intelligent responses based on aggregated statistics rather than raw data dumps.

## Architecture

### Components

1. **Statistics Aggregation API** (`/api/ai-chat-stats`)
   - Computes aggregated statistics from the database
   - Returns pre-computed metrics instead of raw records
   - Handles large datasets efficiently (e.g., 2,500+ workout records)

2. **AI Chat API** (`/api/ai-chat`)
   - Processes user messages with Claude AI
   - Includes comprehensive system prompt with user's health statistics
   - Returns AI-generated responses

3. **Chat UI** (`/app/chat/page.tsx`)
   - Clean, conversational interface similar to ChatGPT/Claude
   - Real-time message display with markdown support
   - Loading states and error handling

## API Endpoints

### GET /api/ai-chat-stats

Aggregates statistics for health incidents, workouts, and lab results.

**Authentication**: Required (JWT Bearer token)

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "incidents": {
      "totalIncidents": 15,
      "activeIncidents": 2,
      "resolvedIncidents": 13,
      "byLocation": {
        "lower back": {
          "totalCount": 8,
          "lastOccurrence": { "date": "2024-01-15", "painIntensity": 6 },
          "averageDurationDays": 14,
          "averageDaysToLowPain": 5,
          "averageIncidentsPerYear": 2.7
        }
      }
    },
    "workouts": {
      "totalWorkouts": 2543,
      "workoutsThisYear": 124,
      "bySport": {
        "Ride": {
          "allTime": {
            "count": 1200,
            "totalDistanceMiles": 8543.2,
            "longestWorkout": { "distanceMiles": 62.3, "date": "2023-07-15" }
          },
          "thisYear": {
            "count": 45,
            "totalDistanceMiles": 312.1
          }
        }
      }
    },
    "labs": {
      "totalResults": 12,
      "latestLipidPanel": {
        "date": "2024-01-10",
        "ldlCholesterol": { "value": 95, "unit": "mg/dL", "flag": "normal" }
      }
    }
  }
}
```

### POST /api/ai-chat

Processes chat messages with AI assistant.

**Authentication**: Required (JWT Bearer token)

**Request Body**:
```json
{
  "message": "How many miles have I biked this year?",
  "stats": { /* stats from ai-chat-stats endpoint */ }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Based on your workout data, you've biked 312.1 miles this year across 45 rides...",
  "usage": {
    "inputTokens": 1234,
    "outputTokens": 567
  }
}
```

## Example Questions Supported

### Health Incidents
- "When did I last have an issue with my lower back?"
- "On average, how long did my back pain last until it was better?"
- "On average, how many back incidents have I had per year?"
- "How long does it typically take for my knee pain to drop below 3/10?"

### Workouts
- "How many miles have I biked this year?"
- "How many bike rides did I do this year?"
- "What was my longest hike this year?"
- "What was my longest bike ride of all time?"
- "How many hours have I spent running?"

### Lab Results
- "What was my most recent LDL level?"
- "What was my last cholesterol reading?"
- "What were my latest lab results?"

## Data Efficiency

The system is designed to handle large datasets efficiently:

1. **Pre-aggregation**: Statistics are computed once per chat session
2. **No raw data**: Only computed metrics are sent to the AI
3. **Scalability**: Works with 2,500+ workout records without performance issues
4. **Smart filtering**: Aggregations group by relevant categories (location, sport type, etc.)

## UI Features

- **Conversational Interface**: Clean chat-like UI with user and assistant messages
- **Markdown Support**: AI responses support markdown formatting for better readability
- **Loading States**: Clear indicators when waiting for AI response
- **Error Handling**: Graceful error messages for API failures
- **Auto-scroll**: Automatically scrolls to latest message
- **Responsive Design**: Works on desktop and mobile devices

## System Prompt Design

The AI assistant receives a comprehensive system prompt that includes:

1. **Role Definition**: Health and fitness assistant for personal tracking
2. **Data Context**: All aggregated statistics formatted for clarity
3. **Response Guidelines**:
   - Be conversational but precise
   - Use natural language for dates
   - Provide insights, not just numbers
   - Admit when information is unavailable
   - Reference relevant data sections

## Future Enhancements

- [ ] Add conversation history storage
- [ ] Support multi-turn conversations with context
- [ ] Add suggested questions based on available data
- [ ] Include data visualization in responses
- [ ] Add export/share functionality for chat sessions
- [ ] Support for custom date ranges in queries
- [ ] Integration with goal tracking for progress questions

## Security Considerations

- All endpoints require JWT authentication
- No raw user data is exposed in error messages
- API keys are stored in environment variables
- Input validation prevents injection attacks
- Rate limiting should be considered for production

## Testing

To test the feature:

1. Ensure MongoDB is configured with sample data
2. Set `ANTHROPIC_API_KEY` in environment variables
3. Log in to the dashboard
4. Navigate to "AI Chat" from the dashboard
5. Ask questions about your health data

Example test queries:
- "What's my recent health activity?"
- "Show me my workout stats for this year"
- "What was my last LDL reading?"
