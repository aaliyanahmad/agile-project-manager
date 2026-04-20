# Board Module

## 📌 Overview

The Board module provides kanban board visualization and management. It retrieves tickets grouped by status, allowing teams to see work in progress and move tickets between statuses through the board interface. The board can display tickets for a sprint or the entire backlog.

**Key Responsibilities:**
- Retrieve board data (tickets grouped by status)
- Update ticket status by dragging/updating
- Filter board by sprint
- Paginate board results
- Track board state changes via activity logging

## 🏗 Architecture

### Design Pattern
- **Query-Focused**: BoardService primarily retrieves and transforms data
- **Status Grouping**: Groups tickets by status and category
- **Kanban Visualization**: Supports standard kanban columns

### Key Design Decisions
1. **Status-Based Grouping**: Board organized by project statuses (not hardcoded)
2. **Optional Sprint Filter**: Can view sprint board or backlog board
3. **Pagination Support**: Handle large boards with pagination
4. **Lightweight Operations**: Primarily read operations, minimal writes
5. **Activity Logging**: Status changes logged for audit trail

## 📦 Entities

Uses existing entities:
- **Ticket**: Work items on board
- **Status**: Columns on board
- **Project**: Board context
- **User**: Assignees on tickets

## 📥 DTOs

### UpdateTicketStatusDto
Used to update ticket status.

**Fields:**
- `statusId` (required, UUID): New status ID
- `position` (optional, number): Position within status column

**Validation:**
- Status ID must be valid UUID
- Status must belong to same project as ticket

## ⚙️ Services

### BoardService

**Method: `getBoardData(projectId, sprintId, userId, pagination)`**
- Retrieves all statuses for project
- Groups tickets by status
- Filters by sprint if sprintId provided (or backlog if null)
- Returns board structure with statuses and tickets
- Includes assignees and labels for each ticket

**Method: `updateTicketStatus(ticketId, statusId, userId)`**
- Updates ticket's status
- Validates ticket and status belong to same project
- Logs activity (STATUS_CHANGED)
- Publishes event for notifications
- Returns updated ticket

**Method: `reorderByStatus(reorderData, userId)`**
- Bulk reorder tickets within a status
- Updates positions for multiple tickets
- Uses transaction for atomicity
- Logs each reorder as activity

## 🌐 API Endpoints

### GET `/projects/:projectId/board`
Get board data for project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID
- `sprintId` (query, optional, UUID): Filter by sprint (null = backlog)
- `page` (query, optional, number): Page number
- `limit` (query, optional, number): Items per page

**Response (200 OK):**
```json
{
  "projectId": "uuid",
  "sprintId": "uuid or null",
  "statuses": [
    {
      "id": "uuid",
      "name": "To Do",
      "category": "TODO",
      "position": 0,
      "color": "#808080",
      "tickets": [
        {
          "id": "uuid",
          "ticketKey": "PROJ-1",
          "title": "Implement login",
          "priority": "HIGH",
          "assignees": [
            { "id": "uuid", "name": "John Doe", "avatar": null }
          ],
          "labels": [
            { "id": "uuid", "name": "backend", "color": "#0066CC" }
          ],
          "dueDate": "2026-04-30T23:59:59Z",
          "storyPoints": 5
        }
      ]
    },
    {
      "id": "uuid",
      "name": "In Progress",
      "category": "IN_PROGRESS",
      "position": 1,
      "color": "#0066CC",
      "tickets": [
        {
          "id": "uuid",
          "ticketKey": "PROJ-2",
          "title": "Add password reset",
          "priority": "MEDIUM",
          "assignees": []
        }
      ]
    },
    {
      "id": "uuid",
      "name": "Done",
      "category": "DONE",
      "position": 2,
      "color": "#228B22",
      "tickets": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25
  }
}
```

**Errors:**
- 403: User not member of workspace
- 404: Project not found

### PATCH `/tickets/:ticketId/status`
Update ticket status (move on board).

**Parameters:**
- `ticketId` (path, required, UUID): Ticket ID

**Request Body:**
```json
{
  "statusId": "uuid",
  "position": 0
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": {
      "id": "uuid",
      "name": "In Progress"
    },
    "updatedAt": "2026-04-20T12:30:00Z"
  }
}
```

**Errors:**
- 400: Invalid status for project
- 404: Ticket or status not found

## 🔍 Special Features

### Kanban Visualization
- Tickets organized into columns by status
- Status order determined by `position` field
- Visual indication of status category (TODO, IN_PROGRESS, DONE)

### Sprint vs Backlog
- `sprintId = null`: Show backlog board
- `sprintId = <uuid>`: Show sprint-specific board
- Can view multiple boards (different sprints)

### Visual Information
- **Priority**: Indicated with color/icon
- **Labels**: Visual tags with colors
- **Assignees**: Avatar/initials on ticket
- **Due Date**: Highlighted if overdue
- **Story Points**: Displayed for estimation

### Board Operations
- **Drag and Drop**: Move ticket by updating status and position
- **Status Update**: Change ticket workflow state
- **Reordering**: Organize tickets within status

## ⚠️ Error Handling

**Validation Errors (400):**
- Invalid status for project
- Status not found

**Access Control Errors (403):**
- User not member of workspace

**Not Found (404):**
- Project not found
- Ticket not found
- Status not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ProjectModule**: Board belongs to project
- **TicketModule**: Displays and updates tickets
- **StatusModule**: Defines board columns
- **ActivityModule**: Logs status changes
- **EventsModule**: Publishes status change events

**Dependent Modules:**
- Frontend: Primary consumer of board data

## 🧠 Notes / Future Improvements

**Current Limitations:**
- All tickets loaded (large boards may be slow)
- No filtering within board
- No swimlanes (by assignee, label, etc.)
- No WIP limits visualization
- No time-in-status tracking

**Possible Enhancements:**
- WIP (Work In Progress) limits per status
- Swimlanes by assignee/label/priority
- Color-coded priorities
- Drag-and-drop reordering
- Quick-edit on board (title, assignees)
- Bulk move tickets between statuses
- Board templates
- Historical board data (sprint burndown)
- Filtering and search on board
- Keyboard shortcuts for status movement
