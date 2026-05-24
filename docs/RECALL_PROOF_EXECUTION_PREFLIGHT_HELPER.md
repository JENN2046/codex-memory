# CM-0904 Recall Proof Execution Preflight Helper

Date: 2026-05-24

Status: `RECALL_PROOF_EXECUTION_PREFLIGHT_HELPER_COMPLETED_NOT_EXECUTED_NOT_READY`

Decision: `RC_NOT_READY_BLOCKED`

## Purpose

CM-0904 adds a local explicit-input preflight helper for the `CM-0814` recall basis packet from [RECALL_PRECISION_CM0814_EXACT_BASIS_APPROVAL_PACKET.md](/A:/codex-memory/docs/RECALL_PRECISION_CM0814_EXACT_BASIS_APPROVAL_PACKET.md).

The helper makes the future execution boundary machine-checkable before any live proof:

- clean synced `main` baseline
- exact approval line
- exact `CM-0814` four-query family
- exact internal runner/adapter/app seam
- exact no-provider / no-audit / no-raw / sanitized-output boundary flags

It does not execute live proof.

## Implementation

Added:

- [RecallProofExecutionPreflight.js](/A:/codex-memory/src/core/RecallProofExecutionPreflight.js)
- [recall-proof-execution-preflight.test.js](/A:/codex-memory/tests/recall-proof-execution-preflight.test.js)

The helper is explicit-input only. It does not run Git commands, read files, call `search_memory`, call `record_memory`, call providers, read raw memory, read `.jsonl`, write durable memory, write durable audit, expand public MCP, or change config/watchdog/startup.

## Bound CM-0814 Query Family

The helper accepts only this ordered query family:

| Slot | Family | Query Text | Expected Result Count |
|---|---|---|---:|
| Q1 | `stricter_negative_control` | `xqzv-9137-lomdra-kepv-azmuth` | 0 |
| Q2 | `stricter_negative_control` | `nareth-48291-pluvox-darnel-kiv` | 0 |
| Q3 | `stricter_negative_control` | `vornik-73019-quaspel-threnn-ulo` | 0 |
| Q4 | `stricter_negative_control` | `mavrix-60428-selkun-dopra-nyxal` | 0 |

Any query count drift, slot drift, family drift, query-text drift, or broad-scan query fails closed.

## Required Seam

The helper accepts only:

```text
TrueLiveRecallReadonlyProofRunner
-> createTrueLiveRecallExecutorAdapter({ app })
-> app.callTool('search_memory', ...)
```

Required seam fields:

- `runner= TrueLiveRecallReadonlyProofRunner`
- `adapter= createTrueLiveRecallExecutorAdapter`
- `appCallTool= search_memory`
- `requestSource= internal-true-live-recall-readonly-proof-runner`

Required boundary flags:

- `readOnly=true`
- `noProvider=true`
- `noAudit=true`
- `noTokenReadOnly=true`
- `noRawContentRead=true`
- `includeContent=false`
- `precisionPolicyEnabled=true`
- `proofNoResultMode=true`
- `sanitizedOutput=true`

## Fail-Closed Cases Covered

The targeted test covers:

- clean synced exact `CM-0814` basis returns `RECALL_PROOF_EXECUTION_PREFLIGHT_READY_NOT_EXECUTED`
- dirty worktree returns `RECALL_PROOF_EXECUTION_PREFLIGHT_BLOCKED_NOT_EXECUTED`
- query-family drift fails closed
- broad-scan query attempts fail closed
- exact approval line mismatch fails closed
- proof seam drift fails closed
- boundary flag drift fails closed
- status-line normalization is explicit-input only

## Validation

Passed:

```powershell
node --check .\src\core\RecallProofExecutionPreflight.js
node --check .\tests\recall-proof-execution-preflight.test.js
node --test .\tests\recall-proof-execution-preflight.test.js
```

Targeted test result: `5/5`.

## What This Proves

This proves only that future `CM-0814` recall proof execution now has a local explicit-input preflight helper that can fail closed before execution.

## What This Does Not Prove

This does not prove:

- live `search_memory` recall behavior
- `memory recall reliable`
- public/default `search_memory` reliability
- write reliability
- lifecycle/scope governance closure
- `RC_READY`

## Current Blocker

The current worktree remains dirty. Therefore the helper would block current live proof execution with `dirty_worktree` if supplied with current Git status.

The next live-proof path remains:

1. Rebind fresh Git/runtime facts.
2. Require clean synced `main`.
3. Run this preflight with the exact `CM-0814` family and internal seam.
4. Only then consider a separate live proof execution step.
