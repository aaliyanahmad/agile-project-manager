# Activity Module

## 📌 Overview

The Activity module provides comprehensive audit logging for the entire system. It tracks all meaningful changes to tickets, enabling teams to see what changed, who changed it, and when. The activity log is essential for compliance, debugging, and understanding ticket evolution.

**Key Responsibilities:**
- Log all ticket state changes
- Provide activity feed for tickets and projects
- Track metadata about changes (before/after values)
- Support activity retrieval with filtering and pagination
- Enable audit trail functionality

## 🏗 Architecture

### Design Pattern
- **Event-Driven Logging**: Activities logged whenever important actions occur
- **Metadata Tracking**: Changes include before/after values for audit
- **Non-Blocking**: Activity logging doesn't block main operations
- **Immutable Records**: Activity logs cannot be modified

### Key Design Decisions
1. **Immutable Logs**: Activity records cannot be deleted or modified (audit compliance)
2. **Metadata Storage**: Changes stored as JSON for flexibility
3. **Event Integration**: Activities triggered by domain events
4. **Selective Logging**: Only significant changes logged (not every timestamp update)
5. **User Attribution**: All activities attributed to a specific user

## 📦 Entities

### ActivityLog
Represents a single activity/change event.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `ticketId` (UUID, FK): Related ticket
- `userId` (UUID, FK): User who made the change
- `action` (ENUM): Type of action (TICKET_CREATED, STATUS_CHANGED, PRIORITY_CHANGED, etc.)
- `metadata` (JSON): Additional data about the change (e.g., {from: "TODO", to: "IN_PROGRESS"})
- `createdAt` (TIMESTAMP): Action timestamp
- `updatedAt` (TIMESTAMP): Record update timestamp

**Relationships:**
- `ticket`: Many-to-One with Ticket
- `user`: Many-to-One with User (who performed action)

**Indexes:**
- `idx_activity_ticket_id`: For retrieving ticket activity
- `idx_activity_user_id`: For user activity
- `idx_activity_created_at`: For time-based sorting

### ActivityAction (Enum)
```
TICKET_CREATED
TICKET_UPDATED
TICKET_DELETED
STATUS_CHANGED
PRIORITY_CHANGED
ASSIGNEE_ADDED
ASSIGNEE_REMOVED
LABEL_ADDED
LABEL_REMOVED
DUE_DATE_CHANGED
DESCRIPTION_CHANGED
TITLE_CHANGED
MOVED_TO_SPRINT
MOVED_TO_BACKLOG
COMMENT_CREATED
COMMENT_UPDATED
COMMENT_DELETED
ATTACHMENT_ADDED
ATTACHMENT_DELETED
SUBTASK_CREATED
TICKET_REORDERED
```

## 📥 DTOs

None - ActivityLog is write-only from service perspective.

## ⚙️ Services

### ActivityService

**Method: `log(logDto)`**
- Creates new activity log entry
- Called by other services when changes occur
- Non-blocking operation (ideally async)
- Records user, action, and metadata

**DTO Format:**
```typescript
{
  ticketId: string;
  userId: string;
  action: ActivityAction;
  metadata?: Record<string, any>;
}
```

**Method: `getTicketActivity(ticketId, userId, pagination)`**
- Retrieves all activities for a ticket
- Validates user access
- Ordered by timestamp descending (newest first)
- Includes user details for each activity
- Paginated results

**Method: `getActivity(activityId, userId)`**
- Retrieves single activity entry
- Validates user access to related ticket
- Returns with full details

**Method: `projectActivity(projectId, userId, pagination)`**
- Retrieves all activities in project
- Filters tickets from project
- Includes ticket and user information
- Paginated results

## 🌐 API Endpoints

### GET `/tickets/:ticketId/activity`
Get activity log for a ticket.

**Parameters:**
- `ticketId` (path, required, UUID): Ticket ID
- `page` (query, optional, number): Page number (default: 1)
- `limit` (query, optional, number): Items per page (default: 10, max: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "action": "STATUS_CHANGED",
      "metadata": {
        "from": "TODO",
        "to": "IN_PROGRESS"
      },
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2026-04-20T14:30:00Z"
    },
    {
      "id": "uuid",
      "ticketId": "uuid",
      "action": "ASSIGNEE_ADDED",
      "metadata": {
        "assigneeId": "uuid",
        "assigneeName": "Jane Smith"
      },
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2026-04-20T13:15:00Z"
    },
    {
      "id": "uuid",
      "ticketId": "uuid",
      "action": "TICKET_CREATED",
      "metadata": {
        "title": "Fix login bug"
      },
      "user": {
        "id": "uuid",
        "name": "Jane Smith"
      },
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

**Errors:**
- 403: User not in workspace
- 404: Ticket not found

### GET `/projects/:projectId/activity`
Get activity feed for a project.

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
      "ticketId": "uuid",
      "ticket": {
        "id": "uuid",
        "ticketKey": "PROJ-1",
        "title": "Fix login bug"
      },
      "action": "STATUS_CHANGED",
      "metadata": {
        "from": "TODO",
        "to": "IN_PROGRESS"
      },
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2026-04-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45
  }
}
```

## 🔍 Special Features

### Metadata Tracking
- Activities include "before" and "after" values for changes
- Full context preserved for debugging
- JSON format allows flexible data storage

**Example Metadata:**
- STATUS_CHANGED: `{from: "TODO", to: "IN_PROGRESS"}`
- ASSIGNEE_ADDED: `{userId: "uuid", name: "John Doe"}`
- PRIORITY_CHANGED: `{from: "MEDIUM", to: "HIGH"}`
- DUE_DATE_CHANGED: `{from: "2026-04-30", to: "2026-05-07"}`

### Audit Trail
- Complete history of all ticket changes
- Immutable records for compliance
- User attribution for accountability
- Timestamped entries

### Activity Feed
- Chronological feed of all changes
- Newest activities first
- Used for recent activity dashboard widget
- Project-level view shows all activity

## ⚠️ Error Handling

**Access Control Errors (403):**
- User not in workspace
- Cannot access activity from different workspace

**Not Found (404):**
- Ticket not found
- Activity entry not found

## 🔗 Relationships with Other Modules

**Dependen Modules:**
- **TicketModule**: Logs all ticket changes
- **CommentModule**: Logs comment creation/updates
- **BoardModule**: Logs status changes
- **SprintModule**: Logs sprint state changes
- **AttachmentsModule**: Logs attachment additions/deletions

**Dependent Modules:**
- **DashboardModule**: Displays recent activity
- **ProjectActivityModule**: Activity feed endpoint
- Frontend: Activity timeline/feed display

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No activity filtering by action type
- No bulk activity analysis
- Activity not searchable
- No export functionality

**Possible Enhancements:**
- Advanced filtering (by action, date range, user)
- Activity rollback/undo (if safe)
- Bulk operations history
- Audit report generation
- Activity webhooks for external systems
- Real-time activity Push notifications
- Diff view for specific changes
- Activity export (CSV, PDF)
- Advanced search in activity logs
