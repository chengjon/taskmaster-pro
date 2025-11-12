# Task Master Pro - Architecture Diagrams & Data Flow

---

## Current Architecture (As-Is)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Task Master Pro System                       │
└─────────────────────────────────────────────────────────────────┘

                        .taskmaster/tasks.json
                    (Single Source of Truth)
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                v             v             v
            ┌────────┐   ┌──────────┐   ┌────────┐
            │ @tm/cli│   │FileStorage   │@tm/mcp │
            └────┬───┘   └──────┬───┘   └───┬────┘
                 │              │            │
                 └──────────┬───┴────────────┘
                            │
                            v
                       ┌──────────┐
                       │ @tm/core │
                       │(TmCore)  │
                       └────┬─────┘
                            │
                    ┌───────┴────────┐
                    │                │
                    v                v
              ┌──────────┐    ┌─────────────┐
              │  CLI App │    │  REST API   │
              │          │    │ (Express)   │
              └──────────┘    └──────┬──────┘
                                     │
                              ┌──────v──────────┐
                              │  CacheStore     │
                              │  (In-Memory)    │
                              │  Per-Process    │
                              └─────────────────┘
```

**Problems**:
- Cache not coordinated with file changes
- API can't retrieve real data (mock-only)
- No inter-layer communication
- Multiple writers can corrupt JSON

---

## Proposed Architecture (To-Be)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Task Master Pro System v2                    │
└─────────────────────────────────────────────────────────────────┘

                        .taskmaster/tasks.json
                     (File-Based Storage)
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                v             v             v
            ┌────────┐   ┌──────────────┐   ┌────────┐
            │ @tm/cli│   │FileStorage   │   │@tm/mcp │
            │        │   │  with:       │   │        │
            │        │   │ • Atomic     │   │        │
            │        │   │   Writes     │   │        │
            │        │   │ • File       │   │        │
            │        │   │   Watches    │   │        │
            │        │   │ • Change     │   │        │
            │        │   │   Emitter    │   │        │
            └────┬───┘   └──────┬───┘   └───┬────┘
                 │              │            │
                 └──────────┬───┴────────────┘
                            │
                            v
                       ┌──────────────┐
                       │ @tm/core     │
                       │(TmCore)      │
                       │ + Event Bus  │
                       └────┬─────────┘
                            │
                ┌───────────┬┴───────────┐
                │           │           │
                v           v           v
            ┌───────┐  ┌──────────┐  ┌──────────┐
            │CLI App│  │REST API  │  │MCP Tools │
            │       │  │(Express) │  │          │
            └───────┘  └─────┬────┘  └──────────┘
                             │
                      ┌──────v──────────────┐
                      │ Smart Cache         │
                      │ • Subscribes to     │
                      │   Change Events     │
                      │ • Auto-invalidates  │
                      │ • Consistent across │
                      │   instances (Redis) │
                      │ • Persists          │
                      └────────────────────┘
```

**Improvements**:
- File watches emit change events
- Cache subscribes and auto-invalidates
- Atomic writes prevent corruption
- Event bus enables real-time features
- Ready for multi-instance scaling

---

## Data Flow: Create Task (Current)

```
User: TAMP add-task --prompt="Build feature X"
        │
        v
    @tm/cli
        │
        ├─> Validate input
        │
        ├─> Call tmCore.tasks.create()
        │
        v
    @tm/core
        │
        ├─> Create TaskEntity
        ├─> Validate rules
        │
        v
    FileStorage
        │
        ├─> Read .taskmaster/tasks.json
        ├─> Modify in memory
        │
        v
    File System
        │
        └─> Write .taskmaster/tasks.json
            (Direct write - NOT ATOMIC)
        │
        v
    Response: "Task created ✓"

User: curl GET /api/v1/tasks
        │
        v
    REST API
        │
        ├─> Check cache
        ├─> Cache miss? (usually)
        │
        v
    CacheStore
        │
        └─> Return mock data
        
PROBLEM: API doesn't see the file changes!
         Cache is empty or stale!
```

---

## Data Flow: Create Task (Proposed)

```
User: TAMP add-task --prompt="Build feature X"
        │
        v
    @tm/cli
        │
        ├─> Validate input
        │
        v
    @tm/core (TmCore)
        │
        ├─> Create TaskEntity
        ├─> Validate rules
        │
        v
    FileStorage.create()
        │
        ├─> Read .taskmaster/tasks.json
        ├─> Modify in memory
        ├─> Write to tasks.json.tmp (ATOMIC)
        ├─> Verify JSON is valid
        ├─> Rename tmp -> tasks.json (ATOMIC)
        │
        v
    File System
        │
        ├─> Write complete & atomic
        │
        v
    FileStorage.onChange()
        │
        ├─> File change detected
        │
        v
    EventBus.emit('task.created')
        │
        ├─> Event propagated to all subscribers
        │
        v
    REST API cache invalidation
        │
        ├─> cacheStore.clearPattern('*:GET:*/tasks*')
        │
        v
    Response: "Task created ✓"

User: curl GET /api/v1/tasks
        │
        v
    REST API
        │
        ├─> Check cache
        ├─> Cache miss (just cleared)
        │
        v
    @tm/core.tasks.list()
        │
        ├─> Read .taskmaster/tasks.json
        │
        v
    Return: [{ id: 1, title: "Build feature X", ... }]
        
SUCCESS: Real data from @tm/core!
         Cache is fresh!
         Both CLI and API see the same task!
```

---

## State Management Layers

### Current (Problematic)

```
┌─────────────────────────────────────────┐
│ Application State                       │
├─────────────────────────────────────────┤
│                                         │
│  Layer 1: @tm/core                      │
│  ├─ TasksDomain (in-memory entities)    │
│  └─ Storage: FileStorage reads/writes   │
│                                         │
│  Layer 2: API Controller                │
│  ├─ TaskService (mock data!)            │  ← BROKEN
│  └─ CacheStore (in-memory Map)          │
│                                         │
│  Layer 3: File System                   │
│  └─ .taskmaster/tasks.json              │
│                                         │
│  Problem: 3 separate state stores!      │
│  No synchronization between layers!     │
│                                         │
└─────────────────────────────────────────┘
```

### Proposed (Healthy)

```
┌─────────────────────────────────────────┐
│ Application State (Single Source)       │
├─────────────────────────────────────────┤
│                                         │
│  Source of Truth: .taskmaster/tasks.json│
│  ├─ Persisted to disk                   │
│  ├─ Atomic writes                       │
│  └─ Change notifications                │
│                                         │
│  Layer 1: @tm/core                      │
│  ├─ TasksDomain                         │
│  ├─ FileStorage (atomic+watching)       │
│  └─ EventBus (change notifications)     │
│                                         │
│  Layer 2: Caching Layer                 │
│  ├─ In-memory cache (L1)                │
│  ├─ Redis cache (L2, multi-instance)    │
│  └─ Auto-invalidation via events        │
│                                         │
│  Layer 3: Presentation Layers           │
│  ├─ CLI (reads from @tm/core)           │
│  ├─ API (reads from @tm/core)           │
│  └─ MCP (reads from @tm/core)           │
│                                         │
│  Benefit: Single source of truth!       │
│  All layers synchronized via events!    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Cache Invalidation Timeline

### Current (Problem)

```
t=0ms   CLI: set-status --id=1 --status=done
            └─> File updated ✓

t=5ms   API Cache still has status=pending ✗

t=100ms API Cache still has status=pending ✗

t=300s  API Cache expires (5 minute TTL) 
            └─> Next read gets fresh data ✓

ISSUE: 5-minute window of stale data!
       Users see different status in CLI vs API!
```

### Proposed (Solution)

```
t=0ms   CLI: set-status --id=1 --status=done
            └─> File updated (atomic)
            └─> FileStorage emits 'changed' event

t=2ms   EventBus processes change event
            └─> Cache invalidation triggered

t=5ms   API Cache is already empty
            └─> Next read loads fresh data ✓

RESULT: < 10ms to consistent state!
        Both CLI and API see same data immediately!
```

---

## Concurrent Write Scenario

### Current (UNSAFE)

```
Process A (CLI)           Process B (API)
────────────────────────────────────────

1. Read tasks.json
   {
     tasks: [Task1, Task2]
   }
                          1. Read tasks.json
                             {
                               tasks: [Task1, Task2]
                             }

2. Modify Task1
   tasks[0].status = "done"
   
                          2. Modify Task2
                             tasks[1].status = "in-progress"

3. Write tasks.json
   {
     tasks: [Task1(done), Task2]
   }
   
                          3. Write tasks.json
                             {
                               tasks: [Task1, Task2(in-progress)]
                             }
                          
RESULT: Task1's update is LOST! ✗
        Only Task2's update persists
        This is a DATA LOSS incident!
```

### Proposed (SAFE)

```
Process A (CLI)           Process B (API)
────────────────────────────────────────

1. Read tasks.json
   {
     tasks: [Task1, Task2]
   }
                          1. Acquire write lock ← Wait!

2. Acquire write lock ✓
   (Process B waits)
   
3. Modify Task1
   tasks[0].status = "done"

4. Write to tasks.json.tmp (temp)
   Verify JSON is valid
   Atomic rename tmp → tasks.json ✓
   
5. Release write lock
   
                          2. Acquire write lock ✓
                          (Now Process A is done)
                          
                          3. Read tasks.json
                             {
                               tasks: [Task1(done), Task2]  ← Sees A's update!
                             }
                             
                          4. Modify Task2
                             tasks[1].status = "in-progress"
                             
                          5. Write atomically
                          6. Release write lock

RESULT: Both updates preserved! ✓
        Task1 is done
        Task2 is in-progress
        No data loss!
```

---

## Deployment Scenarios

### Single Instance (Current)

```
                    ┌──────────────────┐
                    │   API Server     │
                    │                  │
                    │  CacheStore      │
                    │  (In-Memory)     │
                    │                  │
                    │  Rate Limiter    │
                    │  (Per-Instance)  │
                    └────────┬─────────┘
                             │
                    ┌────────v─────────┐
                    │ .taskmaster/     │
                    │ tasks.json       │
                    └──────────────────┘

Status: ✓ Works fine
        ✓ No concurrency issues
        ✓ Simple deployment
```

### Multiple Instances (Problem)

```
       ┌─────────────────┐         ┌─────────────────┐
       │   API Server 1  │         │   API Server 2  │
       │                 │         │                 │
       │  CacheStore A   │         │  CacheStore B   │
       │  [Task1: done]  │         │  [Task1: pend]  │  ← Different!
       │                 │         │                 │
       │  Rate Limiter A │         │  Rate Limiter B │
       │  (100 req/min)  │         │  (100 req/min)  │
       └────────┬────────┘         └────────┬────────┘
                │ Read/Write                │ Read/Write
                └────────────┬──────────────┘
                             │
                    ┌────────v─────────┐
                    │ .taskmaster/     │
                    │ tasks.json       │
                    │ (Shared)         │
                    └──────────────────┘

Problems:
  ❌ Cache coherency: Server1 shows done, Server2 shows pending
  ❌ Rate limiting: Combined 200 req/min easily hits limit on shared file
  ❌ File contention: Both servers reading/writing concurrently
  ❌ No coordination: Who wins on concurrent writes?

Status: ✗ BREAKS
        ✗ Users see different data
        ✗ Rate limiting doesn't work
        ✗ File corruption risk
```

### Multiple Instances (Proposed)

```
       ┌─────────────────┐         ┌─────────────────┐
       │   API Server 1  │         │   API Server 2  │
       │                 │         │                 │
       │  Cache L1 (hot) │         │  Cache L1 (hot) │
       └────────┬────────┘         └────────┬────────┘
                │                           │
                └─────────────┬─────────────┘
                              │
                      ┌───────v────────┐
                      │   Redis Cache   │
                      │   (Shared L2)   │
                      │   Persistent    │
                      └───────┬────────┘
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    │  EventBus (Redis)  │ ← Change notifications
                    │                    │
                    └─────────┬──────────┘
                              │
                      ┌───────v────────┐
                      │ File Storage    │
                      │ (Atomic Writes) │
                      │ (File Watches)  │
                      └───────┬────────┘
                              │
                    ┌─────────v─────────┐
                    │ .taskmaster/      │
                    │ tasks.json        │
                    │ (SoT)             │
                    └───────────────────┘

Benefits:
  ✓ Cache coherency: Both servers see same data via Redis
  ✓ Shared cache: Reduces file I/O
  ✓ Auto-invalidation: Events propagate changes
  ✓ Atomic writes: No corruption
  ✓ File watches: External changes detected
  ✓ Distributed rate limiting: Shared state

Status: ✓ WORKS
        ✓ Scales to 10+ instances
        ✓ Data consistency maintained
        ✓ No file corruption
```

---

## Testing Pyramid

### Current (Incomplete)

```
                    ▲
                    │  ▲
                    │  │ E2E Tests
                    │  │ (API + TmCore)
                    │  │ 
         ┌──────────┼──┼──────────┐
         │          │  │ MISSING  │  ← Integration tests
         │          ▼  │          │     (Real TmCore, real cache)
         │             │          │
         ├─────────────┼──────────┤
         │             │ Unit     │
         │             │ Tests    │
         │             │ ✓ Good   │
         │             │          │
         └─────────────┴──────────┘

Issue: No integration tests
       Can't verify API-TmCore synchronization
       Cache invalidation untested
       Concurrency untested
```

### Proposed (Complete)

```
                    ▲
                    │  ▲  ▲
                    │  │  │ E2E Tests
                    │  │  │ ✓ API + TmCore
         ┌──────────┼──┼──┼──────────┐
         │          │  │  │ Integr.  │
         │          ▼  │  │ Tests ✓  │
         │             │  │ • Cache  │
         │             │  │ • Events │
         ├─────────────┼──┼──────────┤
         │             │ Unit      │
         │             │ Tests     │
         │             │ ✓ Good    │
         │             │           │
         └─────────────┴───────────┘

Coverage:
  ✓ Unit: Business logic
  ✓ Integration: API + TmCore + Storage
  ✓ E2E: Full workflow with real files
  ✓ Concurrency: Parallel writes
  ✓ Cache: Invalidation scenarios
```

---

## Technology Stack Evolution

### Phase 1 (Current)
```
Storage:      File System (.json)
Cache:        In-Memory Map (per-process)
Rate Limiting: Per-Instance Buckets
Sync:         None (manual)
```

### Phase 2 (Planned)
```
Storage:      File System (.json) + Atomic Writes + Watches
Cache:        In-Memory Map + Event-Driven Invalidation
Rate Limiting: Per-Instance (still)
Sync:         Event Bus (in-process pub/sub)
```

### Phase 3 (Growth)
```
Storage:      File System or PostgreSQL (pluggable)
Cache:        Redis (shared across instances)
Rate Limiting: Redis-Backed (distributed)
Sync:         Redis Pub/Sub or Kafka
Deployment:   Kubernetes Ready
```

### Phase 4 (Scale)
```
Storage:      PostgreSQL or similar RDBMS
Cache:        Redis Cluster
Rate Limiting: Distributed rate limiter service
Sync:         Event streaming (Kafka/Pulsar)
Deployment:   Multi-region, High-Availability
```

---

**End of Diagrams & Data Flow**

*These diagrams illustrate why the critical issues must be fixed, and how the proposed improvements will solve them.*
