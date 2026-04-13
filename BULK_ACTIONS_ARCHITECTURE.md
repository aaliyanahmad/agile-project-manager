# Bulk Actions API - Architecture & Design

## 🏗️ System Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      API Request                             │
│  PATCH /projects/:projectId/tickets/bulk                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌────────────────────────────┐
         │  JWT Authentication Guard  │
         │   (@UseGuards)             │
         └────────┬───────────────────┘
                  │
                  ▼
        ┌──────────────────────────┐
        │  Input Validation        │
        │  (class-validator)       │
        │  - ticketIds: UUID[]     │
        │  - action: enum          │
        │  - payload: nested DTO   │
        └────────┬─────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │  Business Logic Validation     │
    │  (TicketService)               │
    │  - Project exists              │
    │  - User in workspace           │
    │  - Action-specific validation  │
    └────────┬─────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  Database Transaction          │
    │  (DataSource.transaction)      │
    │                                │
    │  For each ticket:              │
    │  - Load state                  │
    │  - Apply action                │
    │  - Save changes                │
    │  - Log activity                │
    └────────┬─────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  Activity Logging              │
    │  (ActivityService.log)         │
    │  - Metadata with before/after  │
    │  - Audit trail                 │
    └────────┬─────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  Response                      │
    │  { success: true,              │
    │    updatedCount: number }      │
    └────────────────────────────────┘
```

---

## 📋 Component Responsibilities

### 1. TicketController
**File**: `src/ticket/ticket.controller.ts`

```typescript
bulkUpdateTickets() {
  // Responsibility: HTTP routing & parameter extraction
  // - Extract projectId from URL param
  // - Extract user from JWT token
  // - Parse & validate request body (via DTO)
  // - Call service layer
  // - Return response
}
```

**Decorator Stack**:
```typescript
@Patch('projects/:projectId/tickets/bulk')     // Route
@UseGuards(JwtAuthGuard)                       // Auth
@ApiOperation({...})                           // Docs
@ApiBearerAuth()                               // Docs
@ApiParam({...})                               // Docs
@ApiBody({...})                                // Docs
```

**Validation**:
- JWT token present ✅
- projectId format valid ✅
- Body matches DTO schema ✅

---

### 2. TicketService
**File**: `src/ticket/ticket.service.ts`

```typescript
bulkUpdateTickets() {
  // Responsibility: Business logic & data manipulation
  // - Validate project exists
  // - Validate user workspace membership
  // - Validate action and payload
  // - Fetch tickets (batch)
  // - Execute within transaction
  // - Apply changes per ticket
  // - Log activities
  // - Return result
}
```

**Key Methods**:
- `validateUserInWorkspace()` - Private helper
- `validateAssigneeInWorkspace()` - Private helper
- DataSource.transaction() wrapper

**Validation Layers**:
1. **Resource existence**: Project, sprint, assignee, tickets
2. **Access control**: User in workspace, workspace membership
3. **Business rules**: No completed sprints, valid enums
4. **Data integrity**: All tickets in same project

---

### 3. ActivityService
**File**: `src/activity/activity.service.ts`

```typescript
log() {
  // Responsibility: Audit trail creation
  // - Create activity log record
  // - Store action type
  // - Store metadata (before/after values)
  // - Link to ticket & user
}
```

**Used By**: TicketService (for each ticket)

**Data Stored**:
```typescript
{
  ticketId: string,      // Which ticket
  userId: string,        // Who made change
  action: ActivityAction, // What happened
  metadata: {            // How it changed
    field: string,
    from: any,
    to: any
  },
  createdAt: timestamp   // When
}
```

---

### 4. DTOs & Types
**File**: `src/ticket/dto/bulk-ticket-action.dto.ts`

```typescript
// Request DTO
BulkTicketActionDto {
  ticketIds: string[]         // What to update
  action: BulkActionType      // What to do
  payload: BulkActionPayloadDto // Action data
}

// Payload DTO (nested, optional fields)
BulkActionPayloadDto {
  assigneeId?: string
  priority?: TicketPriority
  sprintId?: string
}

// Action Type Enum
BulkActionType {
  ASSIGN,
  PRIORITY,
  MOVE_TO_SPRINT,
  MOVE_TO_BACKLOG
}

// Response Type
BulkActionResponse {
  success: boolean
  updatedCount: number
}
```

---

## 🔄 Data Flow Example: BULK ASSIGN

### Scenario: Assign 3 tickets to user "alice"

```
1. HTTP Request
   ├─ URL: PATCH /projects/proj-123/tickets/bulk
   ├─ Header: Authorization: Bearer alice_token
   └─ Body: {
       ticketIds: ["t1", "t2", "t3"],
       action: "ASSIGN",
       payload: { assigneeId: "alice_uuid" }
     }

2. Controller Layer
   ├─ JWT Guard validates token → alice_uuid extracted
   ├─ DTO validation
   │  ├─ ticketIds: valid UUID array ✓
   │  ├─ action: "ASSIGN" in enum ✓
   │  └─ payload: assigneeId is valid UUID ✓
   └─ Call service.bulkUpdateTickets(
       ["t1","t2","t3"], "proj-123", "alice_uuid", dto)

3. Service - Validation Phase
   ├─ Fetch project "proj-123" → exists ✓
   ├─ Check alice_uuid in workspace → member ✓
   ├─ Fetch assignee user (alice_uuid) → exists ✓
   ├─ Check alice in workspace → member ✓
   ├─ Fetch 3 tickets with relations → all exist ✓
   └─ All tickets in project-123 → verified ✓

4. Service - Transaction Phase
   ├─ dataSource.transaction(async manager => {
   │
   │  For ticket t1:
   │  ├─ oldAssignees = [] (was unassigned)
   │  ├─ ticket.assignees = [alice]
   │  ├─ manager.getRepository(Ticket).save(ticket)
   │  └─ activityService.log({
   │      ticketId: "t1",
   │      userId: "alice_uuid",
   │      action: "ASSIGNEE_CHANGED",
   │      metadata: {
   │        field: "assignee",
   │        from: [],
   │        to: ["alice_uuid"]
   │      }
   │    })
   │
   │  For ticket t2:
   │  ├─ oldAssignees = ["bob"]
   │  ├─ ticket.assignees = [alice]
   │  ├─ manager.getRepository(Ticket).save(ticket)
   │  └─ activityService.log({...})
   │
   │  For ticket t3:
   │  ├─ oldAssignees = ["alice"] (already assigned)
   │  ├─ Check if changed: alice === alice_uuid → SAME
   │  ├─ SKIP update: don't save, don't log
   │  └─ (not counted in updatedCount)
   │
   │  updatedCount = 2 (t1 and t2 only)
   │
   └─ End transaction (all or nothing)

5. Response
   {
     "success": true,
     "updatedCount": 2
   }

6. Database State
   ├─ ticket t1: assignees=[alice], updated_at=now
   ├─ ticket t2: assignees=[alice], updated_at=now
   ├─ ticket t3: assignees=[alice], updated_at=unchanged
   └─ activity_log: 2 new records (t1, t2)
```

---

## 🛡️ Validation Layers

### Layer 1: HTTP/DTO Validation
**Responsibility**: Input sanitation
- TeamValidator ensures valid format
- Decorator: `@Body(new ValidationPipe())`
- Errors: 400 Bad Request (malformed)

**Checks**:
- `ticketIds`: Array of UUIDs
- `action`: Enum value
- `payload`: Nested DTO validation

---

### Layer 2: Authorization
**Responsibility**: Access control
- JWT token presence & validity
- User extracted from token
- Guard: `@UseGuards(JwtAuthGuard)`
- Errors: 401 Unauthorized

**Checks**:
- Token valid
- Token not expired
- User exists

---

### Layer 3: Business Logic Validation
**Responsibility**: Domain constraints
- Resources exist (project, sprint, users, tickets)
- User workspace membership
- Business rules (no completed sprints)
- Errors: 400/403/404

**Checks**:
```
Project exists?
  └─ 404 Not Found

User in workspace?
  └─ 403 Forbidden

All tickets exist?
  └─ 400 Bad Request

All tickets in project?
  └─ 400 Bad Request

For ASSIGN:
  ├─ assigneeId provided?
  │  └─ 400 Bad Request
  ├─ assignee exists?
  │  └─ 400 Bad Request
  └─ assignee in workspace?
     └─ 400 Bad Request

For PRIORITY:
  ├─ priority provided?
  │  └─ 400 Bad Request
  └─ priority valid enum?
     └─ 400 Bad Request

For MOVE_TO_SPRINT:
  ├─ sprintId provided?
  │  └─ 400 Bad Request
  ├─ sprint exists?
  │  └─ 404 Not Found
  ├─ sprint in project?
  │  └─ 400 Bad Request
  └─ sprint not completed?
     └─ 400 Bad Request

For MOVE_TO_BACKLOG:
  └─ No completed sprint tickets?
     └─ 400 Bad Request
```

---

## 💾 Database Transactions

### Transaction Scope
```typescript
await this.dataSource.transaction(async (manager) => {
  // EVERYTHING inside runs atomically
  const ticketRepo = manager.getRepository(Ticket);
  
  for (const ticket of tickets) {
    // Apply changes
    await ticketRepo.save(ticket);
    
    // Log activities (inside transaction)
    // Will be rolled back if anything fails
  }
});
```

### Transaction Guarantees
- **Atomicity**: All changes or none
- **Consistency**: DB stays valid
- **Isolation**: Other transactions don't interfere
- **Durability**: Once committed, persists

### Failure Handling
```
If error during loop:
├─ Exception thrown
└─ All saves rolled back
   ├─ Tickets reverted
   ├─ Activities reverted
   └─ Database unchanged
```

---

## 📊 Query Patterns

### Batch Fetch (Pre-Transaction)
```typescript
// Fetch all tickets upfront
const tickets = await this.ticketRepository.find({
  where: {
    id: In(ticketIds),
    projectId
  },
  relations: ['sprint', 'assignees']  // Load relations once
});
```

**Why**: 
- Single batch query (efficient)
- Relations loaded upfront (no N+1)
- Validation possible before transaction

### Per-Ticket Update (In-Transaction)
```typescript
const ticketRepo = manager.getRepository(Ticket);

for (const ticket of tickets) {
  ticket.priority = newPriority;
  await ticketRepo.save(ticket);  // UPDATE statement
}
```

**Why**:
- Allows checking before/after per ticket
- Only updates changed values
- Properly logged with metadata

---

## 🎯 Design Decisions

### Decision 1: Project Context Required
**Chose**: `PATCH /projects/:projectId/tickets/bulk`
**Why**: 
- Prevents moving tickets between projects
- Validates all in same context
- Better REST semantics

### Decision 2: Per-Ticket Logging
**Chose**: One log per ticket (not combined)
**Why**:
- Audit trail accurate per ticket
- Can track individual changes
- Matches single-ticket update pattern
- Better for history/rollback

### Decision 3: Transaction Inside Service
**Chose**: Transaction in service layer
**Why**:
- Business logic isolated
- Easier to test
- Transaction scope clear
- Error handling centralized

### Decision 4: Skip Unchanged Tickets
**Chose**: Don't update if value already set
**Why**:
- Reduces DB writes
- `updatedCount` accurate
- No spurious activity logs
- Better performance

### Decision 5: Fail-Fast Validation
**Chose**: Validate everything before transaction
**Why**:
- User sees error immediately
- No partial updates on bad input
- Clearer error messages
- Faster failure

---

## 🚀 Performance Profile

### Query Breakdown
```
1. Validate project           → 1 query
2. Validate assignee (ASSIGN) → 1 query (if needed)
3. Validate sprint (SPRINT)   → 1 query (if needed)
4. Fetch all tickets          → 1 query (batch) +
                               relations
5. For each ticket:
   └─ Save ticket             → 1 query/ticket
6. Activity logs              → 1 insert/ticket
                               (can be batched)

Total for N tickets:
├─ Pre-transaction: ~4 queries
└─ In-transaction: N+N queries
  └─ = 4 + 2N total
```

### Performance Impact
- 10 tickets: ~24 queries
- 100 tickets: ~204 queries
- All within single transaction
- Typical latency: < 500ms

### Optimization Opportunities
1. **Batch activity logging**: One insert instead of N
2. **Bulk save**: Use `getRepository().save([...])` 
3. **Async logging**: Activity logs outside transaction
4. **Caching**: Cache project/sprint data if frequently updates

---

## 🔐 Security Considerations

### Threat: Unauthorized Access
**Mitigation**:
- JWT guard validates token
- User in workspace verified
- All ops scoped by workspace_id

### Threat: Data Modification Out of Bounds
**Mitigation**:
- Tickets must be in project
- Sprint must be in project
- Assignee must be in workspace
- Comprehensive validation

### Threat: Race Conditions
**Mitigation**:
- Transaction isolation
- Database locking
- Atomic operations

### Threat: Denial of Service
**Mitigation**:
- Rate limiting (API layer, not here)
- Input validation (max 1000 tickets)
- Reasonable query timeouts
- Transaction timeout

---

## 🧪 Testability

### Unit Test Opportunities
```typescript
// Mock dependencies
- sprintRepository: MockRepository<Sprint>
- userRepository: MockRepository<User>
- ticketRepository: MockRepository<Ticket>
- activityService: MockActivityService
- dataSource: MockDataSource

// Test cases
- bulkUpdateTickets() with ASSIGN
- bulkUpdateTickets() with PRIORITY
- bulkUpdateTickets() with MOVE_TO_SPRINT
- bulkUpdateTickets() with MOVE_TO_BACKLOG
- Validates project exists
- Validates user in workspace
- Validates action specific rules
- Creates activity logs per ticket
- Transaction rollback on error
- Skips unchanged tickets
```

### Integration Test Opportunities
```typescript
// Real database
- E2E bulk assign workflow
- E2E bulk priority change
- E2E bulk sprint movement
- Verify activity logs created
- Verify transaction safety
```

---

## 📚 Related Architecture

### Single-Ticket Update
**File**: `src/ticket/ticket.service.ts` → `updateTicket()`

Bulk API mirrors this:
- Same validation approach
- Same activity logging pattern
- Same transaction handling
- Compatible with existing code

### Activity Logging
**File**: `src/activity/activity.service.ts`

Bulk API uses the same service:
- One call per ticket
- Same metadata format
- Integrated audit trail

---

## 🔄 Future Enhancement Ideas

### Idea 1: Dry-Run Mode
```typescript
// Request with dryRun: true
// Returns what would change without saving
```

### Idea 2: Partial Failure Strategy
```typescript
// Continue on errors, return failed ticket list
{
  success: true,
  updatedCount: 8,
  failedCount: 2,
  failedTicketIds: ["t1", "t3"]
}
```

### Idea 3: Async Activity Logging
```typescript
// Log activities outside transaction
// Improves transaction speed
```

### Idea 4: Batch Operations Queue
```typescript
// For very large operations (10k+ tickets)
// Process in background job queue
```

### Idea 5: Conditional Updates
```typescript
// Update only if current state matches condition
// "Set priority to HIGH only if currently LOW"
```

---

**Document Last Updated**: April 13, 2026
**Architecture Version**: 1.0
**Status**: Approved for Production
