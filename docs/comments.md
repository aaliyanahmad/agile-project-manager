# Comments Module

## 📌 Overview

The Comments module handles discussion and collaboration on tickets. Users can add, edit, and delete comments on any ticket. Comments are tracked, time-stamped, and integrated with the activity logging system for a complete audit trail of ticket discussions.

**Key Responsibilities:**
- Create comments on tickets
- Update and delete comments
- Retrieve comments with pagination
- Track comment authorship and timestamps
- Integrate with activity logging and events
- Support comment discovery and filtering

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: CommentService handles business logic
- **Audit Trail**: All comments and changes tracked for compliance
- **Event Publishing**: Comment events trigger notifications

### Key Design Decisions
1. **Immutable Thread**: Comments are non-editable by default (edit tracking could be added)
2. **Author Tracking**: Record who created each comment
3. **Workspace Isolation**: Comments only visible to workspace members
4. **Event Publishing**: Comment creation/updates trigger notifications
5. **Soft Delete**: Comments may be soft-deleted rather than hard-deleted

## 📦 Entities

### Comment
Represents a discussion comment on a ticket.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `ticketId` (UUID, FK): Parent ticket
- `userId` (UUID, FK): Comment author
- `content` (TEXT): Comment text
- `createdAt` (TIMESTAMP): Creation time
- `updatedAt` (TIMESTAMP): Last update time
- `deletedAt` (TIMESTAMP, nullable): Soft delete timestamp

**Relationships:**
- `ticket`: Many-to-One with Ticket
- `user`: Many-to-One with User (author)
- `attachments`: One-to-Many with Attachment

**Constraints:**
- Foreign keys on ticketId and userId
- Content cannot be empty
- Immutable author (cannot change who posted)

## 📥 DTOs

### CreateCommentDto
Used to create a new comment.

**Fields:**
- `content` (required, string, 1-5000 chars): Comment text

**Validation:**
- Content is required and non-empty
- Content must not exceed 5000 characters
- Trim whitespace

### UpdateCommentDto
Used to update an existing comment.

**Fields:**
- `content` (required, string, 1-5000 chars): Updated comment text

**Validation:**
- Same as CreateCommentDto
- Only author can update

## ⚙️ Services

### CommentService

**Method: `createComment(ticketId, userId, dto)`**
- Creates new comment on ticket
- Validates user is in ticket's workspace
- Validates ticket exists
- Logs activity (COMMENT_CREATED)
- Publishes event for notifications
- Returns created comment with user details

**Method: `getComments(ticketId, userId, pagination)`**
- Returns all comments for ticket
- Validates user access to ticket
- Ordered by creation date (ascending - oldest first)
- Includes author details for each comment
- Paginated results

**Method: `getComment(commentId, userId)`**
- Retrieves single comment
- Validates user access
- Returns comment with all relations (author, attachments)

**Method: `updateComment(commentId, userId, dto)`**
- Updates comment content
- Only author can update
- Validates user ownership
- Logs activity (COMMENT_UPDATED)
- Publishes update event
- Returns updated comment

**Method: `deleteComment(commentId, userId)`**
- Deletes comment (soft delete)
- Only author can delete
- Logs activity (COMMENT_DELETED)
- Cascades to attachments deletion
- Returns success response

**Method: `restoreComment(commentId, userId)`**
- Restores soft-deleted comment
- Only author or admin can restore
- Logs activity
- Returns restored comment

## 🌐 API Endpoints

### POST `/tickets/:ticketId/comments`
Create a comment on a ticket.

**Parameters:**
- `ticketId` (path, required, UUID): Ticket ID

**Request Body:**
```json
{
  "content": "I've started working on this. Testing the login flow with different auth providers."
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticketId": "uuid",
    "content": "I've started working on this. Testing the login flow with different auth providers.",
    "user": {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "createdAt": "2026-04-20T14:30:00Z",
    "updatedAt": "2026-04-20T14:30:00Z"
  }
}
```

**Errors:**
- 400: Validation error (empty content, too long)
- 403: User not in workspace
- 404: Ticket not found

### GET `/tickets/:ticketId/comments`
Get all comments for a ticket.

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
      "content": "First comment...",
      "user": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2026-04-20T10:00:00Z",
      "updatedAt": "2026-04-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "ticketId": "uuid",
      "content": "Second comment...",
      "user": {
        "id": "uuid",
        "name": "Jane Smith"
      },
      "createdAt": "2026-04-20T14:30:00Z",
      "updatedAt": "2026-04-20T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

**Errors:**
- 403: User not in workspace
- 404: Ticket not found

### GET `/comments/:commentId`
Get a single comment.

**Parameters:**
- `commentId` (path, required, UUID): Comment ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "ticketId": "uuid",
  "content": "Comment text...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "attachments": [
    {
      "id": "uuid",
      "fileName": "screenshot.png",
      "fileUrl": "/uploads/uuid",
      "fileSize": 102400
    }
  ],
  "createdAt": "2026-04-20T10:00:00Z",
  "updatedAt": "2026-04-20T10:00:00Z"
}
```

### PATCH `/comments/:commentId`
Update a comment (author only).

**Parameters:**
- `commentId` (path, required, UUID): Comment ID

**Request Body:**
```json
{
  "content": "Updated comment text..."
}
```

**Response (200 OK):** Updated comment object

**Errors:**
- 403: Not comment author
- 404: Comment not found

### DELETE `/comments/:commentId`
Delete a comment (author only).

**Parameters:**
- `commentId` (path, required, UUID): Comment ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Errors:**
- 403: Not comment author
- 404: Comment not found

## 🔍 Special Features

### Discussion Threading
- Comments appear as chronological thread on ticket
- Each comment shows author, timestamp, and content
- Full context preserved for discussions

### Soft Delete
- Deleted comments marked with `deletedAt` timestamp
- Enables restoration if needed
- Maintains audit trail
- Allows "user deleted comment" in activity

### Author Tracking
- All comments attributed to creator
- Source of each comment clearly identified
- Author information immutable

### Comment Attachments
- Comments can have attachments (support, screenshots, documents)
- Attachments managed separately but linked to comment
- File metadata tracked (name, size, type)

## ⚠️ Error Handling

**Validation Errors (400):**
- Comment content required or empty
- Comment exceeds maximum length (5000 chars)

**Authorization Errors (403):**
- User not in workspace
- User not comment author (update/delete attempts)

**Not Found (404):**
- Ticket not found
- Comment not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **TicketModule**: Comments belong to tickets
- **ActivityModule**: Logs all comment operations
- **EventsModule**: Publishes comment events for notifications
- **AttachmentsModule**: Comments can have attachments

**Dependent Modules:**
- Frontend: Primary consumer
- **NotificationsModule**: Notifies users of new/updated comments

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No comment threading/replies
- No @mentions or notifications
- No comment editing history
- No markdown support
- No emoji reactions
- Comments not searchable separately
- No comment templates

**Possible Enhancements:**
- @mentions with notifications
- Threaded replies (nested comments)
- Edit history and versioning
- Markdown/rich text formatting
- Emoji reactions to comments
- Comment voting/helpful markers
- Comment templates for common responses
- Comment search across all tickets
- Full-text search in comments
- Comment notifications (email, push)
- Bulk comment operations
