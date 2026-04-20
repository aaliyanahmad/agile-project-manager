# Events Module

## 📌 Overview

The Events module provides an event-driven architecture for system-wide notifications and integrations. It publishes domain events when significant changes occur (ticket created, status changed, etc.), allowing other parts of the system to react to these changes. This enables decoupling of features and supports external integrations.

**Key Responsibilities:**
- Publish domain events for system changes
- Process events and trigger handlers
- Track processed events to prevent duplicates
- Integrate with notification system
- Support event subscribers for external systems
- Provide event-driven architecture foundation

## 🏗 Architecture

### Design Pattern
- **Event-Driven Architecture**: Services publish events rather than direct calls
- **Publisher-Subscriber Pattern**: EventPublisherService broadcasts events
- **Event Handlers**: EventHandlerService processes events
- **Deduplication**: Tracks processed events to ensure idempotency
- **Asynchronous Processing**: Events processed potentially asynchronously

### Key Design Decisions
1. **Domain Events**: Events represent domain concepts (TicketCreated, StatusChanged)
2. **Event Sourcing**: Complete history of domain events
3. **Deduplication**: ProcessedEvent tracks which events have been handled
4. **Subscriber Pattern**: NotificationsModule can subscribe to events
5. **Async-Friendly**: Events can be processed asynchronously

## 📦 Entities

### ProcessedEvent
Tracks which events have been processed to ensure idempotency.

**Fields:**
- `id` (UUID, PK): Unique identifier
- `eventId` (VARCHAR, 255, unique): External event identifier
- `eventType` (VARCHAR, 100): Type of event
- `processedAt` (TIMESTAMP): When event was processed
- `handlerId` (VARCHAR, 100, nullable): ID of handler that processed

**Relationships:**
- None (standalone tracking record)

**Constraints:**
- Unique on eventId

### EventType (Enum)
Available event types:
```
TICKET_CREATED
TICKET_UPDATED
TICKET_DELETED
TICKET_STATUS_CHANGED
TICKET_PRIORITY_CHANGED
TICKET_ASSIGNED
COMMENT_CREATED
COMMENT_UPDATED
COMMENT_DELETED
ATTACHMENT_ADDED
ATTACHMENT_DELETED
SPRINT_STARTED
SPRINT_CLOSED
```

## ⚙️ Services

### EventPublisherService

**Method: `publishEvent(eventType, eventData)`**
- Publishes domain event
- Called by business logic services
- Triggers subscribers
- Returns event ID for tracking

**Event Data Format:**
```typescript
{
  eventType: EventType;
  ticketId?: string;
  userId: string;
  data: Record<string, any>;
  timestamp: Date;
}
```

**Method: `emitTicketCreated(ticket, userId)`**
- Publishes TICKET_CREATED event
- Includes ticket details

**Method: `emitStatusChanged(ticket, oldStatus, newStatus, userId)`**
- Publishes TICKET_STATUS_CHANGED event
- Includes before/after values

**Method: `emitCommentCreated(comment, userId)`**
- Publishes COMMENT_CREATED event
- Includes comment details

**Method: `emitAttachmentAdded(attachment, userId)`**
- Publishes ATTACHMENT_ADDED event

### EventSubscriberService

**Method: `subscribe(eventType, handler)`**
- Registers subscriber for event type
- Handler called when event published

**Method: `getSubscribers(eventType)`**
- Returns all subscribers for event type

### EventHandlerService

**Method: `handleEvent(event)`**
- Processes published event
- Checks if already processed (via ProcessedEvent)
- Calls appropriate handler
- Marks as processed
- Returns success/failure

**Method: `logProcessedEvent(eventId, eventType)`**
- Records event as processed
- Prevents duplicate processing

## 🔍 Special Features

### Event Publishing
- Services publish events instead of direct calls
- Decouples features via observer pattern
- Enables external integrations

### Deduplication
- ProcessedEvent table tracks handled events
- Prevents duplicate notification sending
- Ensures idempotency

### Subscriber Pattern
- NotificationsModule can subscribe to events
- External systems can subscribe via webhooks
- Extensible to multiple handlers per event

### Event Data
- Complete context preserved in event
- User attribution
- Timestamp
- Related entities

## 🔗 Relationships with Other Modules

**Dependencies:**
- None (published upon)

**Dependent Modules:**
- **NotificationsModule**: Subscribes to events for notifications
- **TicketModule**: Publishes ticket events
- **CommentModule**: Publishes comment events
- **BoardModule**: Publishes status change events
- **AttachmentsModule**: Publishes attachment events
- **SprintModule**: Publishes sprint events

## 🧠 Notes / Future Improvements

**Current Limitations:**
- Limited event types
- No event filtering
- No event ordering guarantees
- No event replay capability

**Possible Enhancements:**
- Event sourcing (store all events as event log)
- Event filtering and subscriptions
- Ordered event processing
- Event replay for reconstruction
- Webhook support for external systems
- Dead letter queue for failed events
- Event aggregation
- Event bus infrastructure
- Real-time event streaming (WebSockets)
