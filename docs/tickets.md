# Tickets Module

## 📌 Overview

The Tickets module is the **core domain entity** of the agile project manager. It handles all operations related to creating, updating, retrieving, and managing tickets (work items) within projects. Tickets can represent user stories, bugs, tasks, or any unit of work, and support advanced features like subtasks, assignments, labels, attachments, sprinting, and activity logging.

**Key Responsibilities:**
- Create and manage tickets with priorities, statuses, and due dates
- Support hierarchical tickets (parent-child relationships via subtasks)
- Handle ticket ordering (position-based for backlog, sprint-based for sprints)
- Bulk operations for efficient batch updates
- Assignment management (assigning users to tickets)
- Label management (tagging tickets)
- Activity logging for all state changes
- Integration with search, events, and notifications

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: The `TicketService` acts as the business logic layer, using injected repositories for data access
- **Dependency Injection**: All external services (ActivityService, EventPublisherService, SearchService) are injected into the service
- **Transaction Handling**: Bulk operations use database transactions for atomicity
- **Validation**: All user inputs are validated at the DTO layer using class-validator decorators

### Key Design Decisions
1. **Subtask Limitation**: Only one level of subtasks allowed (no nested subtasks of subtasks)
2. **Sprint vs Backlog**: `sprintId = null` indicates backlog; otherwise, ticket belongs to a sprint
3. **Position System**: Backlog tickets use numeric `position` for ordering; sprint tickets use implicit ordering
4. **Status Categories**: Statuses are grouped into categories (TODO, IN_PROGRESS, DONE) for workflow classification
5. **Workspace Isolation**: All operations validate that users belong to the ticket's workspace

### Data Flow
```
API Request
  ↓
Controller (validates JWT, extracts user)
  ↓
TicketService (business logic, validation)
  ↓
Repositories (database operations)
  ↓
ActivityService (logs changes)
  ↓
EventPublisherService (triggers events)
  ↓
Response
```

## 📦 Entities

### Ticket
Primary entity for work items.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `projectId` (UUID, FK): Parent project
- `ticketKey` (VARCHAR, unique): Human-readable key (e.g., "PROJ-1")
- `title` (VARCHAR, 200): Ticket title (required)
- `description` (TEXT): Detailed description (optional)
- `statusId` (UUID, FK): Current status
- `priority` (ENUM): Priority level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
- `sprintId` (UUID, FK, nullable): Sprint assignment; NULL = backlog
- `position` (NUMERIC, nullable): Position in backlog (for ordering)
- `dueDate` (TIMESTAMP, nullable): Due date
- `parentTicketId` (UUID, FK, nullable): Parent ticket for subtasks
- `storyPoints` (NUMERIC, nullable): Estimation for sprint planning
- `createdById` (UUID, FK): User who created the ticket
- `aiUserStory` (TEXT, nullable): AI-generated user story (cached)
- `createdAt` (TIMESTAMP): Creation timestamp
- `updatedAt` (TIMESTAMP): Last update timestamp

**Relationships:**
- `project`: Many-to-One with Project (CASCADE on delete)
- `sprint`: Many-to-One with Sprint (SET NULL on delete)
- `status`: Many-to-One with Status (RESTRICT on delete)
- `createdBy`: Many-to-One with User (RESTRICT on delete)
- `assignees`: Many-to-Many with User (via ticket_assignees join table)
- `labels`: Many-to-Many with Label (via ticket_labels join table)
- `comments`: One-to-Many with Comment
- `activities`: One-to-Many with ActivityLog
- `attachments`: One-to-Many with Attachment

**Indexes:**
- `idx_ticket_project_id`: For project filtering
- `idx_ticket_sprint_id`: For sprint filtering
- `idx_ticket_position`: For backlog ordering
- `idx_ticket_due_date`: For date-based queries
- `idx_ticket_status_id`: For status filtering
- `idx_ticket_parent_ticket_id`: For subtask queries
- `idx_ticket_priority`: For priority filtering
- `idx_ticket_title`: For text search
- `idx_ticket_ticket_key`: For quick lookup
- `idx_ticket_description`: For text search
- `idx_ticket_project_status_priority`: Composite index for common queries

## 📥 DTOs (Data Transfer Objects)

### CreateTicketDto
Used to create a new ticket in a project.

**Fields:**
- `title` (required, string, min 3 chars): Ticket title
- `description` (optional, string): Ticket description
- `priority` (optional, enum): Priority level (default: MEDIUM)
- `dueDate` (optional, ISO8601 string): Due date in ISO format
- `assigneeIds` (optional, UUID array): List of assignee user IDs

**Validation:**
- Title is required and must be at least 3 characters
- Due date must be valid ISO 8601 format
- Assignee IDs must be valid UUIDs
- Assignee IDs must be unique within the array

### UpdateTicketDto
Used to update an existing ticket (partial update).

**Fields:**
- `title` (optional, string, min 3 chars)
- `description` (optional, string)
- `priority` (optional, enum)
- `dueDate` (optional, ISO 8601 string)
- `assigneeIds` (optional, UUID array)
- `labelIds` (optional, UUID array)
- `storyPoints` (optional, number)

**Validation:**
- All fields are optional (supports partial updates)
- Same validation rules apply to provided fields

### GetTicketsQueryDto
Used to filter and retrieve tickets.

**Fields:**
- `page` (optional, number): Page for pagination (default: 1)
- `limit` (optional, number): Items per page (default: 10, max: 50)
- `status` (optional, string): Filter by status ID
- `priority` (optional, enum): Filter by priority
- `assignee` (optional, UUID): Filter by assignee ID
- `sprint` (optional, UUID): Filter by sprint ID
- `search` (optional, string): Search in title and description
- `dueDateFrom` (optional, ISO8601): Filter due dates >= this date
- `dueDateTo` (optional, ISO8601): Filter due dates <= this date

**Validation:**
- Page and limit must be positive integers
- Limit cannot exceed 50
- Date ranges must be valid ISO 8601 format

### MoveTicketToSprintDto
Used to move a ticket from backlog to a sprint (or between sprints).

**Fields:**
- `sprintId` (required, UUID): Target sprint ID
- `position` (optional, number): Position in the new sprint

**Validation:**
- Sprint ID must be a valid UUID
- Sprint must belong to the same project

### ReorderTicketDto
Used to reorder tickets within backlog or sprint.

**Fields:**
- `newPosition` (required, number): New position for the ticket
- `sprintId` (optional, UUID): If provided, reorder within specific sprint

**Validation:**
- Position must be a non-negative number

### BulkTicketActionDto
Used for bulk operations on multiple tickets.

**Enum: BulkActionType**
- `ASSIGN`: Assign user to tickets
- `PRIORITY`: Change priority for tickets
- `MOVE_TO_SPRINT`: Move tickets to a sprint
- `MOVE_TO_BACKLOG`: Move tickets back to backlog

**Fields:**
- `ticketIds` (required, UUID array, non-empty): List of ticket IDs to update
- `action` (required, enum): Action type to apply
- `payload` (required, object): Action-specific data
  - For `ASSIGN`: `{ assigneeId: UUID }`
  - For `PRIORITY`: `{ priority: TicketPriority }`
  - For `MOVE_TO_SPRINT`: `{ sprintId: UUID }`
  - For `MOVE_TO_BACKLOG`: `{ }` (empty payload)

**Validation:**
- Ticket IDs must be non-empty and contain valid UUIDs
- Action must be from the enum
- Payload must match the action type

### BulkActionResponse
Response returned after bulk operations.

**Fields:**
- `success` (boolean): Whether operation succeeded
- `updatedCount` (number): Number of tickets updated
- `failedCount` (number): Number of tickets that failed
- `errors` (array, optional): List of error messages

### AssignLabelsDto
Used to assign or remove labels from a ticket.

**Fields:**
- `labelIds` (required, UUID array): List of label IDs to assign
- `replace` (optional, boolean, default: false): If true, replaces all labels; if false, adds to existing

**Validation:**
- Label IDs must be valid UUIDs
- All label IDs must exist in the project

### CreateSubtaskDto
Used to create a subtask for a parent ticket.

**Fields:**
- `title` (required, string, min 3 chars): Subtask title
- `description` (optional, string): Subtask description
- `priority` (optional, enum): Priority level (default: MEDIUM)
- `statusId` (optional, UUID): Status for subtask (default: project's TODO status)
- `assigneeIds` (optional, UUID array): Assignees for the subtask

**Validation:**
- Title is required and must be at least 3 characters
- Status must belong to the same project as parent ticket
- Cannot create subtask of a subtask (one level only)
- All assignees must exist in the workspace

## ⚙️ Services

### TicketService

**Method: `createTicket(projectId, userId, dto)`**
- Creates a new ticket in a project
- Validates user is in workspace and project exists
- Generates unique ticket key (e.g., "PROJ-1")
- Sets default status to project's TODO status if not provided
- Assigns specified users to the ticket
- Logs activity (TICKET_CREATED)
- Publishes event for notification system
- Returns created ticket with full relations

**Method: `updateTicket(ticketId, userId, dto)`**
- Updates existing ticket (partial update)
- Validates user has access to ticket
- Can update title, description, priority, due date, assignees, labels
- Logs activity for each changed field
- Publishes update event
- Returns updated ticket

**Method: `getTicket(ticketId, userId)`**
- Retrieves a ticket with all relations
- Includes assignees, labels, comments, attachments
- Validates user access to workspace
- Returns ticket detail including parent/subtask info

**Method: `getTicketsForSprint(sprintId, userId, pagination)`**
- Returns all tickets in a sprint with pagination
- Ordered by position/date
- Includes full ticket relations
- Validates user and sprint access

**Method: `getBacklog(projectId, userId, pagination)`**
- Returns all backlog tickets (where sprintId = null)
- Ordered by position
- Supports filtering and pagination
- Returns with assignees and labels

**Method: `createSubtask(parentId, userId, dto)`**
- Creates a subtask for a parent ticket
- Enforces one-level-only rule (cannot create subtask of subtask)
- Validates status belongs to parent's project
- Logs activity
- Returns subtask with relations

**Method: `getSubtasks(ticketId, userId)`**
- Retrieves all subtasks for a ticket
- Returns subtask list with status and assignees
- Ordered by creation date

**Method: `getTicketDetailWithSubtasks(ticketId, userId)`**
- Comprehensive ticket retrieval
- Includes parent ticket info if it's a subtask
- Includes all subtasks with completion summary
- Returns attachments with uploader info
- Used for detail view in frontend

**Method: `moveTicketToSprint(ticketId, sprintId, userId)`**
- Moves ticket from backlog to sprint
- Validates sprint belongs to same project
- Updates position in sprint
- Logs activity
- Returns updated ticket

**Method: `reorderTickets(tickets, userId)`**
- Reorders tickets within backlog or sprint
- Accepts array of ticket IDs with new positions
- Uses transaction for atomicity
- Logs activity for each reorder

**Method: `deleteTicket(ticketId, userId)`**
- Soft or hard deletes a ticket
- Cascades to comments, activity logs
- Logs deletion activity
- Validates user ownership

**Method: `bulkUpdateTickets(projectId, userId, bulkActionDto)`**
- Performs bulk operations on multiple tickets
- Supports ASSIGN, PRIORITY, MOVE_TO_SPRINT, MOVE_TO_BACKLOG actions
- Uses transaction for atomicity
- Returns count of updated/failed tickets
- Logs activity for each update

**Method: `assignLabels(ticketId, labelIds, userId, replace)`**
- Assigns labels to a ticket
- If replace=true, replaces all labels; else adds to existing
- Logs activity
- Returns updated ticket

**Method: `getTicketsByFilter(projectId, userId, filterDto, pagination)`**
- Advanced filtering for tickets
- Supports filtering by status, priority, assignee, sprint, date range
- Full-text search in title and description
- Paginated results

**Helper Method: `validateUserInWorkspace(userId, workspaceId)`**
- Checks if user belongs to workspace
- Throws ForbiddenException if not
- Used in all methods for access control

**Helper Method: `generateTicketKey(projectId, projectKey)`**
- Generates unique ticket key (e.g., "PROJ-1", "PROJ-2")
- Finds next sequential number for project
- Returns formatted key

## 🌐 API Endpoints

### POST `/projects/:projectId/tickets`
Create a ticket in a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Request Body:**
```json
{
  "title": "Fix login bug",
  "description": "Users cannot log in with Google auth",
  "priority": "HIGH",
  "dueDate": "2026-04-30T23:59:59Z",
  "assigneeIds": ["uuid-1", "uuid-2"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "ticketKey": "PROJ-1",
    "title": "Fix login bug",
    "priority": "HIGH",
    "status": { "id": "uuid", "name": "TODO" },
    "assignees": [{ "id": "uuid", "name": "John Doe" }],
    "createdAt": "2026-04-20T10:00:00Z",
    "updatedAt": "2026-04-20T10:00:00Z"
  }
}
```

**Errors:**
- 400: Validation error or project not found
- 401: Unauthorized
- 403: User not in workspace

### GET `/projects/:projectId/backlog`
Get backlog tickets for a project (paginated).

**Parameters:**
- `projectId` (path, required, UUID): Project ID
- `page` (query, optional, number): Page number (default: 1)
- `limit` (query, optional, number): Items per page (default: 10, max: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketKey": "PROJ-1",
      "title": "Ticket title",
      "priority": "MEDIUM",
      "status": { "id": "uuid", "name": "TODO" },
      "assignees": [{ "id": "uuid", "name": "John Doe" }],
      "position": 0,
      "dueDate": "2026-04-30T23:59:59Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### GET `/projects/:projectId/sprints/:sprintId/tickets`
Get all tickets in a sprint (paginated).

**Parameters:**
- `projectId` (path, required, UUID): Project ID
- `sprintId` (path, required, UUID): Sprint ID
- `page` (query, optional, number): Page number
- `limit` (query, optional, number): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketKey": "PROJ-1",
      "title": "Ticket title",
      "status": { "id": "uuid", "name": "IN_PROGRESS" },
      "assignees": []
    }
  ],
  "meta": { "page": 1, "limit": 10, "total": 15 }
}
```

### GET `/tickets/:id`
Get a single ticket with all details and subtasks.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "ticketKey": "PROJ-1",
  "title": "Fix login bug",
  "description": "Users cannot log in",
  "priority": "HIGH",
  "status": { "id": "uuid", "name": "IN_PROGRESS", "category": "IN_PROGRESS" },
  "assignees": [{ "id": "uuid", "name": "Jane Smith" }],
  "labels": [{ "id": "uuid", "name": "bug", "color": "#FF0000" }],
  "subtasks": [
    {
      "id": "uuid",
      "title": "Subtask 1",
      "status": { "name": "TODO" },
      "assignees": []
    }
  ],
  "subtaskCompletion": { "total": 2, "completed": 1 },
  "attachments": [
    {
      "id": "uuid",
      "fileName": "screenshot.png",
      "fileUrl": "/uploads/uuid",
      "fileSize": 102400,
      "uploadedBy": { "id": "uuid", "name": "John Doe" }
    }
  ],
  "dueDate": "2026-04-30T23:59:59Z",
  "createdAt": "2026-04-20T10:00:00Z",
  "updatedAt": "2026-04-22T14:30:00Z"
}
```

### PATCH `/tickets/:id`
Update a ticket (partial update).

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Request Body:**
```json
{
  "title": "Updated title",
  "priority": "LOW",
  "assigneeIds": ["uuid"],
  "labelIds": ["uuid"]
}
```

**Response (200 OK):** Updated ticket object

### DELETE `/tickets/:id`
Delete a ticket.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Ticket deleted successfully"
}
```

### POST `/tickets/:id/move-to-sprint`
Move a ticket to a sprint.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Request Body:**
```json
{
  "sprintId": "uuid",
  "position": 0
}
```

**Response (200 OK):** Updated ticket object

### POST `/tickets/:id/reorder`
Reorder a ticket within backlog or sprint.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Request Body:**
```json
{
  "newPosition": 5,
  "sprintId": "uuid"
}
```

**Response (200 OK):** Updated ticket object

### POST `/tickets/bulk-update`
Perform bulk operations on multiple tickets.

**Request Body:**
```json
{
  "ticketIds": ["uuid-1", "uuid-2", "uuid-3"],
  "action": "PRIORITY",
  "payload": {
    "priority": "HIGH"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "updatedCount": 3,
  "failedCount": 0
}
```

### POST `/tickets/:parentId/subtasks`
Create a subtask for a parent ticket.

**Parameters:**
- `parentId` (path, required, UUID): Parent ticket ID

**Request Body:**
```json
{
  "title": "Implement password recovery",
  "description": "Add password recovery flow",
  "priority": "MEDIUM",
  "assigneeIds": ["uuid"]
}
```

**Response (201 Created):** Subtask object

### GET `/tickets/:id/subtasks`
Get all subtasks for a ticket.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Subtask 1",
      "status": { "id": "uuid", "name": "TODO" },
      "assignees": []
    }
  ]
}
```

### POST `/tickets/:id/labels`
Assign labels to a ticket.

**Parameters:**
- `id` (path, required, UUID): Ticket ID

**Request Body:**
```json
{
  "labelIds": ["uuid-1", "uuid-2"],
  "replace": false
}
```

**Response (200 OK):** Updated ticket object

## 🔍 Special Features

### Position-Based Ordering
- **Backlog tickets** have a numeric `position` field for ordering
- **Sprint tickets** are ordered implicitly by creation/assignment
- Moving tickets between backlog and sprint requires position updates

### Subtask Support
- Tickets can have subtasks (one level only)
- Subtasks inherit project but can have different status/assignees
- Subtask completion tracked as ratio (completed/total)
- Cannot create subtask of a subtask

### Bulk Operations
- Efficiently update multiple tickets in a single transaction
- Atomic operations: all succeed or all fail
- Supports ASSIGN, PRIORITY, MOVE_TO_SPRINT, MOVE_TO_BACKLOG

### Activity Logging
- Every state change creates an ActivityLog entry
- Logs tracked changes: title, status, priority, assignees, labels, due date
- Used for audit trail and activity feed

### Integration with Other Modules
- **Search Module**: Full-text search across ticket title and description
- **AI Module**: Generate user stories using Gemini API
- **Events Module**: Publish events for notifications and webhooks
- **Activity Module**: Log all changes for audit trail

## ⚠️ Error Handling

**Common Exceptions:**
- `NotFoundException`: Ticket, project, sprint, or status not found
- `BadRequestException`: Validation error, invalid sprint/status, circular reference (subtask)
- `ForbiddenException`: User not in workspace or insufficient permissions
- `ConflictException`: Status or project constraint violation

**Validation Errors (400):**
- Title too short or empty
- Invalid priority enum
- Invalid date format
- Duplicate ticket in sprint
- Subtask of subtask attempt

**Access Control Errors (403):**
- User not in workspace
- User not member of project
- Insufficient workspace role

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ActivityModule**: Logs all ticket changes
- **EventsModule**: Publishes events for notifications
- **SearchModule**: Provides full-text search functionality
- **ProjectModule**: Validates project existence and access

**Dependent Modules:**
- **BoardModule**: Uses Ticket for board visualization
- **SprintModule**: Manages sprint-ticket relationships
- **CommentModule**: Manages comments on tickets
- **AttachmentsModule**: Manages file attachments to tickets
- **DashboardModule**: Aggregates ticket data for dashboard

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Subtask depth limited to one level
- No direct ticket-to-ticket linking (dependency tracking)
- No time tracking (hours spent)
- Status transitions not enforced (can move from any status to any status)

**Possible Enhancements:**
- Task dependencies (blocking/blocked by relationships)
- Time estimation and tracking
- Status workflow configuration
- Custom fields per project
- Bulk import from CSV/Excel
- Ticket cloning/templating
- Recurring tickets
- Integration with external systems (Jira, GitHub Issues)
- Collaborative editing / real-time updates
