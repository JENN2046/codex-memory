# CM-1438 Authenticated MCP Preflight Envelope Clarification

Status: `SOURCE_OF_TRUTH_CLARIFICATION_PREPARED_NOT_EXECUTED`

Task: `CM-1438 auth preflight envelope clarification`

Validation: `CMV-1548`

Prepared: `2026-06-04`

## Purpose

Clarify how future authenticated HTTP MCP live gates should word bearer-token authorization for preflight session setup.

CM-1438 is docs/source-of-truth clarification only. It does not execute `search_memory`, `record_memory`, `memory_overview`, bearer-token use, provider/API calls, runtime refresh, real memory read/write, raw SQLite/jsonl/vector/cache/audit scan, memoryId lookup, raw response printing or persistence, durable memory/audit write, config/watchdog/startup modification, public MCP expansion, remote action, readiness claim, or `RC_READY` claim.

## CM-1437 Classification

CM-1437 executed one follow-up bounded `search_memory` call and stopped without retry.

Sanitized search shape evidence:

- public tools unchanged: `memory_overview`, `record_memory`, `search_memory`
- `search_memory` calls: `1`
- query exact: `Checkpoint: CM-1432 scoped write proof marker`
- `target=process`
- `limit=1`
- `include_content=false`
- `access.mode=authenticated_bounded_search`
- `resultCount=1`
- `resultsLength=1`
- forbidden key paths: `0`
- `rawContentReturned=false`
- `pathsReturned=false`
- `memoryIdsReturned=false`
- `titlesReturned=false`
- `snippetsReturned=false`
- bounded result keys only: `baseScore`, `contentHitCount`, `dynamicCoreWeight`, `evidenceHitCount`, `exactCoreTagCount`, `rerankScore`, `score`, `sourceKinds`, `tagHitCount`, `tagMemoSurfaceScore`, `target`, `titleHitCount`

Boundary classification:

```text
SEARCH_SHAPE_PASSED_BUT_BOUNDARY_DEVIATED
```

Reason:

- CM-1437 approval wording allowed bearer token use only for the one authenticated public HTTP MCP `search_memory` call.
- Execution also used bearer token for authenticated MCP `initialize` session setup before that single search call.
- No second `search_memory` call was executed.
- No `record_memory`, `memory_overview`, provider/API call, real memory write, raw store scan, memoryId lookup, raw response printing/persistence, durable memory/audit write, public MCP expansion, release/deploy/tag, readiness claim, or `RC_READY` claim occurred.

The CM-1437 shape evidence may be cited only as sanitized positive shape evidence with boundary deviation. It must not be cited as a fully accepted CM-1437 gate pass unless a later operator decision explicitly accepts the preflight-envelope deviation.

## Clarified Future Authenticated MCP Envelope

Future authenticated HTTP MCP live gates may authorize bearer token use for all of the following, only when the exact approval line says so:

- authenticated MCP `initialize` for session setup
- authenticated MCP `tools/list` if required to confirm public tools unchanged
- exactly approved `tools/call` action

This clarification does not authorize any live action by itself. It only defines approval wording for future gates.

## Required Future Approval Wording

Future authenticated MCP live approvals should explicitly include a line equivalent to:

```text
Bearer token use is allowed only for authenticated MCP initialize/session setup, authenticated MCP tools/list if required to confirm public tools unchanged, and the exactly approved tools/call action; token material must not be printed, persisted, copied into docs, or edited.
```

Future packets should avoid the ambiguous wording:

```text
use bearer token only for this one authorized authenticated public HTTP MCP <tool> call
```

unless the intended execution truly uses no authenticated `initialize`, no authenticated session header setup, and no authenticated `tools/list`.

## Still Forbidden

This clarification does not weaken hard-stop boundaries. Future authenticated MCP live gates still forbid unless separately and exactly approved:

- extra `tools/call`
- extra `search_memory`
- retry with a different query
- query discovery by raw store scan, broad search, memory dump, audit dump, SQLite/jsonl/vector/cache inspection, or memoryId lookup
- `include_content=true`
- raw response body printing
- raw response persistence
- raw content, path, title, snippet, source file, memory id, `.jsonl`, `.sqlite`, token, provider endpoint, or raw store metadata exposure
- `record_memory` unless the exact approved tool is `record_memory`
- `memory_overview` unless explicitly approved as the exact tool or as a preflight observation
- provider/API calls
- real memory write unless the exact approved action is a bounded write
- raw SQLite/jsonl/vector/cache/audit scan
- durable memory/audit write unless the exact approved action is a bounded write
- config/watchdog/startup modification
- public MCP expansion
- push, PR, release, deploy, tag
- readiness, reliability, cutover, or `RC_READY` claim

## CM-1438 Side-Effect Counters

- `search_memory`: `0`
- `record_memory`: `0`
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
