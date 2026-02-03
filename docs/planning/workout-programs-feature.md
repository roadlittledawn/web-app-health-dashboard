# Implementation Plan - Workout Program Planning with Exercise Management

## Problem Statement
Add workout program planning capabilities to enable users to create and manage exercises, build workout programs as sequences of exercises with configurable sets/reps/duration, and track progress through programs during workouts. This complements the existing Strava integration by providing structured workout planning.

## Requirements

**Core Functionality:**
- Create/edit/delete exercises with name, aliases, YouTube media, equipment, target areas, description, difficulty, and time-based flag
- Search and filter exercises by name, target area, and equipment
- Create/edit/delete workout programs as ordered lists of exercises
- Configure sets, reps, or duration for each exercise in a program
- Start workout sessions from programs and check off exercises with inline details
- Support multiple active programs simultaneously

**Technical Constraints:**
- Shared/global exercise library (single user)
- YouTube URLs only for media (MVP)
- Simple in-place tracking (no session history)
- No Strava integration for now
- Follow existing patterns: Netlify Functions, MongoDB, Material-UI, TypeScript

**User Experience:**
- Separate pages: `/workouts/exercises`, `/workouts/programs`, `/workouts/session`
- Start workouts from both program list and program detail views
- Editable exercise configurations in programs (to support progressive overload)

## Background

**Existing Patterns:**
- API endpoints follow RESTful conventions with single handler supporting multiple HTTP methods (GET/POST/PATCH/DELETE)
- Authentication via JWT tokens extracted from Authorization header
- MongoDB collections in `health-fitness` database
- Material-UI components with consistent styling
- TypeScript types defined in `/types` directory
- Client-side state management with React hooks

**Similar Features:**
- Fitness goals (`fitness-goals` collection) - provides pattern for CRUD operations
- Lab results - provides pattern for create/query/update endpoints
- Strava workouts page - provides UI patterns for workout-related features

## Proposed Solution

**Database Schema:**

1. **`exercises` collection:**
```typescript
{
  _id: ObjectId,
  name: string,
  aliases: string[],
  media: { type: 'youtube', url: string }[],
  requiredEquipment: string[],
  targetArea: string[],
  description: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  isTimeBased: boolean,
  created_at: Date,
  updated_at: Date
}
```

2. **`workout-programs` collection:**
```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  exercises: [{
    exercise_id: ObjectId,
    order: number,
    sets: number,
    reps: number,
    duration_seconds: number
  }],
  status: 'active' | 'archived',
  created_at: Date,
  updated_at: Date
}
```

**API Endpoints:**
- `/api/exercises` - GET (query with filters), POST (create), PATCH (update), DELETE
- `/api/workout-programs` - GET (query), POST (create), PATCH (update), DELETE

**Frontend Pages:**
- `/workouts/exercises` - Exercise library with search/filter and CRUD
- `/workouts/programs` - Program list and management
- `/workouts/programs/[id]` - Program detail with exercise list and edit capability
- `/workouts/session/[programId]` - Active workout session with checklist

**Navigation:**
- Add links to exercises and programs from main `/workouts` page
- "Start Workout" buttons on program list and detail pages navigate to session page

## Task Breakdown

**Task 1: Create TypeScript types for exercises and programs**
- Create `/types/workout-programs.ts` with Exercise, WorkoutProgram, and ProgramExercise interfaces
- Include all fields from schema design
- Export types for use in API and frontend
- Demo: Types compile without errors and can be imported

**Task 2: Create exercises API endpoint**
- Create `/netlify/functions/exercises.ts`
- Implement GET with query params for search (name) and filters (targetArea, requiredEquipment)
- Implement POST for creating exercises with validation
- Implement PATCH for updating exercises by ID
- Implement DELETE for removing exercises by ID
- Follow authentication pattern from existing endpoints
- Demo: API endpoints respond correctly via curl/Postman

**Task 3: Create workout programs API endpoint**
- Create `/netlify/functions/workout-programs.ts`
- Implement GET to query programs with optional status filter
- Implement POST to create programs with exercise array
- Implement PATCH to update programs (including exercise configurations)
- Implement DELETE to remove programs
- Validate exercise_id references exist in exercises collection
- Demo: API endpoints respond correctly and validate exercise references

**Task 4: Create exercise library page**
- Create `/app/workouts/exercises/page.tsx`
- Display exercises in grid/list with name, target areas, equipment, difficulty
- Add search bar for filtering by name
- Add filter dropdowns for target area and equipment
- Add "Create Exercise" button opening a dialog/form
- Implement create exercise form with all fields
- Demo: Can view, search, filter, and create exercises

**Task 5: Add exercise edit and delete functionality**
- Add edit button to each exercise card opening edit dialog
- Add delete button with confirmation dialog
- Implement edit form pre-populated with exercise data
- Handle API calls for update and delete
- Show success/error messages
- Demo: Can edit and delete exercises from the library

**Task 6: Create programs list page**
- Create `/app/workouts/programs/page.tsx`
- Display programs as cards with name, description, exercise count
- Add "Create Program" button opening create form
- Show "Start Workout" button on each program card
- Add edit and delete buttons for each program
- Implement create program form with name and description
- Demo: Can view programs list and create new programs

**Task 7: Create program detail/edit page**
- Create `/app/workouts/programs/[id]/page.tsx`
- Display program name, description, and exercise list
- Show exercise details: name, sets/reps/duration, order
- Add "Add Exercise" button to search and add exercises to program
- Add "Start Workout" button at top
- Implement inline editing of sets/reps/duration for each exercise
- Add remove exercise button
- Add drag-to-reorder functionality for exercise sequence
- Demo: Can view program details, add/remove/reorder exercises, edit configurations

**Task 8: Create active workout session page**
- Create `/app/workouts/session/[programId]/page.tsx`
- Fetch program and populate exercise list
- Display exercises in order with checkboxes
- Show exercise details inline: name, sets/reps/duration, target areas
- Embed YouTube videos if media exists
- Show description and instructions
- Track checked state in component state
- Add "Finish Workout" button to return to programs
- Demo: Can start workout, check off exercises, view details, and finish

**Task 9: Update main workouts page navigation**
- Update `/app/workouts/page.tsx`
- Add navigation cards/buttons for "Exercise Library" and "Workout Programs"
- Position alongside existing Strava workouts and goals sections
- Use consistent Material-UI styling
- Demo: Can navigate to exercises and programs from main workouts page
