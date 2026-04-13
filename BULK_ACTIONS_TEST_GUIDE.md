/**
 * BULK ACTIONS API - TEST GUIDE
 * 
 * Endpoint: PATCH /projects/:projectId/tickets/bulk
 * Authentication: Bearer token (JWT)
 * 
 * This file contains example requests and expected responses for testing
 * the bulk actions API implementation.
 */

// ============================================================
// TEST 1: BULK ASSIGN USERS
// ============================================================

// REQUEST
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1", "ticket-2", "ticket-3"],
  "action": "ASSIGN",
  "payload": {
    "assigneeId": "user-uuid-456"
  }
}

// SUCCESS RESPONSE (200 OK)
{
  "success": true,
  "updatedCount": 3
}

// EXPECTED SIDE EFFECTS:
// - All 3 tickets now have user-uuid-456 as assignee
// - Activity log created for each ticket with action: ASSIGNEE_CHANGED
// - Metadata shows: { field: "assignee", from: [...], to: ["user-uuid-456"] }


// ============================================================
// TEST 2: BULK PRIORITY CHANGE
// ============================================================

// REQUEST
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-4", "ticket-5"],
  "action": "PRIORITY",
  "payload": {
    "priority": "HIGH"
  }
}

// SUCCESS RESPONSE (200 OK)
{
  "success": true,
  "updatedCount": 2
}

// EXPECTED SIDE EFFECTS:
// - Both tickets now have priority: HIGH
// - Activity log for each ticket with action: PRIORITY_CHANGED
// - Metadata shows: { field: "priority", from: "MEDIUM", to: "HIGH" }


// ============================================================
// TEST 3: BULK MOVE TO SPRINT
// ============================================================

// REQUEST
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["backlog-ticket-1", "backlog-ticket-2", "backlog-ticket-3"],
  "action": "MOVE_TO_SPRINT",
  "payload": {
    "sprintId": "sprint-uuid-789"
  }
}

// SUCCESS RESPONSE (200 OK)
{
  "success": true,
  "updatedCount": 3
}

// EXPECTED SIDE EFFECTS:
// - All 3 tickets now have sprintId: "sprint-uuid-789"
// - Activity log for each ticket with action: MOVED_TO_SPRINT
// - Metadata shows: { field: "sprint", from: null, to: "sprint-uuid-789" }


// ============================================================
// TEST 4: BULK MOVE TO BACKLOG
// ============================================================

// REQUEST
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["sprint-ticket-1", "sprint-ticket-2"],
  "action": "MOVE_TO_BACKLOG",
  "payload": {}
}

// SUCCESS RESPONSE (200 OK)
{
  "success": true,
  "updatedCount": 2
}

// EXPECTED SIDE EFFECTS:
// - Both tickets now have sprintId: null
// - Activity log for each ticket with action: MOVED_TO_BACKLOG
// - Metadata shows: { field: "sprint", from: "sprint-uuid-123", to: null }


// ============================================================
// TEST 5A: VALIDATION ERRORS - MISSING assigneeId FOR ASSIGN
// ============================================================

// REQUEST (invalid - no assigneeId for ASSIGN action)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1", "ticket-2"],
  "action": "ASSIGN",
  "payload": {}
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "assigneeId is required for ASSIGN action",
  "error": "Bad Request"
}


// ============================================================
// TEST 5B: VALIDATION ERRORS - INVALID USER ASSIGNEE
// ============================================================

// REQUEST (invalid - user doesn't exist)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "ASSIGN",
  "payload": {
    "assigneeId": "non-existent-uuid"
  }
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "Assignee not found",
  "error": "Bad Request"
}


// ============================================================
// TEST 5C: VALIDATION ERRORS - ASSIGNEE NOT IN WORKSPACE
// ============================================================

// REQUEST (invalid - user exists but not in workspace)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "ASSIGN",
  "payload": {
    "assigneeId": "user-from-different-workspace"
  }
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "Assignee must belong to the ticket project workspace",
  "error": "Bad Request"
}


// ============================================================
// TEST 5D: VALIDATION ERRORS - INVALID PRIORITY
// ============================================================

// REQUEST (invalid priority)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "PRIORITY",
  "payload": {
    "priority": "URGENT"
  }
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "Invalid priority value",
  "error": "Bad Request"
}


// ============================================================
// TEST 5E: VALIDATION ERRORS - SPRINT NOT FOUND
// ============================================================

// REQUEST (sprint doesn't exist)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "MOVE_TO_SPRINT",
  "payload": {
    "sprintId": "non-existent-sprint"
  }
}

// ERROR RESPONSE (404 Not Found)
{
  "statusCode": 404,
  "message": "Sprint not found",
  "error": "Not Found"
}


// ============================================================
// TEST 5F: VALIDATION ERRORS - SPRINT BELONGS TO DIFFERENT PROJECT
// ============================================================

// REQUEST (sprint is from different project)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "MOVE_TO_SPRINT",
  "payload": {
    "sprintId": "sprint-from-different-project"
  }
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "Sprint belongs to a different project",
  "error": "Bad Request"
}


// ============================================================
// TEST 5G: VALIDATION ERRORS - CANNOT MOVE FROM COMPLETED SPRINT
// ============================================================

// REQUEST (trying to move tickets from a completed sprint)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-in-completed-sprint"],
  "action": "MOVE_TO_BACKLOG",
  "payload": {}
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "Cannot move tickets from a completed sprint",
  "error": "Bad Request"
}


// ============================================================
// TEST 5H: VALIDATION ERRORS - TICKETS NOT IN PROJECT
// ============================================================

// REQUEST (tickets belong to different project)
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-from-different-project"],
  "action": "ASSIGN",
  "payload": {
    "assigneeId": "user-uuid"
  }
}

// ERROR RESPONSE (400 Bad Request)
{
  "statusCode": 400,
  "message": "Some tickets do not belong to this project or do not exist",
  "error": "Bad Request"
}


// ============================================================
// TEST 6: ACTIVITY LOG VERIFICATION
// ============================================================

// After running bulk update, verify activity logs:

GET /tickets/ticket-1/activity  // (if this endpoint exists)
Authorization: Bearer token

// RESPONSE should contain one entry per action:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "activity-log-uuid",
        "ticketId": "ticket-1",
        "userId": "current-user-id",
        "action": "ASSIGNEE_CHANGED",
        "metadata": {
          "field": "assignee",
          "from": ["old-user-id"],
          "to": ["new-user-id"]
        },
        "createdAt": "2026-04-13T..."
      }
    ],
    // ...
  }
}


// ============================================================
// TEST 7: MIXED SCENARIO - PARTIAL UPDATE (SKIP UNCHANGED)
// ============================================================

// REQUEST: Some tickets already have the priority
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token
Content-Type: application/json

{
  "ticketIds": ["ticket-low", "ticket-medium", "ticket-high"],
  "action": "PRIORITY",
  "payload": {
    "priority": "HIGH"
  }
}

// RESPONSE - 2 updated, 1 skipped (already HIGH)
{
  "success": true,
  "updatedCount": 2
}

// EXPECTED: 
// - ticket-low: priority changed to HIGH, activity log created
// - ticket-medium: priority changed to HIGH, activity log created
// - ticket-high: priority already HIGH, NO update, NO activity log


// ============================================================
// TEST 8: AUTHORIZATION - USER NOT IN WORKSPACE
// ============================================================

// REQUEST from user not in workspace
PATCH /projects/project-uuid-123/tickets/bulk
Authorization: Bearer token-of-external-user
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "ASSIGN",
  "payload": {
    "assigneeId": "user-uuid"
  }
}

// ERROR RESPONSE (403 Forbidden)
{
  "statusCode": 403,
  "message": "Access denied: User does not belong to this workspace",
  "error": "Forbidden"
}


// ============================================================
// TEST 9: AUTHENTICATION - NO TOKEN
// ============================================================

// REQUEST without authorization header
PATCH /projects/project-uuid-123/tickets/bulk
Content-Type: application/json

{
  "ticketIds": ["ticket-1"],
  "action": "ASSIGN",
  "payload": {
    "assigneeId": "user-uuid"
  }
}

// ERROR RESPONSE (401 Unauthorized)
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}


// ============================================================
// IMPORTANT NOTES FOR TESTING
// ============================================================
// 
// 1. TRANSACTION SAFETY:
//    - All updates are wrapped in a transaction
//    - If any validation fails, NO changes are applied
//    - If an error occurs mid-operation, entire operation rolls back
//
// 2. ACTIVITY LOGGING:
//    - ONE activity log is created PER TICKET
//    - NOT one combined log for the whole operation
//    - Each log contains: action, field, from, to
//
// 3. IDEMPOTENCY:
//    - If a ticket already has the target value (e.g., same priority),
//      it's not updated and no activity log is created
//    - updatedCount only counts actual changes
//
// 4. PERFORMANCE:
//    - Batch queries fetch all tickets upfront
//    - One query per ticket to save (within transaction)
//    - Activity logging is separate (allows for async if needed later)
//
// 5. EDGE CASES HANDLED:
//    - Empty ticketIds array → 400 Bad Request
//    - Action not in enum → 400 Bad Request
//    - Payload missing required field → 400 Bad Request
//    - Some tickets don't exist → 400 Bad Request
//    - Mixed old/new values → correctly handles each ticket individually
//
