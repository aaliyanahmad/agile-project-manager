# Labels Module

## 📌 Overview

The Labels module manages project labels (tags) that can be applied to tickets for categorization and filtering. Labels are project-scoped, allowing teams to organize tickets by custom categories like "frontend", "backend", "bug", "feature", etc.

**Key Responsibilities:**
- Create and manage labels for projects
- Assign labels to tickets
- Delete labels and cascading updates
- List labels with usage information
- Support label-based ticket filtering
- Provide label suggestions

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: LabelsService handles business logic
- **Project Scoping**: Labels belong to projects
- **Many-to-Many Relationship**: Labels relate to tickets via junction table

### Key Design Decisions
1. **Project-Scoped**: Labels belong to specific projects
2. **Color Coding**: Labels have visual color representation
3. **Usage Tracking**: Know how many tickets have each label
4. **Cascade Delete**: Unused labels can be deleted
5. **Label Ordering**: Labels can be ordered by position

## 📦 Entities

### Label
Represents a project label/tag.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `projectId` (UUID, FK): Parent project
- `name` (VARCHAR, 50): Label name (e.g., "bug", "frontend", "urgent")
- `color` (VARCHAR, 7): Hex color code (e.g., "#FF0000")
- `description` (TEXT, nullable): Label description
- `position` (NUMERIC, nullable): Order position
- `createdAt` (TIMESTAMP): Creation timestamp

**Relationships:**
- `project`: Many-to-One with Project
- `tickets`: Many-to-Many with Ticket (via ticket_labels)

**Constraints:**
- Unique (projectId, name): Each label name unique per project
- Color must be valid hex format

## 📥 DTOs

### CreateLabelDto
Used to create a new label.

**Fields:**
- `name` (required, string, 1-50 chars): Label name
- `color` (optional, hex color, default: "#808080"): Hex color code
- `description` (optional, string): Label description

**Validation:**
- Name is required, 1-50 characters
- Name must be unique within project
- Color must be valid hex format (#RRGGBB)
- Description is optional

### UpdateLabelDto
Used to update an existing label.

**Fields:**
- `name` (optional, string, 1-50 chars): Update label name
- `color` (optional, hex color): Update color
- `description` (optional, string): Update description

**Validation:**
- Same as CreateLabelDto for provided fields
- Name must still be unique within project

## ⚙️ Services

### LabelsService

**Method: `createLabel(projectId, userId, dto)`**
- Creates new label for project
- Validates project exists and user has access
- Validates label name is unique in project
- Validates color format
- Returns created label

**Method: `getLabels(projectId, userId)`**
- Lists all labels for project
- Validates user access
- Includes usage count (# of tickets with label)
- Ordered by position or creation date

**Method: `getLabel(labelId, userId)`**
- Retrieves single label
- Validates user access
- Includes usage information

**Method: `updateLabel(labelId, userId, dto)`**
- Updates label details
- Validates user access
- Returns updated label

**Method: `deleteLabel(labelId, userId)`**
- Deletes label from project
- Cascades to remove label from all tickets
- Cannot delete if in use (optional)
- Logs activity
- Returns success response

**Method: `assignLabelToTicket(ticketId, labelId, userId)`**
- Assigns label to ticket
- Validates ticket and label from same project
- Validates user access
- Returns updated ticket

**Method: `removeLabelFromTicket(ticketId, labelId, userId)`**
- Removes label from ticket
- Returns updated ticket

## 🌐 API Endpoints

### POST `/projects/:projectId/labels`
Create a new label.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Request Body:**
```json
{
  "name": "backend",
  "color": "#0066CC",
  "description": "Backend/server-side work"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "projectId": "uuid",
    "name": "backend",
    "color": "#0066CC",
    "description": "Backend/server-side work",
    "position": 1,
    "usageCount": 0,
    "createdAt": "2026-04-20T10:00:00Z"
  }
}
```

**Errors:**
- 400: Validation error (duplicate name, invalid color)
- 403: User not in workspace
- 404: Project not found

### GET `/projects/:projectId/labels`
Get all labels for a project.

**Parameters:**
- `projectId` (path, required, UUID): Project ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "backend",
      "color": "#0066CC",
      "description": "Backend/server-side work",
      "usageCount": 5
    },
    {
      "id": "uuid",
      "name": "frontend",
      "color": "#FF6600",
      "description": "Frontend/UI work",
      "usageCount": 8
    }
  ]
}
```

### GET `/labels/:labelId`
Get a single label.

**Parameters:**
- `labelId` (path, required, UUID): Label ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "backend",
  "color": "#0066CC",
  "description": "Backend/server-side work",
  "usageCount": 5,
  "createdAt": "2026-04-20T10:00:00Z"
}
```

### PATCH `/labels/:labelId`
Update a label.

**Parameters:**
- `labelId` (path, required, UUID): Label ID

**Request Body:**
```json
{
  "name": "back-end",
  "color": "#0066FF"
}
```

**Response (200 OK):** Updated label object

### DELETE `/labels/:labelId`
Delete a label.

**Parameters:**
- `labelId` (path, required, UUID): Label ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Label deleted successfully"
}
```

## 🔍 Special Features

### Visual Organization
- Color-coded labels for visual distinction
- Used in UI for kanban board, ticket lists
- Accessible color contrasts for readability

### Label Usage Tracking
- Know how many tickets use each label
- Help identify unused labels
- Support label consolidation

### Label Organization
- Labels ordered by position
- Customizable organization
- Label grouping (optional future feature)

## ⚠️ Error Handling

**Validation Errors (400):**
- Label name is required or empty
- Label name exceeds 50 characters
- Label name not unique in project
- Invalid color hex format
- Description too long

**Access Control Errors (403):**
- User not in workspace
- Insufficient permissions

**Not Found (404):**
- Project not found
- Label not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **ProjectModule**: Labels belong to projects
- **TicketModule**: Labels assigned to tickets

**Dependent Modules:**
- **TicketModule**: Uses labels for organization
- **BoardModule**: Displays labels on tickets
- Frontend: Label management and filtering

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No label templates
- No bulk label operations
- No label validation rules
- Labels not cross-project
- No label hierarchy

**Possible Enhancements:**
- Label templates (predefined sets)
- Bulk assign/remove labels
- Label suggestions based on title/description
- Label hierarchy (parent-child)
- Workspace-level labels (shared across projects)
- Label synonyms/aliasing
- Auto-tagging based on keywords
- Label analytics
- Color palette suggestions
- Label organization/grouping
