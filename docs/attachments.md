# Attachments Module

## 📌 Overview

The Attachments module manages file attachments to tickets. Users can upload files to tickets for sharing documents, screenshots, designs, and other supporting materials. Attachments track file metadata, uploader information, and timestamps.

**Key Responsibilities:**
- Attach files to tickets
- Retrieve ticket attachments
- Remove attachments from tickets
- Track attachment metadata
- Integrate with upload service for file storage
- Log attachment activities

## 🏗 Architecture

### Design Pattern
- **Service-Repository Pattern**: AttachmentsService handles business logic
- **File and Metadata**: Uses Upload module for file storage, tracks metadata
- **Integration**: Works with UploadModule and ActivityModule

### Key Design Decisions
1. **File and Metadata Separation**: File stored via Upload module, metadata in database
2. **Upload Attribution**: Track who uploaded each attachment
3. **Ticket Attachment**: Attachments belong to specific tickets
4. **Activity Logging**: All attachment operations logged
5. **Event Publishing**: Attachment changes trigger events

## 📦 Entities

### Attachment
Represents a file attachment to a ticket.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `ticketId` (UUID, FK): Parent ticket
- `fileName` (VARCHAR, 255): Original file name
- `fileUrl` (VARCHAR, 500): URL to access file
- `fileSize` (BIGINT): File size in bytes
- `fileType` (VARCHAR, 50): MIME type
- `uploadedById` (UUID, FK): User who uploaded
- `createdAt` (TIMESTAMP): Upload timestamp

**Relationships:**
- `ticket`: Many-to-One with Ticket
- `uploadedBy`: Many-to-One with User

**Constraints:**
- Foreign keys on ticketId and uploadedById

## 📥 DTOs

### Implicit FileUploadDto (from multer)
**Fields:**
- `file` (multipart/form-data): File to upload

**Validation:**
- File required
- File size <= 5MB
- File type must be allowed (images, PDFs, text, Word docs)

## ⚙️ Services

### AttachmentsService

**Method: `uploadAttachment(ticketId, userId, file)`**
- Uploads file to ticket
- Validates ticket exists and user has access
- Saves file via UploadService
- Creates attachment metadata record
- Logs activity (ATTACHMENT_ADDED)
- Publishes event
- Returns created attachment

**Process:**
1. Validate ticket and user access
2. Validate file (size, type)
3. Call UploadService.uploadFile()
4. Create attachment record
5. Log activity
6. Publish event

**Method: `getAttachments(ticketId, userId)`**
- Returns all attachments for ticket
- Validates user access
- Returns with uploader info
- Ordered by upload date

**Method: `getAttachment(attachmentId, userId)`**
- Retrieves single attachment
- Validates user access
- Returns complete attachment info

**Method: `deleteAttachment(attachmentId, userId)`**
- Removes attachment from ticket
- Deletes file from disk (via UploadService)
- Logs activity (ATTACHMENT_DELETED)
- Publishes event
- Returns success response

**Method: `downloadAttachment(attachmentId, userId)`**
- Returns file for download
- Validates user access
- Sets proper MIME type and headers
- Triggers file download

## 🌐 API Endpoints

### POST `/tickets/:ticketId/attachments`
Upload file attachment to ticket.

**Parameters:**
- `ticketId` (path, required, UUID): Ticket ID

**Request Body:**
```
multipart/form-data:
  file: <binary file content>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "ticketId": "uuid",
    "fileName": "screenshot.png",
    "fileUrl": "/uploads/1619123456789_screenshot.png",
    "fileSize": 102400,
    "fileType": "image/png",
    "uploadedBy": {
      "id": "uuid",
      "name": "John Doe"
    },
    "createdAt": "2026-04-20T14:30:00Z"
  }
}
```

**Errors:**
- 400: Invalid file, missing file, file too large
- 401: Unauthorized
- 403: User not in workspace
- 404: Ticket not found

### GET `/tickets/:ticketId/attachments`
Get all attachments for a ticket.

**Parameters:**
- `ticketId` (path, required, UUID): Ticket ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fileName": "screenshot.png",
      "fileUrl": "/uploads/1619123456789_screenshot.png",
      "fileSize": 102400,
      "fileType": "image/png",
      "uploadedBy": {
        "id": "uuid",
        "name": "John Doe"
      },
      "createdAt": "2026-04-20T14:30:00Z"
    }
  ]
}
```

### GET `/attachments/:attachmentId/download`
Download an attachment.

**Parameters:**
- `attachmentId` (path, required, UUID): Attachment ID

**Response:**
- File content with appropriate Content-Type header
- Content-Disposition header for download

**Errors:**
- 404: Attachment not found

### DELETE `/attachments/:attachmentId`
Delete an attachment.

**Parameters:**
- `attachmentId` (path, required, UUID): Attachment ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Attachment deleted successfully"
}
```

**Errors:**
- 401: Unauthorized
- 403: User not in workspace
- 404: Attachment not found

## 🔍 Special Features

### File Type Support
- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, Word (.doc, .docx)
- **Text**: Plain text (.txt), CSV

### Attachment Information
- Original filename preserved
- File size tracked for quota management
- MIME type stored
- Upload timestamp for sorting
- Uploader attribution

### Activity Integration
- All attachment operations logged
- Visible in ticket activity feed
- Audit trail maintained

### File Organization
- Files stored in `/uploads/` directory
- Unique naming via UUID prevents collisions
- Direct HTTP serving via static file handler
- Public access to uploaded files (anyone with URL)

## ⚠️ Error Handling

**Validation Errors (400):**
- File too large (> 5MB)
- File type not allowed
- No file provided

**Access Control Errors (403):**
- User not in workspace
- User not member of project

**Not Found (404):**
- Ticket not found
- Attachment not found

## 🔗 Relationships with Other Modules

**Dependencies:**
- **UploadModule**: File storage operations
- **TicketModule**: Attachments belong to tickets
- **ActivityModule**: Logs all attachment operations
- **EventsModule**: Publishes attachment events

**Dependent Modules:**
- Frontend: Attachment upload/download
- **NotificationsModule**: Can notify on attachment additions

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Files stored on local disk (not scalable)
- No file encryption
- No file versioning
- No virus scanning
- No storage quotas
- Public access to all files (no fine-grained permissions)
- No image optimization/thumbnails

**Possible Enhancements:**
- Cloud storage integration (S3, GCS)
- File encryption at rest
- File versioning/history
- Virus/malware scanning
- Storage quota per user/workspace
- Private file access (authentication required for download)
- Image thumbnail generation
- Image optimization/compression
- File sharing with external users
- File expiration dates
- Download tracking/analytics
- Preview functionality for PDFs/documents
- Inline viewing for supported formats
- File commenting/annotations
