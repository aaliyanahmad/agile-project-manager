# Bulk Actions API - Quick Start Guide

## 🚀 Quick Overview

Bulk actions allow you to update multiple tickets in a single API call.

**Endpoint**: `PATCH /projects/:projectId/tickets/bulk`

---

## 📄 Request Format

```typescript
{
  "ticketIds": ["uuid1", "uuid2", "uuid3"],  // Tickets to update
  "action": "ASSIGN" | "PRIORITY" | "MOVE_TO_SPRINT" | "MOVE_TO_BACKLOG",
  "payload": {
    "assigneeId"?: string,      // For ASSIGN
    "priority"?: "LOW" | "MEDIUM" | "HIGH",  // For PRIORITY
    "sprintId"?: string         // For MOVE_TO_SPRINT
  }
}
```

---

## 🎯 Usage Examples

### 1️⃣ Assign Tickets to User

```bash
curl -X PATCH http://localhost:3000/projects/proj-123/tickets/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["ticket-1", "ticket-2", "ticket-3"],
    "action": "ASSIGN",
    "payload": {
      "assigneeId": "user-uuid-456"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "updatedCount": 3
}
```

---

### 2️⃣ Change Priority

```bash
curl -X PATCH http://localhost:3000/projects/proj-123/tickets/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["ticket-4", "ticket-5"],
    "action": "PRIORITY",
    "payload": {
      "priority": "HIGH"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "updatedCount": 2
}
```

---

### 3️⃣ Move to Sprint

```bash
curl -X PATCH http://localhost:3000/projects/proj-123/tickets/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["backlog-1", "backlog-2", "backlog-3"],
    "action": "MOVE_TO_SPRINT",
    "payload": {
      "sprintId": "sprint-789"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "updatedCount": 3
}
```

---

### 4️⃣ Move Back to Backlog

```bash
curl -X PATCH http://localhost:3000/projects/proj-123/tickets/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["sprint-ticket-1", "sprint-ticket-2"],
    "action": "MOVE_TO_BACKLOG",
    "payload": {}
  }'
```

**Response**:
```json
{
  "success": true,
  "updatedCount": 2
}
```

---

## ✅ Validation Rules

### Tickets
- Must not be empty
- Must all exist
- Must all belong to the project

### Action: `ASSIGN`
- `payload.assigneeId` is **required**
- User must exist
- User must belong to workspace

### Action: `PRIORITY`
- `payload.priority` is **required**
- Must be: `LOW`, `MEDIUM`, or `HIGH`

### Action: `MOVE_TO_SPRINT`
- `payload.sprintId` is **required**
- Sprint must exist
- Sprint must belong to same project
- Sprint must not be completed

### Action: `MOVE_TO_BACKLOG`
- No payload validation needed
- Tickets must not be in a completed sprint

---

## ❌ Common Errors

### 400 Bad Request - Missing assigneeId
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "assigneeId is required for ASSIGN action"
}
```
**Fix**: Add `payload.assigneeId` to request

---

### 400 Bad Request - User not found
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Assignee not found"
}
```
**Fix**: Verify the user UUID exists in your system

---

### 400 Bad Request - User not in workspace
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Assignee must belong to the ticket project workspace"
}
```
**Fix**: Ensure the user is a member of the workspace

---

### 404 Not Found - Sprint not found
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Sprint not found"
}
```
**Fix**: Verify the sprint UUID is correct

---

### 400 Bad Request - Tickets invalid
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Some tickets do not belong to this project or do not exist"
}
```
**Fix**: Verify all ticket IDs exist and belong to the specified project

---

### 403 Forbidden - User not in workspace
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Access denied: User does not belong to this workspace"
}
```
**Fix**: Ensure your JWT user token is from someone in this workspace

---

### 401 Unauthorized - No token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```
**Fix**: Add `Authorization: Bearer YOUR_TOKEN` header

---

## 🔄 Activity Logging

Each ticket update creates an activity log. View them with:

```bash
GET /tickets/:ticketId/activity
```

Activities will show:
- **Action**: What changed (ASSIGNEE_CHANGED, PRIORITY_CHANGED, etc.)
- **Metadata**: From/to values
- **CreatedAt**: When the change happened
- **UserId**: Who made the change

---

## 💡 Tips & Best Practices

### ✅ DO
- ✅ Use the bulk API for updating 3+ tickets (more efficient)
- ✅ Batch related updates together
- ✅ Check activity logs to verify changes
- ✅ Validate your UUIDs before sending

### ❌ DON'T
- ❌ Don't send empty `ticketIds` array
- ❌ Don't try to move from completed sprints
- ❌ Don't assign users from different workspaces
- ❌ Don't forget the `Authorization` header

---

## 🧪 Testing Your Integration

### Step 1: Get Project UUID
```bash
GET /projects
```
Find your project ID.

### Step 2: Get Ticket UUIDs
```bash
GET /projects/:projectId/backlog
```
Get some ticket IDs to bulk update.

### Step 3: Get User UUID
```bash
GET /workspaces/:workspaceId/members
```
Get a user ID to assign to.

### Step 4: Run Bulk Update
```bash
curl -X PATCH http://localhost:3000/projects/PROJECT_ID/tickets/bulk \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketIds": ["TICKET_1", "TICKET_2"],
    "action": "ASSIGN",
    "payload": {
      "assigneeId": "USER_ID"
    }
  }'
```

### Step 5: Verify Results
```bash
GET /tickets/TICKET_1/activity
```
Check the activity logs.

---

## 📊 Performance Notes

- Updates are atomic (all succeed or all fail)
- Each ticket is processed in a single transaction
- No N+1 queries (relations loaded upfront)
- Typical response time: < 500ms for 100 tickets

---

## 🔗 Related Endpoints

- `GET /projects/:projectId/backlog` - Get tickets to update
- `GET /tickets/:ticketId/activity` - View activity logs
- `PATCH /tickets/:ticketId` - Single ticket update (alternative)

---

## 📞 Support

For issues or questions:
1. Check `BULK_ACTIONS_TEST_GUIDE.md` for detailed test cases
2. Review `BULK_ACTIONS_IMPLEMENTATION.md` for architecture
3. Check `BULK_ACTIONS_REQUIREMENTS_CHECKLIST.md` for all requirements

---

**Last Updated**: April 13, 2026
**Version**: 1.0
**Status**: Production Ready ✅
