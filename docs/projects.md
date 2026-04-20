# Projects Module

## 📌 Overview

The Projects module manages project-level operations and settings. A project is a container within a workspace that holds tickets, sprints, statuses, and labels. It serves as the primary organizational unit for work management and provides the context for all ticket-related operations.

**Key Responsibilities:**
- Create and manage projects within workspaces
- Define default statuses for projects
- Associate tickets, sprints, and labels with projects
- Enforce project-level access control
- Generate unique project keys for ticket numbering
- Provide project listing and filtering

## 🏗 Architecture

### Design Pattern
- **Hierarchical Organization**: Workspace → Projects → Tickets/Sprints
- **Service-Repository Pattern**: ProjectService handles business logic
- **Access Control**: Workspace member validation via WorkspaceMemberGuard

### Key Design Decisions
1. **Unique Project Keys**: Each project has a unique key (e.g., "PROJ") for ticket numbering
2. **Default Statuses**: Each project has a set of default statuses (TODO, IN_PROGRESS, DONE)
3. **Project Isolation**: Projects inherit workspace isolation
4. **Ticket Key Generation**: Project key is prefix for all ticket numbers (PROJ-1, PROJ-2, etc.)

## 📦 Entities

### Project
Represents a project within a workspace.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `workspaceId` (UUID, FK): Parent workspace
- `name` (VARCHAR, 200): Project name
- `key` (VARCHAR, 20, unique): Unique project key (e.g., "PROJ")
- `description` (TEXT): Project description
- `createdAt` (TIMESTAMP): Creation timestamp

**Relationships:**
- `workspace`: Many-to-One with Workspace
- `sprints`: One-to-Many with Sprint
- `statuses`: One-to-Many with Status
- `tickets`: One-to-Many with Ticket
- `labels`: One-to-Many with Label

**Constraints:**
- Unique index on `key` field
- Foreign key constraint on `workspaceId`

**Notes:**
- Should add unique constraint: `UNIQUE(workspace_id, LOWER(TRIM(name)))` via migration

## 📥 DTOs

### CreateProjectDto
Used to create a new project.

**Fields:**
- `name` (required, string, 1-200 chars): Project name
- `key` (required, string, 2-10 chars): Project key for ticket numbering
- `description` (optional, string): Project description

**Validation:**
- Name is required and 1-200 characters
- Key is required, 2-10 characters, alphanumeric
- Key must be unique
- Description is optional

## ⚙️ Services

### ProjectService

**Method: `createProject(workspaceId, dto)`**
- Creates a new project in workspace
- Validates workspace exists
- Generates or validates unique project key
- Creates default statuses (TODO, IN_PROGRESS, DONE) for project
- Returns created project

**Method: `getProjectsInWorkspace(workspaceId, pagination)`**
- Lists all projects in workspace
- Includes ticket count and sprint count
- Paginated results
- Ordered by creation date

**Method: `getProject(projectId, userId)`**
- Retrieves project details
- Validates user is member of project's workspace
- Includes statuses and active sprint info

**Method: `updateProject(projectId, dto, userId)`**
- Updates project details
- Can update name, description, key
- Validates user has workspace access
- Returns updated project

**Method: `deleteProject(projectId, userId)`**
- Deletes project and cascades to all related data
- Cascades to tickets, sprints, statuses, labels
- Validates user ownership/permissions
- Logs activity

**Method: `getProjectStatuses(projectId, userId)`**
- Returns all statuses for project
- Ordered by position
- Includes usage count (# of tickets with status)

## 🌐 API Endpoints

### POST `/workspaces/:workspaceId/projects`
Create a new project.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID

**Request Body:**
```json
{
  "name": "Mobile App",
  "key": "MOB",
  "description": "Mobile application for iOS and Android"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "workspaceId": "uuid",
    "name": "Mobile App",
    "key": "MOB",
    "description": "Mobile application...",
    "createdAt": "2026-04-20T10:00:00Z",
    "ticketCount": 0,
    "sprintCount": 0
  }
}
```

**Errors:**
- 400: Validation error (name/key invalid or duplicate)
- 401: Unauthorized
- 403: User not member of workspace
- 404: Workspace not found

### GET `/workspaces/:workspaceId/projects`
Get all projects in a workspace.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID
- `page` (query, optional, number): Page number (default: 1)
- `limit` (query, optional, number): Items per page (default: 10, max: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mobile App",
      "key": "MOB",
      "description": "...",
      "createdAt": "2026-04-20T10:00:00Z",
      "ticketCount": 25,
      "sprintCount": 3
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

**Errors:**
- 403: User not member of workspace
- 404: Workspace not found

### GET `/projects/:projectId`
Get project details.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Mobile App",
  "key": "MOB",
  "description": "...",
  "workspaceId": "uuid",
  "createdAt": "2026-04-20T10:00:00Z",
  "statuses": [
    {
      "id": "uuid",
      "name": "TODO",
      "category": "TODO",
      "position": 0,
      "ticketCount": 5
    },
    {
      "id": "uuid",
      "name": "In Progress",
      "category": "IN_PROGRESS",
      "position": 1,
      "ticketCount": 8
    }
  ],
  "stats": {
    "totalTickets": 25,
    "activeSprints": 1,
    "completedTickets": 12
  }
}
```

### PATCH `/projects/:projectId`
Update project details.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Request Body:**
```json
{
  "name": "Mobile App v2",
  "description": "Updated description"
}
```

**Response (200 OK):** Updated project object

**Errors:**
- 400: Validation error
- 403: User not member of workspace
- 404: Project not found

### DELETE `/projects/:projectId`
Delete a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Errors:**
- 403: Insufficient permissions
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
      "ticketCount": 5
    },
    {
      "id": "uuid",
      "name": "In Progress",
      "category": "IN_PROGRESS",
      "position": 1,
      "color": "#0066CC",
      "ticketCount": 8
    }
  ]
}
```

## 🔍 Special Features

### Unique Project Keys
- Project key is human-readable identifier (e.g., "MOB", "WEB", "API")
- Used as prefix for all ticket keys (MOB-1, MOB-2, WEB-1)
- Ensures globally unique ticket identification within project

### Default Statuses
- Each project automatically gets default statuses: TODO, IN_PROGRESS, DONE
- Can add custom statuses per project
- Statuses organized by category (workflow progression)

### Project Hierarchy
```
Workspace
  └─ Project
      ├─ Sprints
      ├─ Tickets
      ├─ Statuses
      └─ Labels
```

## ⚠️ Error Handling

**Validation Errors (400):**
- Project name required or invalid
- Project key required, invalid format, or duplicate
- Description exceeds maximum length

**Access Control Errors (403):**
- User not member of workspace
- Insufficient permissions to modify

**Not Found (404):**
- Project not found
- Workspace not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **WorkspaceModule**: Project belongs to workspace
- **ProjectModule**: Validates workspace membership

**Dependent Modules:**
- **TicketModule**: All tickets belong to projects
- **SprintModule**: All sprints belong to projects
- **StatusModule**: Statuses are project-scoped
- **LabelsModule**: Labels are project-scoped
- **BoardModule**: Board displays project tickets
- **DashboardModule**: Dashboard aggregates project data

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No project templates
- No project-level settings (workflows, custom fields)
- No project permissions (all workspace members have same access)

**Possible Enhancements:**
- Project visibility levels (public, private)
- Project templates for faster setup
- Custom workflow configurations
- Project-level features (analytics, integrations)
- Project leads/assignees
- Archived projects
