# CM-1419 Phase H Search Memory Negative-Control Scope Packet

Status: `SCOPE_PACKET_PREPARED_NOT_EXECUTED`

Task: `CM-1421`

Target execution thread: `CM-1419 Phase H search_memory negative-control`

Validation: `CMV-1535`

Date: 2026-06-03

## Purpose

Prepare the exact scope for a later Phase H live `search_memory` negative-control run.

This packet is docs/board-only. It does not execute `search_memory`, `record_memory`, MCP `tools/call`, provider/API calls, runtime start/stop, bearer-token use, raw memory/audit/store reads, durable writes, config/watchdog/startup changes, public MCP expansion, remote actions, or readiness/reliability claims.

## Current Preflight Basis

A read-only current-facts preflight was run before preparing this packet:

```powershell
node .\src\cli\recall-proof-current-facts-preflight.js --json --pretty
```

Observed result:

```text
decision=RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED
basisId=CM-0814
cleanSyncedMainHead=true
exactQueryFamilyBound=true
internalProofSeamBound=true
boundaryFlagsBound=true
executionStarted=false
liveProofStarted=false
```

The preflight used read-only Git commands only. It did not execute `search_memory`.

## Target Shape

Transport:

```text
HTTP MCP over loopback
```

Endpoint:

```text
http://127.0.0.1:7605/mcp/codex-memory
```

Health URL:

```text
http://127.0.0.1:7605/health
```

Public MCP tools must remain exactly:

```text
memory_overview
record_memory
search_memory
```

## Exact Query Envelope

The future run is limited to exactly two public HTTP MCP `tools/call search_memory` calls.

Both calls must use:

```json
{
  "target": "both",
  "limit": 1,
  "include_content": false
}
```

The only allowed query slots are the first two slots from the accepted `CM-0814` stricter negative-control family:

| Slot | Query | Expected Result Count |
|---|---|---:|
| NC1 | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| NC2 | `nareth-48291-pluvox-darnel-kiv` | 0 |

No other query text, query discovery, broad store scan, raw memory inspection, or exploratory retry is allowed.

## Exact Approval Template

The following line is a template only. It is not approval until the operator sends a fresh exact line after this packet is committed and synced, with the placeholder replaced by the fresh observed commit.

```text
I approve CM-1419 Phase H search_memory negative-control for codex-memory on branch main at commit <FRESH_CLEAN_SYNCED_HEAD_AFTER_PACKET_COMMIT>, endpoint http://127.0.0.1:7605/mcp/codex-memory, using only the current-session already-present bearer token without printing, reading aloud, storing, or editing token material; allowed actions are runtime freshness read-only preflight, authenticated MCP initialize, authenticated tools/list, and exactly two readonly search_memory calls for NC1 `xqzv-9137-lomdra-kepv-azmuth` and NC2 `nareth-48291-pluvox-darnel-kiv` with target=both, limit=1, include_content=false, sanitized output only, expected resultCount=0 for each; forbidden actions are record_memory, memory_overview, additional search_memory calls, provider calls, raw memory/jsonl/audit/vector/candidate-cache output, broad store scan, durable write, config/watchdog/startup change, public MCP expansion, push, PR, release, deploy, cutover, readiness claim, RC_READY claim, reliability claim, and any unlisted action.
```

## Future Execution Preconditions

Before any future execution, verify:

- worktree clean
- branch is `main`
- local `main` equals `origin/main`
- target commit matches the exact approval line
- endpoint matches this packet
- runtime freshness read-only preflight passes
- bearer token already exists in the current session if authenticated MCP calls are required
- token value is not printed, copied into docs, persisted, or edited
- public tools are exactly `memory_overview`, `record_memory`, and `search_memory`

## Side-Effect Budget

Future execution must stay within:

```text
runtime_freshness_preflight <= 1
mcp_initialize_calls <= 1
mcp_tools_list_calls <= 1
search_memory_calls = 2
memory_overview_calls = 0
record_memory_calls = 0
provider_calls = 0
durable_memory_writes = 0
durable_audit_writes = 0
raw_store_scans = 0
raw_jsonl_reads = 0
raw_audit_reads = 0
config_watchdog_startup_changes = 0
public_mcp_expansions = 0
remote_actions = 0
readiness_claims = 0
reliability_claims = 0
```

## Acceptance Criteria

Future execution can only be accepted as bounded negative-control evidence if:

- both NC1 and NC2 return sanitized result count `0`
- `include_content=false` is preserved
- no raw content, raw snippets, raw paths, raw `.jsonl`, raw audit, vector payload, candidate-cache payload, provider endpoint, or token material appears in output
- side-effect counters stay within budget
- public MCP tools remain frozen
- project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

If either query returns a nonzero count, the result is still useful evidence but must be recorded as fail-closed bounded negative-control evidence, not as readiness.

## What This Does Not Prove

Even if a future run passes, it does not prove:

- broad `search_memory` reliability
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
