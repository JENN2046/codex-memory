# CM-1427 Bounded Positive Search Memory Shape Scope Packet

Status: `SCOPE_PACKET_PREPARED_NOT_EXECUTED`

Task: `CM-1427`

Target execution thread: `CM-1428 bounded positive search_memory shape gate`

Validation: `CMV-1540`

Date: 2026-06-03

## Purpose

Prepare the exact scope for a later bounded positive `search_memory` shape gate.

This packet is docs/board-only. It does not execute `search_memory`, `record_memory`, `memory_overview`, MCP `tools/call`, provider/API calls, runtime start/stop, bearer-token use, raw memory/audit/store reads, durable writes, config/watchdog/startup changes, public MCP expansion, remote actions, or readiness/reliability claims.

The future gate does not prove recall quality, broad reliability, or client readiness. It only proves that a non-empty bounded authenticated `search_memory` result can be returned without exposing identifying, path, title, snippet, memory id, or raw-content fields.

## Baseline

The packet was prepared from fresh Git facts:

```text
main == origin/main == 1b840e5
```

Any future live execution must use a fresh clean synced commit after this packet is committed and pushed. Runtime refresh is required before the future live call.

## Future Target Shape

Transport:

```text
HTTP MCP over loopback
```

Endpoint:

```text
http://127.0.0.1:7605/mcp/codex-memory
```

Future execution is limited to exactly one authenticated public HTTP MCP `tools/call search_memory` call:

```json
{
  "query": "Phase H bounded search_memory negative-control evidence",
  "target": "both",
  "limit": 1,
  "include_content": false
}
```

The query is an already public/governance-safe status phrase from repository docs/status surfaces. It was not discovered by raw store scan, broad search, memory dump, audit dump, SQLite inspection, jsonl inspection, vector inspection, cache inspection, or private memory content.

If the operator does not exact-approve this query as sufficiently safe and appropriate for a positive shape gate, do not execute CM-1428. Use a temp/live-like positive fixture gate or prepare a replacement scope packet instead.

## Expected Positive Shape

Future execution can only be accepted as bounded positive shape evidence if the sanitized receipt proves:

```text
resultCount >= 1
resultsLength >= 1
forbidden_key_paths = 0
rawContentReturned=false
pathsReturned=false
memoryIdsReturned=false
titlesReturned=false
snippetsReturned=false
```

Allowed output is bounded projection only: sanitized key paths, counts, access flags, and bounded score/count/target/sourceKinds-style non-identifying fields.

It must not reveal who/what was matched, where it came from, or any raw/source text.

## Forbidden Key Paths

Any of the following key paths or values in future result items must fail closed:

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

MCP wrapper `content[].text` may be present as transport wrapper text, but the future collector must not inspect or print it as raw memory content. The acceptance decision must be based on `structuredContent` shape and sanitized key-path/count flags only.

## Exact Approval Template

The following line is a template only. It is not approval until the operator sends a fresh exact line after this packet is committed and synced, with the placeholder replaced by the fresh observed commit.

```text
I approve CM-1428 bounded positive search_memory shape gate for codex-memory on branch main at commit <FRESH_CLEAN_SYNCED_HEAD_AFTER_PACKET_COMMIT>, endpoint http://127.0.0.1:7605/mcp/codex-memory, using only the current-session already-present bearer token without printing, reading aloud, storing, or editing token material; allowed actions are runtime refresh/freshness preflight, authenticated MCP initialize if required, authenticated tools/list if required to confirm public tools unchanged, and exactly one readonly search_memory call with query `Phase H bounded search_memory negative-control evidence`, target=both, limit=1, include_content=false, sanitized output only, expected resultCount>=1 and forbidden_key_paths=0 with rawContentReturned=false, pathsReturned=false, memoryIdsReturned=false, titlesReturned=false, snippetsReturned=false; forbidden actions are include_content=true, record_memory, memory_overview expansion beyond tools/list preflight, additional search_memory calls, broad query discovery, provider calls, raw memory/jsonl/sqlite/vector/cache/audit output or scan, raw response body printing or persistence, durable write, config/watchdog/startup change, public MCP expansion, push, PR, release, deploy, cutover, readiness claim, RC_READY claim, reliability claim, and any unlisted action.
```

## Future Execution Preconditions

Before any future execution, verify:

- worktree clean
- branch is `main`
- local `main` equals `origin/main`
- target commit matches the exact approval line
- endpoint matches this packet
- runtime refreshed to the target commit
- runtime freshness accepted
- bearer token already exists in the current session if authenticated MCP calls are required
- token value is not printed, copied into docs, persisted, or edited
- public tools are exactly `memory_overview`, `record_memory`, and `search_memory`
- query exactly matches this packet and the operator approval line

## Query Selection Rules

- query must be exact-approved by the operator
- query must be written in the packet and in the future approval line
- query must not be discovered by raw store scan, broad search, memory dump, audit dump, jsonl/sqlite/vector/cache inspection, or private memory content
- query must not contain private memory content
- query must come from an already public/governance-safe phrase, already recorded sanitized evidence phrase, or another exact-approved phrase committed in a replacement packet

## Side-Effect Budget

Future execution must stay within:

```text
runtime_refresh_or_freshness_preflight <= 1
mcp_initialize_calls <= 1_if_required
mcp_tools_list_calls <= 1_if_required
search_memory_calls = 1
memory_overview_calls = 0
record_memory_calls = 0
provider_calls = 0
durable_memory_writes = 0
durable_audit_writes = 0
raw_store_scans = 0
raw_jsonl_reads = 0
raw_sqlite_reads = 0
raw_vector_reads = 0
raw_cache_reads = 0
raw_audit_reads = 0
config_watchdog_startup_changes = 0
public_mcp_expansions = 0
remote_actions = 0
readiness_claims = 0
reliability_claims = 0
```

## Acceptance Criteria

Future execution can only be accepted as bounded positive shape evidence if:

- exactly one authorized `search_memory` call is executed
- `target=both`, `limit=1`, and `include_content=false` are preserved
- `resultCount >= 1`
- forbidden key paths are `0`
- `rawContentReturned=false`
- `pathsReturned=false`
- `memoryIdsReturned=false`
- `titlesReturned=false`
- `snippetsReturned=false`
- side-effect counters stay within budget
- public MCP tools remain frozen
- project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

If the result count is `0`, the gate does not prove positive shape. Record it as inconclusive or failed positive evidence and stop without retry or query discovery.

## What This Does Not Prove

Even if a future run passes, it does not prove:

- broad `search_memory` quality
- recall ranking quality
- client-scope recall reliability
- write reliability
- provider readiness
- live client acceptance
- release readiness
- cutover readiness
- `RC_READY`

## Rollback

This packet has no runtime rollback because it does not execute anything.

Rollback for this docs-only task is reverting the docs/board commit.

If a future approved execution is read-only and fails, rollback is recording the failure and stopping.
