# CM-1132 Selected Audit Correlation Dirty Scope Inventory

Status: `CM1132_SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_INVENTORY_COMPLETED_BLOCKED_NOT_MUTATED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1132 inventories the dirty worktree blocker that currently prevents CM-1131 from advancing to any approval request.

It reads only `git status --short`, buckets paths into known selected-audit-correlation evidence groups, and keeps all mutation and execution authority false.

## Added Surface

```text
helper=src/core/SelectedAuditCorrelationDirtyScopeInventory.js
cli=src/cli/selected-audit-correlation-dirty-scope-inventory.js
tests=tests/selected-audit-correlation-dirty-scope-inventory.test.js
tests=tests/selected-audit-correlation-dirty-scope-inventory-cli.test.js
```

## Current Real Smoke

Expected current class after this slice:

```text
inventoryClass=KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN
worktreeClean=false
unknownDirtyLineCount=0
commitAuthorized=false
cleanAuthorized=false
approvalRequestsAllowedNow=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

If unknown dirty paths appear, the class becomes `UNKNOWN_DIRTY_SCOPE_FAIL_CLOSED`.

## Buckets

Known dirty buckets are limited to:

```text
agent_board
status_surface
current_truth_table
cm_evidence_docs
selected_audit_correlation_cli
selected_audit_correlation_core
selected_audit_correlation_tests
audit_log_store_helper
```

This is an inventory, not a commit/staging plan and not cleanup authority.

## Boundaries

- No staging.
- No commit.
- No clean/reset/restore/delete.
- No CM-1111 approval or execution.
- No CM-1115 approval or execution.
- No CM-1120 approval or execution.
- No true audit log read.
- No observation input read.
- No raw audit read.
- No direct `.jsonl` read.
- No raw memory, raw store, diary, or metadata store read.
- No `record_memory`.
- No `search_memory`.
- No `memory_overview`.
- No durable project memory/audit write.
- No retention/tombstone/cleanup/rollback/migration/import/export/backup/restore apply.
- No provider/API call.
- No public MCP expansion.
- No config/watchdog/startup/package change.
- No push/tag/release/deploy/cutover.
- No readiness or reliability claim.

## Interpretation

CM-1132 can reduce ambiguity around the dirty-worktree blocker, but it does not resolve that blocker.

Current state remains `NOT_READY_BLOCKED` / `RC_NOT_READY_BLOCKED`. CM-1131 must be rerun after the worktree is clean or explicitly isolated through a separate human-reviewed decision.
