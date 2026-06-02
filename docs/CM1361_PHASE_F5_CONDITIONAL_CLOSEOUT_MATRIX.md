# CM-1361 Phase F5 Conditional Closeout Matrix

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1361 prepares the Phase F5 closeout matrix for reaching `PERSONAL_DOGFOOD_READY_NOT_RC_READY`.

This document does not execute F1, F2, F3, F4, strict gates, MCP tools, provider calls, real memory reads, real memory writes, durable audit writes, config/watchdog/startup changes, public MCP expansion, remote actions, release, deploy, cutover, or readiness claims.

## Closeout Target

The only allowed Phase F closeout target is:

```text
PERSONAL_DOGFOOD_READY_NOT_RC_READY
```

This target means personal dogfood evidence is sufficient to continue private operator use and further observation, while RC readiness remains false.

It must not be shortened to:

```text
RC_READY
RUNTIME_READY
WRITE_RELIABLE
RECALL_RELIABLE
CUTOVER_READY
```

## Required Evidence Matrix

F5 closeout is blocked until every row has fresh evidence bound to the same synced `HEAD`.

| Requirement | Required evidence | Current status |
|---|---|---|
| Synced branch | fresh Git facts show local `main` equals `origin/main` and worktree is clean | missing; current local branch is ahead of `origin/main` |
| F1 live client no-write contract refresh | bounded live no-write evidence captured with exact A5-GAP-4 approval and sanitized output | missing |
| F2 A5-GAP-6 aggregation refresh | exact-approved aggregation from explicit sanitized post-F1 evidence, preserving `NOT_READY_BLOCKED` | missing |
| F3 true-live recall negative-control proof | exact-approved bounded negative-control proof with sanitized output, no raw content, no reliability claim | missing |
| F4 minimal personal dogfood write | exact-approved single `record_memory` dogfood write receipt with sanitized payload and no extra write | missing |
| Side-effect counters | provider, config/watchdog/startup, public MCP expansion, remote action, release/deploy/cutover all zero | not yet provable for future F1-F4 |
| Public MCP contract | public tools still exactly `record_memory`, `search_memory`, `memory_overview` | historical/source evidence only; needs fresh final confirmation if F5 requires it |
| Final wording | final status says `PERSONAL_DOGFOOD_READY_NOT_RC_READY` and explicitly keeps `RC_NOT_READY_BLOCKED` | missing |

## Non-Authorizing Closeout Template

This template is not approval and is not a readiness claim. Replace `<SYNCED_POST_F4_HEAD>` only after F1 through F4 evidence is complete:

```text
I approve Phase F5 closeout review for codex-memory on branch main at commit <SYNCED_POST_F4_HEAD>, using only completed F1 live no-write evidence, F2 A5-GAP-6 aggregation evidence, F3 true-live recall negative-control evidence, and F4 one-write personal dogfood evidence, with sanitized output only, no new runtime action, no provider, no real memory scan, no raw audit output, no durable memory write, no durable audit write, no config/watchdog/startup change, no public MCP expansion, no remote action, and no RC readiness claim.
```

If the closeout needs a strict gate, live verification, recall query, cleanup, rollback, push, PR, tag, release, deploy, or cutover, that action needs its own exact approval and cannot be inferred from this template.

## Stop Conditions

Stop before F5 closeout if any are true:

- any F1-F4 evidence row is missing;
- any evidence row is bound to a stale or different `HEAD`;
- local `HEAD` differs from `origin/main`;
- worktree is dirty;
- approval is stale or not exact;
- closeout would run new runtime action not named in the exact approval;
- closeout would read raw memory bodies, raw audit, store files, jsonl content, or token material;
- closeout would write durable memory/audit state;
- closeout would change config/watchdog/startup, dependencies, public MCP schema, or package manager state;
- closeout would push, PR, tag, release, deploy, merge, or cut over;
- output wording would claim `RC_READY`, runtime readiness, write reliability, recall reliability, release readiness, deployment readiness, or cutover readiness.

## Current Result

```text
phaseF5ConditionalCloseoutMatrixPrepared=true
phaseF1LiveEvidencePresent=false
phaseF2AggregationEvidencePresent=false
phaseF3TrueLiveRecallEvidencePresent=false
phaseF4PersonalDogfoodWriteEvidencePresent=false
personalDogfoodReadyNotRcReady=false
rcReady=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=complete_phase_f1_first
```
