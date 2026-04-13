# Test Suite Documentation

## Overview

This is a comprehensive, production-grade test suite for the Agile Project Manager backend (NestJS + PostgreSQL + TypeORM). The suite covers unit tests, integration tests, and E2E tests across all major features from EPIC 1-7:

- **EPIC 1**: Workspaces & User Management
- **EPIC 2**: Projects & Project Configuration
- **EPIC 3**: Tickets & Subtasks
- **EPIC 4**: Sprints & Sprint Management
- **EPIC 5**: Comments & Activity Logs
- **EPIC 6**: Board System & Status Management
- **EPIC 7**: Bulk Actions & Advanced Filtering

## Test Structure

```
test/
├── unit/                                      # Unit tests (mocked dependencies)
│   ├── auth.service.spec.ts
│   ├── workspace-project.service.spec.ts
│   ├── ticket-sprint.service.spec.ts
│   └── comment-activity.service.spec.ts
├── integration/                               # Integration tests (real DB, multiple services)
│   ├── complex-workflows.spec.ts
│   └── authorization-access-control.spec.ts
└── e2e/                                       # E2E tests (real app, HTTP layer)
    ├── auth-workspace-project.e2e-spec.ts
    ├── ticket-subtask-comment.e2e-spec.ts
    ├── sprint.e2e-spec.ts
    ├── bulk-actions.e2e-spec.ts
    ├── board.e2e-spec.ts
    └── filtering.e2e-spec.ts
```

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Setup database (if needed)
npm run migration:run

# Configure environment variables (if not set)
# .env file should have DATABASE_URL pointing to test database
```

### Run All Tests

```bash
# Run entire test suite
npm run test

# Run with coverage report
npm run test:cov

# Run specific test file
npm run test -- auth.service.spec.ts
```

### Run Tests by Layer

```bash
# Unit tests only
npm run test -- --testPathPattern="test/unit"

# Integration tests only
npm run test -- --testPathPattern="test/integration"

# E2E tests only
npm run test:e2e

# Watch mode (auto-rerun on changes)
npm run test -- --watch
```

### Run Specific Test Suite

```bash
# Single test file
npm run test -- auth.service.spec.ts

# By description pattern
npm run test -- --testNamePattern="should create workspace"

# By pattern in path
npm run test -- --testPathPattern="ticket-sprint"
```

## Test Layers Explained

### Unit Tests (test/unit/)

**Purpose**: Verify business logic in isolation with mocked dependencies.

**Characteristics**:
- Mock repositories using Jest factories
- Mock external dependencies (JwtService, etc.)
- Fast execution (~100ms per test)
- No database required
- Test error cases, validation, edge cases

**Files**:
- `auth.service.spec.ts` - Signup, login, token generation
- `workspace-project.service.spec.ts` - Workspace creation, project setup
- `ticket-sprint.service.spec.ts` - Ticket lifecycle, sprint management, subtasks
- `comment-activity.service.spec.ts` - Comments with author-only constraints, activity logging

**Key Patterns**:
```typescript
// Mock repository pattern
const mockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

// Setup in beforeEach
beforeEach(() => {
  module = Test.createTestingModule({
    providers: [
      ServiceUnderTest,
      { provide: getRepositoryToken(Entity), useFactory: mockRepository }
    ]
  }).compile();
});
```

### Integration Tests (test/integration/)

**Purpose**: Verify complex workflows with real database and multiple services.

**Characteristics**:
- Use real AppModule with actual database
- Test interactions between multiple services
- Verify data consistency and constraints
- Medium execution time (~500ms - 2s per test)
- Requires database connectivity

**Files**:
- `complex-workflows.spec.ts` - Full ticket lifecycle, bulk operations, sprint completion
- `authorization-access-control.spec.ts` - Workspace isolation, permission enforcement, token validation

**Key Features**:
- Complete ticket lifecycle with activity tracking
- Bulk operations with atomicity verification
- Subtask constraints and cascade deletion
- Label many-to-many without duplicates
- Transaction safety verification

### E2E Tests (test/e2e/)

**Purpose**: Test complete HTTP API with realistic scenarios.

**Characteristics**:
- Real HTTP requests via Supertest
- Real AppModule with ValidationPipe
- Full authorization flow (token-based)
- Real database persistence
- Slower execution (~1-5s per test)
- Tests endpoint contracts and response formats

**Files**:
- `auth-workspace-project.e2e-spec.ts` - Signup, login, workspace & project CRUD
- `ticket-subtask-comment.e2e-spec.ts` - Ticket operations, subtasks, comments
- `sprint.e2e-spec.ts` - Sprint lifecycle, active sprint enforcement
- `bulk-actions.e2e-spec.ts` - All 4 bulk action types (ASSIGN, PRIORITY, MOVE_TO_SPRINT, MOVE_TO_BACKLOG)
- `board.e2e-spec.ts` - Board data, status moves, N+1 query prevention
- `filtering.e2e-spec.ts` - Advanced filtering, searching, sorting, pagination

**Key Patterns**:
```typescript
// BeforeAll setup
beforeAll(async () => {
  const module = Test.createTestingModule({
    imports: [AppModule]
  }).compile();
  
  app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  await app.init();
  
  // Create test user and get token
  const signup = await request(app.getHttpServer())
    .post('/auth/signup')
    .send(credentials);
  token = signup.body.access_token;
});

// HTTP requests with token
request(app.getHttpServer())
  .post('/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .send(data)
  .expect(expectedStatus)
```

## Test Coverage

### Services Covered

| Service | Unit | Integration | E2E |
|---------|------|-------------|-----|
| AuthService | ✅ | ✅ | ✅ |
| WorkspaceService | ✅ | ✅ | ✅ |
| ProjectService | ✅ | ✅ | ✅ |
| TicketService | ✅ | ✅ | ✅ |
| SprintService | ✅ | ✅ | ✅ |
| CommentService | ✅ | ✅ | ✅ |
| ActivityService | ✅ | ✅ | ✅ |
| BoardService | ❌ | ❌ | ✅ |
| LabelService | ❌ | ✅ | ✅ |

### Critical Business Rules Tested

- ✅ Only 1 active sprint per project
- ✅ No subtask-of-subtask (one level only)
- ✅ Parent-child ticket validation
- ✅ Comment author-only edit/delete
- ✅ Assignees must exist in workspace
- ✅ Workspace isolation (cross-workspace data access prevention)
- ✅ Token-based authentication
- ✅ Activity logging with metadata
- ✅ Bulk operations atomicity (all-or-nothing)
- ✅ Incomplete ticket backlog movement on sprint completion
- ✅ Label duplicate prevention
- ✅ Many-to-many label assignment without duplicates

### Endpoints Tested

| Endpoint | Tests |
|----------|-------|
| POST /auth/signup | 3 (validation, duplicate, success) |
| POST /auth/login | 3 (success, invalid password, not found) |
| GET /auth/me | 2 (with token, without token) |
| POST /workspaces | 3 (create, duplicate, isolation) |
| GET /workspaces | 2 (list, pagination) |
| POST /workspaces/:id/projects | 3 (create, default statuses, duplicate) |
| GET /workspaces/:id/projects | 1 (list) |
| POST /workspaces/:id/members | 2 (add member, admin-only) |
| POST /projects/:id/tickets | 2 (create, validation) |
| PATCH /tickets/:id | 3 (update, priority, complex) |
| DELETE /tickets/:id | 2 (delete, not found) |
| POST /tickets/:id/subtasks | 3 (create, prevent nested, validation) |
| GET /tickets/:id/subtasks | 1 (list) |
| POST /tickets/:id/comments | 2 (add, unassigned) |
| GET /tickets/:id/comments | 1 (list) |
| PATCH /comments/:id | 2 (author-only, edit) |
| DELETE /comments/:id | 2 (author-only, delete) |
| POST /projects/:id/sprints | 4 (create, validation, unique name, dates) |
| PATCH /sprints/:id/start | 2 (start, prevent multiple active) |
| PATCH /sprints/:id/complete | 1 (complete & move incomplete) |
| PATCH /sprints/:id | 2 (update goal, update dates) |
| GET /projects/:id/board | 3 (fetch, grouping, counts) |
| PATCH /tickets/:id/status | 3 (move, invalid, validation) |
| PATCH /projects/:id/tickets/bulk | 5 (ASSIGN, PRIORITY, MOVE_TO_SPRINT, MOVE_TO_BACKLOG, validation) |
| GET /projects/:id/tickets | 10+ (status filter, priority filter, assignee, label, combined, sorting, pagination, search) |

## Key Test Patterns

### Mocking Pattern (Unit Tests)

```typescript
// Repository mock
const mockRepository = {
  findOne: jest.fn().mockResolvedValue({ id: '123' }),
  save: jest.fn().mockResolvedValue({ id: '123' })
};

// Service mock
const mockJwtService = {
  sign: jest.fn().mockReturnValue('token')
};

// Transaction mock
const mockDataSource = {
  transaction: jest.fn(async (callback) => {
    const manager = { save: jest.fn() };
    return callback(manager);
  })
};
```

### BeforeEach (Unit Tests)

```typescript
beforeEach(async () => {
  module = Test.createTestingModule({
    providers: [
      ServiceUnderTest,
      { provide: getRepositoryToken(Entity), useValue: mockRepository },
      { provide: JwtService, useValue: mockJwtService }
    ]
  }).compile();
  
  service = module.get<ServiceUnderTest>(ServiceUnderTest);
  repository = module.get<Repository<Entity>>(getRepositoryToken(Entity));
});
```

### BeforeAll (Integration & E2E)

```typescript
beforeAll(async () => {
  const module = Test.createTestingModule({
    imports: [AppModule]  // Real module, full dependency injection
  }).compile();
  
  app = module.createNestApplication();
  app.useGlobalPipes(new ValidationPipe());
  await app.init();
  
  // Create test data
  const response = await request(app.getHttpServer())
    .post('/auth/signup')
    .send({...})
  token = response.body.access_token;
});
```

### HTTP Testing Pattern (E2E)

```typescript
await request(app.getHttpServer())
  .post('/endpoint')
  .set('Authorization', `Bearer ${token}`)
  .send(payload)
  .expect(expectedStatus);  // Defaults to 200

// Verify response
const response = await request(...);
expect(response.body.data).toHaveProperty('id');
expect(response.body.items).toBeArray();
expect(response.body.success).toBe(true);
```

## Common Assertions

### HTTP Status Codes
- `201` - Resource created
- `200` - Successful operation
- `400` - Bad request (validation failure)
- `401` - Unauthorized (no token)
- `403` - Forbidden (no permission)
- `404` - Not found (resource doesn't exist)

### Response Structure
```typescript
// Success response
{ success: true, data: { id, ... } }

// List response
{ items: [...], total: 10, limit: 20, offset: 0 }

// Error response
{ success: false, error: "message", statusCode: 400 }
```

### Common Expects
```typescript
// Status codes
.expect(201);
expect(response.status).toBe(201);

// Response structure
expect(response.body.success).toBe(true);
expect(response.body.data).toBeDefined();
expect(response.body.data.id).toBe(expectedId);

// Arrays
expect(Array.isArray(response.body.items)).toBe(true);
expect(response.body.items.length).toBeGreaterThan(0);

// Properties
expect(response.body).toHaveProperty('id');
response.body.items.forEach(item => {
  expect(item).toHaveProperty('id');
});

// Exception types
expect(() => { /* code */ }).toThrow(ForbiddenException);
```

## Troubleshooting

### Database Connection Issues
```bash
# Verify DATABASE_URL is set
echo $DATABASE_URL

# Test connection
npm run migration:run

# Use test-specific database
DATABASE_URL="postgres://user:pass@localhost/agile_test" npm run test
```

### Timeout Issues
```bash
# Increase Jest timeout
npm run test -- --testTimeout=10000

# Or in test file
jest.setTimeout(10000);

// Or in specific test
it('slow test', async () => {
  // test code
}, 10000);  // 10 second timeout
```

### Token Issues
```typescript
// Ensure token is being used
.set('Authorization', `Bearer ${token}`)

// Verify token format
expect(token).toMatch(/^[A-Za-z0-9._-]+$/);
```

### Flaky Tests
- Increase timeouts
- Add retries for network operations
- Ensure test isolation (no shared state)
- Mock time-dependent operations

## Maintenance

### Adding New Tests

1. **For new service/feature**:
   - Create unit test in `test/unit/`
   - Create integration test in `test/integration/`
   - Create E2E test in `test/e2e/`

2. **Test naming convention**:
   ```typescript
   describe('Feature Name', () => {
     describe('Method/Endpoint', () => {
       it('should [expected behavior]', () => { ... });
     });
   });
   ```

3. **Use existing patterns**:
   - Copy mock setup from similar tests
   - Follow same assertion style
   - Reuse test data creation helpers

### Updating Tests on Code Changes

When modifying:
- Service logic → Update unit tests
- Database schema → Update migration + integration tests
- API endpoint → Update E2E tests
- Authorization → Update authorization integration tests

### Performance Considerations

- Unit tests: Target < 100ms each
- Integration tests: Target < 2s each
- E2E tests: Target < 5s each
- Total suite: Target < 3-5 minutes

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests
  run: npm run test -- --coverage

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

### Pre-commit Hook

```bash
#!/bin/bash
npm run test:cov
if [ $? -ne 0 ]; then
  exit 1
fi
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Clear Names**: Describe what is being tested and expected behavior
3. **DRY Code**: Use BeforeEach/BeforeAll for common setup
4. **Fast Tests**: Mock external dependencies in unit tests
5. **Real Integration**: Use real DB and services in integration tests
6. **Realistic Scenarios**: E2E tests should simulate real user workflows
7. **Error Cases**: Test both happy path and error scenarios
8. **Clean Up**: Use AfterEach/AfterAll to clean resources
9. **No Side Effects**: Tests should not affect each other
10. **Documentation**: Comment on why tests exist, not just what they do

## Extensions & Future Work

### Recommended Additions

1. **Performance tests**: Load testing with k6 or Apache JMeter
2. **Security tests**: OWASP top 10 vulnerability scanning
3. **API contract tests**: Pact for contract testing
4. **Visual regression tests**: For board and UI components
5. **Chaos engineering**: Random failure injection tests
6. **Load testing**: Verify N+1 prevention at scale

### Test Gaps to Address

1. Label service full coverage
2. Status service CRUD operations
3. Dashboard service computations
4. Advanced search functionality
5. Notification system
6. File attachments
7. Git link integrations
8. User preferences
9. Workspace settings
10. Audit logs

## Support & Questions

For test suite issues:
1. Check troubleshooting section
2. Review similar passing tests
3. Check Jest documentation: https://jestjs.io/
4. Check NestJS testing docs: https://docs.nestjs.com/fundamentals/testing

## Test Metrics

Estimated Coverage:
- **Statements**: ~75%
- **Branches**: ~70%
- **Functions**: ~80%
- **Lines**: ~75%

Target: >80% coverage with focus on critical paths
