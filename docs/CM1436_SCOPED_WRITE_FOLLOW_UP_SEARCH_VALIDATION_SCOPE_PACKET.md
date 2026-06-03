# CM-1436 Scoped Write Follow-Up Search Validation Scope Packet

Status: `SCOPE_PACKET_PREPARED_NOT_EXECUTED`

Task: `CM-1436 scoped write follow-up search validation scope packet`

Future gate: `CM-1437 scoped write follow-up search validation`

Validation: `CMV-1547`

Prepared: `2026-06-04`

## Purpose

Prepare the exact boundary for a future follow-up bounded `search_memory` validation of the already accepted CM-1432 corrected scoped `record_memory` write proof.

CM-1436 is docs-only. It does not execute live `search_memory`, `record_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw SQLite/jsonl/vector/cache/audit scan, memoryId lookup, raw response printing or persistence, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.

The future CM-1437 gate is not a recall quality, ranking quality, broad write reliability, broad search reliability, client acceptance, readiness, or `RC_READY` proof. It only checks whether the CM-1432 accepted write can be found through bounded authenticated public HTTP MCP `search_memory` while returning only sanitized shape evidence.

## Baseline

This packet is prepared after the CM-1435 docs-only evidence closeout commit:

```text
main == origin/main == a9b41de
```

Future CM-1437 must use a fresh clean synced commit after this CM-1436 packet is committed and pushed. Runtime refresh to that exact future commit is required before any live search call.

## Query Selection Rule

Future CM-1437 query:

```text
Checkpoint: CM-1432 scoped write proof marker
```

This query is an exact governance-safe phrase already committed in `docs/CM1434_CORRECTED_SCOPED_RECORD_MEMORY_WRITE_PROOF_PACKET.md`. It is not discovered by raw store scan, broad search, memory dump, audit dump, SQLite inspection, jsonl inspection, vector inspection, cache inspection, memoryId lookup, private memory content, or raw response inspection.

The query must be exact-approved by the operator in the future CM-1437 approval. If the operator does not approve this exact query, do not execute CM-1437 from this packet.

## Future Search Shape

Future CM-1437 may execute only:

- calls: exactly `1`
- tool: authenticated public HTTP MCP `search_memory`
- endpoint: `http://127.0.0.1:7605/mcp/codex-memory`
- query: `Checkpoint: CM-1432 scoped write proof marker`
- target: `process`
- limit: `1`
- include_content: `false`

Future allowed inspection is limited to:

- sanitized key paths
- result count / results length
- access flags
- bounded score/count/target/sourceKinds-style non-identifying fields

Future output must not reveal the matched memory id, title, content, snippet, source file, file path, raw text, raw response body, or raw store metadata.

## Expected Sanitized Shape

Future CM-1437 can only pass if the sanitized receipt proves:

```text
resultCount >= 1
resultsLength >= 1
access.mode = authenticated_bounded_search
forbidden_key_paths = 0
rawContentReturned = false
pathsReturned = false
memoryIdsReturned = false
titlesReturned = false
snippetsReturned = false
```

If `resultCount=0`, the gate is inconclusive or failed positive evidence. Stop without retry, query change, broad search, or raw store lookup.

## Forbidden Key Paths

Any future response exposure of these key paths or equivalent values must fail closed:

```text
content
text
snippet
raw_text
filePath
sourceFile
sourceFiles
memoryId
memoryIds
topMemoryId
topSourceFile
title
path
.jsonl
.sqlite
```

MCP wrapper `content[].text` may exist as transport wrapper text, but the future evidence collector must not inspect or print wrapper text as raw memory content. Acceptance must be based on structured sanitized shape, key paths, counts, and access flags only.

## Future Preconditions

Before CM-1437 can execute, verify:

- `main == origin/main == <CM-1436 commit>`
- worktree clean
- runtime refreshed to `<CM-1436 commit>`
- runtime freshness accepted
- public tools unchanged: `memory_overview`, `record_memory`, `search_memory`
- exact approval names this packet and exact query
- bearer token may be used only for the single approved authenticated public HTTP MCP `search_memory` call and must not be printed, stored, copied into docs, or edited

## Future Forbidden Actions

CM-1437 must fail closed before execution if any boundary is ambiguous.

Forbidden:

- `record_memory`
- second or additional `search_memory` call
- query change
- retry with a different query
- broad search
- `memory_overview`
- `include_content=true`
- raw response body printing
- raw response persistence
- memoryId lookup
- raw SQLite/jsonl/vector/cache/audit scan
- real memory write
- provider/API call
- public MCP expansion
- config/watchdog/startup modification
- push, PR, release, deploy, tag
- readiness, reliability, cutover, or `RC_READY` claim

## Future Exact Approval Template

Use this exact approval template only after this CM-1436 packet is committed and pushed, and after fresh Git/runtime facts are available.

```text
I authorize CM-1437 scoped write follow-up bounded search_memory validation only.

Target repo: A:\codex-memory
Required target: main == origin/main == <CM-1436_COMMIT_FULL_HASH>

Runtime prerequisite must be satisfied before the live call:
- runtime refreshed to <CM-1436_COMMIT_FULL_HASH>
- runtime freshness accepted
- worktree clean
- public tools unchanged: memory_overview, record_memory, search_memory

Allowed actions:
- use bearer token only for this one authorized authenticated public HTTP MCP search_memory call
- execute exactly one search_memory call:
  - query=Checkpoint: CM-1432 scoped write proof marker
  - target=process
  - limit=1
  - include_content=false
- inspect only sanitized key paths, counts, access flags, and bounded non-identifying score/count/target/sourceKinds-style fields
- expected resultCount >= 1
- expected access.mode=authenticated_bounded_search
- expected forbidden key paths = 0
- expected rawContentReturned=false
- expected pathsReturned=false
- expected memoryIdsReturned=false
- expected titlesReturned=false
- expected snippetsReturned=false
- output a sanitized evidence receipt only

Forbidden actions:
- record_memory
- any second search_memory call
- changing the query
- retrying with a different query if resultCount=0
- include_content=true
- memory_overview
- provider/API calls
- raw SQLite/jsonl/vector/cache/audit scan
- memoryId lookup
- raw response printing or persistence
- real memory write
- broad search
- config/watchdog/startup modification
- public MCP expansion
- push/release/deploy/tag
- readiness or RC_READY claim

Fail-closed rules:
- if runtime freshness is stale, stop before search
- if worktree is dirty, stop before search
- if public tools changed, stop before search
- if resultCount=0, stop as inconclusive / failed positive evidence; do not retry
- if any forbidden key path appears, stop fail-closed
- if raw content, path, memory id, title, snippet, source file, file path, .jsonl, .sqlite, token, provider endpoint, or raw store metadata appears, stop fail-closed
- if any boundary is ambiguous, stop and report without printing raw values
```

## CM-1436 Side-Effect Counters

- `record_memory`: `0`
- `search_memory`: `0`
- `memory_overview`: `0`
- bearer-token use: `0`
- provider/API calls: `0`
- real memory reads: `0`
- real memory writes: `0`
- raw store scans: `0`
- memoryId lookups: `0`
- raw response prints/persistence: `0`
- durable memory/audit writes: `0`
- runtime refresh/start/stop: `0`
- config/watchdog/startup changes: `0`
- public MCP expansion: `0`
- remote actions: `0`
- readiness / `RC_READY` claims: `0`

CM-1436 only prepares the future scope packet.
