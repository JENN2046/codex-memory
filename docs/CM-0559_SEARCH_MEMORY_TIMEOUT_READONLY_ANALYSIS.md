# CM-0559 Search Memory Timeout Read-Only Analysis

Status: CM_0559_NEEDS_CM0560
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note records the CM-0559 read-only analysis for the previously observed `search_memory` timeout.

It does not call true `search_memory`.

It does not read `.jsonl` audit files or real memory content.

It does not modify recall/search runtime, tests, package manifests, lockfiles, config, watchdog/startup, or public MCP tools.

## Commands Run

Allowed read-only commands:

```powershell
git status -sb
git log --oneline --decorate -n 20
Select-String -Path .\src\app.js,.\src\recall\*.js,.\src\storage\*.js -Pattern "search_memory|searchMemory|listChunks|CandidateGenerator|rerank|timeout|cache|audit" -CaseSensitive:$false
```

Observed Git state:

```text
main...origin/main [ahead 3]
HEAD = 9970511 fix: return JSON-RPC envelope for no-token mutation rejection
```

## Chain Analysis

### 1. App Tool Dispatch

`src/app.js` contains the `search_memory` dispatch branch and passes control into `passiveRecallService.search`.

Timeout risk:

- no obvious top-level bounded timeout around the complete `search_memory` tool call was observed from the allowed read-only scan
- a slow lower layer can therefore surface to the MCP client as a client-side timeout instead of a controlled tool error

Write-like side effects:

- `src/app.js` can call `recallAuditService.recordReadPolicySummary` after lifecycle/read-policy filtering
- this means some search flows can write recall-audit evidence even though the user-visible operation is a read

### 2. Recall Pipeline

`src/recall/KnowledgeBaseRecallPipeline.js` contains the recall pipeline, including:

- candidate generation
- rerank finalization
- aggregation
- recall audit recording

Timeout risk:

- candidate generation, rerank, aggregation, record lookup, and audit append are sequential awaited stages
- a slow stage can delay the entire `search_memory` response

Write-like side effects:

- `KnowledgeBaseRecallPipeline.recordAudit` calls `recallAuditService.record`
- recall audit append can write durable audit state depending on active config

### 3. `shadowStore.listChunks`

`src/recall/CandidateGenerator.js` calls `shadowStore.listChunks`.

`src/storage/SqliteShadowStore.js` contains `listChunks` and `listChunksByTimeRanges`.

Timeout risk:

- large SQLite shadow chunk sets, broad target selection, or filters that do not narrow enough can make chunk listing and subsequent in-memory ranking slow
- time-range search can call `listChunks` again through `listChunksByTimeRanges`

Write-like side effects:

- the listed operation itself is read-oriented, but it feeds cache writes and audit writes later in the path

### 4. Vector Query / Embedding Path

`src/recall/CandidateGenerator.js` calls `vectorStore.getSingleEmbeddingCached(queryText)`.

`src/storage/VectorIndexStore.js` contains `getSingleEmbeddingCached`, embedding cache handling, and vector query-related paths.

Timeout risk:

- query embedding generation can be slow if it falls through to an external embedding adapter
- local cache misses can trigger embedding generation and cache updates
- vector ranking over large vectors can add cost after chunk listing

Write-like side effects:

- embedding cache entries can update access metadata or add cache entries
- vector index cache/state may be written depending on the path and config

### 5. Candidate Cache

`src/recall/CandidateGenerator.js` references `candidateCacheStore.get` and `candidateCacheStore.set`.

`src/storage/CandidateCacheStore.js` contains file-backed candidate cache behavior.

Timeout risk:

- cache file read/write, pruning, or JSON serialization can add latency
- cache miss falls through to full candidate generation

Write-like side effects:

- `candidateCacheStore.set` can write the candidate cache file
- `KnowledgeBaseSyncService` can clear candidate cache on changed sync state

### 6. Optional Rerank

`src/recall/RerankService.js` and `src/recall/ExternalRerankAdapter.js` contain rerank behavior.

Timeout risk:

- local rerank is CPU-bound and can scale with candidate size
- external rerank has an adapter timeout, but provider use is a separate risk boundary and was not executed here

Write-like side effects:

- rerank itself is read/compute oriented
- it contributes metadata that is later recorded into recall audit

### 7. Audit Path

`src/recall/RecallAuditService.js` calls audit-log append methods.

`src/storage/AuditLogStore.js` contains write and recall audit append/read helpers.

Timeout risk:

- durable audit append can add file I/O latency
- audit failures or slow disk can affect the response path if not isolated

Write-like side effects:

- recall audit append is a durable write-like side effect
- read-policy summary append is also write-like evidence

## Findings

The prior `search_memory` timeout should be treated as a separate reliability blocker from the no-token `record_memory` JSON-RPC rejection shape.

The likely timeout zones are:

```text
app tool dispatch
recall pipeline
shadowStore.listChunks
vector embedding/query path
candidate cache read/write
optional rerank
recall audit append
```

The likely write-like side effects are:

```text
candidate cache set / clear
embedding cache update
recall audit append
read-policy summary append
```

Because those side effects exist, true `search_memory` must not be used as a casual "read-only" validation command under a no-durable-write boundary.

## CM-0560 Recommendation

CM-0560 is needed.

Recommended CM-0560 scope:

```text
targeted runtime fix for bounded search_memory timeout and controlled error shape
```

Suggested allowed files:

```text
src/app.js
src/core/SearchMemoryTimeoutPolicy.js
tests/mcp-contract.test.js
tests/phase-b-passive-recall.test.js
```

Possible implementation direction:

- add a bounded timeout wrapper around the `search_memory` app tool dispatch
- return a controlled tool error / JSON-RPC error shape when timeout occurs
- avoid exposing raw query content, secrets, paths, env, provider metadata, or private memory content in timeout errors
- keep public MCP tools unchanged
- keep provider calls disabled by default in tests
- use fixtures/mocks rather than true real memory search

Suggested validation for CM-0560:

```powershell
node --check .\src\app.js
node --test .\tests\mcp-contract.test.js
node --test .\tests\phase-b-passive-recall.test.js
git diff --check
```

Do not implement CM-0560 in CM-0559.

## Result

```text
CM_0559_NEEDS_CM0560
RC_NOT_READY_BLOCKED
```

## Next Safe Action

Next safe action: prepare CM-0560 as a separate targeted runtime-fix plan before changing recall/search runtime. 中文解释：下一步只适合单独规划一个有限的 search timeout 运行时修复，不能在本阶段调用真实检索、读取真实记忆、写 durable audit/memory、切配置、push 或声明 ready。
