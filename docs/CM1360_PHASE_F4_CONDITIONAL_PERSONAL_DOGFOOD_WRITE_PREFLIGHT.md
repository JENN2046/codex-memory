# CM-1360 Phase F4 Conditional Personal Dogfood Write Preflight

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1360 prepares the Phase F4 minimal personal dogfood write boundary without executing `record_memory`.

This document does not call MCP, call providers, start services, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Sequence Guard

Phase F4 must not execute before Phase F1, Phase F2, and Phase F3 are complete.

Required evidence before F4 can be approved:

- F1 live-client no-write evidence captured at fresh synced `HEAD`;
- F2 A5-GAP-6 aggregation refresh executed from explicit sanitized post-F1 evidence, with `decision=NOT_READY_BLOCKED` and no readiness claim;
- F3 true-live recall negative-control proof completed with sanitized output, no raw content, no provider, no durable write, no readiness claim, and no reliability claim;
- local `HEAD` equals `origin/main`;
- worktree is clean;
- current approval line is bound to the fresh synced post-F3 `HEAD`;
- the dogfood payload is minimal, explicit, sanitized, and limited to a personal proof-memory style entry.

If any prerequisite is missing, F4 remains blocked.

## Intended F4 Dogfood Shape

After F1 through F3 complete, F4 may run one bounded personal dogfood write:

- use `record_memory` exactly once;
- use an explicit sanitized payload that contains no secrets, no raw private data, no raw chat transcript, no raw audit, and no provider output;
- bind scope to a personal dogfood proof context rather than production or migration state;
- require idempotency or a rollback/cleanup note before execution;
- record sanitized receipt only;
- run immediate bounded verification only if included in the exact approval line;
- preserve public MCP tools as exactly `record_memory`, `search_memory`, and `memory_overview`;
- record result as dogfood-write-evidence-captured-not-rc-ready, failed-not-ready, or blocked-not-ready.

F4 may at most produce one minimal personal dogfood write receipt. It must not claim write reliability, recall reliability, personal RC readiness, cutover readiness, or `RC_READY`.

## Non-Authorizing Approval Template

This template is not approval. Replace `<SYNCED_POST_F3_HEAD>` after F1, F2, and F3 are complete and fresh Git facts show local `HEAD` equals `origin/main`:

```text
I approve one minimal personal dogfood record_memory write for codex-memory on branch main at commit <SYNCED_POST_F3_HEAD>, using exactly one sanitized proof-memory style payload with no secrets, no raw private data, no raw chat transcript, no raw audit output, no provider output, no config/watchdog/startup change, no public MCP expansion, no remote action, and no readiness or reliability claim.
```

If post-write verification is needed, it must be added explicitly to the approval line. Do not infer `search_memory`, broad store reads, rollback apply, cleanup apply, or repeated writes from this template.

## Stop Conditions

Stop before F4 execution if any are true:

- F1 live no-write evidence is missing;
- F2 aggregation evidence is missing;
- F3 true-live recall negative-control evidence is missing;
- local `HEAD` differs from `origin/main`;
- worktree is dirty;
- approval is stale or not exact;
- payload contains secrets, raw private data, raw chat transcript, raw audit output, provider output, production endpoint material, or token material;
- planned action would perform more than one `record_memory` write;
- planned verification would run `search_memory`, broad memory/store/jsonl/raw audit reads, rollback apply, cleanup apply, or any additional write without separate exact approval;
- any config/watchdog/startup, dependency, public MCP schema, remote, tag/release/deploy, or cutover action is needed;
- output wording would claim write reliability, recall reliability, runtime readiness, personal dogfood readiness, RC readiness, cutover readiness, or `RC_READY`.

## Current Result

```text
phaseF4ConditionalPreflightPrepared=true
phaseF1LiveEvidencePresent=false
phaseF2AggregationEvidencePresent=false
phaseF3TrueLiveRecallEvidencePresent=false
phaseF4PersonalDogfoodWriteApproved=false
phaseF4PersonalDogfoodWriteExecuted=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=complete_phase_f1_f2_f3_before_phase_f4
```
