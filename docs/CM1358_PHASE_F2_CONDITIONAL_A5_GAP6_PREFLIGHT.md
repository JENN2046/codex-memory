# CM-1358 Phase F2 Conditional A5-GAP-6 Preflight

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1358 prepares the Phase F2 A5-GAP-6 aggregation refresh boundary without executing the aggregation.

This document does not run `ValidationAggregator`, scan files or stores, call MCP, call providers, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Sequence Guard

Phase F2 must not execute before Phase F1 live-client no-write evidence capture is complete.

Required F1 evidence before F2 can be approved:

- local `main` synced with `origin/main`;
- exact A5-GAP-4 approval for the synced `HEAD`;
- successful bounded no-write execution of `src/cli/phase-f1-live-client-no-write.js --execute`;
- sanitized evidence file or board record showing `PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_CAPTURED_NOT_READY`;
- side-effect counters still zero for provider calls, durable memory writes, durable audit writes, config/watchdog/startup changes, public MCP expansion, remote actions, readiness claims, and reliability claims.

If any F1 item is missing, F2 remains blocked.

## Intended F2 Aggregation Shape

After F1 evidence exists, F2 may refresh the A5-GAP-6 aggregation using only explicit sanitized evidence from approved units.

Candidate approved units:

```text
A5-GAP-1
A5-GAP-2
A5-GAP-3
A5-GAP-4
A5-GAP-5
```

The included evidence file should be a fresh basename that references the completed F1 evidence and any still-valid sanitized source/test/status evidence. Do not use a stale pre-F1 map as the only included evidence.

The aggregation must remain:

```text
no new runtime action
```

This means the F2 aggregation itself must not start services, execute live recall/write, call MCP tools, call providers, scan real memory/store/jsonl/raw audit, write durable state, change config/watchdog/startup, push, deploy, cut over, or claim readiness.

## Non-Authorizing Approval Template

This template is not approval. Replace both placeholders from fresh facts after F1 evidence exists:

```text
I approve A5-GAP-6 for codex-memory on branch main at commit <SYNCED_POST_F1_HEAD>, using only evidence from approved A5-GAP units A5-GAP-1, A5-GAP-2, A5-GAP-3, A5-GAP-4, A5-GAP-5, including <FRESH_POST_F1_EVIDENCE_MAP_BASENAME>, no new runtime action.
```

## Stop Conditions

Stop before F2 execution if any are true:

- F1 live no-write evidence is missing;
- local `HEAD` differs from the approval line;
- local `HEAD` differs from `origin/main`;
- worktree is dirty;
- included evidence basename is stale, missing, or not tied to the post-F1 head;
- approval checker rejects the line;
- the aggregation would collect evidence by scanning files or stores instead of using explicit sanitized inputs;
- the aggregation would execute any runtime action;
- the result would be described as runtime readiness, recall reliability, write reliability, personal dogfood readiness, RC readiness, cutover readiness, or `RC_READY`.

## Current Result

```text
phaseF2ConditionalPreflightPrepared=true
phaseF1LiveEvidencePresent=false
phaseF2AggregationApproved=false
phaseF2AggregationExecuted=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=complete_phase_f1_before_phase_f2
```
