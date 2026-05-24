# Memory Write Preflight CM-0737 Candidate Rebind Packet

Status: `MEMORY_WRITE_PREFLIGHT_CM0737_CANDIDATE_REBIND_PACKET_COMPLETED_NOT_READY`

Date: `2026-05-24`

Scope: `CM-0897` bounded source/doc packet only; no execution approval, no live write

## Purpose

`CM-0895` fixed which seam a future separately exact-approved live write proof must consume.

`CM-0896` fixed what can count as an acceptable duplicate-basis family.

This packet fixes the next narrower question:

If a future packet explicitly chooses the current strongest candidate family, `CM-0737`, what exact fields must be rebound before execution, and what must fail closed if it cannot be rebound?

## Reviewed Inputs

- `docs/MEMORY_WRITE_PREFLIGHT_LIVE_WRITE_PROOF_CONSUMPTION_PACKET.md`
- `docs/MEMORY_WRITE_PREFLIGHT_DUPLICATE_BASIS_BINDING_REVIEW.md`
- `docs/MEMORY_WRITE_PROOF_SURFACE_PLAN.md`
- `docs/MEMORY_WRITE_EVIDENCE_REVIEW.md`
- `docs/MEMORY_WRITE_RELIABILITY_BOUNDED_REVIEW.md`
- `STATUS.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`

## Decision

`CM-0737` may remain the strongest current candidate family for any future separately exact-approved live write proof.

But if that future packet chooses `CM-0737`, it must not inherit `CM-0737` as-is.

It must rebind one exact basis packet before execution.

## Exact Known Fields

Current repository evidence already fixes these exact known fields:

- basis family: `CM-0737`
- write path class: separately exact-approved bounded `record_memory`
- accepted basis event type: repaired accepted second attempt
- accepted `memoryId`: `codex-process-1ef539a197d747e199e12fe1c0d69731`
- target family: `process`
- payload family marker: repaired checkpoint-shaped process payload family
- authorization shape: separately exact-approved only, not standing authorization
- write-count boundary: the future proof must still remain exactly one `record_memory` call

These known fields are useful only as a candidate family anchor.

They are not sufficient by themselves to authorize execution.

## Required Rebind Fields

If a future separately exact-approved live write proof chooses `CM-0737`, that future packet must explicitly rebind all of the following before execution:

### 1. Fresh baseline

- current local `HEAD`
- current tracking `origin/main`
- current remote `refs/heads/main`
- statement that these baselines were checked immediately before execution

If fresh baseline equality is not rechecked, fail closed.

### 2. Exact basis identity

- explicit statement that the chosen basis family is `CM-0737`
- explicit statement that the chosen accepted basis event is the repaired accepted second attempt
- explicit statement that the chosen bounded basis `memoryId` is `codex-process-1ef539a197d747e199e12fe1c0d69731`

If the exact accepted basis event is not named, fail closed.

### 3. Exact target and seam

- exact target: `process`
- exact consumption seam:
  - `createCodexMemoryApplication()`
  - `enableWritePreflight=true`
  - `app.callTool('record_memory', ...)`

If the packet tries to use another path, fail closed.

### 4. Exact payload family

- explicit statement that the future payload must stay inside the repaired checkpoint-shaped process payload family
- explicit statement that the future payload is the one-time proof payload being executed now, not a broad replay of historical text
- explicit statement that the future payload must still satisfy the same process-memory validation class that rejected the first malformed `CM-0737` attempt

If the payload family is widened beyond the repaired checkpoint-shaped process lane, fail closed.

### 5. Exact scope assumptions

The future packet must explicitly name its scope assumptions rather than borrow them implicitly from history.

At minimum this means:

- exact target scope lane being used for the future proof
- exact current app/runtime scope derivation source
- explicit statement that no broad scan or exploratory lookup will be used to discover scope

If the future packet cannot name its current scope assumptions, fail closed.

### 6. Exact duplicate basis interpretation

The future packet must explicitly state what “duplicate” means for this run.

At minimum:

- duplicate basis is anchored to the chosen `CM-0737` family
- duplicate suppression is being tested only against that exact prebound basis
- no broad target scan
- no `search_memory`
- no ad hoc real-store exploration
- no first-write-then-second-write manufacture

If duplicate interpretation is not exact and prebound, fail closed.

### 7. Exact one-write-only boundary

The future packet must restate:

- exactly one `record_memory` call
- zero `search_memory` calls
- zero provider/API calls
- zero direct `.jsonl` reads
- zero raw durable memory/audit reads
- zero second write

If the one-write-only boundary is softened or omitted, fail closed.

## Explicitly Unknown Or Non-Inherited Fields

The following must not be treated as already inherited just because `CM-0737` exists:

- current branch baseline
- current synced-main status
- current exact scope tuple
- current exact operator approval line
- current exact canary payload instance
- current exact duplicate interpretation
- current exact side-effect counters

Any future packet that silently inherits these from `CM-0737` is malformed.

## Minimal Rebind Packet Shape

If a future separately exact-approved live write proof chooses `CM-0737`, its approval packet should minimally bind:

```text
basisFamily=CM-0737
acceptedBasisEvent=repaired_second_attempt
acceptedBasisMemoryId=codex-process-1ef539a197d747e199e12fe1c0d69731
target=process
seam=createCodexMemoryApplication()->callTool('record_memory') with enableWritePreflight=true
payloadFamily=repaired_checkpoint_shaped_process_payload
baselineHead=<fresh local HEAD>
baselineOriginMain=<fresh origin/main>
baselineRemoteMain=<fresh refs/heads/main>
duplicateInterpretation=exact_prebound_against_cm0737_basis_only
oneWriteOnly=true
searchMemoryCalls=0
secondWriteAllowed=false
```

This packet shape is guidance only.

It is not execution approval.

## What This Still Does Not Approve

This packet does not approve:

- true live `record_memory`
- automatic reuse of `CM-0737`
- default-on write preflight
- broad duplicate discovery
- `search_memory`
- two-write proof shape
- `memory write reliable`
- `RC_READY`

## Next Safe Direction

After `CM-0897`, the next safe step is no longer to clarify seam, basis family, or rebind fields.

The seam should now simply remain internal-only until a future separately exact-approved live write proof deliberately:

- chooses one exact basis family
- rebinds all required fields
- and either executes once or stays blocked

## Closeout

Result: `MEMORY_WRITE_PREFLIGHT_CM0737_CANDIDATE_REBIND_PACKET_COMPLETED_NOT_READY`.

`CM-0897` fixes the last obvious ambiguity after `CM-0896`:

- `CM-0737` may remain the strongest current candidate family
- but future execution cannot inherit it implicitly
- it must rebind exact basis identity, baseline, target, seam, payload family, scope assumptions, duplicate interpretation, and one-write-only boundaries

No execution approval, no live write, no public MCP expansion, and no readiness/reliability claim is made.

`RC_NOT_READY_BLOCKED` remains.
