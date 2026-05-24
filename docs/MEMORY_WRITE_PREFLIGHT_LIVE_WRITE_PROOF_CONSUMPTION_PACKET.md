# Memory Write Preflight Live Write Proof Consumption Packet

Status: `MEMORY_WRITE_PREFLIGHT_LIVE_WRITE_PROOF_CONSUMPTION_PACKET_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0895` bounded packet/review only; no execution approval is granted by this document

## Purpose

This document fixes one narrow question after `CM-0894`:

If a future separately exact-approved live write proof is ever chosen, what exact seam should consume it?

Answer:

- use the existing opt-in app seam introduced by `CM-0892`
- keep the stronger isolated temp-local evidence from `CM-0893` as the immediate model
- do not invent a parallel runtime path
- do not silently reinterpret the seam as default runtime behavior

This document is not an approval packet and does not execute a live write.

It does not authorize:

- true live `record_memory`
- true live `search_memory`
- provider/API calls
- broad real-memory scans
- direct `.jsonl` reads
- raw durable memory/audit reads
- public MCP expansion
- config/watchdog/startup changes
- readiness or reliability claims

## Current Seam To Be Consumed

The only future-aligned seam is:

```text
createCodexMemoryApplication()
-> config.enableWritePreflight = true
-> app.callTool('record_memory', ...)
```

Current repository reality already fixes these properties:

- `enableWritePreflight` exists and defaults to `false`
- `MemoryWriteService` can use an exact-scope `writePreflightCandidateProvider`
- the provider can route to `SqliteShadowStore.getWritePreflightCandidates(...)`
- the public MCP tool surface remains:
  - `memory_overview`
  - `record_memory`
  - `search_memory`
- no separate public `memory_validate`, `memory_tombstone`, or `memory_supersede` write lane is involved

Therefore any future exact-approved live proof should consume this exact seam instead of:

- a helper-only direct call
- a new private CLI-only mutation path
- a second duplicate-suppression runtime path
- a broad store scan plus ad hoc write flow
- a default-on config change

## Consumption Decision

The correct future live-proof interpretation is:

- current seam = internal-only operational seam
- future seam consumer = separately exact-approved live proof only
- current seam != default runtime behavior
- current seam != `memory write reliable`
- current seam != readiness-bearing write lane

## Future Exact-Approved Packet Requirements

Any future exact-approved live write proof packet that consumes this seam should explicitly bind all of the following:

### 1. Exact seam

It must name this exact path:

```text
createCodexMemoryApplication()
-> enableWritePreflight=true
-> callTool('record_memory', ...)
```

It must explicitly reject:

- parallel runtime paths
- direct helper invocation instead of app path
- public MCP widening
- default-on preflight activation

### 2. Exact baseline

It must bind:

- branch
- local `HEAD`
- `origin/main`
- remote `refs/heads/main`
- inspected worktree state

If source/test/runtime drift appears after packet review, execution must stop and rebind the baseline.

### 3. Exact proof mode

Because this seam is about duplicate/idempotence suppression, the future packet must name one exact proof basis before execution.

Allowed basis examples:

- one previously known exact-scope canary already named in approved evidence
- one operator-supplied exact duplicate candidate reference already known without broad scan
- one prebound candidate id / scope tuple / canonical hash basis already inspected outside the live-proof action itself

Forbidden:

- broad `search_memory`
- broad `listRecords(target)` scan
- ad hoc real-store exploration
- "write once and then write again" two-write proof shape

If the packet cannot name one exact duplicate basis up front, execution should stop as:

```text
BLOCKED_DUPLICATE_BASIS_REBIND_REQUIRED
```

### 4. Exact write count

It must preserve the current write-proof matrix boundary:

- exactly one `record_memory` call
- no second write
- no compensating write
- no repair write

### 5. Exact non-write boundaries

It must also preserve:

- no `search_memory`
- no marker search
- no provider/API call
- no raw memory output
- no direct `.jsonl` read
- no raw durable memory/audit read
- no migration/import/export/backup/restore apply
- no cleanup apply
- no rollback apply
- no config/watchdog/startup change
- no public MCP expansion
- no readiness or reliability claim

### 6. Exact output shape

Output must stay sanitized and must not dump raw memory content or broad store state.

At minimum, the packet should require:

- target baseline
- seam identifier
- write-preflight enabled flag
- whether duplicate suppression triggered
- whether durable projection happened
- bounded side-effect counters
- sanitized failure class or acceptance class
- explicit `readinessClaimed=false`

## Preferred Future Result Shape

If a future exact-approved live proof is later chosen, the result should stay close to this shape:

```json
{
  "unit": "WRITE_PREFLIGHT_LIVE_PROOF_001",
  "targetBaseline": "<full commit>",
  "seam": "createCodexMemoryApplication -> enableWritePreflight=true -> callTool(record_memory)",
  "duplicateBasisPrebound": true,
  "recordMemoryCallCount": 1,
  "searchMemoryCallCount": 0,
  "providerCallCount": 0,
  "duplicateSuppressed": "<true_or_false>",
  "durableProjectionCount": "<bounded_sanitized_count>",
  "durableAuditCount": "<bounded_sanitized_count>",
  "rawMemoryPrinted": false,
  "rawJsonlRead": false,
  "publicMcpExpanded": false,
  "readinessClaimed": false,
  "result": "<sanitized_not_ready_result>"
}
```

This is result-shape guidance only.

It is not approval and not execution authorization.

## Why This Packet Still Does Not Prove Memory Write Reliable

This packet only fixes how a future live proof would be consumed.

It does not prove:

- default-on preflight
- unattended runtime duplicate suppression
- broad current-real-store duplicate behavior
- long-run idempotence
- rollback/cleanup sufficiency
- lifecycle/governance closure
- `memory write reliable`

So the safe current interpretation remains:

- `memory write reliable = not claimed`
- `memory recall reliable = not claimed`
- `RC_NOT_READY_BLOCKED`

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_LIVE_WRITE_PROOF_CONSUMPTION_PACKET_COMPLETED_NOT_READY`.

`CM-0895` fixes the future consumption path without granting execution:

- future exact-approved live write proof should consume the existing opt-in app seam
- it should not invent a parallel runtime path
- it should not silently turn the seam into default runtime behavior
- it should remain one-write-only and fail-closed on missing exact duplicate basis

No execution approval, no live write, no public MCP expansion, and no readiness/reliability claim is made.

`RC_NOT_READY_BLOCKED` remains.
