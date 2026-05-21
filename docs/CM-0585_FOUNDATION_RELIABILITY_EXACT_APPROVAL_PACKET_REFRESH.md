# CM-0585 Foundation Reliability Exact-Approval Packet Refresh

Status: CM_0585_READY_FOR_COMMIT_NOT_APPROVED
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

This note refreshes the current Phase 1 / exact-A5 packet boundary after CM-0584.

It does not execute `AUTH_WRITE_PATH_VALIDATION_001`.

It does not execute `BOUNDED_RECALL_VALIDATION_001`.

It does not call true live `record_memory`.

It does not call true live `search_memory`.

It does not write durable memory or durable audit state.

It does not read `.jsonl` audit files or broad real memory content.

It does not call providers, start or observe HTTP, run compare/rollback, apply migration/import/export/backup/restore, switch config, install watchdog/startup entries, expand public MCP, push, tag, release, deploy, cut over, or claim readiness.

## Current Baseline

Current Git reality observed for this refresh:

```text
branch: main
local HEAD: 017eda4930c5add4b824c162c46868f75c91ea0f
origin/main: 017eda4930c5add4b824c162c46868f75c91ea0f
remote refs/heads/main: 017eda4930c5add4b824c162c46868f75c91ea0f
worktree: clean
controlling status: RC_NOT_READY_BLOCKED
```

## Collector-Lane Conclusion

The current authoritative runtime map remains `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`.

That map now records fifteen explicit-input, fail-closed, validated, no-touch ValidationAggregator collector units through CM-0584.

No newer collector unit is explicitly named by the current truth table, the current collector registry tests, or the current runtime-proof collector wiring.

Therefore the next safe move is not to invent a sixteenth collector unit.

Therefore the next safe move is to refresh the exact A5 packet boundary to the current synced baseline.

This note is now historical: later CM-0589, CM-0592, and CM-0593 evidence narrowed the live next step away from direct `AUTH_WRITE_PATH_VALIDATION_001` and down to the token-only continuation packet.

## Packet Binding

Current packet stack:

```text
packet: docs/CM-0562_FOUNDATION_RELIABILITY_EXACT_APPROVAL_PACKET.md
refresh note: docs/CM-0585_FOUNDATION_RELIABILITY_EXACT_APPROVAL_PACKET_REFRESH.md
historical single-unit packet: docs/CM-0586_AUTH_WRITE_PATH_VALIDATION_001_SINGLE_UNIT_APPROVAL_PACKET.md
historical combined enablement packet: docs/CM-0590_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_PACKET.md
current approved enablement evidence: docs/CM-0592_AUTHORIZED_PUBLIC_WRITE_PATH_COMBINED_MINIMAL_ENABLEMENT_EVIDENCE.md
current live next exact unit: none until token material independently exists in the current session
historical consumed presence-only packet: docs/CM-0599_CURRENT_SESSION_TOKEN_PRESENCE_RECHECK_ONLY_PACKET.md
prepared rebound packet once the external prerequisite becomes true: docs/CM-0601_CURRENT_SESSION_TOKEN_PRESENCE_REBOUND_PACKET.md
```

Execution remains blocked unless a future exact approval names:

```text
target baseline = 017eda4930c5add4b824c162c46868f75c91ea0f or a later explicitly rebound commit
remote main = freshly re-read before execution
allowed unit(s) = AUTH_WRITE_PATH_VALIDATION_001 and/or BOUNDED_RECALL_VALIDATION_001
allowed write count, if any = exactly one sanitized durable memory write
allowed recall query count, if any = exactly one bounded search_memory validation query
```

If `HEAD`, `origin/main`, or remote main drift after this refresh, execution must stop and the packet must be rebound before any true write or true recall validation.

## Still Blocked Without Exact Approval

The following remain blocked:

- exactly one sanitized durable memory write through `record_memory`
- normal write-path audit side effect
- exactly one bounded true live `search_memory` validation query
- reading `.jsonl` audit files
- broad real memory scan
- provider/model call
- config/watchdog/startup change
- public MCP expansion
- migration/import/export/backup/restore apply
- readiness claim

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

Keep CM-0562 as the multi-unit planning packet and keep this refresh note as the baseline rebinding record for the `017eda...` packet family.

For the live next step, do not route back through CM-0586 directly and do not reuse consumed CM-0599, CM-0597, or CM-0594 directly. First wait until token material independently exists in the current session. Only then should CM-0601 be used as the prepared same-baseline presence-only rebound boundary, and only after that fresh token-present evidence succeeds should CM-0595 become the future split-evidence write packet.
