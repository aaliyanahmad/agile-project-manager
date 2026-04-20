# Dashboard Module

## 📌 Overview

The Dashboard module provides project-level analytics and key metrics. It aggregates data from across the project to give team leads and stakeholders a high-level view of project health, sprint progress, and recent activity.

**Key Responsibilities:**
- Aggregate project statistics
- Calculate sprint progress metrics
- Track overdue tickets
- Generate recent activity feed
- Provide dashboard summarization
- Calculate project health indicators

## 🏗 Architecture

### Design Pattern
- **Data Aggregation**: Queries multiple entities to compile dashboard data
- **Read-Only**: Dashboard is primarily read operations
- **Performance-Optimized**: Uses efficient aggregates and indexes
- **Cacheable**: Dashboard data can be cached for performance

## 📦 Entities

Uses existing entities:
- **Ticket**: For calculating counts and status
- **Sprint**: For sprint progress
- **ActivityLog**: For recent activity
- **Status**: For status categories

## 📥 DTOs

None - Dashboard is read-only

## ⚙️ Services

### DashboardService

**Method: `getDashboard(projectId, userId)`**
- Retrieves complete dashboard data
- Validates user access to project
- Aggregates all project metrics
- Includes recent activity
- Returns structured dashboard object

**Data Compiled:**
- Backlog count (tickets with sprintId = null)
- Active sprint info (if any):
  - Sprint name, ID, status
  - Total tickets in sprint
  - Status breakdown (TODO, IN_PROGRESS, DONE)
  - Burn-down data
  - Velocity (story points completed)
- Overdue tickets count (dueDate < today and status != DONE)
- Recent activity (latest 10-20 activities)
- Project statistics:
  - Total tickets
  - Completed tickets
  - Average cycle time
  - Completion rate

## 🌐 API Endpoints

### GET `/projects/:projectId/dashboard`
Get project dashboard data.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Response (200 OK):**
```json
{
  "backlogCount": 12,
  "activeSprint": {
    "id": "uuid",
    "name": "Sprint 1",
    "status": "ACTIVE",
    "startDate": "2026-04-20",
    "endDate": "2026-05-03",
    "totalTickets": 10,
    "statusBreakdown": {
      "TODO": 3,
      "IN_PROGRESS": 4,
      "DONE": 3
    },
    "velocity": 35,
    "completionRate": 0.6
  },
  "overdueCount": 2,
  "recentActivity": [
    {
      "id": "uuid",
      "action": "STATUS_CHANGED",
      "ticket": {
        "id": "uuid",
        "ticketKey": "PROJ-1",
        "title": "Fix login bug"
      },
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
  "stats": {
    "totalTickets": 45,
    "completedTickets": 18,
    "completionRate": 0.4,
    "averageCycleTime": "5.2 days"
  }
}
```

**Errors:**
- 403: User not in workspace
- 404: Project not found

## 🔍 Special Features

### Project Health Metrics
- **Completion Rate**: % of tickets completed
- **Velocity**: Estimated work completed per sprint
- **Overdue Count**: Tickets past due date
- **Average Cycle Time**: Average time from creation to completion

### Sprint Progress
- Status breakdown by category
- Visual representation of sprint progress
- Burn-down rate tracking
- Velocity trending

### Activity Feed
- Recent changes across project
- User attribution
- Timestamp and change details
- Limited to recent entries for performance

## ⚠️ Error Handling

**Access Control Errors (403):**
- User not in workspace

**Not Found (404):**
- Project not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **TicketModule**: Ticket data and counting
- **SprintModule**: Sprint progress information
- **ActivityModule**: Recent activity logs
- **StatusModule**: Status breakdown

**Dependent Modules:**
- Frontend: Dashboard display

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No historical trend data
- Limited to current project
- No predictive analytics
- No custom metrics
- No widget customization

**Possible Enhancements:**
- Historical trend charts (velocity over time)
- Multi-project dashboard
- Predictive analytics (delivery dates)
- Custom widget configuration
- Export dashboard data (PDF, CSV)
- Scheduled email reports
- Custom query builder for metrics
- Team member productivity metrics
- Risk indicators
- Budget tracking
- Resource allocation visualization
