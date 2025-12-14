# Health Dashboard - Functional Requirements

## Project Overview

A personal health dashboard for tracking health issues, lab results, workouts, and AI-powered health insights.

**Target User**: Single user (personal use)
**Deployment**: Netlify
**Database**: MongoDB (existing `health-fitness` database)

## Core Requirements

### 1. Authentication & Security

**REQ-AUTH-001**: Single-user JWT authentication
- User logs in with username/password
- System validates against `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH` environment variables
- Returns JWT token valid for 24 hours
- Token stored in localStorage and httpOnly cookie

**REQ-AUTH-002**: Protected routes
- All routes except `/login` require valid authentication
- Middleware validates JWT on each request
- Expired/invalid tokens redirect to login page

**REQ-AUTH-003**: Password security
- Passwords hashed with bcrypt (salt rounds: 12)
- Password hash stored in environment variables, not database

### 2. Health Issue Tracking

**REQ-HEALTH-001**: View health logs
- Display all health logs from `health-logs` collection
- Filter by:
  - Date range
  - Body area
  - Issue type
  - Status (active, improving, resolved)
  - Pain level range
  - Incident ID
- Sort by timestamp, pain level, or created date
- Pagination support (50 logs per page)

**REQ-HEALTH-002**: Create health log entry
- Required fields:
  - Issue type (e.g., "back_pain", "knee_pain")
  - Pain level (1-10 scale)
  - Description (free text)
  - Incident ID (for grouping related logs)
  - Body area (specific location)
- Optional fields:
  - Timestamp (defaults to now)
  - Activities (array of strings)
  - Triggers (array of strings)
  - Symptoms (array of strings)
  - Status (defaults to "active")

**REQ-HEALTH-003**: Update health log entry
- Update any field including:
  - Pain level
  - Description
  - Status (active → improving → resolved)
  - Activities, triggers, symptoms

**REQ-HEALTH-004**: View incident summaries
- Group logs by incident_id
- Display analytics per incident:
  - First and last log dates
  - Duration in hours
  - Number of log entries
  - Max and average pain level
  - Current status
  - All symptoms, activities, and triggers

**REQ-HEALTH-005**: Health analytics
- Incident frequency over time (by month/quarter/year)
- Symptom pattern analysis
- Trigger analysis
- Pain level trends
- Average incident duration by issue type

**REQ-HEALTH-006**: Timeline visualization
- Visual timeline of incidents
- Show incident duration, status changes
- Color-coded by issue type or pain level
- Interactive - click to view details

### 3. Lab Results Tracking

**REQ-LAB-001**: View lab results
- Display all lab results from `lab-results` collection
- Filter by:
  - Date range
  - Test type (lipid panel, metabolic, custom)
  - Doctor/provider
- Sort by test date (most recent first)

**REQ-LAB-002**: Add lab result - Lipid Panel
- Test date (required)
- Test type: "lipid_panel"
- Ordered by (doctor name)
- Lab facility name (optional)
- For each metric (total cholesterol, LDL, HDL, triglycerides):
  - Value (number)
  - Unit (mg/dL)
  - Reference range (min, max)
  - Flag (auto-calculated: high/low/normal based on reference range)
- Notes field (optional)

**REQ-LAB-003**: Add lab result - Custom test
- Same base fields as lipid panel
- Test type: "custom" or specific type
- Array of custom results, each with:
  - Test name
  - Value (number or string)
  - Unit (optional)
  - Reference range (optional)
  - Flag (high/low/normal/critical)

**REQ-LAB-004**: Update lab result
- Edit any field in existing lab result
- Recalculate flags if reference ranges or values change

**REQ-LAB-005**: Lab trends visualization
- Line chart showing lipid panel values over time
- Separate lines for total cholesterol, LDL, HDL, triglycerides
- Reference range bands displayed on chart
- Color-coded flags (green=normal, yellow=borderline, red=high/low)
- X-axis: test dates
- Y-axis: values in mg/dL

**REQ-LAB-006**: Lab result comparison
- Compare most recent results to previous tests
- Show trend direction (↑ ↓ →)
- Highlight values outside reference ranges

### 4. Strava Workout Integration

**REQ-STRAVA-001**: OAuth authentication
- Connect to Strava account via OAuth 2.0
- Store access token, refresh token, and expiration
- Auto-refresh token when expired

**REQ-STRAVA-002**: Sync workouts automatically
- Fetch workouts from Strava API
- Store in `strava-workouts` collection
- Cache to reduce API calls
- Track sync date to avoid duplicates
- Workout data includes:
  - Activity type (Run, Ride, Swim, etc.)
  - Distance, duration, elevation gain
  - Speed, heart rate (if available)
  - Calories

**REQ-STRAVA-003**: View workout history
- Display all cached workouts
- Filter by:
  - Date range
  - Activity type
  - Distance/duration ranges
- Sort by date (most recent first)

**REQ-STRAVA-004**: Calendar view
- Month/week calendar showing workouts
- Color-coded by activity type
- Click day to see workout details
- Visual indicators for goal progress

**REQ-STRAVA-005**: Workout trends
- Charts showing:
  - Total distance per week/month
  - Workout frequency
  - Average pace/speed trends
  - Heart rate trends (if available)
  - Elevation totals

**REQ-STRAVA-006**: Fitness goals
- Create goals with:
  - Goal type (distance, frequency, duration)
  - Activity type filter (optional)
  - Target value and unit
  - Time period (week, month, year)
  - Start and end dates
  - Status (active, completed, abandoned)
- Track progress automatically based on synced workouts
- Visual progress bars and completion percentages

### 5. AI Chat & Natural Language Queries

**REQ-AI-001**: Chat interface
- Dedicated chat page with message history
- User sends natural language questions
- AI responds using health data from MongoDB
- Support for questions like:
  - "Summarize my right knee issues"
  - "How many lower back incidents since 2020?"
  - "When did I have surgery on my right knee?"
  - "Average duration of lower back incidents until resolved?"
  - "When did I first experience right knee issues?"

**REQ-AI-002**: Context-aware responses
- AI queries MongoDB for relevant data
- Uses health logs, lab results, and workout data
- Provides specific dates, counts, and statistics
- Cites sources (e.g., "Based on 5 health logs...")

**REQ-AI-003**: Streaming responses
- Stream AI responses for better UX
- Show typing indicator while generating
- Display partial responses as they arrive

**REQ-AI-004**: Chat history
- Persist chat history in session
- Clear chat option
- Optional: save important conversations

### 6. Doctor Visit Preparation

**REQ-DOCTOR-001**: Select date range
- User specifies "since last visit" date
- Or selects custom date range
- Defaults to last 3-6 months

**REQ-DOCTOR-002**: Generate summary
- AI-generated summary includes:
  - All health incidents in period (grouped by issue)
  - Status of each incident (resolved, improving, ongoing)
  - Latest lab results with trends
  - Significant changes in lab values
  - Workout activity level summary
  - New symptoms or triggers
  - Discussion outline with key talking points

**REQ-DOCTOR-003**: Summary sections
- **Health Issues Summary**
  - Active issues requiring attention
  - Recently resolved issues
  - Incident frequency and patterns

- **Lab Results Summary**
  - Most recent results
  - Trends and changes
  - Values outside reference ranges

- **Activity Summary**
  - Workout frequency and volume
  - Changes in activity levels

- **Discussion Points**
  - Questions to ask doctor
  - Concerns to raise
  - Follow-ups needed

**REQ-DOCTOR-004**: Export/print summary
- Print-friendly format
- PDF export option
- Include charts and visualizations
- Professional formatting for medical setting

**REQ-DOCTOR-005**: Save summaries
- Save generated summaries for future reference
- Associate with visit date
- Review past summaries

### 7. Dashboard & Analytics

**REQ-DASH-001**: Overview dashboard
- Quick stats:
  - Active health issues count
  - Days since last health incident
  - Most recent lab results (with flags)
  - Last 7 days workout summary
- Recent activity feed
- Quick actions (add log, add lab result, sync Strava)

**REQ-DASH-002**: Navigation
- Clear navigation to all features
- Dashboard accessible from all pages
- Breadcrumb navigation for deep pages

**REQ-DASH-003**: Responsive design
- Works on desktop (primary)
- Functional on mobile devices
- Charts scale appropriately

### 8. Data Visualization Requirements

**REQ-VIZ-001**: Timeline views
- Interactive timelines for health incidents
- Show overlapping incidents
- Zoom and pan functionality
- Click to view details

**REQ-VIZ-002**: Line charts
- Lab value trends over time
- Workout metrics over time
- Smooth, responsive animations
- Tooltips showing exact values
- Legend for multiple series

**REQ-VIZ-003**: Reference ranges
- Display reference ranges as shaded bands on charts
- Color-code values (in-range vs out-of-range)
- Highlight critical values

**REQ-VIZ-004**: Chart interactions
- Hover tooltips
- Click to filter/drill down
- Export chart as image
- Toggle series on/off

## Non-Functional Requirements

### Performance
- Page load time < 2 seconds
- API response time < 500ms (excluding AI)
- AI responses stream within 1 second of first token
- Charts render smoothly with 100+ data points

### Security
- All API endpoints require valid JWT
- Environment variables for all secrets
- Input validation on all forms
- MongoDB queries scoped to single user
- Rate limiting on AI endpoints

### Reliability
- Graceful error handling
- Connection retry logic for MongoDB
- Token refresh for Strava API
- Offline-friendly where possible

### Usability
- Intuitive navigation
- Clear error messages
- Loading indicators for async operations
- Keyboard navigation support
- Accessible (WCAG 2.1 AA compliant)

## Future Enhancements (Out of Scope - v1)

- Multi-user support
- Mobile app
- Medication tracking
- Appointment scheduling
- Document upload/storage
- Export data to CSV/JSON
- Integration with other fitness trackers
- Symptom correlation analysis
- Predictive health insights
