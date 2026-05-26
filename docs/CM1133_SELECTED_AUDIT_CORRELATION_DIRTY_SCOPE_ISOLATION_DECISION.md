# CM-1133 Selected Audit Correlation Dirty Scope Isolation Decision

Status: `CM1133_SELECTED_AUDIT_CORRELATION_DIRTY_SCOPE_ISOLATION_DECISION_COMPLETED_BLOCKED_NOT_MUTATED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1133 converts the CM-1132 dirty-scope inventory into a human-review isolation decision packet.

It prepares review bundles for a future explicit isolation or commit decision. It does not stage, commit, clean, reset, restore, approve, or execute anything.

## Added Surface

```text
helper=src/core/SelectedAuditCorrelationDirtyScopeIsolationDecision.js
cli=src/cli/selected-audit-correlation-dirty-scope-isolation-decision.js
tests=tests/selected-audit-correlation-dirty-scope-isolation-decision.test.js
tests=tests/selected-audit-correlation-dirty-scope-isolation-decision-cli.test.js
```

## Decision Classes

```text
CLEAN_SCOPE_RERUN_STAGE_GATE_NOT_APPROVAL
KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED
UNKNOWN_DIRTY_SCOPE_BLOCKED_NOT_MUTATED
FAIL_CLOSED_INVENTORY_MISSING
FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL
FAIL_CLOSED_UNSUPPORTED_INVENTORY_CLASS
```

## Review Bundles

Known dirty scope is grouped as:

```text
operator_status_surfaces
recall_proof_review_docs
write_governance_review_docs
selected_audit_correlation_chain
selected_audit_correlation_source_tests
audit_log_store_helper
```

These bundles are review inputs only, not a staging list and not commit authorization.

## Current Interpretation

For the current CM-1132 inventory:

```text
decisionClass=KNOWN_DIRTY_SCOPE_HUMAN_REVIEW_REQUIRED_NOT_MUTATED
humanReviewRequired=true
commitDecisionPrepared=true
commitAuthorized=false
cleanAuthorized=false
approvalRequestsAllowedNow=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

## Boundaries

- No staging.
- No commit.
- No clean/reset/restore/delete.
- No CM-1111 approval or execution.
- No CM-1115 approval or execution.
- No CM-1120 approval or execution.
- No file content read by the helper.
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

## Next

A separate explicit human-reviewed isolation or commit decision is still required before the dirty-worktree blocker can be resolved. After the worktree is clean or explicitly isolated, rerun CM-1131 before requesting any approval packet execution.
