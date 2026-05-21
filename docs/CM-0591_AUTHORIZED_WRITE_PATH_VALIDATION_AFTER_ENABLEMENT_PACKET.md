# CM-0591 Authorized Write-Path Validation After Enablement Packet

Status: APPROVED_REVIEWED_BLOCKED_PRECONDITION_NOT_MET
Decision: AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_BLOCKED_TOKEN_BOUNDARY_NOT_ESTABLISHED
Date: 2026-05-20

Execution/block evidence:

- [CM-0593 Authorized Write-Path Validation After Enablement Blocked Evidence](/A:/codex-memory/docs/CM-0593_AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_BLOCKED_EVIDENCE.md)

## Purpose

This packet defines the next exact A5 boundary after CM-0590, not before it.

It does not execute `record_memory`.

It does not execute `search_memory`.

It does not authorize itself.

Its only purpose is to define the smallest write-path validation unit that may be considered only after the combined minimal enablement boundary has succeeded.

## Required Prior Evidence

This packet is not the next step by itself.

It is gated behind future approved execution evidence for:

```text
docs/CM-0590_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_PACKET.md
```

Minimum evidence required before this packet may be used:

- current-session token boundary established or proven already present
- loopback endpoint healthy after the approved bounded enablement step
- no config mutation
- no watchdog/startup persistence
- no `record_memory`
- no `search_memory`
- no readiness claim

Without that evidence, this packet remains blocked.

## Exact Scope

This packet requests future exact approval for one bounded unit only:

```text
AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_001
```

Goal:

```text
Prove the authorized public `record_memory` write path can accept exactly one sanitized validation canary after the prerequisite boundary has already been established by a separately approved CM-0590 execution.
```

## Why This Packet Exists Separately

CM-0586 was the earlier direct write-only packet.

CM-0587 then failed closed because no authorized public write path was actually available.

CM-0589 classified that the blockers were token missing, endpoint missing, and startup-or-injection approval missing.

CM-0590 now isolates the prerequisite enablement boundary.

CM-0591 therefore isolates the next step after that enablement succeeds, so the project does not have to jump from prerequisite establishment straight into the broader CM-0562 packet.

## Permitted Only Under Exact Approval

- re-read branch, `HEAD`, `origin/main`, and remote main
- confirm the approved CM-0590 execution evidence exists for the same target baseline and current-session boundary
- execute exactly one sanitized durable memory write through public `record_memory`
- allow only the normal unavoidable write-path audit side effect from that single write
- record one bounded execution/evidence note
- update docs/board after execution

## Explicit Non-Goals

- no `search_memory`
- no marker search
- no second write
- no `observe:http`
- no `.jsonl` read
- no provider/model call
- no config file edit
- no watchdog/startup persistence change
- no public MCP expansion
- no migration/import/export/backup/restore apply
- no readiness claim

## Command-Family Contract

Only the following command families may appear in a future approved execution:

### Baseline Recheck

- `git branch --show-current`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git ls-remote origin refs/heads/main`

### Prior-Evidence Recheck

- read the approved CM-0590 execution evidence document path
- confirm the target baseline matches
- confirm the evidence states token boundary established/present and endpoint healthy

### Write Boundary

- exactly one public `record_memory` invocation

No recall, observe, audit-inspection, provider, migration, or config/startup command family is allowed.

## Required Canary Constraints

- synthetic only
- no user private content
- no credentials, token, cookie, path secret, provider metadata, or personal data
- explicitly marked as post-enable write-path validation canary
- includes a unique canary id tied to the target baseline
- content must be short and safe to quote in docs

## Pass Evidence Shape

```json
{
  "unit": "AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_001",
  "targetBaseline": "<full commit>",
  "cm0590EvidenceConfirmed": true,
  "canaryId": "<sanitized id>",
  "durableMemoryWriteCount": 1,
  "authorizedWriteAccepted": true,
  "normalWriteAuditSideEffect": "expected",
  "searchMemoryCalled": false,
  "jsonlReadPerformed": false,
  "providerCalled": false,
  "readinessClaimed": false,
  "result": "AUTHORIZED_WRITE_PATH_VALIDATED_AFTER_ENABLEMENT_NOT_READY"
}
```

## Fail Evidence Shape

```json
{
  "unit": "AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_001",
  "targetBaseline": "<full commit>",
  "cm0590EvidenceConfirmed": false,
  "durableMemoryWriteCount": 0,
  "authorizedWriteAccepted": false,
  "failureClass": "<sanitized reason>",
  "searchMemoryCalled": false,
  "jsonlReadPerformed": false,
  "providerCalled": false,
  "readinessClaimed": false,
  "result": "AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_FAILED_NOT_READY"
}
```

## Stop Conditions

Stop immediately and report `BLOCKED_CM0590_EVIDENCE_REQUIRED` if:

- there is no separately approved CM-0590 execution evidence
- the CM-0590 evidence does not match the current target baseline
- the CM-0590 evidence does not prove token boundary established/present and endpoint healthy

Stop immediately and report `BLOCKED_A5_OR_EXPLICIT_APPROVAL_REQUIRED` if execution would require:

- `search_memory`
- any marker search
- any second write
- `.jsonl` read
- `observe:http`
- provider/model call
- config mutation
- watchdog/startup persistence
- public MCP expansion
- migration/import/export/backup/restore apply
- push/tag/release/deploy/cutover
- any readiness claim

Stop and report `BLOCKED_BASELINE_REBIND_REQUIRED` if:

- target baseline is not current `HEAD`
- `origin/main` diverged
- remote main diverged
- uncommitted unrelated non-docs/board drift exists

## Required Approval Line

Suggested future approval line:

```text
授权执行 CM-0591，target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f，只允许 AUTHORIZED_WRITE_PATH_VALIDATION_AFTER_ENABLEMENT_001，并且仅在同一 baseline 下已存在经批准执行的 CM-0590 enablement evidence 且其证明当前 session token boundary 已建立或已存在、loopback endpoint healthy 的前提下，允许 exactly one sanitized durable memory write through public record_memory and only the normal write-path audit side effect；禁止 search_memory / marker search / observe:http / .jsonl read / provider / config change / watchdog or startup persistence / public MCP expansion / additional durable write / readiness claim。
```

## Current State

```text
current controlling prerequisite packet: CM-0590
cm0590 execution evidence present: no
authorized public write-path validated after enablement: not yet attempted
controlling status: RC_NOT_READY_BLOCKED
```

## Next Safe Action

Use CM-0591 as the historical blocked post-enable packet.

Do not reuse it directly from CM-0592, because the approved condition required CM-0590 evidence itself to prove both token boundary and endpoint health.

Treat CM-0594, CM-0597, and CM-0599 as consumed historical evidence. Wait until token material independently exists in the current session, then use CM-0601 as the prepared rebound boundary, then use CM-0595 as the refined write-validation successor.
