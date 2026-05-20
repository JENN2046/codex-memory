# CM-0560 Search Memory Timeout Targeted Fix Plan

Status: CM_0560_PLAN_READY_FOR_COMMIT
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This is the docs-only targeted fix plan for the observed `search_memory` timeout blocker.

It does not modify runtime code, execute `search_memory`, read `.jsonl` audit files, read real memory content, scan real memory stores, call providers, write durable memory or audit state, change packages, push, tag, release, deploy, or claim readiness.

The current controlling state remains:

```text
RC_NOT_READY_BLOCKED
memory write reliable: not claimed
memory recall reliable: not claimed
runtime ready: not claimed
RC ready: not claimed
production ready: not claimed
```

## Source Context

CM-0559 identified the timeout as independent from the no-token `record_memory` JSON-RPC rejection bug.

CM-0560 already has a recorded app-level timeout boundary in `docs/CM-0560_SEARCH_MEMORY_TIMEOUT_BOUNDARY.md`.

CM-0561, CM-0563, and CM-0564 later added cooperative abort and fixture-only side-effect evidence.

This plan records the targeted implementation shape that should remain controlling for any future narrow timeout repair or review. It must not be expanded into broad recall rewrites or real memory scanning.

## Timeout Suspicion Ranking

Ranked from most likely first-control point to deeper slow-path contributors:

1. App tool dispatch around `search_memory`
   - First boundary because it controls client-visible JSON-RPC behavior.
   - A timeout here can return a sanitized tool error even when deeper recall work is slow.
2. Recall pipeline await chain
   - Candidate generation, filtering, aggregation, optional rerank, and audit recording are sequential enough that one slow stage can stall the full response.
3. `CandidateGenerator` and `shadowStore.listChunks`
   - Broad chunk listing or insufficient narrowing can be expensive before scoring begins.
4. Vector embedding/query path
   - Query embedding cache miss, local vector scoring, or accidental provider fallback can add latency.
5. Candidate cache read/write path
   - Cache read, cache miss, serialization, pruning, or `set` can add latency and write-like side effects.
6. Optional rerank
   - Local rerank can be CPU-bound; external rerank must remain provider-gated and is not part of this plan.
7. Recall audit / read-policy summary append
   - Audit append is write-like and must not continue after an already-timed-out synthetic path.

## First Fix Shape

The first targeted fix should prefer:

- a bounded app-level timeout wrapper for `search_memory`
- a sanitized JSON-RPC error envelope for timeout
- cooperative `AbortSignal` propagation into recall/candidate boundaries where already in the call path
- fixture-only side-effect guards proving aborted synthetic paths do not write candidate cache or recall audit

The first targeted fix should not start with broad instrumentation.

Instrumentation, if added later, must be:

- sanitized
- fixture-based or explicit-input only
- local
- non-durable by default
- unable to expose raw query text, private memory content, paths, env, tokens, provider metadata, or audit payloads

## Fixture-Based Targeted Tests

Fixture-based targeted tests are required before any implementation is accepted.

Required test shape:

- mock or fixture `search_memory` slow path; do not call true `search_memory`
- verify timeout returns a JSON-RPC compatible error envelope
- verify request id is preserved
- verify raw query/private content is not serialized into timeout response
- verify public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- verify no provider call is needed
- verify synthetic post-timeout candidate cache write is skipped when that path is in scope
- verify synthetic post-timeout recall audit append is skipped when that path is in scope

Targeted validation candidates:

```powershell
node --check .\src\app.js
node --check .\src\core\SearchMemoryTimeoutPolicy.js
node --check .\src\recall\KnowledgeBaseRecallPipeline.js
node --check .\src\recall\CandidateGenerator.js
node --check .\tests\mcp-contract.test.js
node --check .\tests\phase-b-passive-recall.test.js
node --check .\tests\recall-isolation-classification-runtime.test.js
node --test .\tests\mcp-contract.test.js
node --test .\tests\phase-b-passive-recall.test.js
node --test .\tests\recall-isolation-classification-runtime.test.js
git diff --check
```

Run only the commands relevant to the actual files changed.

## Allowed Implementation Files

If implementation is separately authorized, keep it limited to this small surface:

```text
src/app.js
src/core/SearchMemoryTimeoutPolicy.js
src/config/createConfig.js
src/adapters/codex-mcp/server.js
src/recall/KnowledgeBaseRecallPipeline.js
src/recall/CandidateGenerator.js
tests/mcp-contract.test.js
tests/phase-b-passive-recall.test.js
tests/recall-isolation-classification-runtime.test.js
```

The preferred next runtime scope is `recall/app/test` only.

Do not touch unrelated storage, provider, package, config, watchdog, startup, migration, import/export, backup/restore, public MCP schema, or release files under this plan.

## Forbidden Actions

This plan does not authorize:

- true `search_memory` call
- true `record_memory` call
- `.jsonl` read
- real memory content read
- broad real memory scan
- provider/model call
- durable memory write
- durable audit write
- package manifest or lockfile change
- config switch
- watchdog/startup change
- migration/import/export/backup/restore apply
- public MCP expansion
- push, tag, release, deploy, or cutover
- memory write reliability claim
- memory recall reliability claim
- runtime, RC, production, or cutover readiness claim

## Scope Decision

The implementation scope is clear only if the next patch remains limited to:

```text
app-level timeout / cooperative recall guard / fixture-only tests
```

If a future fix requires reading real memory content, scanning runtime stores, inspecting `.jsonl`, running provider-backed recall, changing storage schema, changing package files, expanding public MCP, or starting a service, stop with:

```text
CM_0560_BLOCKED_SCOPE_UNCLEAR
```

## Next Safe Action

Next safe action: content-review this plan, then stage and commit only the docs/board plan files if validation passes.

中文解释：下一步只适合审查并提交这个小范围修复计划；不能把计划升级成真实检索、真实记忆读取、durable audit 写入、provider 调用或 readiness 声明。

## Result

```text
CM_0560_PLAN_READY_FOR_COMMIT
RC_NOT_READY_BLOCKED
```
