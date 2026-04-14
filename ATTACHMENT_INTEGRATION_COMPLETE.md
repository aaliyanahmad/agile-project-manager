# Attachment Integration Testing Guide

## Changes Summary

This document outlines all changes made to integrate attachments into existing Ticket and Comment detail endpoints.

### Files Modified

#### 1. `src/entities/activity-action.enum.ts`
- **Change**: Added `ATTACHMENT_ADDED = 'ATTACHMENT_ADDED'` to ActivityAction enum
- **Purpose**: Enable activity logging when attachments are uploaded

#### 2. `src/attachments/dto/attachment.dto.ts` (NEW)
- **Change**: Created UploadedByUserDto and AttachmentDto
- **Structure**:
  ```typescript
  AttachmentDto {
    id: string
    fileUrl: string
    fileName: string
    fileSize: number
    uploadedBy: { id: string, name: string }
    createdAt: Date
  }
  ```
- **Purpose**: Define attachment response structure with Swagger documentation

#### 3. `src/attachments/dto/index.ts` (NEW)
- **Change**: Created barrel export for attachments DTOs
- **Purpose**: Clean import paths

#### 4. `src/ticket/ticket.service.ts`
- **Change**: Updated `getTicketDetailWithSubtasks()` method (line 132)
- **Added relations**: `'attachments'`, `'attachments.uploadedBy'`
- **Added mapping**: Transform attachments to include only needed fields
- **Impact**: GET /tickets/:id now includes attachments array
- **Example**:
  ```json
  {
    "id": "...",
    "title": "Feature X",
    "attachments": [
      {
        "id": "...",
        "fileUrl": "/uploads/file.pdf",
        "fileName": "file.pdf",
        "fileSize": 512000,
        "uploadedBy": { "id": "...", "name": "John Doe" },
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
  ```

#### 5. `src/comment/comment.service.ts`
- **Change**: Updated `getComments()` method (line 88)
- **Before**: Used `.find()` with explicit select fields
- **After**: Switched to query builder with leftJoinAndSelect for relations
- **Added relations**: `'attachments'`, `'attachments.uploadedBy'`
- **Added mapping**: Transform comments to include formatted attachments
- **Impact**: GET /tickets/:id/comments now includes attachments per comment
- **Performance**: Single query with joins, no N+1 issues; pagination still works correctly

#### 6. `src/attachments/attachments.service.ts`
- **Change 1**: Added imports for ActivityService and ActivityAction
- **Change 2**: Injected ActivityService in constructor
- **Change 3**: Updated `uploadToTicket()` method to log activity
- **After saving attachment**: Calls `activityService.log()` with:
  - action: `ActivityAction.ATTACHMENT_ADDED`
  - metadata: `{ fileName, fileSize, attachmentId }`
- **Error handling**: Wraps activity logging in try-catch, logs warning if fails (non-critical)

#### 7. `src/attachments/attachments.module.ts`
- **Change**: Added ActivityModule to imports
- **Purpose**: Make ActivityService available for dependency injection

#### 8. `src/ticket/ticket.controller.ts`
- **Change**: Enhanced `@ApiOkResponse` for GET /tickets/:id endpoint
- **Added**: Detailed schema example showing attachments array
- **Example structure**: Shows ticket with attachments including file metadata

#### 9. `src/comment/comment.controller.ts`
- **Change**: Enhanced `@ApiOkResponse` for GET /tickets/:id/comments endpoint
- **Added**: attachments array in example response
- **Example structure**: Shows comment with attachments

## Testing Steps

### Test 1: Ticket Detail with Attachments
```bash
# 1. Create a ticket
POST /api/tickets
{
  "projectId": "<project-id>",
  "title": "Test ticket",
  "statusId": "<status-id>"
}
# Response: { "id": "<ticket-id>", ... }

# 2. Upload attachment to ticket
POST /api/tickets/<ticket-id>/attachments
# Form-data: file=<your-file>
# Response: {
#   "id": "<attachment-id>",
#   "fileUrl": "/uploads/<filename>",
#   "fileName": "<filename>",
#   "fileSize": <size>,
#   "uploadedById": "<user-id>",
#   "ticketId": "<ticket-id>",
#   "createdAt": "..."
# }

# 3. Get ticket detail (should include attachments)
GET /api/tickets/<ticket-id>
# Response should include:
# {
#   "success": true,
#   "data": {
#     "id": "<ticket-id>",
#     ...,
#     "attachments": [
#       {
#         "id": "<attachment-id>",
#         "fileUrl": "/uploads/<filename>",
#         "fileName": "<filename>",
#         "fileSize": <size>,
#         "uploadedBy": { "id": "<user-id>", "name": "..." },
#         "createdAt": "..."
#       }
#     ]
#   }
# }
```

### Test 2: Comment Detail with Attachments
```bash
# 1. Create ticket (if not already done above)

# 2. Create comment
POST /api/tickets/<ticket-id>/comments
{
  "content": "Test comment"
}
# Response: { "id": "<comment-id>", ... }

# 3. Upload attachment to comment
POST /api/comments/<comment-id>/attachments
# Form-data: file=<your-file>
# Response: { "id": "<attachment-id>", ... }

# 4. Get comments (should include attachments)
GET /api/tickets/<ticket-id>/comments?page=1&limit=5
# Response should include:
# {
#   "success": true,
#   "data": {
#     "items": [
#       {
#         "id": "<comment-id>",
#         "content": "Test comment",
#         "user": { "id": "...", "name": "..." },
#         "attachments": [
#           {
#             "id": "<attachment-id>",
#             "fileUrl": "/uploads/<filename>",
#             "fileName": "<filename>",
#             "fileSize": <size>,
#             "uploadedBy": { "id": "...", "name": "..." },
#             "createdAt": "..."
#           }
#         ]
#       }
#     ],
#     "total": 1,
#     "page": 1,
#     "limit": 5
#   }
# }
```

### Test 3: Activity Logging
```bash
# After uploading attachment to ticket (Test 1, step 2):

# Get ticket activity
GET /api/projects/<project-id>/activities?ticketId=<ticket-id>
# Response should include:
# {
#   "action": "ATTACHMENT_ADDED",
#   "metadata": {
#     "fileName": "<filename>",
#     "fileSize": <size>,
#     "attachmentId": "<attachment-id>"
#   },
#   "user": { "id": "...", "name": "..." },
#   "createdAt": "..."
# }
```

### Test 4: Edge Cases
```bash
# 1. Ticket with no attachments - should return empty array
GET /api/tickets/<ticket-with-no-attachments>
# attachments: []

# 2. Multiple attachments on same ticket
# Upload 3 attachments, then GET /tickets/:id
# All three should appear in attachments array

# 3. Attachment deletion should not affect other attachments
DELETE /api/attachments/<attachment-id>
GET /api/tickets/<ticket-id>
# Should only show remaining attachments
```

### Test 5: Swagger Documentation
```bash
# 1. Navigate to http://localhost:3000/api
# 2. Expand GET /api/tickets/{id}
# 3. Verify response schema shows example with attachments array
# 4. Expand GET /api/tickets/{ticketId}/comments
# 5. Verify response schema shows comments with attachments
```

## Validation Checklist

- [ ] Build compiles without errors: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] Ticket detail includes attachments array
- [ ] Comment detail includes attachments array
- [ ] Each attachment has correct structure (id, fileUrl, fileName, fileSize, uploadedBy, createdAt)
- [ ] Attachments are associated with correct parents (ticket or comment)
- [ ] Activity log created for ticket attachment uploads
- [ ] Swagger docs show example attachments in responses
- [ ] Pagination still works for comments (limit applies to comments, not attachments)
- [ ] Multiple attachments display correctly
- [ ] Migration runs cleanly (if needed)

## Performance Notes

- **Query Optimization**: Uses `leftJoinAndSelect` for single-query loading
- **N+1 Problem**: Avoided by loading attachments and uploadedBy in single query
- **Pagination**: Correctly applies to comments, not affected by attachment counts
- **Cost**: Minimal – single additional join per request

## Backward Compatibility

- Response structure extended with new `attachments` array field
- All existing fields preserved
- Existing clients can ignore `attachments` field if not used
- No breaking changes to API contract
