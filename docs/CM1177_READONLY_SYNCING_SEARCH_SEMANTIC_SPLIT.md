# CM-1177 Readonly/Syncing Search Semantic Split

Date: 2026-05-26

Status: `CM1177_READONLY_SYNCING_SEARCH_SEMANTIC_SPLIT_VALIDATED_NOT_READY`

## Summary

CM-1177 tightens the internal recall boundary between readonly search and syncing search.

The source change is deliberately narrow:

- `CandidateGenerator.generate(...)` now bypasses candidate cache reads as well as candidate cache writes when `readOnly=true`.
- Existing `readOnly` propagation still prevents `KnowledgeBaseRecallPipeline` from running `KnowledgeBaseSyncService.syncTarget(...)`.
- Existing readonly vector/rerank behavior continues to avoid external embedding/rerank providers and embedding-cache flushes.
- Existing app-level guards continue to skip recall audit and read-policy audit writes when readonly search is used.

This makes no-token HTTP `search_memory` stay on the readonly side of the split and keeps default authorized search on the existing syncing path.

## Validation

Passed:

```text
node --check src\recall\CandidateGenerator.js
node --check tests\mcp-http.test.js
node --test tests\mcp-http.test.js tests\phase-b-sync-cache-rerank.test.js
npm test
```

Targeted runtime tests passed `33/33`; full project tests passed `2786/2786`.

The strengthened HTTP no-token regression now fails if a no-token `search_memory` call attempts to:

- sync local stores
- read or update candidate cache metadata
- write candidate cache entries
- write recall audit
- write read-policy audit
- flush embedding cache
- call external embedding providers
- call external rerank providers

The phase-B sync/cache/rerank regression still proves default authorized syncing search can populate and hit candidate cache and record cached recall audit state.

## Boundary

This does not change public MCP tools or schemas.

This does not touch real memory stores, raw `.jsonl`, provider/API credentials, config, watchdog, startup, dependencies, migration/import/export/backup/restore, tag/release/deploy, or cutover.

This does not prove general recall quality, full no-token read closure, write reliability, recall reliability, runtime readiness, production readiness, or `RC_READY`.

## Remaining

- Broader no-token read closure still needs a dedicated CM-1178 review/test slice.
- SQLite schema migration/version startup gate remains open.
- Startup explicit rebuild/recovery policy remains open.
- Lifecycle remains timestamp/counter based, not a full transition log.
