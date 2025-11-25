# PDF SEARCHER - NON-FUNCTIONAL TEST CASES

**Version:** 1.1
**Date:** November 25, 2025
**Total Test Cases:** 104

---

## TABLE OF CONTENTS
1. [Performance Testing](#1-performance-testing-42-test-cases)
2. [Security Testing](#2-security-testing-36-test-cases)
3. [Reliability & Resilience Testing](#3-reliability--resilience-testing-26-test-cases)

---

## 1. PERFORMANCE TESTING (42 Test Cases)

### 1.1 Load Testing (15 Test Cases)

#### TC-PERF-001: Baseline Performance - Single User
**Priority:** P1
**Test Steps:**
1. Single user performs typical workflow:
   - Upload 1 document
   - Wait for processing
   - Perform 1 search
   - View results

**Expected Results:**
- Upload: <3 seconds
- Processing (20-page doc): <5 minutes (median)
- Search: <5 seconds
- Dashboard load: <2 seconds

**Tools:** k6, Lighthouse
**Metrics:** Response time (P50, P95, P99), throughput

---

#### TC-PERF-002: Load Test - 10 Concurrent Users
**Priority:** P1
**Test Steps:**
1. Ramp up to 10 concurrent users over 2 minutes
2. Each performs mixed operations (upload, search, view)
3. Maintain for 10 minutes

**Expected Results:**
- 95% of requests <10 seconds
- Zero 5xx errors
- Database connection pool <50% utilization
- No degradation in response times

---

#### TC-PERF-003: Load Test - 50 Concurrent Users
**Priority:** P2
**Expected Results:**
- System remains responsive
- Queue depth increases but manageable
- Connection pool <70% utilization
- Graceful degradation if capacity exceeded

---

#### TC-PERF-004: Load Test - 100 Concurrent Users (Stress)
**Priority:** P2
**Expected Results:**
- System may throttle requests (rate limiting)
- No crashes or data corruption
- Error messages user-friendly
- System recovers when load decreases

---

#### TC-PERF-005: Concurrent Document Uploads - Free Tier (1 concurrent)
**Priority:** P1
**Test Steps:**
1. 3 users upload simultaneously
2. Monitor processing queue

**Expected Results:**
- First upload processes immediately
- Subsequent uploads queued
- MAX_CONCURRENT_DOCUMENTS=1 enforced
- All eventually process successfully

---

#### TC-PERF-006: Concurrent Document Processing - Paid Tier (10 concurrent)
**Priority:** P1
**Test Steps:**
1. Upload 10 documents simultaneously

**Expected Results:**
- All 10 process in parallel
- Connection pool usage <70%
- All complete within expected timeframes
- No race conditions

---

#### TC-PERF-007: Upload Rate Limiting - Free Tier
**Priority:** P1
**Expected Results:**
- 2 uploads per user per minute (global limit: 2)
- 3rd upload gets 429 Too Many Requests
- Retry after 60 seconds succeeds

---

#### TC-PERF-008: Search Performance - Large Result Set
**Priority:** P1
**Test Steps:**
1. Search with stage0_topK=600

**Expected Results:**
- Search completes <8 seconds (P95)
- Stage 2 handles 600 candidates efficiently
- UI remains responsive

---

#### TC-PERF-009: Search Performance - Concurrent Searches
**Priority:** P2
**Test Steps:**
1. 10 users perform searches simultaneously

**Expected Results:**
- All searches complete <10 seconds
- No query blocking
- Qdrant handles load
- Parallel Stage 2 workers utilized

---

#### TC-PERF-010: API Endpoint Response Times
**Priority:** P1
**Test Endpoints:**
- GET /api/documents: <500ms
- POST /api/documents/upload: <3s (for upload initiation)
- GET /api/health: <100ms
- POST /api/documents/[id]/similar-v2: <5s

**Expected Results:** All endpoints meet targets under normal load

---

#### TC-PERF-011: Database Query Performance
**Priority:** P1
**Test Steps:**
1. Run EXPLAIN ANALYZE on critical queries
2. Verify index usage

**Expected Results:**
- All queries use appropriate indexes
- No sequential scans on large tables
- Query plans optimal

---

#### TC-PERF-012: Connection Pool Efficiency
**Priority:** P1
**Test Steps:**
1. Monitor pool during load test
2. Check for connection leaks

**Expected Results:**
- Connections properly released after use
- No leaks detected
- Pool size adequate for load
- Idle connections cleaned up

---

#### TC-PERF-013: Memory Usage - Document Processing
**Priority:** P1
**Test Steps:**
1. Process documents of varying sizes
2. Monitor memory consumption

**Expected Results:**
- Memory released after processing completes
- No memory leaks
- Large documents (25 MB): <4 GB memory
- Garbage collection effective

---

#### TC-PERF-014: Throughput - Documents Per Hour
**Priority:** P2
**Test Steps:**
1. Continuously upload documents for 1 hour
2. Measure processing rate

**Expected Results:**
- Free tier: 60+ documents/hour (1 concurrent)
- Paid tier: 300+ documents/hour (10 concurrent)
- Queue management efficient

---

#### TC-PERF-015: CDN & Asset Loading Performance
**Priority:** P2
**Test Steps:**
1. Measure page load times from different geographies

**Expected Results:**
- First contentful paint <1.5s
- Time to interactive <3s
- Lighthouse performance score >90

---

### 1.2 Stress Testing (10 Test Cases)

#### TC-STRESS-001: Exceed Concurrent Processing Limit
**Priority:** P1
**Test Steps:**
1. Upload 20 documents (limit: 10 concurrent on paid tier)

**Expected Results:**
- First 10 process immediately
- Remaining 10 queued
- Queue processes FIFO
- No system crash

---

#### TC-STRESS-002: Database Connection Pool Exhaustion
**Priority:** P1
**Test Steps:**
1. Simulate all 200 connections in use

**Expected Results:**
- New requests wait or throttled
- Timeout error after 30s if not acquired
- System recovers as connections release
- No permanent damage

---

#### TC-STRESS-003: Upload Burst Traffic
**Priority:** P1
**Test Steps:**
1. 50 users upload simultaneously

**Expected Results:**
- Rate limiting enforced
- Requests queued or rejected gracefully
- System remains stable
- Recovers after burst

---

#### TC-STRESS-004: Qdrant Vector Search Under Load
**Priority:** P2
**Test Steps:**
1. 100 concurrent similarity searches

**Expected Results:**
- Qdrant handles load
- Searches may slow down but complete
- No crashes
- Circuit breaker may open if thresholds exceeded

---

#### TC-STRESS-005: Large Document Processing (50 MB limit)
**Priority:** P1
**Test Steps:**
1. Upload maximum size document (49.5 MB)
2. Monitor processing

**Expected Results:**
- Processing completes
- Timeout enforced (30 min max)
- Memory managed appropriately
- No server crash

---

#### TC-STRESS-006: Very Large Document (200+ pages, 25 MB)
**Priority:** P1
**Expected Results:**
- Chunked processing used
- Processing time <20 minutes
- All content indexed
- System stable throughout

---

#### TC-STRESS-007: Continuous Processing - Endurance Test
**Priority:** P2
**Test Steps:**
1. Run processing continuously for 24 hours
2. Upload documents every 5 minutes

**Expected Results:**
- No memory leaks
- Performance consistent over time
- No degradation after extended run
- All documents process successfully

---

#### TC-STRESS-008: Stuck Job Recovery Stress
**Priority:** P1
**Test Steps:**
1. Simulate 10 stuck jobs (>15 min)
2. Trigger recovery

**Expected Results:**
- All 10 recovered automatically
- Recovery metadata accurate
- Jobs reassigned to workers
- System healthy after recovery

---

#### TC-STRESS-009: Rapid Delete Operations
**Priority:** P2
**Test Steps:**
1. User deletes 50 documents in rapid succession

**Expected Results:**
- Rate limiting enforced (2 concurrent deletes)
- Cleanup completes for all
- No orphaned data (Supabase, Qdrant, Storage)
- System stable

---

#### TC-STRESS-010: API Rate Limit Saturation
**Priority:** P1
**Test Steps:**
1. Hit all rate limits simultaneously

**Expected Results:**
- All limits enforced independently
- 429 responses returned
- No 5xx errors
- System recovers when limits reset

---

### 1.3 Scalability Testing (10 Test Cases)

#### TC-SCALE-001: Horizontal Scaling - Add Server Instance
**Priority:** P3
**Test Steps:**
1. Deploy multiple app instances (if applicable)
2. Load balance requests

**Expected Results:**
- Requests distributed evenly
- Session management works across instances
- No data inconsistencies

---

#### TC-SCALE-002: Database Scaling - Increased Pool Size
**Priority:** P2
**Test Steps:**
1. Increase DB_POOL_MAX_CONNECTIONS from 40 to 200

**Expected Results:**
- Higher concurrent load supported
- More parallel processing possible
- No adverse effects

---

#### TC-SCALE-003: Document Collection Growth (1000+ documents)
**Priority:** P2
**Test Steps:**
1. User with 1000 documents
2. Test list, search, filter performance

**Expected Results:**
- Pagination performs well
- Search remains fast (<5s)
- Filters efficient (use indexes)

---

#### TC-SCALE-004: Document Collection Growth (10,000+ documents)
**Priority:** P3
**Expected Results:**
- System remains usable
- Query performance acceptable
- May need pagination adjustments

---

#### TC-SCALE-005: Embeddings Table Growth (1M+ chunks)
**Priority:** P3
**Expected Results:**
- Qdrant handles 1M+ vectors
- Search performance stable
- Index maintenance automatic

---

#### TC-SCALE-006: Qdrant Collection Scaling
**Priority:** P2
**Test Steps:**
1. Index 10,000+ documents in Qdrant

**Expected Results:**
- Indexing throughput consistent
- Search latency acceptable
- Collection size within limits

---

#### TC-SCALE-007: Storage Scaling (100 GB+ usage)
**Priority:** P3
**Expected Results:**
- Supabase Storage handles large volumes
- No performance degradation
- Costs predictable

---

#### TC-SCALE-008: Activity Log Growth (1M+ rows)
**Priority:** P3
**Test Steps:**
1. Simulate 1M activity log entries

**Expected Results:**
- Cleanup function removes old logs
- Query performance unaffected
- Table size managed

---

#### TC-SCALE-009: Concurrent Worker Scaling
**Priority:** P2
**Test Steps:**
1. Scale SIMILARITY_STAGE2_WORKERS from 1 to 28

**Expected Results:**
- Search performance improves with more workers
- Diminishing returns after certain point
- No race conditions

---

#### TC-SCALE-010: Multi-Region Performance (If Applicable)
**Priority:** P3
**Expected Results:**
- Acceptable latency from different regions
- CDN serves assets globally
- Database latency considered

---

### 1.4 Resource Utilization (5 Test Cases)

#### TC-RESOURCE-001: CPU Utilization During Processing
**Priority:** P2
**Expected Results:**
- Normal load: 50-70% CPU
- Peak load: <90% CPU
- No sustained 100% CPU

---

#### TC-RESOURCE-002: Memory Utilization
**Priority:** P1
**Expected Results:**
- Normal load: <2 GB RAM
- Peak load: <4 GB RAM
- No memory leaks over time

---

#### TC-RESOURCE-003: Disk I/O Performance
**Priority:** P2
**Expected Results:**
- Storage operations fast
- No disk bottlenecks
- Adequate IOPS

---

#### TC-RESOURCE-004: Network Bandwidth Usage
**Priority:** P2
**Expected Results:**
- Upload bandwidth sufficient for concurrent uploads
- External API calls (Document AI, Vertex AI) well-managed
- No bandwidth saturation

---

#### TC-RESOURCE-005: Database Storage Growth Rate
**Priority:** P2
**Expected Results:**
- Storage growth predictable
- Embeddings compressed efficiently (TOAST)
- Vacuuming effective

---

### 1.5 Throttling Performance (2 Test Cases)

#### TC-PERF-041: Upload Throttling Performance
**Priority:** P1
**Test Steps:**
1. Mix of throttled and non-throttled upload requests
2. Monitor response times for both

**Expected Results:**
- Throttling doesn't degrade non-throttled requests
- 429 responses returned immediately
- Non-throttled requests maintain normal performance
- Rate limiting overhead <10ms

---

#### TC-PERF-042: Delete Throttling Performance
**Priority:** P1
**Test Steps:**
1. Exceed delete rate limit
2. Measure 429 response time

**Expected Results:**
- 429 response time <100ms
- Rate limit check efficient
- No impact on other operations
- Proper Retry-After headers

---

## 2. SECURITY TESTING (36 Test Cases)

### 2.1 Authentication & Authorization (8 Test Cases)

#### TC-SEC-001: Brute Force Login Protection
**Priority:** P1
**Test Steps:**
1. Attempt 100 failed logins

**Expected Results:**
- Rate limiting enforced after 5 attempts
- Temporary lockout (5 min)
- CAPTCHA may be triggered (if implemented)

---

#### TC-SEC-002: Session Hijacking Prevention
**Priority:** P1
**Test Steps:**
1. Steal session token
2. Attempt to use from different IP/browser

**Expected Results:**
- Session validation includes IP/user-agent (optional)
- Suspicious activity detected
- User notified (optional)

---

#### TC-SEC-003: Token Expiration Enforcement
**Priority:** P1
**Test Steps:**
1. Use expired token to access API

**Expected Results:**
- 401 Unauthorized
- Token rejected
- Must re-authenticate

---

#### TC-SEC-004: RLS Policy Bypass Attempt - SQL Injection
**Priority:** P0
**Test Steps:**
1. Inject SQL in document title: `'; DROP TABLE documents; --`
2. Inject in search parameters

**Expected Results:**
- Input sanitized
- SQL injection prevented
- RLS still enforced
- No data loss

---

#### TC-SEC-005: RLS Policy Bypass - Direct Database Query
**Priority:** P0
**Test Steps:**
1. User A attempts: `SELECT * FROM documents WHERE user_id != current_user_id()`

**Expected Results:**
- RLS blocks query
- Zero rows returned
- Audit log entry created

---

#### TC-SEC-006: Privilege Escalation Attempt
**Priority:** P0
**Test Steps:**
1. Regular user attempts admin operations

**Expected Results:**
- 403 Forbidden
- Operations blocked
- Attempt logged

---

#### TC-SEC-007: OAuth State Parameter Tampering
**Priority:** P1
**Expected Results:**
- CSRF protection via state parameter
- Tampered state rejected
- Authentication fails safely

---

#### TC-SEC-008: JWT Token Tampering
**Priority:** P1
**Test Steps:**
1. Modify JWT claims (e.g., user_id)
2. Use tampered token

**Expected Results:**
- Signature validation fails
- Token rejected
- 401 Unauthorized

---

### 2.2 Input Validation & API Security (18 Test Cases)

#### TC-SEC-011: SQL Injection - Document Title
**Priority:** P0
**Test Steps:**
1. Upload document with SQL injection in title

**Expected Results:**
- Input sanitized
- No SQL execution
- Title stored safely

---

#### TC-SEC-012: SQL Injection - Search Query
**Priority:** P0
**Test Steps:**
1. Search: `Contract'; DROP TABLE--`

**Expected Results:**
- Parameterized queries prevent injection
- Search executes safely

---

#### TC-SEC-013: XSS - Document Title
**Priority:** P1
**Test Steps:**
1. Title: `<script>alert('XSS')</script>`

**Expected Results:**
- Script tags escaped
- No script execution in UI
- Output encoded

---

#### TC-SEC-014: XSS - Metadata Fields
**Priority:** P1
**Test Steps:**
1. Law Firm: `<img src=x onerror=alert(1)>`

**Expected Results:**
- HTML sanitized
- No script execution

---

#### TC-SEC-015: Path Traversal - File Upload
**Priority:** P1
**Test Steps:**
1. Filename: `../../../../etc/passwd.pdf`

**Expected Results:**
- Path traversal prevented
- File stored in designated user folder only

---

#### TC-SEC-016: Path Traversal - File Download
**Priority:** P1
**Test Steps:**
1. Request: `/api/documents/../../other-user/file.pdf`

**Expected Results:**
- RLS blocks access
- Path normalized before processing

---

#### TC-SEC-017: Command Injection - Filename
**Priority:** P1
**Test Steps:**
1. Filename: `file.pdf; rm -rf /`

**Expected Results:**
- Special characters escaped
- No command execution

---

#### TC-SEC-018: LDAP Injection (if applicable)
**Priority:** P2
**Expected Results:**
- Input sanitized
- LDAP queries safe

---

#### TC-SEC-019: XML External Entity (XXE) Attack
**Priority:** P2
**Test Steps:**
1. Upload malicious PDF with XXE payload

**Expected Results:**
- Document AI rejects or sanitizes
- No external entity expansion

---

#### TC-SEC-020: Server-Side Request Forgery (SSRF)
**Priority:** P1
**Test Steps:**
1. Attempt to make app request internal URLs

**Expected Results:**
- Outbound requests restricted
- No access to internal services

---

#### TC-SEC-036: Upload Throttling Enforcement
**Priority:** P1
**Test Steps:**
1. Exceed upload rate limit (2 per minute)
2. Verify 429 response

**Expected Results:**
- 429 Too Many Requests returned
- Retry-After header present
- Rate limit enforced correctly
- Clear error message

---

#### TC-SEC-037: Delete Throttling Enforcement
**Priority:** P1
**Test Steps:**
1. Exceed delete rate limit (2 concurrent)
2. Verify 429 response

**Expected Results:**
- 429 Too Many Requests returned
- Concurrent delete limit enforced
- Retry-After header present
- Queue management proper

---

#### TC-SEC-038: Metadata JSON Validation
**Priority:** P1
**Test Steps:**
1. Upload document with malformed JSON metadata
2. Example: `{"lawFirm": "Test", invalid}`

**Expected Results:**
- 400 Bad Request returned
- Clear validation error message
- Request rejected before processing
- No data corruption

---

#### TC-SEC-039: Metadata Type Validation
**Priority:** P1
**Test Steps:**
1. Upload document with non-object metadata
2. Example: metadata as array `["value1", "value2"]`

**Expected Results:**
- 400 Bad Request returned
- Error message specifies type requirement
- Only object metadata accepted
- Request rejected

---

#### TC-SEC-040: Pagination Parameter Validation
**Priority:** P1
**Test Steps:**
1. Request documents with negative page: `?page=-1`
2. Request with invalid limit: `?limit=999999`
3. Request with non-numeric values: `?page=abc`

**Expected Results:**
- 400 Bad Request for invalid parameters
- Negative values rejected
- Limits enforced (max: 100)
- Non-numeric values rejected
- Default pagination used on error

---

#### TC-SEC-041: CRON_SECRET Missing
**Priority:** P1
**Test Steps:**
1. Call cron endpoint without Authorization header
2. Example: `POST /api/cron/process-jobs`

**Expected Results:**
- 401 Unauthorized returned
- Error message: "Missing authorization"
- Cron job does not execute
- Security event logged

---

#### TC-SEC-042: CRON_SECRET Invalid
**Priority:** P1
**Test Steps:**
1. Call cron endpoint with incorrect Bearer token
2. Example: `Authorization: Bearer wrong-secret`

**Expected Results:**
- 401 Unauthorized returned
- Error message: "Invalid credentials"
- Cron job does not execute
- Failed attempt logged

---

#### TC-SEC-043: CRON_SECRET Valid
**Priority:** P1
**Test Steps:**
1. Call cron endpoint with correct Bearer token
2. Example: `Authorization: Bearer {CRON_SECRET}`

**Expected Results:**
- 200 OK returned
- Cron job executes successfully
- Job processing starts
- Success logged

---

### 2.3 Data Protection & Privacy (10 Test Cases)

#### TC-SEC-021: Data Encryption at Rest
**Priority:** P1
**Expected Results:**
- Supabase database encrypted
- Supabase Storage encrypted
- Encryption keys managed securely

---

#### TC-SEC-022: Data Encryption in Transit
**Priority:** P0
**Expected Results:**
- All traffic over HTTPS
- TLS 1.2+ enforced
- No mixed content warnings

---

#### TC-SEC-023: Secure Password Storage (Email/Password)
**Priority:** P1
**Expected Results:**
- Passwords hashed (bcrypt/argon2)
- Never stored in plaintext
- Supabase Auth handles securely

---

#### TC-SEC-024: PII Data Handling
**Priority:** P1
**Expected Results:**
- User email not exposed in logs
- Personal data minimized
- GDPR compliance (if applicable)

---

#### TC-SEC-025: Document Content Privacy
**Priority:** P0
**Test Steps:**
1. User A uploads confidential document
2. User B attempts to access

**Expected Results:**
- Content not accessible to User B
- RLS enforced on embeddings
- Qdrant vectors isolated (if multi-tenant)

---

#### TC-SEC-026: Secure API Key Storage
**Priority:** P1
**Expected Results:**
- API keys in environment variables
- Never hardcoded
- Never exposed to client

---

#### TC-SEC-027: Sensitive Data in Logs
**Priority:** P1
**Test Steps:**
1. Review application logs

**Expected Results:**
- No passwords, tokens, or sensitive data logged
- PII redacted or hashed

---

#### TC-SEC-028: Data Deletion Completeness
**Priority:** P1
**Test Steps:**
1. Delete document
2. Verify all traces removed

**Expected Results:**
- Database records deleted
- Qdrant vectors deleted
- Storage files deleted
- Backup considerations (if applicable)

---

#### TC-SEC-029: Backup Data Security
**Priority:** P2
**Expected Results:**
- Backups encrypted
- Access restricted
- Retention policy enforced

---

#### TC-SEC-030: Data Residency Compliance (if applicable)
**Priority:** P3
**Expected Results:**
- Data stored in compliant regions
- No unauthorized cross-border transfers

---

## 3. RELIABILITY & RESILIENCE TESTING (26 Test Cases)

### 3.1 Error Handling & Recovery (10 Test Cases)

#### TC-REL-001: Document AI Service Outage
**Priority:** P1
**Test Steps:**
1. Simulate Document AI unavailable (503 error)

**Expected Results:**
- Circuit breaker opens after threshold
- Retry with exponential backoff
- Job marked as failed after max attempts
- User notified

---

#### TC-REL-002: Vertex AI Service Outage
**Priority:** P1
**Test Steps:**
1. Simulate Vertex AI 500 error

**Expected Results:**
- Unlimited retry with backoff
- Eventually succeeds (or times out at 30 min)
- Circuit breaker protects system

---

#### TC-REL-003: Qdrant Service Outage
**Priority:** P1
**Test Steps:**
1. Simulate Qdrant connection failure

**Expected Results:**
- Operations added to retry queue
- Background worker processes queue
- Exponential backoff (1s → 64s max)
- User notified of delay

---

#### TC-REL-004: Supabase Database Connection Loss
**Priority:** P1
**Test Steps:**
1. Simulate database connection timeout

**Expected Results:**
- Connection pool retries
- Graceful error messages
- No data corruption
- System recovers when DB back online

---

#### TC-REL-005: Supabase Storage Outage
**Priority:** P1
**Test Steps:**
1. Simulate storage service unavailable

**Expected Results:**
- Upload fails gracefully
- Error message clear
- Download shows appropriate error
- Retry available

---

#### TC-REL-006: Network Partition During Processing
**Priority:** P1
**Test Steps:**
1. Disconnect network mid-processing
2. Reconnect after 10 minutes

**Expected Results:**
- Job becomes stuck (>15 min)
- Stuck job recovery triggers
- Job reassigned to another worker
- Processing completes

---

#### TC-REL-007: Worker Crash During Processing
**Priority:** P1
**Test Steps:**
1. Kill worker process while processing document

**Expected Results:**
- Job stuck for 15 minutes
- Stuck job recovery reassigns job
- Metadata tracks previous_worker_id
- Processing completes on retry

---

#### TC-REL-008: Partial Processing Failure
**Priority:** P1
**Test Steps:**
1. Fail at embedding generation stage

**Expected Results:**
- Partial data cleaned up
- Job status: failed
- Retry option available
- No orphaned embeddings

---

#### TC-REL-009: Timeout Handling - Job Processing
**Priority:** P1
**Test Steps:**
1. Document takes >30 minutes to process

**Expected Results:**
- Job timeout enforced
- Job marked as failed with "timeout" error
- Resources released
- Retry available

---

#### TC-REL-010: Cascading Failure Prevention
**Priority:** P1
**Test Steps:**
1. Simulate multiple service failures simultaneously

**Expected Results:**
- Circuit breakers protect system
- Graceful degradation
- Core functions still available
- Clear error messages

---

### 3.2 Data Integrity & Consistency (5 Test Cases)

#### TC-REL-011: Transaction Rollback on Error
**Priority:** P1
**Test Steps:**
1. Fail during multi-step database operation

**Expected Results:**
- Transaction rolled back
- No partial data saved
- Database consistent

---

#### TC-REL-012: Concurrent Update Conflict
**Priority:** P1
**Test Steps:**
1. Two users edit same document simultaneously

**Expected Results:**
- Optimistic locking or last-write-wins
- No data loss
- Conflict resolution strategy clear

---

#### TC-REL-013: Qdrant-Supabase Consistency
**Priority:** P1
**Test Steps:**
1. Delete document
2. Verify Qdrant vectors also deleted

**Expected Results:**
- Deletion atomic across systems
- No orphaned vectors
- Cleanup verified

---

#### TC-REL-014: Embedding Count Accuracy
**Priority:** P2
**Test Steps:**
1. Process document
2. Verify chunk count matches embeddings count

**Expected Results:**
- Counts consistent
- No missing or duplicate chunks
- effective_chunk_count accurate

---

#### TC-REL-015: Metadata Propagation to Qdrant
**Priority:** P1
**Test Steps:**
1. Update document metadata
2. Verify Qdrant vectors updated

**Expected Results:**
- Metadata synced to Qdrant
- Filters work with new metadata
- Consistency maintained

---

### 3.3 Stuck Job Recovery & Retry Logic (5 Test Cases)

#### TC-REL-016: Stuck Job Recovery - Basic
**Priority:** P0
**Test Steps:**
1. Job stuck in "processing" for >15 minutes

**Expected Results:**
- `stuck_jobs_monitoring` view shows job
- Next cron cycle reclaims job
- Job status reset to "processing" with new worker_id
- Attempts incremented
- metadata.recovered = true

---

#### TC-REL-017: Stuck Job Recovery - Multiple Jobs
**Priority:** P1
**Test Steps:**
1. Simulate 5 stuck jobs

**Expected Results:**
- All 5 recovered in priority order
- Each tracked independently
- All eventually complete or fail after max_attempts

---

#### TC-REL-018: Retry with Exponential Backoff
**Priority:** P1
**Test Steps:**
1. Cause Document AI to fail repeatedly

**Expected Results:**
- Retry after 1s, 2s, 4s, 8s, etc.
- Max backoff respected
- Eventually fails after max_attempts

---

#### TC-REL-019: Max Retry Attempts Exhausted
**Priority:** P1
**Test Steps:**
1. Job fails 3 times (default max_attempts)

**Expected Results:**
- Job status: permanently failed
- error_details populated
- No further retries
- User must manually intervene

---

#### TC-REL-020: Circuit Breaker State Transitions
**Priority:** P2
**Test Steps:**
1. Monitor circuit breaker during failures

**Expected Results:**
- Closed → Open after failure threshold
- Open → Half-Open after timeout
- Half-Open → Closed on success
- Metrics logged

---

### 3.4 Background Workers (6 Test Cases)

#### TC-REL-021: Qdrant Cleanup Worker
**Priority:** P1
**Test Steps:**
1. Delete multiple documents
2. Monitor background cleanup queue
3. Verify cleanup completes

**Expected Results:**
- Delete operations queue cleanup without blocking API
- API returns success immediately
- Background worker processes delete queue
- Qdrant vectors removed asynchronously
- No user-facing delays

---

#### TC-REL-022: Qdrant Cleanup Failures
**Priority:** P1
**Test Steps:**
1. Simulate Qdrant unavailable during cleanup
2. Monitor failure handling and logging

**Expected Results:**
- Cleanup failures logged with details
- Failures don't block document delete operation
- Delete appears successful to user
- Retry mechanism for failed cleanups
- Eventual consistency maintained

---

#### TC-REL-023: Auto-Cron Trigger
**Priority:** P1
**Test Steps:**
1. Upload document (queue processing job)
2. Monitor for automatic cron trigger
3. Verify processing starts

**Expected Results:**
- Upload triggers cron endpoint automatically
- Job moves from queued to processing
- No manual cron invocation needed
- Proper CRON_SECRET used in auto-trigger
- Processing starts within expected timeframe

---

#### TC-REL-024: Background Worker Concurrency
**Priority:** P2
**Test Steps:**
1. Queue multiple cleanup operations
2. Monitor concurrent worker execution

**Expected Results:**
- Multiple cleanup operations process in parallel
- Worker pool managed efficiently
- No race conditions
- All cleanups eventually complete

---

#### TC-REL-025: Background Worker Error Recovery
**Priority:** P1
**Test Steps:**
1. Cause intermittent failures in background worker
2. Monitor recovery behavior

**Expected Results:**
- Failed operations retry with backoff
- Successful operations not affected
- Error logging comprehensive
- System recovers automatically

---

#### TC-REL-026: Background Worker Queue Management
**Priority:** P2
**Test Steps:**
1. Generate large volume of cleanup operations
2. Monitor queue depth and processing

**Expected Results:**
- Queue doesn't grow unbounded
- FIFO processing maintained
- Memory usage reasonable
- System remains responsive

---

## TEST SUMMARY BY CATEGORY

| Category | Test Cases | P0 | P1 | P2 | P3 |
|----------|------------|----|----|----|----|
| Performance - Load | 15 | 0 | 8 | 6 | 1 |
| Performance - Stress | 10 | 0 | 5 | 4 | 1 |
| Performance - Scalability | 10 | 0 | 2 | 5 | 3 |
| Performance - Resources | 5 | 0 | 1 | 4 | 0 |
| Performance - Throttling | 2 | 0 | 2 | 0 | 0 |
| Security - Auth | 8 | 3 | 5 | 0 | 0 |
| Security - Input/API | 18 | 2 | 13 | 3 | 0 |
| Security - Data Protection | 10 | 1 | 6 | 2 | 1 |
| Reliability - Error Handling | 10 | 0 | 9 | 1 | 0 |
| Reliability - Data Integrity | 5 | 0 | 4 | 1 | 0 |
| Reliability - Recovery | 5 | 1 | 3 | 1 | 0 |
| Reliability - Background Workers | 6 | 0 | 4 | 2 | 0 |
| **TOTAL** | **104** | **7** | **62** | **29** | **6** |

---

## TESTING TOOLS

| Category | Tools |
|----------|-------|
| **Load Testing** | k6, Artillery, Apache JMeter |
| **Performance Monitoring** | Lighthouse, WebPageTest, Chrome DevTools |
| **Security Testing** | OWASP ZAP, Burp Suite, npm audit, Snyk |
| **Database** | pgAdmin, EXPLAIN ANALYZE, pg_stat_statements |
| **API Testing** | Postman, Insomnia, Supertest |
| **Monitoring** | Datadog, Sentry, Prometheus (if applicable) |

---

*END OF NON-FUNCTIONAL TEST CASES*
