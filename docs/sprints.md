# Sprints Module

## 📌 Overview

The Sprints module manages sprint lifecycle and operations. Sprints are time-boxed iterations within a project where teams plan and execute work. This module handles sprint creation, activation, closure, and ticket management within sprints.

**Key Responsibilities:**
- Create and manage sprints for projects
- Start, close, and update sprint status
- Move tickets into and out of sprints
- Track sprint goals and dates
- Sprint-specific ticket retrieval and filtering
- Integration with activity logging

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: SprintService handles business logic
- **Lifecycle Management**: Sprints have statuses (PLANNING, ACTIVE, CLOSED)
- **State Transitions**: Sprints move through defined states

### Key Design Decisions
1. **Sprint Status**: PLANNING → ACTIVE → CLOSED workflow
2. **Time-Bounded**: Sprints have start and end dates
3. **Sprint Goals**: Optional goal/description for sprint
4. **One Active Sprint**: Only one active sprint per project at a time
5. **Ticket Ordering**: Tickets in sprint ordered by creation/assignment

## 📦 Entities

### Sprint
Represents a time-boxed iteration.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `projectId` (UUID, FK): Parent project
- `name` (VARCHAR, 100): Sprint name (e.g., "Sprint 1", "Q2 2026")
- `status` (ENUM): Current status (PLANNING, ACTIVE, CLOSED)
- `startDate` (DATE, nullable): Sprint start date
- `endDate` (DATE, nullable): Sprint end date
- `goal` (TEXT, nullable): Sprint goal/description
- `createdAt` (TIMESTAMP): Creation timestamp

**Relationships:**
- `project`: Many-to-One with Project
- `tickets`: One-to-Many with Ticket

**Constraints:**
- Foreign key on projectId
- Status must be valid enum value

## 📥 DTOs

### CreateSprintDto
Used to create a new sprint.

**Fields:**
- `name` (required, string, 1-100 chars): Sprint name
- `goal` (optional, string): Sprint goal/description
- `startDate` (optional, ISO8601 date): Sprint start date
- `endDate` (optional, ISO8601 date): Sprint end date

**Validation:**
- Name is required and 1-100 characters
- Dates must be valid ISO8601 format
- Start date must be before end date if both provided
- End date must be in future

### UpdateSprintDto
Used to update sprint details.

**Fields:**
- `name` (optional, string): Update sprint name
- `goal` (optional, string): Update sprint goal
- `startDate` (optional, ISO8601): Update start date
- `endDate` (optional, ISO8601): Update end date

**Validation:**
- All fields optional for partial update
- Same validation rules as CreateSprintDto for provided fields

## ⚙️ Services

### SprintService

**Method: `createSprint(projectId, userId, dto)`**
- Creates new sprint in PLANNING status
- Validates project exists and user has access
- Returns created sprint
- Does not start sprint automatically

**Method: `getSprints(projectId, userId, pagination)`**
- Lists all sprints for project
- Includes ticket count and status
- Paginated results
- Ordered by creation date

**Method: `getSprint(sprintId, userId)`**
- Retrieves sprint details
- Includes all tickets in sprint
- Validates user access

**Method: `updateSprint(sprintId, userId, dto)`**
- Updates sprint details (name, goal, dates)
- Validates user access
- Returns updated sprint

**Method: `startSprint(sprintId, userId)`**
- Transitions sprint from PLANNING to ACTIVE
- Validates only one active sprint per project
- Sets start date if not already set
- Logs activity
- Publishes event

**Method: `closeSprint(sprintId, userId, moveUnfinishedTo)`**
- Transitions sprint from ACTIVE to CLOSED
- Sets end date to current date
- Can move unfinished tickets to backlog or next sprint
- Calculates sprint metrics (velocity, burn-down)
- Logs activity
- Publishes event

**Method: `deleteSprint(sprintId, userId)`**
- Deletes sprint only if in PLANNING status
- Cannot delete active or closed sprints
- Moves tickets in sprint to backlog
- Logs deletion

## 🌐 API Endpoints

### POST `/projects/:projectId/sprints`
Create a new sprint.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Request Body:**
```json
{
  "name": "Sprint 1",
  "goal": "Implement user authentication",
  "startDate": "2026-04-27",
  "endDate": "2026-05-10"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "Sprint 1",
    "status": "PLANNING",
    "goal": "Implement user authentication",
    "startDate": "2026-04-27",
    "endDate": "2026-05-10",
    "createdAt": "2026-04-20T10:00:00Z",
    "ticketCount": 0
  }
}
```

**Errors:**
- 400: Validation error or invalid dates
- 404: Project not found

### GET `/projects/:projectId/sprints`
Get all sprints for a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID
- `page` (query, optional, number): Page number
- `limit` (query, optional, number): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Sprint 1",
      "status": "ACTIVE",
      "goal": "...",
      "startDate": "2026-04-27",
      "endDate": "2026-05-10",
      "ticketCount": 12,
      "createdAt": "2026-04-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3
  }
}
```

### GET `/sprints/:sprintId`
Get sprint details with tickets.

**Parameters:**
- `sprintId` (path, required, UUID): Sprint ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "Sprint 1",
  "status": "ACTIVE",
  "goal": "Implement user authentication",
  "startDate": "2026-04-27",
  "endDate": "2026-05-10",
  "createdAt": "2026-04-20T10:00:00Z",
  "tickets": [
    {
      "id": "uuid",
      "ticketKey": "PROJ-1",
      "title": "Create login form",
      "status": { "name": "In Progress" },
      "priority": "HIGH",
      "assignees": []
    }
  ],
  "stats": {
    "total": 12,
    "todo": 3,
    "inProgress": 5,
    "done": 4
  }
}
```

### PATCH `/sprints/:sprintId`
Update sprint details.

**Parameters:**
- `sprintId` (path, required, UUID): Sprint ID

**Request Body:**
```json
{
  "name": "Sprint 1 - Updated",
  "goal": "Updated goal"
}
```

**Response (200 OK):** Updated sprint object

### POST `/sprints/:sprintId/start`
Start a sprint (PLANNING → ACTIVE).

**Parameters:**
- `sprintId` (path, required, UUID): Sprint ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "ACTIVE",
    "startDate": "2026-04-20"
  }
}
```

**Errors:**
- 400: Another sprint already active
- 404: Sprint not found

### POST `/sprints/:sprintId/close`
Close a sprint (ACTIVE → CLOSED).

**Parameters:**
- `sprintId` (path, required, UUID): Sprint ID

**Request Body (optional):**
```json
{
  "moveUnfinishedTo": "backlog"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CLOSED",
    "endDate": "2026-05-10",
    "velocity": 35,
    "completionRate": 0.75
  }
}
```

### DELETE `/sprints/:sprintId`
Delete a sprint (only if PLANNING status).

**Parameters:**
- `sprintId` (path, required, UUID): Sprint ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sprint deleted successfully"
}
```

**Errors:**
- 400: Cannot delete non-PLANNING sprint
- 404: Sprint not found

## 🔍 Special Features

### Sprint Lifecycle
```
PLANNING ─→ ACTIVE ─→ CLOSED
  (plan)    (work)    (review)
```

- **PLANNING**: Created but not started, can be deleted
- **ACTIVE**: In progress, tickets being worked on
- **CLOSED**: Completed, historical data

### Sprint Goals
- Optional description of sprint objectives
- Used for team alignment and retrospectives
- Tracked in activity logs

### Sprint Metrics
- **Velocity**: Sum of story points completed in sprint
- **Burn-down**: Graphing of work completed over time
- **Completion Rate**: % of tickets completed
- **Cycle Time**: Average time ticket spends in sprint

## ⚠️ Error Handling

**Validation Errors (400):**
- Sprint name required or invalid
- Invalid date format
- Start date after end date
- Another sprint already active (when starting)
- Cannot delete non-PLANNING sprint

**Access Control Errors (403):**
- User not member of workspace

**Not Found (404):**
- Sprint not found
- Project not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ProjectModule**: Sprint belongs to project
- **ActivityModule**: Logs sprint state changes
- **EventsModule**: Publishes sprint events

**Dependent Modules:**
- **TicketModule**: Tickets are assigned to sprints
- **BoardModule**: Board can filter by sprint

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Manual sprint management (no auto-creation)
- No velocity tracking/predictions
- No burndown chart generation
- Limited sprint metrics

**Possible Enhancements:**
- Auto-create recurring sprints
- Velocity tracking and forecasting
- Sprint templates with auto-populated tickets
- Burndown chart data/visualization
- Sprint retrospectives/notes
- Team capacity planning
- Sprint reports and analytics
