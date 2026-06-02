# CM-1359 Phase F3 Conditional True-Live Recall Preflight

Date: 2026-06-02

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

CM-1359 prepares the Phase F3 true-live recall negative-control proof boundary without executing recall.

This document does not run `search_memory`, call MCP, call providers, start services, read real memory bodies, read raw audit, write durable memory/audit, change config/watchdog/startup, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Sequence Guard

Phase F3 must not execute before Phase F1 and Phase F2 are complete.

Required evidence before F3 can be approved:

- F1 live-client no-write evidence captured at fresh synced `HEAD`;
- F2 A5-GAP-6 aggregation refresh executed from explicit sanitized post-F1 evidence, with `decision=NOT_READY_BLOCKED` and no readiness claim;
- local `HEAD` equals `origin/main`;
- worktree is clean;
- current approval line is bound to the fresh synced `HEAD`;
- proof profile is the stricter negative-control family, not a broad recall reliability test.

If any prerequisite is missing, F3 remains blocked.

## Existing Proof Surface

The repository already contains the true-live recall proof surfaces and prior hardening:

- `src/cli/recall-proof-current-facts-preflight.js`
- `src/core/RecallProofExecutionPreflight.js`
- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_EXECUTION.md`
- `docs/RECALL_PRECISION_POST_HARDENING_LIVE_NEGATIVE_CONTROL_PROOF_REVIEW.md`

CM-1359 does not modify those surfaces.

## Intended F3 Proof Shape

After F1 and F2 complete, F3 should run only a bounded negative-control proof:

- use the existing true-live readonly proof runner path;
- bind approval to branch `main` and the fresh synced `HEAD`;
- use exactly the stricter negative-control query family already guarded by the current proof profile;
- require sanitized output only;
- require no raw memory content, raw audit output, provider calls, durable writes, config/watchdog/startup changes, public MCP expansion, remote actions, readiness claims, or reliability claims;
- record result as passed-not-ready, failed-not-ready, or blocked-not-ready.

F3 may at most produce bounded negative-control evidence. It must not claim memory recall reliability.

## Non-Authorizing Approval Template

This template is not approval. Replace `<SYNCED_POST_F2_HEAD>` after F1 and F2 are complete and fresh Git facts show local `HEAD` equals `origin/main`:

```text
I approve true-live recall negative-control proof for codex-memory on branch main at commit <SYNCED_POST_F2_HEAD>, using the existing stricter negative-control proof profile only, sanitized output only, no provider, no raw memory content, no raw audit output, no durable memory write, no durable audit write, no config/watchdog/startup change, no public MCP expansion, no remote action, and no readiness or reliability claim.
```

## Stop Conditions

Stop before F3 execution if any are true:

- F1 live no-write evidence is missing;
- F2 aggregation evidence is missing;
- local `HEAD` differs from `origin/main`;
- worktree is dirty;
- approval is stale or not exact;
- proof query family differs from the existing stricter negative-control profile;
- the run would execute broad recall reliability testing instead of bounded negative-control proof;
- the run would expose raw content, raw audit, store paths, or token material;
- any side-effect counter is nonzero;
- output wording would claim recall reliability, write reliability, runtime readiness, personal dogfood readiness, RC readiness, cutover readiness, or `RC_READY`.

## Current Result

```text
phaseF3ConditionalPreflightPrepared=true
phaseF1LiveEvidencePresent=false
phaseF2AggregationEvidencePresent=false
phaseF3TrueLiveRecallApproved=false
phaseF3TrueLiveRecallExecuted=false
decision=NOT_READY_BLOCKED
operatorState=RC_NOT_READY_BLOCKED
nextRequiredAction=complete_phase_f1_and_phase_f2_before_phase_f3
```
