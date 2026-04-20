# Project Activity Module

## 📌 Overview

The Project Activity module provides a project-level activity feed. It retrieves and displays all activities across all tickets in a project, giving team leads and stakeholders visibility into all project changes. This complements the ticket-level activity feed with a broader project perspective.

**Key Responsibilities:**
- Retrieve project-wide activity feed
- Filter activities by ticket
- Support pagination for large activity sets
- Provide aggregated project statistics
- Track activity metadata
- Enable activity-based insights

## 🏗 Architecture

### Design Pattern
- **Query-Focused**: ProjectActivityService primarily retrieves and aggregates data
- **Activity Aggregation**: Combines activity logs from all project tickets
- **Pagination Support**: Handles large activity sets efficiently

### Key Design Decisions
1. **Project-Scoped**: Activity limited to single project
2. **Access Control**: Validate user has project access
3. **Activity Aggregation**: Query across all related activity logs
4. **Metadata Enrichment**: Includes ticket and user information
5. **Sorting**: Activities ordered by timestamp (newest first)

## 📦 Entities

Uses existing entities:
- **ActivityLog**: Individual activity records
- **Ticket**: Associated with each activity
- **User**: User who performed action
- **Project**: Organizational context

## 📥 DTOs

### ProjectActivityResponse
Response format for project activity.

**Fields:**
```typescript
{
  data: ActivityLog[];
  meta: {
    page: number;
    limit: number;
    total: number;
  }
}
```

## ⚙️ Services

### ProjectActivityService

**Method: `getProjectActivity(projectId, pagination, userId)`**
- Retrieves all activities for project
- Validates user access to project
- Fetches activities from project's tickets
- Returns with ticket and user information
- Paginated results
- Ordered by timestamp descending (newest first)

**Process:**
1. Validate project exists and user has access
2. Query all activity logs for project tickets
3. Enrich with ticket and user details
4. Paginate results
5. Return with metadata

**Method: `getActivityStats(projectId)`**
- Calculates activity statistics
- Returns counts by activity type
- Returns most active users
- Returns activity timeline

## 🌐 API Endpoints

### GET `/projects/:projectId/activity`
Get activity feed for a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID
- `page` (query, optional, number): Page number (default: 1)
- `limit` (query, optional, number): Items per page (default: 10, max: 50)

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "ticket": {
        "id": "uuid",
        "ticketKey": "PROJ-15",
        "title": "Add password reset"
      },
      "action": "COMMENT_CREATED",
      "metadata": {
        "commentId": "uuid",
        "preview": "Looks good, let's merge this..."
      },
      "user": {
        "id": "uuid",
        "name": "Jane Smith"
      },
      "createdAt": "2026-04-20T15:30:00Z"
    },
    {
      "id": "uuid",
      "ticketId": "uuid",
      "ticket": {
        "id": "uuid",
        "ticketKey": "PROJ-12",
        "title": "Fix login bug"
      },
      "action": "STATUS_CHANGED",
      "metadata": {
        "from": "IN_PROGRESS",
        "to": "DONE"
      },
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2026-04-20T15:00:00Z"
    },
    {
      "id": "uuid",
      "ticketId": "uuid",
      "ticket": {
        "id": "uuid",
        "ticketKey": "PROJ-10",
        "title": "Setup CI/CD"
      },
      "action": "ASSIGNEE_ADDED",
      "metadata": {
        "assigneeId": "uuid",
        "assigneeName": "Bob Wilson"
      },
      "user": {
        "id": "uuid",
        "name": "Alice Johnson"
      },
      "createdAt": "2026-04-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 127
  }
}
```

**Errors:**
- 403: User not in workspace
- 404: Project not found

## 🔍 Special Features

### Activity Aggregation
- Combines activities from all project tickets
- Unified timeline across project
- Cross-ticket visibility

### Rich Context
- Includes ticket information (key, title)
- User attribution
- Activity metadata (before/after values)
- Timestamp information

### Pagination
- Supports large activity sets
- Default limit 10, maximum 50
- Offset-based pagination

### Sorting
- Newest activities first (descending timestamp)
- Consistent ordering for pagination

## ⚠️ Error Handling

**Access Control Errors (403):**
- User not member of workspace
- User not core member of project

**Not Found (404):**
- Project not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ProjectModule**: Activity scoped to project
- **ActivityModule**: Queries activity logs
- **TicketModule**: Activities relate to tickets

**Dependent Modules:**
- Frontend: Project activity feed display
- **DashboardModule**: May use for recent activity widget

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No activity filtering
- No search within activities
- No activity export
- Limited to recent activities

**Possible Enhancements:**
- Activity filtering (by action type, user, date)
- Search in activity metadata
- Activity export (CSV, PDF)
- Advanced analytics
- Activity metrics dashboard
- Configurable activity retention
- Activity notifications
- Activity webhooks
