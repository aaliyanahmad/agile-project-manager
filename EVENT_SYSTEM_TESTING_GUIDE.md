# Event System Hardening - Testing Guide

Quick guide to verify all reliability improvements are working correctly.

## Prerequisites

```bash
# 1. Start PostgreSQL (if not running)
# docker run -d -e POSTGRES_PASSWORD=admin -p 5499:5432 postgres:15

# 2. Start MongoDB (if not running)  
# docker run -d -p 27017:27017 mongo:latest

# 3. Start NestJS server in watch mode
npm run start:dev

# 4. Keep another terminal ready for curl commands
```

## Test Cases

### ✅ Test 1: Normal Event Processing

**Goal:** Verify events are processed successfully and acknowledged

```bash
# Create a workspace and project first (if needed)
# Then create a ticket to trigger an event

curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Test Ticket - Normal Processing",
    "description": "Testing normal event flow",
    "projectId": "YOUR_PROJECT_ID",
    "status": "BACKLOG"
  }'
```

**Expected Logs:**
```
✅ Event received: type=TICKET_CREATED, eventId=evt_123
📨 Event received: type=TICKET_CREATED [eventId: evt_123]
✓ Event marked as processed: evt_123
✅ Event processed successfully: evt_123
```

**Verify in Database:**
```sql
SELECT eventId, eventType, isProcessed, retryCount, lastError
FROM processed_events
ORDER BY processedAt DESC
LIMIT 1;
-- Expected: isProcessed=true, retryCount=0, lastError=NULL
```

---

### ⚠️ Test 2: Duplicate Event Handling

**Goal:** Verify idempotency - same event processed only once

**Scenario:** Manually push same event twice to Pub/Sub (via gcloud CLI)

```bash
# Using Google Cloud Pub/Sub CLI
gcloud pubsub topics publish ticket-events \
  --message '{
    "eventId": "evt_dup_test_001",
    "type": "TICKET_CREATED",
    "data": { "ticketId": "tk_123", ...}
  }'

# Publish the SAME event again
gcloud pubsub topics publish ticket-events \
  --message '{
    "eventId": "evt_dup_test_001",
    "type": "TICKET_CREATED",
    "data": { "ticketId": "tk_123", ...}
  }'
```

**Expected Logs:**
```
First message:
📨 Event received: type=TICKET_CREATED, eventId=evt_dup_test_001
✓ Event marked as processed: evt_dup_test_001
✅ Event processed successfully: evt_dup_test_001

Second message (DUPLICATE):
📨 Event received: type=TICKET_CREATED, eventId=evt_dup_test_001
⚠️ Duplicate event skipped: evt_dup_test_001
✅ Message acknowledged (no reprocessing)
```

**Verify in Database:**
```sql
SELECT eventId, retryCount, isProcessed
FROM processed_events
WHERE eventId = 'evt_dup_test_001';
-- Expected: ONLY ONE row, retryCount=0, isProcessed=true
```

---

### ❌ Test 3: Invalid Payload Handling

**Goal:** Verify invalid payloads are ACKed (prevent retry loops)

**Test:** Send malformed JSON to Pub/Sub

```python
# Using Python to push invalid JSON
from google.cloud import pubsub_v1

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path('agile-project-manager-493310', 'ticket-events')

# Send invalid JSON
publisher.publish(topic_path, b'{ invalid json without closing bracket')
```

**Expected Logs:**
```
Invalid JSON payload: Unexpected token } in JSON at position X
⚠️ Invalid payload received, acknowledging to prevent loop
```

**Verify:**
```sql
SELECT eventId, lastError FROM processed_events
WHERE eventId IS NULL OR lastError LIKE '%Invalid%'
LIMIT 5;
```

**Key Point:** Should NOT see thousands of retry attempts

---

### ⏱️ Test 4: Timeout Protection

**Goal:** Verify stuck processing is detected and retried

**Setup:** Temporarily add a delay to simulate slow handler

```typescript
// Modify event-handler.service.ts - temporary change
async handleEvent(event: AppEvent): Promise<void> {
  // Simulate slow processing (40 seconds)
  await new Promise(resolve => setTimeout(resolve, 40000));
  
  // Rest of handler...
}
```

**Expected Logs:**
```
Processing event: type=TICKET_CREATED, eventId=evt_timeout_001
Event processing timeout after 30000ms
❌ Event processing failed: evt_timeout_001
Message NOT acknowledged - will be retried by Pub/Sub: evt_timeout_001
```

**Verify in Database:**
```sql
SELECT eventId, retryCount, lastError
FROM processed_events
WHERE eventId = 'evt_timeout_001'
-- Expected: Multiple rows OR retryCount incremented, lastError contains "timeout"
```

**Revert Change:**
```typescript
// Remove the setTimeout and redeploy
```

---

### 🔄 Test 5: Retry Tracking

**Goal:** Verify retries are tracked and alerts are triggered

**Setup:** Temporarily make handler throw an error

```typescript
// Modify event-handler.service.ts - temporary change
async handleEvent(event: AppEvent): Promise<void> {
  throw new Error('Simulated database connection failure');
}
```

**First Attempt Logs:**
```
Processing event: type=TICKET_CREATED, eventId=evt_retry_001
Event handler failed: Simulated database connection failure
❌ Event processing failed: evt_retry_001
Message NOT acknowledged - will be retried by Pub/Sub
```

**After 5+ Retries, Expected Alert:**
```
⚠️ Event exceeded max retry threshold (5): evt_retry_001. Last error: Simulated database connection failure
```

**Verify in Database:**
```sql
SELECT eventId, retryCount, isProcessed, lastError
FROM processed_events
WHERE eventId = 'evt_retry_001';
-- Expected: retryCount >= 5, isProcessed=false, lastError contains error
```

**Revert Change:**
```typescript
// Remove the throw statement and redeploy
// Message will eventually be delivered to working handler
```

---

### 🛑 Test 6: Graceful Shutdown

**Goal:** Verify subscription closes cleanly on app shutdown

**Test:** Send an event, then immediately stop the server

```bash
# Terminal 1: Send event
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"title": "Test", "projectId": "..."}' &

# Terminal 2: Stop server (Ctrl+C within 2 seconds)
# npm run start:dev
# [Press Ctrl+C while event is processing]
```

**Expected Logs:**
```
📨 Event received: type=TICKET_CREATED
🛑 Application shutting down: gracefully closing Pub/Sub subscription...
✓ Pub/Sub subscription closed cleanly
```

**Key Point:** Should NOT see unhandled errors or memory leaks

---

### 📊 Test 7: Load Testing

**Prerequisites:**
```bash
npm install axios
```

**Run Load Test:**
```bash
npx ts-node load-test.ts --count 50 --delay 100 --duplicate-rate 20
```

**Expected Output:**
```
✅ Successful: 50/50
❌ Failed: 0/50
📋 Duplicates tested: ~10
⚡ Throughput: X events/sec
✨ All tests passed! System is stable under load.
```

**Verify:**
```sql
SELECT COUNT(*) as total, SUM(CASE WHEN isProcessed THEN 1 ELSE 0 END) as processed
FROM processed_events
WHERE processedAt > NOW() - INTERVAL '5 minutes';
```

---

## Monitoring Dashboard Queries

### Real-Time Metrics

```sql
-- Events per minute
SELECT 
  DATE_TRUNC('minute', processedAt) as minute,
  COUNT(*) as event_count,
  SUM(CASE WHEN isProcessed THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT isProcessed THEN 1 ELSE 0 END) as failed
FROM processed_events
WHERE processedAt > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', processedAt)
ORDER BY minute DESC;

-- Events with high retry count
SELECT eventId, eventType, retryCount, lastError
FROM processed_events
WHERE retryCount >= 3
ORDER BY retryCount DESC;

-- Failed events summary
SELECT 
  eventType,
  COUNT(*) as count,
  AVG(retryCount) as avg_retries,
  MAX(retryCount) as max_retries
FROM processed_events
WHERE isProcessed = false
GROUP BY eventType;
```

---

## Troubleshooting Tests

### Issue: Tests timeout

**Solution:**
```bash
# Increase timeout
# Check if Pub/Sub is running
# Check database connection
# Check logs for errors
```

### Issue: Logs not appearing

**Solution:**
```bash
# Add debug logging to env
# DEBUG=* npm run start:dev

# Or in .env:
# LOG_LEVEL=debug
```

### Issue: Database errors

**Solution:**
```bash
# Check PostgreSQL is running
# Verify migrations applied
psql -h localhost -U admin -d db_postgres -c "SELECT * FROM processed_events LIMIT 1;"

# Rerun migrations if needed
npm run migration:run
```

---

## Success Criteria

✅ All Tests Pass When:
1. Normal events process end-to-end
2. Duplicates are skipped (not reprocessed)
3. Invalid payloads don't crash system
4. Timeouts are detected and logged
5. Retries are tracked correctly
6. Max retry alerts fire
7. Shutdown is graceful
8. Load test passes without errors
9. Database tracks all state correctly
10. Logs are clear and actionable

---

## Performance Targets

- **Throughput:** ≥ 100 events/sec
- **Latency:** < 500ms p95
- **Retry Rate:** < 1% (after fix)
- **Duplicate Skip Rate:** 100% (for actual duplicates)
- **Timeout Rate:** < 0.1%
- **Memory:** Stable (no leaks during 24h run)

---

## Next Steps After Testing

1. Deploy to staging environment
2. Run 24-hour monitoring test
3. Verify production environment variables
4. Prepare runbooks for failure scenarios
5. Train team on new observability capabilities
6. Set up alerting in monitoring system (DataDog, Prometheus, etc.)
