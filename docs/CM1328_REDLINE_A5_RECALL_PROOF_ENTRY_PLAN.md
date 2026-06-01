# CM-1328 Red-Line A5 Recall Proof Entry Plan

Date: 2026-06-01

Status: `PLAN_ONLY_PREFLIGHT_BLOCKED_NOT_EXECUTED_NOT_READY`

## Purpose

Move the project from repeated local hardening slices toward the first controlled Red-line/A5 runtime evidence step, without executing that Red-line step in CM-1328.

The selected target is the `memory recall reliable` gap, specifically the true live recall negative-control proof path. This is the highest-value next runtime gap because repository status still separates local fixture/temp proof from real-store recall reliability, and current status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Current Read-Only Preflight

Command run:

```powershell
node src\cli\recall-proof-current-facts-preflight.js --json --pretty
```

Result:

```text
status=blocked
decision=RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED
blockerReasons=local_origin_head_mismatch, dirty_worktree
localHead=7c311c8d9a535a6f49c1c1673be59a8155c1bab4
originHead=0a992a87808cb2f20f40da93edf9df8c6c7d4572
dirtyStatusLineCount=2
exactApprovalLineMatched=true
exactQueryFamilyBound=true
internalProofSeamBound=true
boundaryFlagsBound=true
executionStarted=false
liveProofStarted=false
```

Interpretation:

- The current recall proof approval string and four-query negative-control family are already bound by the implemented preflight.
- The current workspace is not eligible for live proof execution because local `main` is ahead of `origin/main` and the worktree is not clean.
- The two untracked files observed during this preflight are intentionally left untouched: `CLAUDE.md` and `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md`.
- CM-1328 does not execute `search_memory`, `record_memory`, provider/model/API calls, service startup, raw memory reads, `.jsonl` reads, durable memory/audit writes, migration/import/export/backup/restore apply, config/watchdog/startup changes, public MCP expansion, push, release, deploy, cutover, or any readiness/reliability claim.

## Red-Line Target

Target gap:

```text
memory recall reliable
recall isolation runtime proof
true live recall negative-control proof
```

Existing proof surface:

- `src/cli/recall-proof-current-facts-preflight.js`
- `src/core/RecallProofExecutionPreflight.js`
- `src/core/TrueLiveRecallReadonlyProofRunner.js`
- `src/core/TrueLiveRecallExecutorAdapter.js`

Required proof seam:

```text
runner=TrueLiveRecallReadonlyProofRunner
adapter=createTrueLiveRecallExecutorAdapter
appCallTool=search_memory
requestSource=internal-true-live-recall-readonly-proof-runner
```

Required boundary flags:

```text
readOnly=true
noProvider=true
noAudit=true
noTokenReadOnly=true
noRawContentRead=true
includeContent=false
precisionPolicyEnabled=true
proofNoResultMode=true
sanitizedOutput=true
```

Expected query family:

```text
Q1 xqzv-9137-lomdra-kepv-azmuth -> 0 results
Q2 nareth-48291-pluvox-darnel-kiv -> 0 results
Q3 vornik-73019-quaspel-threnn-ulo -> 0 results
Q4 mavrix-60428-selkun-dopra-nyxal -> 0 results
```

## Preconditions Before Any Live Proof

All must be true before the separate Red-line/A5 execution step:

1. Branch is `main`.
2. Local `HEAD` equals `origin/main`.
3. Worktree satisfies the implemented current-facts preflight clean-state requirement.
4. `node src\cli\recall-proof-current-facts-preflight.js --json --pretty` returns `status=ok` and `acceptedForExecutionPreflight=true`.
5. The exact approval line required by the implemented runner/preflight is provided for the current clean synced main head.
6. The execution command/path is rechecked against current source immediately before use.
7. Output remains sanitized and metadata-only; raw memory content must not be printed or persisted.
8. The result is recorded only as bounded evidence, not as `memory recall reliable`, runtime readiness, RC readiness, cutover readiness, or personal dogfood readiness.

## Approval Boundary

The implemented preflight currently imports `EXACT_APPROVAL_LINE` from `TrueLiveRecallReadonlyProofRunner`; it does not accept an arbitrary newly named CM-1328 approval string.

Therefore the next operator must either:

- use the existing exact approval string after the current-facts preflight proves a clean synced main head, or
- first implement and validate a source/test change that updates the proof approval binding to a new fresh-HEAD-bound approval grammar.

CM-1328 chooses no source change and no live proof execution. It records the current blocker and the next exact boundary only.

## Next Step

1. Stabilize the current local commits and reach a clean synced `main` if remote push is separately authorized.
2. Re-run the read-only current-facts preflight.
3. If accepted, request or use an exact approval packet that matches the implemented runner/preflight.
4. Execute exactly one bounded true-live recall negative-control proof only after that approval.
5. Record the result as evidence-only and keep `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED` unless later independent closure evidence justifies a different status.
