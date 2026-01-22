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
    |  Queue Store|                    |   live_code_       |
    |             |                    |   execution        |
    +-------------+                    +--------------------+
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

### Production Readiness Gaps

1. **Authentication**: No user authentication or authorization
2. **Advanced Sandboxing**: Child process, not Docker isolation
3. **Metrics**: No Prometheus/Grafana integration
4. **Log Aggregation**: Stdout only, no centralized logging
5. **Secret Management**: Environment variables only

---

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
psql -U postgres -h localhost -d live_code_execution
SELECT COUNT(*) FROM executions WHERE status = 'QUEUED';
```

### Worker Logs
```bash
npm run worker
# or
docker-compose logs -f worker
```

---

## Future Improvements

1. **Authentication** - JWT, per-user rate limits
2. **Persistent Audit Logs** - Store all events in database
3. **Advanced Sandboxing** - Docker per execution, filesystem restrictions
4. **WebSocket** - Real-time execution streaming
5. **Metrics** - Prometheus, Grafana dashboards
6. **Advanced Features** - Multiple files, stdin, custom libraries
7. **SDK/CLI** - Client library, command-line tool
8. **Performance** - Code caching, compilation caching
9. **Better Recovery** - Dead letter queue, manual retries, webhooks
10. **Load Testing** - Artillery, k6, chaos testing

---

## License

ISC

## Author

lengocbao
