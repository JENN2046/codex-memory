# CM-0565 Foundation Reliability Exact-Approval Baseline Refresh

Status: CM_0565_READY_FOR_COMMIT_NOT_APPROVED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note refreshes the Phase 1 Foundation Reliability exact-approval boundary after CM-0563 and CM-0564.

It does not execute `AUTH_WRITE_PATH_VALIDATION_001`.

It does not execute `BOUNDED_RECALL_VALIDATION_001`.

It does not call true live `record_memory`.

It does not call true live `search_memory`.

It does not write durable memory or durable audit state.

It does not read `.jsonl` audit files or real memory content.

It does not run provider calls, HTTP observe, compare, rollback, migration/import/export/backup/restore apply, config switches, watchdog/startup changes, public MCP expansion, tag, release, deploy, cutover, or readiness claims.

## Current Baseline

Local baseline observed before this refresh:

```text
branch: main
local HEAD: 77dec659d9a16b9795eab7fb1e9bf88798bcdc7c
local tracking state: main...origin/main
controlling status: RC_NOT_READY_BLOCKED
```

Remote live verification note:

```text
git ls-remote origin refs/heads/main failed with a GitHub connection timeout during this refresh preflight.
```

Therefore, any future exact approval must re-run live remote verification before executing runtime validation.

## Evidence Since CM-0562

CM-0562 remains the controlling exact-approval packet for the next Phase 1 live validation boundary.

Since CM-0562 was created:

- CM-0563 added fixture-only evidence that aborted synthetic candidate generation skips candidate cache writes.
- CM-0564 added fixture-only evidence that aborted synthetic recall pipeline skips recall audit writes.
- CM-0564 was pushed and reconciled at `77dec659d9a16b9795eab7fb1e9bf88798bcdc7c`.

These are local fixture and docs/board evidence only.

They do not prove memory write reliability.

They do not prove memory recall reliability.

They do not close any runtime gap in `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`.

## Updated Approval Boundary

The next exact approval should bind to the current target baseline only after fresh preflight:

```text
target baseline: <fresh git rev-parse HEAD>
remote main: <fresh git ls-remote origin refs/heads/main>
worktree: clean
packet: docs/CM-0562_FOUNDATION_RELIABILITY_EXACT_APPROVAL_PACKET.md
refresh note: docs/CM-0565_FOUNDATION_RELIABILITY_EXACT_APPROVAL_BASELINE_REFRESH.md
```

If live remote verification fails, execution remains blocked.

If `HEAD`, `origin/main`, or remote main drift after this note, the target baseline must be rebound before any true write or true recall validation.

## Still Blocked Without Exact Approval

The following remain blocked:

- exactly one sanitized durable memory write through `record_memory`
- normal write-path audit side effect
- exactly one bounded true live `search_memory` validation query
- bounded read-path side effects not explicitly named in the approval
- reading `.jsonl` audit files
- reading real memory content
- broad real memory scan
- provider/model call
- config/watchdog/startup change
- public MCP expansion
- migration/import/export/backup/restore apply
- readiness claim

## Required Future Approval Shape

The future approval should name:

```text
CM-0562
CM-0565
target baseline = <fresh full commit>
remote main = <fresh full commit>
allowed unit(s): AUTH_WRITE_PATH_VALIDATION_001 and/or BOUNDED_RECALL_VALIDATION_001
allowed write count, if any: exactly one sanitized durable memory write
allowed recall query count, if any: exactly one bounded search_memory validation query
forbidden: provider / broad scan / .jsonl read / real private memory content exposure / public MCP expansion / readiness claim
```

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

Run docs-only validation for this refresh and commit it locally.

Do not execute CM-0562 live validation until a future exact approval binds the target baseline and live remote state.
