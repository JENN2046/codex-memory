# CM-0903 Recall Precision CM-0814 Exact Basis Approval Packet

Date: 2026-05-24

Status: `RECALL_PRECISION_CM0814_EXACT_BASIS_PACKET_COMPLETED_NOT_EXECUTED_NOT_READY`

Decision: `RC_NOT_READY_BLOCKED`

## Purpose

This packet binds the strongest current recall candidate family, `CM-0814`, into an exact, preflight-ready basis packet for a future separately bounded recall proof.

It does not execute the proof.

It does not grant runtime readiness, recall reliability, or public/default `search_memory` reliability.

## Current Repository Preflight

Packet preparation baseline:

- branch: `main`
- local head: `a6782e338dfa320679f2802b0d8e2491d8f8b55d`
- `origin/main`: `a6782e338dfa320679f2802b0d8e2491d8f8b55d`
- worktree: dirty before this packet, with pre-existing source/test/docs/board changes

Execution interpretation:

- the matching local/remote commit is useful as packet context only
- the dirty worktree prevents this packet from being treated as a clean executable proof baseline
- any future execution must re-run Git preflight and bind the then-current branch/head/worktree facts before running
- if the future execution baseline is dirty, stale, ambiguous, or source-drifted, it must fail closed before live proof

## Bound Candidate Family

Basis family: `CM-0814 RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION`.

Evidence source:

- [RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION.md](/A:/codex-memory/docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION.md)
- [RECALL_PRECISION_CM0814_CANDIDATE_REBIND_PACKET.md](/A:/codex-memory/docs/RECALL_PRECISION_CM0814_CANDIDATE_REBIND_PACKET.md)
- [RECALL_PRECISION_QUERY_FAMILY_BASIS_BINDING_REVIEW.md](/A:/codex-memory/docs/RECALL_PRECISION_QUERY_FAMILY_BASIS_BINDING_REVIEW.md)
- [MEMORY_RELIABILITY_PROOF_CONSUMPTION_PHASE_HANDOFF.md](/A:/codex-memory/docs/MEMORY_RELIABILITY_PROOF_CONSUMPTION_PHASE_HANDOFF.md)

Accepted historical basis shape:

- four ordered stricter negative-control slots
- sanitized output only
- `precisionPolicyContext.enabled=true`
- `proofNoResultMode=true`
- expected `resultCount=0` for every slot
- complete zero side-effect counters
- no raw content returned

Non-inherited historical state:

- the `CM-0814` local baseline is not inherited as current executable baseline
- the older `CM-0801` synced-main baseline is not inherited
- legacy `CM-0774` approval labeling is not inherited as current approval semantics
- historical pass/fail wording is not upgraded into reliability
- this packet does not make `CM-0814` automatic authorization for execution

## Exact Query Family

The only query family bound by this packet is:

| Slot | Basis Label | Query Text | Expected Result Count |
|---|---|---|---:|
| Q1 | NC1 stricter negative control | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| Q2 | NC2 stricter negative control | `nareth-48291-pluvox-darnel-kiv` | 0 |
| Q3 | NC3 stricter negative control | `vornik-73019-quaspel-threnn-ulo` | 0 |
| Q4 | NC4 stricter negative control | `mavrix-60428-selkun-dopra-nyxal` | 0 |

No other query text, query count, query order, or mixed historical family is bound by this packet.

## Exact Proof Seam

The future proof, if executed later by a separate execution step, must consume the existing internal seam only:

```text
TrueLiveRecallReadonlyProofRunner
-> createTrueLiveRecallExecutorAdapter({ app })
-> app.callTool('search_memory', ...)
```

Required internal context:

- `requestSource=internal-true-live-recall-readonly-proof-runner`
- `noTokenReadOnly=true`
- `noRawContentRead=true`
- `includeContent=false`
- `precisionPolicyContext.enabled=true`
- `proofNoResultMode=true`
- sanitized output only

Rejected proof seams:

- direct public `search_memory`
- `dashboard`
- `governance-report`
- `http-observe`
- ad hoc app/service calls outside the runner/adapter seam
- any new parallel runtime path
- any broad real-memory exploration used to discover or tune queries

## Required Execution-Time Boundaries

A future execution using this basis must remain one-run only:

- exactly four read-only internal `search_memory` calls
- zero `record_memory` calls
- zero provider/API calls
- zero durable memory writes
- zero durable audit writes
- zero raw memory or direct `.jsonl` reads
- zero migration/import/export/backup/restore apply
- zero cleanup apply or rollback apply
- zero public MCP expansion
- zero config/watchdog/startup changes
- zero package/lockfile changes
- zero push/tag/release/deploy/cutover actions
- zero readiness or reliability claims

Failure interpretation:

- any nonzero result in Q1 through Q4 is a recall-precision blocker signal, not a duplicate/proof success
- any raw content field in output is boundary failure
- any nonzero side-effect counter is boundary failure
- any query-family drift is boundary failure
- any execution outside the internal seam is boundary failure

## What This Packet Proves

This packet proves only:

- the `CM-0814` candidate family can be represented as one exact prebound query-family basis
- the exact four queries and expected per-slot counts are known before execution
- the allowed internal proof seam is already identified
- the execution boundaries can be checked fail-closed before any future live proof

## What This Packet Does Not Prove

This packet does not prove:

- `memory recall reliable`
- public/default `search_memory` reliability
- write reliability
- lifecycle/scope governance closure
- VCP full parity
- runtime readiness
- `RC_READY`

## Next Safe Step

The next safe step is not automatic proof execution.

Acceptable next steps:

- perform a future execution-time preflight that rebinds clean current Git/runtime facts before using this exact query family
- or continue governance closure work without live proof

Blocked next steps:

- executing this proof from the current dirty worktree as if it were clean synced evidence
- discovering new proof queries through real-memory exploration
- treating this packet as readiness, reliability, or public MCP contract expansion
