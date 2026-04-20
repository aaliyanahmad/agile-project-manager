# Notifications Module

## 📌 Overview

The Notifications module manages user notifications. It stores notifications in MongoDB and provides endpoints for retrieving and managing them. Notifications are event-driven, with the system creating notifications when significant changes occur (ticket created, assigned, commented, etc.).

**Key Responsibilities:**
- Store notification records
- Create notifications from events
- Retrieve user notifications
- Mark notifications as read/unread
- Delete notifications
- Support notification filtering
- Track notification metadata

## 🏗 Architecture

### Design Pattern
- **Document Store**: Uses MongoDB for flexible notification schema
- **Event-Driven**: Creates notifications on domain events
- **User-Centric**: Notifications organized by user

### Key Design Decisions
1. **MongoDB**: Document database for flexible notification structure
2. **Event Subscription**: Subscribes to Events module
3. **Async Creation**: Notifications created asynchronously
4. **Read Status**: Tracks read/unread state
5. **Rich Content**: Notifications include full context

## 📦 Entities

### Notification (MongoDB Document)
Represents a user notification.

**Fields:**
- `_id` (ObjectId, auto-generated): MongoDB ID
- `userId` (String): User who receives notification
- `type` (String): Notification type (ticket_created, status_changed, comment_added, etc.)
- `title` (String): Notification title
- `message` (String): Notification message/description
- `data` (Object): Additional context data
  - `ticketId`: Related ticket
  - `ticketKey`: Ticket key for display
  - `projectId`: Related project
  - `actionBy`: User who triggered notification
  - `actionByName`: Name of user who triggered
- `isRead` (Boolean, default: false): Whether notification has been read
- `link` (String, optional): Navigation link to relevant resource
- `createdAt` (Date): Creation timestamp
- `readAt` (Date, optional): When marked as read
- `expiresAt` (Date, optional): Auto-delete timestamp (TTL)

**Schema Definition (Mongoose):**
```typescript
{
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  link?: string;
  createdAt: Date;
  readAt?: Date;
  deletedAt?: Date;
}
```

## ⚙️ Services

### NotificationsService

**Method: `createNotification(userId, notificationData)`**
- Creates new notification
- Saves to MongoDB
- Returns created notification

**Method: `getNotifications(userId, limit, skip)`**
- Retrieves user notifications
- Ordered by creation date (newest first)
- Supports pagination
- Returns with read status

**Method: `markAsRead(notificationId, userId)`**
- Marks notification as read
- Sets readAt timestamp
- Returns updated notification

**Method: `markAllAsRead(userId)`**
- Marks all notifications for user as read
- Bulk update operation
- Returns count of updated

**Method: `deleteNotification(notificationId, userId)`**
- Deletes notification (to user)
- Returns success response

**Method: `onTicketCreated(event)`**
- Subscriber for TICKET_CREATED event
- Creates notification for project members
- Includes ticket details

**Method: `onStatusChanged(event)`**
- Subscriber for STATUS_CHANGED event
- Notifies assignees and followers

**Method: `onCommentAdded(event)`**
- Subscriber for COMMENT_CREATED event
- Notifies ticket assignees and followers

## 🌐 API Endpoints

### GET `/notifications`
Get current user's notifications.

**Query Parameters:**
- `limit` (optional, number, default 20): Number of notifications
- `skip` (optional, number, default 0): Records to skip for pagination

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "mongo-id",
      "type": "ticket_created",
      "title": "Ticket Created",
      "message": "John Doe created ticket 'Fix login bug'",
      "data": {
        "ticketId": "uuid",
        "ticketKey": "PROJ-1",
        "projectId": "uuid",
        "actionBy": "uuid",
        "actionByName": "John Doe"
      },
      "isRead": false,
      "link": "/projects/uuid/tickets/uuid",
      "createdAt": "2026-04-20T14:30:00Z"
    },
    {
      "id": "mongo-id",
      "type": "comment_added",
      "title": "New Comment",
      "message": "Jane Smith commented on 'Fix login bug'",
      "data": {
        "ticketId": "uuid",
        "ticketKey": "PROJ-1",
        "commentId": "uuid",
        "actionByName": "Jane Smith"
      },
      "isRead": true,
      "link": "/projects/uuid/tickets/uuid#comments",
      "readAt": "2026-04-20T15:00:00Z",
      "createdAt": "2026-04-20T14:45:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "unreadCount": 5
  }
}
```

### PATCH `/notifications/:notificationId/read`
Mark notification as read.

**Parameters:**
- `notificationId` (path, required, string): Notification ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "mongo-id",
    "type": "ticket_created",
    "isRead": true,
    "readAt": "2026-04-20T15:05:00Z"
  }
}
```

### PATCH `/notifications/read-all`
Mark all notifications as read.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "All notifications marked as read",
  "updatedCount": 5
}
```

### DELETE `/notifications/:notificationId`
Delete a notification.

**Parameters:**
- `notificationId` (path, required, string): Notification ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

## 🔍 Special Features

### Notification Types
- **ticket_created**: Ticket created in project
- **ticket_assigned**: User assigned to ticket
- **status_changed**: Ticket status changed
- **comment_added**: Comment added to ticket
- **attachment_added**: Attachment added to ticket
- **sprint_started**: Sprint started
- **sprint_closed**: Sprint closed

### Rich Context
- Includes affected ticket details
- Attribution (who triggered the notification)
- Navigation links to related resources
- Additional metadata in data field

### Read Status Tracking
- Unread/read status enables badge indicators
- Read timestamp for audit
- Bulk mark as read for email digests

### Auto-Expiration
- Optional TTL (time-to-live) for old notifications
- Configurable retention period
- MongoDB TTL index handles cleanup

## ⚠️ Error Handling

**Not Found (404):**
- Notification not found

**Validation Errors (400):**
- Invalid notification ID format

## 🔗 Relationships with Other Modules

**Dependencies:**
- **EventsModule**: Subscribes to events
- External: MongoDB for storage

**Dependent Modules:**
- Frontend: Notification display and badge
- **CommentModule**: Triggers notifications
- **TicketModule**: Triggers notifications
- **AttachmentsModule**: Triggers notifications

## 🧠 Notes / Future Improvements

**Current Limitations:**
- No email notifications
- No notification preferences
- No notification grouping/digests
- No push notifications
- No notification templates
- No scheduled notifications

**Possible Enhancements:**
- Email notifications (digest, realtime)
- Push notifications (mobile, browser)
- Email subscription preferences
- Notification frequency control
- Notification grouping/digests
- @mention notifications
- Notification templates
- Scheduled notifications
- Notification analytics
- SMS notifications
- Slack integration
- Teams integration
