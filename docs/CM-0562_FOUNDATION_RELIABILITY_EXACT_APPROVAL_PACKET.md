# CM-0562 Foundation Reliability Exact-Approval Packet

Status: DRAFT_NOT_APPROVED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This packet prepares the next Phase 1 Foundation Reliability gate after CM-0558, CM-0560, CM-0561, CM-0563, and CM-0564.

It does not execute validation.

It does not authorize itself.

It does not claim memory write reliability, memory recall reliability, runtime readiness, production readiness, RC readiness, or cutover readiness.

The packet exists so the next exact approval can be scoped, auditable, reversible in reasoning, and fail-closed.

## Current Evidence Baseline

Current preparation baseline:

```text
branch: main
prep HEAD: 77dec659d9a16b9795eab7fb1e9bf88798bcdc7c
current status: RC_NOT_READY_BLOCKED
```

Current refresh note:

```text
docs/CM-0565_FOUNDATION_RELIABILITY_EXACT_APPROVAL_BASELINE_REFRESH.md
```

Baseline rule:

```text
Before execution, re-read git status, current HEAD, origin/main, remote main, this packet, and the current refresh note.
If HEAD changed after this packet, rebind the target baseline explicitly before executing.
Docs/board-only drift may be accepted only if inspected and named.
Any src/tests/package/runtime drift requires a fresh approval packet or explicit re-approval.
If live remote verification fails, execution remains blocked until remote main can be verified.
```

## Scope

This packet requests future exact approval for two bounded units:

1. `AUTH_WRITE_PATH_VALIDATION_001`
2. `BOUNDED_RECALL_VALIDATION_001`

These units may be approved together only if the approval line names both units, the target baseline, and the allowed commands.

If only one unit is named, execute only that unit.

## Unit 1: AUTH_WRITE_PATH_VALIDATION_001

Goal:

```text
Prove the authorized write path can accept exactly one sanitized validation canary through the current public `record_memory` contract.
```

Permitted only under exact approval:

- exactly one sanitized durable memory write
- the normal write-path audit side effect required by the write path
- one bounded post-write evidence summary that does not print secrets or broad memory contents
- docs/board evidence update after execution

Required canary constraints:

- synthetic only
- no user private content
- no credentials, token, cookie, path secret, provider metadata, or personal data
- explicitly marked as a Phase 1 validation canary
- includes a unique canary id tied to the target baseline
- content must be short and safe to quote in docs

Forbidden unless separately approved:

- more than one durable memory write
- any update/delete/cleanup/rebuild/migration/import/export/backup/restore apply
- broad memory scan
- `.jsonl` audit read
- provider/model call
- public MCP expansion
- config/watchdog/startup change
- package/lockfile change
- readiness claim

Pass evidence shape:

```json
{
  "unit": "AUTH_WRITE_PATH_VALIDATION_001",
  "targetBaseline": "<full commit>",
  "canaryId": "<sanitized id>",
  "durableMemoryWriteCount": 1,
  "authorizedWriteAccepted": true,
  "publicTool": "record_memory",
  "normalWriteAuditSideEffect": "expected",
  "secretsPrinted": false,
  "providerCalled": false,
  "broadScanPerformed": false,
  "readinessClaimed": false,
  "result": "AUTHORIZED_WRITE_PATH_VALIDATED_NOT_READY"
}
```

Fail evidence shape:

```json
{
  "unit": "AUTH_WRITE_PATH_VALIDATION_001",
  "targetBaseline": "<full commit>",
  "durableMemoryWriteCount": 0,
  "authorizedWriteAccepted": false,
  "failureClass": "<sanitized reason>",
  "secretsPrinted": false,
  "providerCalled": false,
  "readinessClaimed": false,
  "result": "AUTHORIZED_WRITE_PATH_VALIDATION_FAILED_NOT_READY"
}
```

## Unit 2: BOUNDED_RECALL_VALIDATION_001

Goal:

```text
Prove a bounded `search_memory` recall path can query only the approved validation canary scope without timing out or leaking raw private memory content.
```

Permitted only under exact approval:

- exactly one true live `search_memory` validation query
- query scoped to the approved validation canary id or exact sanitized marker
- bounded output summary only
- docs/board evidence update after execution

Allowed only if either:

- `AUTH_WRITE_PATH_VALIDATION_001` was already approved and produced a canary id, or
- the user names a previously approved sanitized canary id for this unit

Forbidden unless separately approved:

- broad real memory search
- unbounded query
- multiple recall queries
- printing raw memory content beyond the sanitized canary evidence needed for proof
- `.jsonl` audit read
- provider/model call
- durable memory write
- durable audit write beyond normal read-path behavior explicitly named by approval
- config/watchdog/startup change
- public MCP expansion
- readiness claim

Pass evidence shape:

```json
{
  "unit": "BOUNDED_RECALL_VALIDATION_001",
  "targetBaseline": "<full commit>",
  "canaryId": "<sanitized id>",
  "queryCount": 1,
  "boundedRecallReturned": true,
  "timedOut": false,
  "timeoutBoundaryTriggered": false,
  "rawPrivateContentPrinted": false,
  "providerCalled": false,
  "broadScanPerformed": false,
  "readinessClaimed": false,
  "result": "BOUNDED_RECALL_VALIDATED_NOT_READY"
}
```

Fail evidence shape:

```json
{
  "unit": "BOUNDED_RECALL_VALIDATION_001",
  "targetBaseline": "<full commit>",
  "canaryId": "<sanitized id>",
  "queryCount": 1,
  "boundedRecallReturned": false,
  "timedOut": "<true|false>",
  "failureClass": "<sanitized reason>",
  "rawPrivateContentPrinted": false,
  "providerCalled": false,
  "readinessClaimed": false,
  "result": "BOUNDED_RECALL_VALIDATION_FAILED_NOT_READY"
}
```

## Stop Conditions

Stop immediately and report `BLOCKED_A5_OR_EXPLICIT_APPROVAL_REQUIRED` if execution would require:

- a second durable memory write
- a second live recall query
- real memory broad scan
- reading `.jsonl` audit or raw memory content
- provider/model call
- migration/import/export/backup/restore apply
- cleanup/rebuild/apply/confirm
- config/watchdog/startup change
- public MCP expansion
- package/lockfile change
- push/tag/release/deploy/cutover beyond the current goal's safe-push allowance
- any readiness claim

Stop and report `BLOCKED_BASELINE_REBIND_REQUIRED` if:

- target baseline is not the current HEAD
- origin/main diverged
- uncommitted unrelated changes exist
- src/tests/package/runtime drift is present after this packet and not explicitly approved

## Required Approval Line

Execution requires a future user message that names the exact units and target baseline, for example:

```text
授权执行 CM-0562，target baseline = <full commit>，允许 AUTH_WRITE_PATH_VALIDATION_001 和 BOUNDED_RECALL_VALIDATION_001，允许 exactly one sanitized durable memory write and exactly one bounded search_memory validation query，禁止 provider / broad scan / .jsonl read / public MCP expansion / readiness claim。
```

Without that exact approval, this packet remains planning-only.

## Current State

```text
memory write reliable: not claimed
memory recall reliable: not claimed
runtime ready: not claimed
RC ready: not claimed
production ready: not claimed
controlling status: RC_NOT_READY_BLOCKED
```

## Next Safe Action

Wait for exact approval or continue with fixture-only side-effect isolation tests.
