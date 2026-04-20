# Workspaces Module

## 📌 Overview

The Workspaces module is the **multi-tenancy foundation** for the agile project manager. It provides isolated environments where teams can collaborate on projects without accessing each other's data. A workspace is an organizational unit that contains users (members), projects, sprints, and all related resources.

**Key Responsibilities:**
- Create and manage workspaces for organizations
- Manage workspace membership (add/remove members)
- Enforce workspace-level access control
- Provide workspace isolation (data separation)
- Associate resources (projects, tickets) with workspaces
- Track workspace creation and membership

## 🏗 Architecture

### Design Pattern
- **Multi-Tenancy Pattern**: Each workspace is a complete, isolated data partition
- **Workspace Guard**: `WorkspaceMemberGuard` enforces membership validation on protected routes
- **Service-Repository Pattern**: `WorkspaceService` handles business logic with injected repositories

### Key Design Decisions
1. **Workspace Membership**: Users must be explicitly added to workspaces (no automatic membership)
2. **Access Control**: All workspace-scoped operations validate user membership
3. **Isolation**: No cross-workspace queries or data leakage
4. **Creator as Owner**: User creating workspace automatically becomes its owner/admin

## 📦 Entities

### Workspace
Represents an organizational unit or team environment.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `name` (VARCHAR, 200): Workspace name (required)
- `description` (TEXT, nullable): Workspace description
- `createdAt` (TIMESTAMP): Creation timestamp

**Relationships:**
- `members`: One-to-Many with WorkspaceMember
- `projects`: One-to-Many with Project
- `createdBy`: User who created the workspace

### WorkspaceMember
Junction entity representing user membership in a workspace.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `workspaceId` (UUID, FK): Workspace ID
- `userId` (UUID, FK): User ID
- `role` (ENUM, default: 'MEMBER'): User role in workspace (OWNER, ADMIN, MEMBER)
- `joinedAt` (TIMESTAMP): When user joined
- `createdAt` (TIMESTAMP): Record creation time

**Relationships:**
- `workspace`: Many-to-One with Workspace
- `user`: Many-to-One with User

**Constraints:**
- Unique constraint on (workspaceId, userId): Each user can be member once per workspace

## 📥 DTOs

### CreateWorkspaceDto
Used to create a new workspace.

**Fields:**
- `name` (required, string, 1-200 chars): Workspace name
- `description` (optional, string): Workspace description

**Validation:**
- Name is required and non-empty
- Name must not exceed 200 characters
- Description is optional

### AddMemberDto
Used to add a user to a workspace.

**Fields:**
- `userId` (required, UUID): User ID to add to workspace
- `role` (optional, enum, default: 'MEMBER'): Role for the user (OWNER, ADMIN, MEMBER)

**Validation:**
- User ID must be valid UUID
- User must exist in system
- User must not already be member of workspace

## ⚙️ Services

### WorkspaceService

**Method: `createWorkspace(userId, dto)`**
- Creates a new workspace
- Automatically adds creator as OWNER/ADMIN
- Validates user exists
- Returns created workspace with creator info
- Event: Workspace created

**Method: `getUserWorkspaces(userId, pagination)`**
- Returns all workspaces user is member of
- Paginated results
- Includes member count and project count
- Ordered by creation date

**Method: `getWorkspace(workspaceId, userId)`**
- Retrieves workspace details
- Validates user is member
- Returns workspace with member list and project count

**Method: `getWorkspaceMembers(workspaceId, userId, pagination)`**
- Lists all members in a workspace
- Validates user is member
- Includes user details and role
- Paginated results

**Method: `addMember(workspaceId, userId, addMemberDto)`**
- Adds user to workspace
- Validates both user exists and is not already member
- Sets specified role (default: MEMBER)
- Logs activity
- Returns updated workspace members

**Method: `removeMember(workspaceId, memberId, userId)`**
- Removes user from workspace
- Validates requester has permission
- Cannot remove last owner
- Logs activity

**Method: `updateMemberRole(workspaceId, memberId, newRole, userId)`**
- Updates user role in workspace (MEMBER, ADMIN, OWNER)
- Validates requester has permission
- Returns updated member

**Method: `deleteWorkspace(workspaceId, userId)`**
- Deletes workspace and all associated data
- Cascades to projects, tickets, sprints, statuses
- Validates user is owner
- Logs activity

## 🌐 API Endpoints

### POST `/workspaces`
Create a new workspace.

**Request Body:**
```json
{
  "name": "Tech Team",
  "description": "Engineering team for product development"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Tech Team",
    "description": "Engineering team...",
    "createdAt": "2026-04-20T10:00:00Z",
    "memberCount": 1,
    "projectCount": 0
  }
}
```

**Errors:**
- 400: Validation error (name required, etc.)
- 401: Unauthorized

### GET `/workspaces`
Get all workspaces for authenticated user.

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 10, max: 50)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Tech Team",
      "createdAt": "2026-04-20T10:00:00Z",
      "memberCount": 5,
      "projectCount": 3
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

### GET `/workspaces/:workspaceId`
Get workspace details.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Tech Team",
  "description": "...",
  "members": [
    {
      "id": "member-uuid",
      "user": { "id": "uuid", "name": "John Doe", "email": "john@example.com" },
      "role": "OWNER",
      "joinedAt": "2026-04-20T10:00:00Z"
    }
  ],
  "projectCount": 3,
  "createdAt": "2026-04-20T10:00:00Z"
}
```

**Errors:**
- 403: User not member of workspace
- 404: Workspace not found

### POST `/workspaces/:workspaceId/members`
Add a user to a workspace.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID

**Request Body:**
```json
{
  "userId": "uuid",
  "role": "MEMBER"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "user": { "id": "uuid", "name": "Jane Smith" },
    "role": "MEMBER",
    "joinedAt": "2026-04-20T10:00:00Z"
  }
}
```

**Errors:**
- 400: User already member, user not found
- 403: Insufficient permissions
- 404: Workspace not found

### GET `/workspaces/:workspaceId/members`
Get all members in a workspace.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID
- `page` (query, optional, number): Page number
- `limit` (query, optional, number): Items per page

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "member-uuid",
      "user": { "id": "uuid", "name": "John Doe", "role": "OWNER" },
      "joinedAt": "2026-04-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 5
  }
}
```

### DELETE `/workspaces/:workspaceId/members/:memberId`
Remove a user from a workspace.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID
- `memberId` (path, required, UUID): WorkspaceMember ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed from workspace"
}
```

**Errors:**
- 403: Cannot remove last owner
- 404: Workspace or member not found

### PATCH `/workspaces/:workspaceId/members/:memberId/role`
Update a member's role.

**Parameters:**
- `workspaceId` (path, required, UUID): Workspace ID
- `memberId` (path, required, UUID): WorkspaceMember ID

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "member-uuid",
    "user": { "id": "uuid", "name": "Jane Smith" },
    "role": "ADMIN",
    "joinedAt": "2026-04-20T10:00:00Z"
  }
}
```

## 🔍 Special Features

### Multi-Tenancy
- Complete data isolation between workspaces
- No cross-workspace queries
- All queries filtered by workspace context

### Role-Based Access Control
- **OWNER**: Full workspace control, can add/remove members, delete workspace
- **ADMIN**: Manage projects, members
- **MEMBER**: Standard member, can view and edit projects

### WorkspaceMemberGuard
- Protects workspace-scoped routes
- Validates user is member of workspace
- Extracts workspace ID from route parameter
- Used on all `/workspaces/:workspaceId/*` routes

## ⚠️ Error Handling

**Validation Errors (400):**
- Workspace name required or empty
- Workspace name exceeds 200 characters
- User already member of workspace
- User not found

**Access Control Errors (403):**
- User not member of workspace
- Insufficient role for operation
- Cannot remove last owner

**Not Found (404):**
- Workspace not found
- Member not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **AuthModule**: Validates user existence and JWT

**Dependent Modules:**
- **ProjectModule**: All projects belong to workspaces
- **AllOtherModules**: All resources scoped to workspaces via projects

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Basic role system (OWNER, ADMIN, MEMBER)
- No fine-grained permissions
- No workspace invitations (must have user ID)

**Possible Enhancements:**
- Email-based workspace invitations
- Customizable roles with permission sets
- Audit log for workspace activities
- Workspace settings (naming, logo, etc.)
- Workspace templates
- Integration with SSO (Active Directory, Okta)
