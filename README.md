# Live Code Execution Engine - Backend

A robust Node.js backend for executing code in multiple programming languages with async queue processing using BullMQ and Redis.

## Features

- **Multi-Language Support**: Python 3, JavaScript, C, C++, Go, Java, PHP, Ruby
- **Async Code Execution**: Non-blocking using BullMQ queue system with Redis
- **Session Management**: Create, update, close code execution sessions
- **Execution Tracking**: QUEUED → RUNNING → COMPLETED/FAILED/TIMEOUT lifecycle
- **Safety Features**: Infinite loop detection, rate limiting, parameter validation
- **Retry Logic**: Exponential backoff retries (3 attempts) for transient failures
- **Timeout & Resource Limits**: Configurable time and memory constraints
- **Lifecycle Logging**: Timestamp tracking for each execution stage
- **Docker Support**: One-command setup with docker-compose
- **RESTful API**: Comprehensive API with proper error handling

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js 5.2 |
| Database | PostgreSQL 16 |
| Queue System | BullMQ 5.12 |
| Cache/Message Broker | Redis 7 |
| Process Execution | Node child_process |

## Prerequisites

- Node.js 18+
- npm
- PostgreSQL 15+ (or Neon managed PostgreSQL)
- Redis 7+
- Docker & Docker Compose (optional)
- g++/gcc (for C/C++ execution on Windows, use MinGW or WSL)

---

## Architecture Overview

```
+-------------------------------------------------------------+
|                    Client Application                        |
+----------------------------+--------------------------------+
                             | HTTP REST API
                             v
         +------------------------------------+
         |    Express.js API Server           |
         |  (Controllers + Routes)            |
         +---------------+--------------------+
                         |
         +---------------+-------------------------+
         |                                         |
         v                                         v
+------------------+                    +----------------------+
| Services Layer   |                    | Database Layer       |
| - ExecutionSvc   |                    | - Session Model      |
| - SessionSvc     |                    | - Execution Model    |
| - CodeExecSvc    |                    | - Language Model     |
| - SafetySvc      |                    +----------------------+
+--------+---------+                             ^
         |                                       |
         | Job Queue                  PostgreSQL Connection
         | (BullMQ/Redis)                        |
         v                                       |
    +-------------+                    +--------------------+
    |   Redis     |                    |   PostgreSQL       |
    |  Queue Store|                    |   livecoding       |
    |             |                    +--------------------+
    +-------------+                    
         ^
         | Worker Process
         | (codeExecutionWorker.js)
         |
    +------------------------------------+
    | BullMQ Worker                       |
    | - Processes jobs from queue         |
    | - Executes code in isolation        |
    | - Updates execution status          |
    | - Handles retries + failures        |
    +------------------------------------+
```

### End-to-End Request Flow

1. **Code Session Creation**: Client creates a session with a language ID. Server generates UUID and stores session in PostgreSQL.

2. **Autosave Behavior**: Client sends PATCH requests to update source code. Server validates code and updates session.

3. **Execution Request**: Client triggers code execution via POST /code-sessions/:id/run. Server validates parameters, checks for abuse, creates execution record with QUEUED status.

4. **Background Execution**: Job is added to BullMQ queue. Worker picks up job, updates status to RUNNING, executes code in child process.

5. **Result Polling**: Client polls GET /executions/:id to check status. Once COMPLETED/FAILED/TIMEOUT, full results are returned.

### Queue-Based Execution Design

- Jobs are stored in Redis via BullMQ
- Workers process jobs asynchronously
- Each job has unique ID (execution_id) for idempotency
- Failed jobs are retried with exponential backoff

---

## Project Structure

```
backend/
├── src/
│   ├── controllers/           # HTTP request handlers
│   │   ├── executionController.js
│   │   ├── languageController.js
│   │   └── sessionController.js
│   ├── models/                # Database models
│   │   ├── Execution.js
│   │   ├── Language.js
│   │   └── Session.js
│   ├── services/              # Business logic
│   │   ├── CodeExecutionService.js
│   │   ├── ExecutionService.js
│   │   ├── SessionService.js
│   │   └── SafetyService.js
│   ├── routes/                # API routes
│   │   ├── executionRoute.js
│   │   ├── languageRoute.js
│   │   ├── sessionRoute.js
│   │   └── index.js
│   ├── libs/                  # Utilities
│   │   ├── db.js              # PostgreSQL connection
│   │   ├── queue.js           # BullMQ queue setup
│   │   ├── redis.js           # Redis connection
│   │   ├── schema.sql         # Database schema
│   │   └── sqlQuery.js
│   ├── workers/
│   │   └── codeExecutionWorker.js  # Job processor
│   └── index.js               # Server entry point
├── __tests__/                 # Test files
│   ├── unit/
│   │   ├── SafetyService.test.js
│   │   ├── CodeExecutionService.test.js
│   │   └── SessionService.test.js
│   ├── integration/
│   │   ├── api.test.js
│   │   └── queue.test.js
│   └── fixtures/
│       └── testData.js
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

---

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
cd backend
docker-compose up
```

Access API: `http://localhost:3000`

### Option 2: Local Development

#### 1. Setup Environment
```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
NODE_ENV=development

# PostgreSQL Configuration
PG_HOST=your_pg_database_host
PG_PORT=5432
PG_DATABASE=livecoding
PG_USER=your_pg_database_user
PG_PASSWORD=your_pg_database_password
PG_SSL=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Execution Limits
DEFAULT_TIME_LIMIT_MS=5000
DEFAULT_MEMORY_MB=256
MAX_CONCURRENT_EXECUTIONS=10

# Logging
LOG_LEVEL=debug
```

#### 2. Install & Start Services
```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Initialize database
psql -U postgres -h localhost < src/libs/schema.sql

# Terminal 1: Start API
npm run dev

# Terminal 2: Start Worker
npm run worker
```

---

## API Documentation

### Health Check

**GET /health**

Response:
```json
{
  "status": "ok"
}
```

---

### Languages

**GET /languages**

Response:
```json
{
  "total": 8,
  "languages": [
    {
      "id": "uuid",
      "name": "javascript",
      "runtime": "node",
      "version": "18.x",
      "default_time_limit_ms": 5000,
      "default_memory_mb": 256
    }
  ]
}
```

**GET /languages/:language_id**

Response:
```json
{
  "id": "uuid",
  "name": "javascript",
  "runtime": "node",
  "version": "18.x",
  "template_code": "console.log('Hello World');",
  "file_name": "main.js",
  "default_time_limit_ms": 5000,
  "default_memory_mb": 256
}
```

---

### Code Sessions

**POST /code-sessions**

Request:
```json
{
  "language_id": "uuid"
}
```

Response (201 Created):
```json
{
  "session_id": "uuid",
  "status": "ACTIVE"
}
```

---

**GET /code-sessions/:session_id**

Response:
```json
{
  "session_id": "uuid",
  "status": "ACTIVE",
  "language_id": "uuid",
  "language_name": "javascript",
  "source_code": "console.log('Hello');",
  "runtime": "node",
  "version": "18.x",
  "created_at": "2026-01-21T10:00:00.000Z",
  "updated_at": "2026-01-21T10:05:00.000Z"
}
```

---

**PATCH /code-sessions/:session_id**

Request:
```json
{
  "source_code": "console.log('Updated code');"
}
```

Response:
```json
{
  "session_id": "uuid",
  "status": "ACTIVE"
}
```

---

**POST /code-sessions/:session_id/run**

Execute the current code asynchronously using default time and memory limits from environment variables.

Response (202 Accepted):
```json
{
  "execution_id": "uuid",
  "status": "QUEUED"
}
```

Error Response (429 Too Many Requests):
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

**GET /code-sessions/:session_id/executions**

Query Parameters:
- `limit` (optional, default: 10)

Response:
```json
{
  "session_id": "uuid",
  "executions": [
    {
      "execution_id": "uuid",
      "status": "COMPLETED",
      "execution_time_ms": 150,
      "exit_code": 0,
      "created_at": "2026-01-21T10:00:00.000Z"
    }
  ]
}
```

---

**PATCH /code-sessions/:session_id/close**

Response:
```json
{
  "session_id": "uuid",
  "status": "INACTIVE"
}
```

---

### Executions

**GET /executions/:execution_id**

Response (when status is QUEUED or RUNNING):
```json
{
  "execution_id": "uuid",
  "status": "RUNNING"
}
```

Response (when status is COMPLETED/FAILED/TIMEOUT):
```json
{
  "execution_id": "uuid",
  "status": "COMPLETED",
  "stdout": "Hello World\n",
  "stderr": "",
  "execution_time_ms": 120
}
```

---

## Execution Lifecycle

```
POST /code-sessions/{id}/run
  |
  v
Validate parameters (time_limit, memory_limit)
  |
  v
Check for abuse (rate limit, failures)
  |
  v
Detect infinite loops (pattern matching)
  |
  v
Create execution (status: QUEUED)
Enqueue job to BullMQ
  |
  v
Worker picks up job
Update execution (status: RUNNING, started_at)
  |
  v
Execute code (child process, timeout, memory)
  |
  v
Capture output (stdout, stderr, exit_code, execution_time_ms)
  |
  v
Update execution (status: COMPLETED/FAILED/TIMEOUT, finished_at)
  |
  v
GET /executions/{id} returns full result
```

### Execution States

| State | Description |
|-------|-------------|
| QUEUED | Job created and waiting in queue |
| RUNNING | Worker is executing the code |
| COMPLETED | Code executed successfully (exit_code = 0) |
| FAILED | Code executed but returned non-zero exit code |
| TIMEOUT | Execution exceeded time limit |

---

## Reliability & Data Model

### Idempotency Handling

1. **Unique Execution IDs**: Each execution has a UUID as jobId in BullMQ. Duplicate submissions with same ID are rejected.

2. **Safe Reprocessing**: If worker crashes mid-execution, BullMQ automatically requeues the job. Status remains accurate via database state.

3. **Session State Check**: Before execution, system validates session exists and is ACTIVE.

### Failure Handling

1. **Retry Logic**:
   - 3 retry attempts for transient failures
   - Exponential backoff: 2s, 4s, 8s delays
   - Only infrastructure failures trigger retries (not code errors)

2. **Error States**:
   - FAILED: Code executed but returned error
   - TIMEOUT: Code exceeded time limit
   - Both states include stderr output for debugging

3. **Dead Letter / Failed Execution Handling**:
   - After 3 failed retries, job moves to failed state
   - Failed executions remain queryable in database
   - Execution status updated to FAILED with error details
   - Logs captured for debugging

---

## Safety Features

### Rate Limiting
- **Max 10 executions per minute** per session
- **Max 5 consecutive failures** before block
- Returns `429 Too Many Requests`

### Infinite Loop Detection
Pattern matching for:
- Python: `while True:`, `while 1:`
- JavaScript/C/C++: `while(1)`, `while(true)`, `for(;;)`

### Resource Constraints
- **Time**: 100ms - 60,000ms
- **Memory**: 32MB - 2,048MB
- Process isolation with timeouts

---

## Scalability Considerations

### Handling Many Concurrent Sessions

1. **Stateless API**: API servers don't hold session state. All state in PostgreSQL/Redis.
2. **Connection Pooling**: PostgreSQL connections pooled to handle concurrent requests.
3. **Redis Pub/Sub**: Can scale Redis horizontally with clustering.

### Horizontal Scaling of Workers

1. **Multiple Workers**: Run multiple worker instances to process jobs in parallel.
   ```bash
   # Run 4 workers
   npm run worker & npm run worker & npm run worker & npm run worker
   ```

2. **Container Scaling**: Docker Compose can scale workers:
   ```bash
   docker-compose up --scale worker=4
   ```

3. **Worker Independence**: Each worker processes jobs independently from the queue.

### Queue Backlog Handling

1. **Queue Monitoring**: Monitor queue depth via Redis commands:
   ```bash
   redis-cli LLEN code-execution:wait
   ```

2. **Backpressure**: Rate limiting prevents queue overflow from single session.

3. **Priority Queues**: Can implement priority lanes for different user tiers.

### Potential Bottlenecks and Mitigation

| Bottleneck | Mitigation |
|------------|------------|
| PostgreSQL connections | Connection pooling, read replicas |
| Redis memory | TTL on lifecycle events, Redis Cluster |
| Worker capacity | Horizontal scaling, auto-scaling |
| Large execution output | Truncate stdout/stderr, stream to storage |
| Cold start for languages | Pre-compile templates, warm containers |

---

## Design Decisions & Trade-offs

### 1. BullMQ + Redis Queue
- **Why**: Reliable job processing, automatic retries, easy scaling
- **Trade-off**: Requires Redis infrastructure; not for synchronous execution

### 2. Child Process Isolation
- **Why**: Prevents malicious code from affecting main process
- **Trade-off**: Less secure than Docker; no filesystem restrictions

### 3. Temporary Lifecycle Events (Redis)
- **Why**: Fast access without DB queries; auto-expire after 30 min
- **Trade-off**: Not persistent; can't query old history

### 4. No Persistent Retry Tracking
- **Why**: BullMQ handles internally; simpler DB schema
- **Trade-off**: Can't query "how many retries" from DB

### 5. Pattern Matching (Not AST)
- **Why**: Fast, works cross-language
- **Trade-off**: Can't detect all loops; false positives possible

### Technology Choices

| Choice | Reason | Alternative Considered |
|--------|--------|----------------------|
| Node.js | Fast I/O, JavaScript ecosystem | Go, Python |
| BullMQ | Redis-backed, mature, reliable | Agenda, Bee-Queue |
| PostgreSQL | ACID compliance, JSON support | MongoDB, MySQL |
| Redis | In-memory speed, pub/sub | Memcached, RabbitMQ |

### Optimization Focus

Optimized for **reliability** over speed:
- Queue-based async execution ensures no request loss
- Retry logic handles transient failures
- Database persistence ensures execution results survive crashes



## Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Submit execution | <10ms | Enqueue only |
| Check status | <5ms | Redis lookup |
| Get execution | <20ms | DB query |
| Process execution | Variable | Code dependent |

---

## Logging

All services log to stdout with prefixes:
```
[Server] Listening on port 3000
[Worker] Processing execution 123e4567...
[Queue] Error: Connection refused
[Database] SELECT * FROM sessions
[Redis] Connected
```

---

## Testing

```bash
# Run all tests
npm test

# Run specific test
npm test -- SafetyService.test.js

# With coverage
npm test -- --coverage
```

### Test Coverage

**Unit Tests**:
- SafetyService: Rate limiting, infinite loop detection, parameter validation
- CodeExecutionService: Code execution, timeout handling, output capture
- SessionService: Session CRUD operations

**Integration Tests**:
- API endpoints: Full request/response cycle
- Queue processing: Job submission and completion

**Failure Scenario Tests**:
- Queue failure: Redis connection errors
- Worker crash: Mid-execution failures
- Timeout: Long-running code handling

---

## Monitoring

### Queue Status
```bash
redis-cli
> KEYS code-execution:*
> HGETALL code-execution:123e4567...
```

### Database
```bash
psql -U postgres -h localhost -d livecoding
SELECT COUNT(*) FROM executions WHERE status = 'QUEUED';
```

### Worker Logs
```bash
npm run worker
# or
docker-compose logs -f worker
```

---

## Production Optimization Roadmap

### 1. Code Execution Isolation (High Priority)

**Current State**: Execution is conceptually isolated at worker level via OS processes.

**Limitations**:
- No strong sandboxing against file system access
- Process escape vulnerabilities possible
- Malicious system calls not restricted

**Production Improvements**:
- Replace process-based execution with container-based isolation:
  - **Docker**: Standard containerization with resource limits
  - **Firecracker**: Lightweight microVMs for secure isolation
  - **gVisor**: User-space kernel providing additional isolation
- Apply security hardening:
  - **Seccomp** profiles to restrict system calls
  - **Read-only filesystem** to prevent modifications
  - **Network isolation** to prevent outbound connections

---

### 2. Execution Result Storage Management

**Current State**: stdout and stderr stored directly in PostgreSQL as TEXT.

**Limitations**:
- Large outputs increase database size
- Query performance degradation
- Memory issues when fetching large results

**Production Improvements**:
- Enforce configurable output size limits (e.g., max 1MB per execution)
- Store large outputs in external object storage (e.g., AWS S3, MinIO)
- Persist only references (URLs/object keys) in database
- Implement streaming for large result retrieval

---

### 3. Idempotency Guarantees

**Current State**: Each POST /code-sessions/{id}/run creates new execution. Claim of idempotency via UUID, but no explicit deduplication.

**Limitations**:
- Rapid repeated requests may enqueue duplicate executions
- Network retries can cause unintended duplicate runs
- No client-side request deduplication

**Production Improvements**:
- Introduce **idempotency keys** per execution request
- Reject or deduplicate requests with same idempotency key within 24-hour window
- Return cached result for duplicate requests
- Document idempotency key header requirement in API

---

### 4. Rate Limiting & Abuse Protection (Enhanced)

**Current State**: Basic rate limiting (10 executions/min per session, 5 consecutive failures block).

**Limitations**:
- Vulnerable to execution spamming from multiple sessions
- No per-user limits (if authentication added)
- No resource quotas across sessions
- DOS attack vectors possible

**Production Improvements**:
- Apply **per-session rate limiting** (current: 10/min)
- Add **per-user rate limiting** once authentication implemented
- Implement **resource quotas**:
  - Max CPU time per user per day
  - Max storage quota for results
  - Max concurrent executions
- Enforce **cooldown periods** between rapid executions
- Add **IP-based rate limiting** to prevent distributed attacks
- Implement **adaptive rate limiting** based on system load

---

### 5. Autosave Optimization

**Current State**: Autosave API (PATCH /code-sessions/{id}) writes directly to PostgreSQL.

**Limitations**:
- High-frequency autosave calls increase write load
- Database contention during peak usage
- Inefficient for real-time collaborative editing

**Production Improvements**:
- **Cache intermediate states in Redis** with expiration (e.g., 10 min)
- **Debounce client-side autosave** (e.g., 5-second intervals)
- **Batch writes** to PostgreSQL periodically (every 30-60s)
- Implement **conflict resolution** for concurrent edits
- Use Redis **WATCH** for optimistic locking

---

### 6. Real-Time Execution Updates (Replace Polling)

**Current State**: Clients poll GET /executions/{id} to retrieve execution status.

**Limitations**:
- Inefficient for high concurrency
- Generates redundant requests during execution
- Higher latency for result delivery
- Increases server load

**Production Improvements**:
- **WebSocket connections** for persistent bidirectional communication
- **Server-Sent Events (SSE)** as polling alternative
- **Push execution status updates** in real time
  - QUEUED → RUNNING → COMPLETED
  - Stream stdout/stderr chunks as they arrive
- Implement automatic reconnection with backoff
- Support subscription to multiple execution streams

---

### 7. Failure Classification (Finer-Grained Error Codes)

**Current State**: Failures broadly categorized as FAILED, TIMEOUT.

**Limitations**:
- No distinction between:
  - Compilation errors vs runtime errors
  - User code errors vs system errors
  - Worker crashes vs timeouts
  - Out-of-memory vs timeout

**Production Improvements**:
- Introduce **error code categories**:
  - **Syntax Error** (E001): Code failed to compile/parse
  - **Runtime Error** (E002): Code crashed during execution
  - **Memory Limit** (E003): Exceeded memory allocation
  - **Time Limit** (E004): Exceeded execution time
  - **System Error** (E005): Worker/infrastructure failure
  - **Unsafe Code** (E006): Blocked by safety rules
- Standardize error messages with structured format:
  ```json
  {
    "error_code": "E002",
    "error_type": "RuntimeError",
    "message": "TypeError: Cannot read property 'x' of undefined",
    "stack_trace": "..."
  }
  ```

---

### 8. Dead Letter Queue (DLQ) Implementation

**Current State**: Failed jobs remain in main queue after retries; status updated in DB.

**Limitations**:
- Difficult to inspect persistent failures
- Challenging to reprocess failed executions
- Hard to analyze systemic issues
- No separate visibility for permanently failed jobs

**Production Improvements**:
- Configure **Dead Letter Queue** in BullMQ
- Automatically move permanently failed jobs (after 3 retries) to DLQ
- Implement **DLQ monitoring and alerting**:
  - Alert when DLQ depth exceeds threshold
  - Dashboard visibility for failed job analysis
- Enable **manual replay** of failed executions:
  - API endpoint to requeue from DLQ
  - Admin panel for batch reprocessing
- Implement **DLQ retention** policy (keep for 30 days)

---

### 9. Worker Heartbeat Monitoring

**Current State**: Worker availability assumed based on job completion.

**Limitations**:
- Worker crashes leave executions stuck in RUNNING state
- Manual cleanup required for stale executions
- No automatic failure detection
- Difficult to diagnose worker health

**Production Improvements**:
- Implement **worker heartbeat mechanism**:
  - Worker sends heartbeat to Redis every 10 seconds
  - Heartbeat includes worker ID, queue status, memory usage
- Implement **heartbeat timeout detection**:
  - Mark workers as DEAD if no heartbeat for 30 seconds
  - Automatically mark RUNNING executions as FAILED if worker dies
- Add **worker health monitoring**:
  - Alert if heartbeat failure detected
  - Track worker uptime and restart frequency
  - Dashboard for worker status visualization
- Implement **graceful worker shutdown**:
  - Complete current job before stopping
  - Return incomplete jobs to queue

---

### 10. Worker Auto-Scaling

**Current State**: Worker scaling is manual or static.

**Limitations**:
- Does not adapt to queue backlog spikes
- Cannot handle traffic bursts efficiently
- Requires manual intervention to scale up/down

**Production Improvements**:
- Implement **horizontal auto-scaling of workers**:
  - Scale based on **queue depth**: Add worker if jobs waiting > threshold
  - Scale based on **job processing time**: Add worker if avg time exceeds limit
  - Scale based on **CPU usage**: Add worker if system CPU > 80%
- Use Kubernetes or container orchestration:
  - Deploy workers as Kubernetes Deployments
  - Use Horizontal Pod Autoscaler (HPA)
- Implement **scaling policies**:
  - Min workers: 2
  - Max workers: 20
  - Scale up by 1 worker if queue depth > 50 jobs
  - Scale down by 1 worker if queue empty for 5 minutes

---

### 11. Enhanced Execution Metrics

**Current State**: Execution time measured at application level only.

**Limitations**:
- Does not capture CPU vs wall-clock time
- Context switching overhead not tracked
- Missing memory peak usage
- I/O metrics not available

**Production Improvements**:
- Use **OS-level or container-level metrics**:
  - **CPU time**: User + system time
  - **Memory peak**: Max RSS during execution
  - **I/O metrics**: Bytes read/written
  - **Context switches**: Voluntary + involuntary
- Collect metrics at:
  - Application level (process-level)
  - Container level (if using Docker)
  - System level (via /proc on Linux)
- Store detailed metrics in time-series database:
  - InfluxDB or Prometheus
- Return metrics in execution response:
  ```json
  {
    "execution_time_ms": 150,
    "cpu_time_ms": 145,
    "wall_clock_ms": 150,
    "memory_peak_mb": 45,
    "io_read_bytes": 1024,
    "io_write_bytes": 512
  }
  ```

---

### 12. Redis High Availability

**Current State**: Redis used for queue without replication.

**Limitations**:
- Redis downtime causes execution queue unavailability
- Job loss if Redis crashes
- No automatic failover
- Single point of failure

**Production Improvements**:
- Deploy **Redis replication**:
  - Master-slave setup with automatic failover
  - Or use **Redis Sentinel** for automatic failover (3+ sentinels)
- Enable **Redis persistence**:
  - RDB snapshots (periodic)
  - AOF (Append-Only File) for durability
- Implement **Redis Cluster** for horizontal scaling:
  - 6+ nodes for HA (3 masters, 3 replicas)
  - Automatic sharding of queue data
- Add **connection pooling** with retry logic
- Implement **circuit breaker** for Redis failures

---

### 13. Multi-Language Runtime Optimization

**Current State**: Language support is generic and uniform.

**Limitations**:
- High cold start latency (first execution of language)
- No pre-warmed runtimes
- Language-specific optimizations missing
- Each language pays startup cost

**Production Improvements**:
- **Pre-build language-specific execution environments**:
  - Cache Docker images with runtimes pre-installed
  - Cache compiled language tools (e.g., Go toolchain)
- Implement **runtime warm-up**:
  - Keep a pool of pre-started containers for each language
  - Reuse containers for multiple executions
- Add **language-specific optimizations**:
  - Node.js: Pre-require common modules
  - Python: Use PyPy or pre-compiled libraries
  - Java: Shared JVM pool to avoid startup
  - C++: Pre-compile standard headers
- Track **cold vs warm start times** separately
- Implement **custom templates** with pre-loaded libraries

---

### 14. Structured Logging & Observability

**Current State**: Execution lifecycle logged at high level to stdout.

**Limitations**:
- No distributed tracing
- Non-structured logs hard to parse
- No metrics dashboards
- Difficult to diagnose issues in production

**Production Improvements**:
- **Add structured logging**:
  - JSON-formatted logs with consistent schema
  - Log levels: DEBUG, INFO, WARN, ERROR
  - Include execution ID, session ID, worker ID in every log
- **Implement distributed tracing**:
  - Use OpenTelemetry for trace collection
  - Track request flow: API → Queue → Worker → DB
  - Export traces to Jaeger or Zipkin
- **Collect Prometheus metrics**:
  - Execution duration histogram
  - Queue depth gauge
  - Success/failure rate counters
  - Worker resource usage
- **Centralized logging**:
  - Stream logs to ELK (Elasticsearch-Logstash-Kibana)
  - Or Loki + Grafana for log aggregation
  - Enable full-text search and filtering
- **Create observability dashboards**:
  - Grafana dashboard for metrics
  - Execution timeline view
  - Worker health status
  - Queue backlog trends

---

## Future Feature Improvements

1. **Authentication & Authorization** - JWT, per-user rate limits, role-based access
2. **Persistent Audit Logs** - Store all events in database for compliance
3. **Persistent Retry Tracking** - Query retry history from DB
4. **Advanced Features** - Multiple files, stdin, custom libraries
5. **SDK/CLI** - Client library, command-line tool
6. **Webhooks** - Notify external systems on execution completion
7. **Load Testing** - Artillery, k6, chaos testing
8. **GraphQL API** - Alternative to REST for flexible queries

---

## License

ISC

## Author

lengocbao
