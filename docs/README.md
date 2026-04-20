# Agile Project Manager - Module Documentation

This directory contains comprehensive documentation for all modules in the Agile Project Manager backend system. Each module represents a distinct functional area of the system.

## 📚 Module Index

### Core Authentication & Organization
- [Auth Module](auth.md) - User registration, login, JWT authentication
- [Workspaces Module](workspaces.md) - Multi-tenant workspace management and memberships
- [Users Module](users.md) - User profile and preferences

### Project Management
- [Projects Module](projects.md) - Project creation and management
- [Tickets Module](tickets.md) - **CORE** - Ticket lifecycle, subtasks, and bulk operations
- [Sprints Module](sprints.md) - Sprint planning and management
- [Status Module](status.md) - Project workflow statuses and categories

### Collaboration & Communication
- [Comments Module](comments.md) - Ticket discussions and collaboration
- [Attachments Module](attachments.md) - File attachments to tickets
- [Upload Module](upload.md) - File upload and storage utilities

### Visualization & Reporting
- [Board Module](board.md) - Kanban board visualization
- [Dashboard Module](dashboard.md) - Project statistics and key metrics
- [Activity Module](activity.md) - Change logs and audit trails
- [Project Activity Module](project-activity.md) - Project-wide activity feed

### Advanced Features
- [Search Module](search.md) - Full-text search across tickets
- [Labels Module](labels.md) - Project labels and tagging
- [AI Module](ai.md) - AI-powered features (user story generation via Gemini)
- [Events Module](events.md) - Event-driven architecture
- [Notifications Module](notifications.md) - User notifications (MongoDB)

## 🏗 Architecture Overview

### Module Organization
```
Workspace (Multi-tenant container)
├── Project (Organizational unit)
│   ├── Status (Workflow states)
│   ├── Label (Tags)
│   ├── Sprint (Time-boxed iterations)
│   │   └── Ticket
│   │       ├── Comment
│   │       ├── Attachment
│   │       ├── ActivityLog
│   │       └── Subtask
│   └── Ticket (in Backlog - sprintId = null)
├── User Membership
├── Project Activity Feed
└── Dashboard
```

### Data Storage
- **PostgreSQL**: Core entities (tickets, projects, sprints, users, etc.)
- **MongoDB**: Notifications (flexible document structure)

### Authentication
- **JWT-based**: 7-day token expiration
- **Workspace Isolation**: All operations scoped to user's workspace membership

## 📖 How to Use This Documentation

### For New Developers
1. Start with [Auth Module](auth.md) to understand authentication
2. Read [Workspaces Module](workspaces.md) for multi-tenancy concepts
3. Study [Tickets Module](tickets.md) - the core domain entity
4. Explore related modules based on your feature area

### For API Integration
1. Check the module's **API Endpoints** section
2. Review request/response examples
3. Note error codes and validation rules
4. Reference DTOs for validation rules

### For Database Queries
1. Review the **Entities** section for schema
2. Check relationships and foreign keys
3. Note important **Constraints** and indexes
4. Refer to service methods for complex queries

### For Adding Features
1. Check the **Special Features** section
2. Review **Architecture** patterns
3. Note **Dependencies** with other modules
4. Check **Error Handling** for exceptions

## 🔄 Module Relationships

### Dependencies Graph
```
Auth ←─────────────────────────────── All Protected Endpoints
Workspace ←─────────────────────┐
    ↓                           │
Project ──→ Status              │
    ↓           ↓               │
    Ticket ←────┘               │
    ├─→ Sprint                  │
    ├─→ Label                   │
    ├─→ Comment ───────→ Events ─→ Notifications
    ├─→ Attachment ─────→ Upload
    ├─→ ActivityLog ────→ Activity
    └─→ Search
    
Board ←──── Ticket, Status
Dashboard ← Ticket, Sprint, ActivityLog, Project
ProjectActivity ← ActivityLog
AI ──────→ Ticket (enhances with user stories)
```

### Module Dependencies Summary

| Module | Depends On | Used By |
|--------|-----------|---------|
| Auth | ConfigModule | All Protected Endpoints |
| Workspaces | Auth, TypeORM | Projects, All Modules |
| Projects | Workspace | Tickets, Sprints, Labels, Status |
| Tickets | Project, Sprint, Status, Activity, Events, Search | Board, Comments, Attachments, Search |
| Sprints | Project, Ticket, Activity | Tickets, Board, Dashboard |
| Status | Project | Tickets, Board, Search |
| Board | Ticket, Status, Activity, Events | Frontend |
| Comments | Ticket, Events | Attachments, Activity |
| Attachments | Ticket, Upload, Activity, Events | Frontend |
| Activity | Ticket | ProjectActivity, Dashboard |
| ProjectActivity | Activity | Dashboard, Frontend |
| Search | Ticket | Tickets, Frontend |
| Labels | Project | Tickets, Frontend |
| Dashboard | Ticket, Sprint, Activity, Project | Frontend |
| AI | Ticket, Sprint, Project | Frontend |
| Events | None | Notifications, Comments, Tickets, Attachments |
| Notifications | Events | Frontend |
| Upload | None | Attachments |
| Users | Auth | Frontend |

## 🔐 Access Control

### Authentication & Authorization
- **Public Endpoints**: `/auth/signup`, `/auth/login`, `/search` (limited)
- **Protected Endpoints**: Require JWT token with `JwtAuthGuard`
- **Workspace-Scoped**: Most operations validate user workspace membership
- **Project-Scoped**: Ticket, sprint, label operations inherit project visibility

### Workspace Isolation
- All data isolated by workspace
- No cross-workspace queries
- `WorkspaceMemberGuard` validates membership
- User can only access resources in their workspaces

## 📋 Common Patterns

### Error Handling
All modules follow similar error handling:
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Missing/invalid JWT token
- **403 Forbidden**: Access control violation
- **404 Not Found**: Resource not found
- **409 Conflict**: Business logic conflict (duplicate, constraint violation)
- **500 Internal Server Error**: Unexpected failure

### DTOs and Validation
- All inputs validated with `class-validator` decorators
- Swagger annotations for API documentation
- Type safety through TypeScript interfaces
- Partial updates via optional DTO fields

### Pagination
- **Default**: page=1, limit=10
- **Maximum limit**: 50 items per page
- **Offset model**: Skip and take parameters
- **Metadata**: Returns total count and current page

### Activity Logging
- All state changes logged to ActivityLog
- Includes user attribution
- Metadata stores before/after values
- Used for audit trail and activity feeds

## 🚀 Performance Considerations

### Database Indexes
- Strategic indexes on foreign keys and common filters
- Composite indexes for common query patterns
- Example: `idx_ticket_project_status_priority` for filtering

### Caching Opportunities
- Dashboard data (cacheable per project)
- Board data (cacheable per sprint)
- Labels and statuses (project-scoped, cacheable)
- User preferences (per-user cache)

### Query Optimization
- Lazy loading of relations (load only needed relations)
- Aggregate queries for counts (don't load all records)
- Full-text search for ticket search (PostgreSQL FTS)
- Pagination for large result sets

## 📝 Documentation Conventions

Each module documentation follows this structure:

1. **Overview**: What the module does
2. **Architecture**: Design patterns and key decisions
3. **Entities**: Database schema
4. **DTOs**: Data validation and transformation
5. **Services**: Business logic methods
6. **API Endpoints**: HTTP routes and examples
7. **Special Features**: Advanced capabilities
8. **Error Handling**: Exceptions and validation
9. **Relationships**: Dependencies with other modules
10. **Future Improvements**: Enhancement ideas

## 🔗 Quick Links

### Getting Started
- [User Registration](auth.md#post-authsignup)
- [Create Workspace](workspaces.md#post-workspaces)
- [Create Project](projects.md#post-workspaceswor kspaceidprojects)

### Main Operations
- [Create Ticket](tickets.md#post-projectsprojectidtickets)
- [View Board](board.md#get-projectsprojectidbor d)
- [Create Sprint](sprints.md#post-projectsprojectidsprints)
- [Add Comment](comments.md#post-ticketsticketidcomments)

### Reporting
- [Project Dashboard](dashboard.md#get-projectsprojectidd ashboard)
- [Activity Feed](activity.md#get-ticketsticketidactivity)
- [Project Activity](project-activity.md#get-projectsprojectidactivity)

### Advanced
- [Search Tickets](search.md#get-search)
- [Generate User Story](ai.md#post-ticketsidai-user-story)
- [Bulk Operations](tickets.md#post-ticketsbulk-update)

## 📞 Support & Contributing

For questions about specific modules:
1. Check the module's documentation
2. Review the **Special Features** section
3. Check **Error Handling** for edge cases
4. See **Future Improvements** for known limitations

For contributing new features:
1. Follow the documented patterns
2. Maintain consistent error handling
3. Include activity logging where appropriate
4. Add integration test coverage

---

**Last Updated**: April 20, 2026  
**Documentation Version**: 1.0  
**System Version**: NestJS + TypeORM + PostgreSQL + MongoDB
