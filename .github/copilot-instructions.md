# Project Guidelines

## Code Style
- **TypeScript**: Strict mode enabled with targeted exceptions (see [tsconfig.json](tsconfig.json))
- **Linting**: ESLint with Prettier integration for consistent formatting (see [eslint.config.mjs](eslint.config.mjs))
- **Imports**: Use absolute paths from `src/` root
- **Naming**: PascalCase for classes/enums, camelCase for variables/methods, UPPER_SNAKE for constants

## Architecture
This is a **NestJS-based agile project management platform** with modular architecture:

- **Core Modules**: Auth, Workspace, Project, Ticket, Board, Sprint, Comment, Activity
- **Database**: PostgreSQL with TypeORM entities and migrations (see [src/data-source.ts](src/data-source.ts))
- **Authentication**: JWT-based with workspace membership validation
- **Key Boundaries**: 
  - Workspace isolation (users can only access their workspace's data)
  - Activity logging for all ticket state changes
  - Transaction-wrapped bulk operations

Entity relationships center around `Ticket` as the core domain object with relations to Users, Projects, Sprints, Statuses, Labels, Assignees, Comments, and ActivityLogs.

## Build and Test
```bash
# Install dependencies
npm install

# Development
npm run start:dev      # Watch mode
npm run start:debug    # Debug mode

# Building
npm run build          # Compile to dist/
npm run start:prod     # Production build

# Testing
npm run test           # Unit tests
npm run test:cov       # With coverage
npm run test:e2e       # End-to-end tests

# Database
npm run migration:run  # Apply migrations
```

## Conventions
- **Access Control**: Always validate workspace membership before operations (see `validateUserInWorkspace()` pattern in services)
- **Activity Logging**: Log all ticket state changes with metadata (see [src/activity/activity.service.ts](src/activity/activity.service.ts))
- **DTOs**: Use class-validator decorators and Swagger annotations (see [src/ticket/dto/](src/ticket/dto/))
- **Bulk Operations**: Use database transactions for atomicity (see ticket service bulk methods)
- **Filtering**: Use QueryBuilder for complex queries, avoid N+1 problems
- **Sprint/Backlog**: `sprintId = null` means backlog (position-based ordering), otherwise sprint (time-based)

For detailed feature documentation:
- Bulk actions: See [BULK_ACTIONS_IMPLEMENTATION.md](BULK_ACTIONS_IMPLEMENTATION.md) and [BULK_ACTIONS_QUICK_START.md](BULK_ACTIONS_QUICK_START.md)
- Ticket filtering: See [FILTERING_SYSTEM_IMPLEMENTATION.md](FILTERING_SYSTEM_IMPLEMENTATION.md)
- Testing patterns: See [BULK_ACTIONS_TEST_GUIDE.md](BULK_ACTIONS_TEST_GUIDE.md)</content>
<parameter name="filePath">d:\Aaliyan\agile-project-manager\.github\copilot-instructions.md