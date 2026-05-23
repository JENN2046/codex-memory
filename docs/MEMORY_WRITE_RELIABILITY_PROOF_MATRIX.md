# Memory Write Reliability Proof Matrix

Status: `MEMORY_WRITE_RELIABILITY_PROOF_MATRIX_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0832`
Decision: `RC_NOT_READY_BLOCKED`
Scope: proof matrix only; no `record_memory` execution

## Purpose

Define the evidence matrix required before `memory write reliable` can be reviewed as more than exact-approval-only bounded evidence.

This matrix does not execute true live `record_memory`, true live `search_memory`, provider/API calls, real memory scans, raw durable memory/audit reads, direct `.jsonl` reads, durable memory/audit writes, migration/import/export/backup/restore apply, public MCP expansion, package/config/watchdog/startup changes, release/cutover, or readiness transitions.

## Current Evidence

Current accepted evidence:

- `CM-0558`: no-token JSON-RPC mutation rejection is bounded boundary evidence only.
- `CM-0737`: one separately exact-approved rejected `record_memory` attempt.
- `CM-0737`: one separately exact-approved accepted repaired `record_memory` attempt with `memory_writes=1`.
- `CM-0763`: exact-approved write evidence review confirms no implicit write authorization remains.
- `CM-0785`: bounded write reliability review keeps `memory write reliable = exact approval required`.
- `CM-0786`: future exactly-one bounded write proof surface is planned, but not executed.

Current missing evidence:

- default unattended write reliability;
- broad payload class coverage;
- multi-client / scope-aware write behavior;
- durable audit reliability across accepted and rejected writes;
- shadow/vector/cache projection checks across accepted and failed writes;
- idempotence and duplicate handling;
- rollback/cleanup posture for an incorrect write;
- lifecycle integration with proposal, approval, supersession, tombstone, and forget flows;
- stale/bad-memory prevention after accepted writes;
- controlled live evidence beyond one accepted write.

## Proof Matrix

| Requirement | Current Evidence | Missing Evidence | Next Safe Gate | Status |
|---|---|---|---|---|
| Unauthorized no-token mutation rejection | CM-0558 bounded JSON-RPC mutation rejection evidence | Broader write reliability still unproven | Keep separate from authorized write reliability | bounded evidence only |
| Exact approval enforcement | CM-0737 two separately approved attempts; CM-0763 review | Future proof must fail closed on missing/edited/stale approval | Exact approval packet recheck before any write | bounded evidence only |
| Payload validation rejection | CM-0737 first attempt rejected by process-memory validation | More negative payload classes and malformed inputs | Fixture/temp-local validation matrix | bounded evidence only |
| Accepted sanitized write | CM-0737 second attempt accepted once | Repeated controlled accepted-write evidence with sanitized output and complete counters | Separately exact-approved exactly-one write proof | exact approval required |
| Durable audit accounting | CM-0737 accepted event summary; no broad raw audit review | Sanitized audit append/readback evidence without raw `.jsonl` dump | Exact-approved bounded audit summary only | exact approval required |
| Shadow store projection | CM-0737 records `shadowWrite.status=ok` for one accepted event | Accepted/rejected projection behavior across bounded cases | Fixture/temp-local projection tests before live write | bounded evidence required |
| Vector/cache behavior | Not proven as write-reliability evidence | Whether accepted write updates or avoids vector/cache state coherently | Fixture/temp-local vector/cache side-effect counters | missing |
| Idempotence / duplicate handling | Not proven | Duplicate payload behavior, run id behavior, and repeated approval boundaries | Fixture duplicate matrix before live write | missing |
| Failure handling | Rejected attempt proves one fail-closed validation path | Durable partial-write failure, audit failure, shadow failure, counter mismatch behavior | Fixture failure-injection matrix | missing |
| Rollback / cleanup posture | No real rollback apply; rollback harness is separate bounded posture | How to recover from incorrect accepted memory without broad destructive action | Planning + fixture tombstone/forget cleanup path | missing |
| Lifecycle governance integration | Governance surfaces exist separately; not tied to write reliability | Proposal/approval/supersession/tombstone/forget transitions for written memory | Governance lifecycle proof track | missing |
| Scope-aware writes | Scope behavior exists as separate track; not proven for write reliability | user/project/agent/task/client/workspace write scope and recall impact | Scope fixture/temp-local write-read policy matrix | missing |
| Bad-memory pollution prevention | Not proven for accepted writes | Accepted bad/stale/out-of-scope memory must not pollute recall | Lifecycle/scope-aware recall regression | missing |

## Required Evidence Ladder

1. Fixture write validation matrix for accepted, rejected, malformed, duplicate, stale, and scope-marked payloads.
2. Temp-local write sandbox evidence proving sanitized side-effect counters without touching real memory stores.
3. Shadow/vector/cache/audit projection checks in fixture or temp-local state.
4. Exact approval packet for one bounded live write proof, if still needed.
5. Separately exact-approved bounded live write proof with exactly one sanitized `record_memory` call.
6. Post-write review that compares accepted/rejected decision, counters, projection status, audit status, lifecycle implications, and no-overclaim wording.
7. Lifecycle/scope pollution-prevention follow-up before any broader `memory write reliable` claim.

## Future Exact-Approved Write Proof Boundary

Any future live write proof must keep the CM-0786 boundary:

- exactly one `record_memory` call;
- no `search_memory` call;
- no provider/API call;
- no raw memory output;
- no direct `.jsonl` read;
- no raw durable memory/audit read;
- no second write;
- no migration/import/export/backup/restore apply;
- no config/watchdog/startup change;
- no public MCP expansion;
- complete side-effect counters;
- sanitized output only;
- no readiness or reliability claim.

## Matrix Verdict

`memory write reliable` remains not claimed.

This matrix narrows the write reliability path from a single future exactly-one write proof into a fuller evidence ladder. A future accepted write can be useful evidence, but it cannot by itself close write reliability without rejection coverage, projection/accounting checks, idempotence/failure handling, rollback/cleanup posture, and lifecycle/scope pollution-prevention evidence.

## No-Overclaim Statement

- `memory write reliable: not claimed`
- `memory recall reliable: not claimed`
- `runtime ready: not claimed`
- `RC ready: not claimed`
- `production ready: not claimed`
- `V8 implemented: no`
- `VCP full parity: not claimed`

Controlling state remains `RC_NOT_READY_BLOCKED`.
