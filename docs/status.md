# Status Module

## 📌 Overview

The Status module manages project statuses (workflow states). Statuses represent the different states a ticket can be in throughout its workflow (e.g., TODO, In Progress, Done). Each project has its own set of statuses that can be customized.

**Key Responsibilities:**
- Create project statuses
- Update status information and ordering
- Delete statuses
- List statuses with usage information
- Provide status categories for workflow classification
- Track status position for kanban board ordering

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: StatusService handles business logic
- **Project Scoping**: Statuses belong to projects
- **Category-Based**: Statuses organized by category

### Key Design Decisions
1. **Project-Scoped**: Each project has its own statuses
2. **Categories**: Statuses grouped by category (TODO, IN_PROGRESS, DONE)
3. **Position-Based**: Statuses ordered for board display
4. **Default Statuses**: Projects come with default status set
5. **Color-Coded**: Each status has visual color representation

## 📦 Entities

### Status
Represents a workflow state (column in kanban board).

**Fields:**
- `id` (UUID, PK): Unique identifier
- `projectId` (UUID, FK): Parent project
- `name` (VARCHAR, 100): Status name (e.g., "To Do", "In Progress")
- `category` (ENUM): Status category (TODO, IN_PROGRESS, DONE)
- `position` (NUMERIC): Display order in board
- `color` (VARCHAR, 7, optional): Hex color code
- `createdAt` (TIMESTAMP): Creation timestamp

**Relationships:**
- `project`: Many-to-One with Project
- `tickets`: One-to-Many with Ticket

**Constraints:**
- Foreign key on projectId
- Category must be valid enum (TODO, IN_PROGRESS, DONE)

**Indexes:**
- `idx_status_project_id`: For project statuses
- `idx_status_position`: For ordering

### StatusCategory (Enum)
```
TODO          - Work not started
IN_PROGRESS   - Work in progress
DONE          - Work completed
```

## 📥 DTOs

### CreateStatusDto
Used to create a new status.

**Fields:**
- `name` (required, string, 1-100 chars): Status name
- `category` (required, enum): StatusCategory (TODO, IN_PROGRESS, DONE)
- `color` (optional, hex color, default auto): Hex color code
- `position` (optional, number): Order position

**Validation:**
- Name is required and 1-100 characters
- Category must be valid enum value
- Color must be valid hex format if provided
- At least one status per category expected

### UpdateStatusDto
Used to update existing status.

**Fields:**
- `name` (optional, string): Update name
- `color` (optional, hex color): Update color
- `position` (optional, number): Update position

**Validation:**
- Same as CreateStatusDto for provided fields

### ReorderStatusDto
Used to reorder statuses.

**Fields:**
- `statuses` (required, array): Array of status IDs in new order

**Validation:**
- Must include all statuses for project
- No duplicates

## ⚙️ Services

### StatusService

**Method: `createStatus(projectId, userId, dto)`**
- Creates new status for project
- Validates project exists and user has access
- Assigns position if not provided
- Returns created status

**Method: `getStatuses(projectId, userId)`**
- Lists all statuses for project
- Validates user access
- Includes ticket count for each status
- Ordered by position

**Method: `getStatus(statusId, userId)`**
- Retrieves single status
- Validates user access
- Returns with usage information

**Method: `updateStatus(statusId, userId, dto)`**
- Updates status details
- Cannot change category
- Validates user access
- Returns updated status

**Method: `deleteStatus(statusId, userId)`**
- Deletes status from project
- Validates status has no tickets
- Prevents deletion if tickets exist
- Returns success response

**Method: `reorderStatuses(projectId, userId, reorderDto)`**
- Updates position for multiple statuses
- Uses transaction for atomicity
- Returns reordered statuses

**Method: `getDefaultStatus(projectId, category)`**
- Returns first status in category for project
- Used to assign default status to new tickets

## 🌐 API Endpoints

### POST `/projects/:projectId/statuses`
Create a new status.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Request Body:**
```json
{
  "name": "Code Review",
  "category": "IN_PROGRESS",
  "color": "#FF9800"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "Code Review",
    "category": "IN_PROGRESS",
    "position": 4,
    "color": "#FF9800",
    "ticketCount": 0,
    "createdAt": "2026-04-20T10:00:00Z"
  }
}
```

**Errors:**
- 400: Validation error
- 403: User not in workspace
- 404: Project not found

### GET `/projects/:projectId/statuses`
Get all statuses for a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "To Do",
      "category": "TODO",
      "position": 0,
      "color": "#808080",
      "ticketCount": 12
    },
    {
      "id": "uuid",
      "name": "In Progress",
      "category": "IN_PROGRESS",
      "position": 1,
      "color": "#0066CC",
      "ticketCount": 8
    },
    {
      "id": "uuid",
      "name": "Done",
      "category": "DONE",
      "position": 2,
      "color": "#228B22",
      "ticketCount": 5
    }
  ]
}
```

### GET `/statuses/:statusId`
Get a single status.

**Parameters:**
- `statusId` (path, required, UUID): Status ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "In Progress",
  "category": "IN_PROGRESS",
  "position": 1,
  "color": "#0066CC",
  "ticketCount": 8,
  "createdAt": "2026-04-20T10:00:00Z"
}
```

### PATCH `/statuses/:statusId`
Update a status.

**Parameters:**
- `statusId` (path, required, UUID): Status ID

**Request Body:**
```json
{
  "name": "Review",
  "color": "#FF9800"
}
```

**Response (200 OK):** Updated status object

### DELETE `/statuses/:statusId`
Delete a status.

**Parameters:**
- `statusId` (path, required, UUID): Status ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Status deleted successfully"
}
```

**Errors:**
- 400: Cannot delete status with tickets
- 404: Status not found

### POST `/projects/:projectId/statuses/reorder`
Reorder statuses for a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Request Body:**
```json
{
  "statuses": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "position": 0 },
    { "id": "uuid-2", "position": 1 },
    { "id": "uuid-3", "position": 2 }
  ]
}
```

## 🔍 Special Features

### Status Categories
- **TODO**: Work not started (backlog items)
- **IN_PROGRESS**: Active work (work being done)
- **DONE**: Completed work (finished items)

### Kanban Columns
- Status position determines board column order
- Visual identification via colors
- Supports multiple statuses per category

### Usage Tracking
- Know how many tickets have each status
- Help identify unused statuses
- Support status lifecycle management

### Default Statuses
- Projects created with default statuses:
  1. To Do (TODO, #808080)
  2. In Progress (IN_PROGRESS, #0066CC)
  3. Done (DONE, #228B22)

## ⚠️ Error Handling

**Validation Errors (400):**
- Status name required or invalid
- Invalid category
- Invalid hex color format
- Cannot delete status with tickets

**Access Control Errors (403):**
- User not in workspace

**Not Found (404):**
- Project not found
- Status not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ProjectModule**: Statuses belong to projects

**Dependent Modules:**
- **TicketModule**: Tickets have statuses
- **BoardModule**: Board displays by status
- **SearchModule**: Can filter by status

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Cannot have status without category
- No status workflows/rules
- Cannot prevent status transitions (free movement)
- No conditional status logic
- Limited to three categories

**Possible Enhancements:**
- Status workflows (define valid transitions)
- Conditional status rules (based on fields)
- Custom categories
- Status templates
- Workflow automation (auto-transition)
- Status SLAs (service level agreements)
- Stage gates (prevent movement without conditions)
- Status reports/analytics
- Custom properties per status
