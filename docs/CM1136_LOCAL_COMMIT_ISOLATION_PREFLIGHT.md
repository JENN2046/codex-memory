# CM-1136 Local Commit Isolation Preflight

Status: `CM1136_LOCAL_COMMIT_ISOLATION_PREFLIGHT_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1136 turns the CM-1135 draft approval packet into a no-execution preflight helper and CLI.

It checks a future exact approval line against current branch, current head, and CM-1132 dirty-scope inventory. It does not stage, commit, clean, reset, restore, push, approve CM-1111/CM-1115/CM-1120, or execute runtime proof.

## Added Surface

```text
helper=src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js
cli=src/cli/selected-audit-correlation-local-commit-isolation-preflight.js
tests=tests/selected-audit-correlation-local-commit-isolation-preflight.test.js
tests=tests/selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
```

## Preflight Classes

```text
BLOCKED_APPROVAL_MISSING
BLOCKED_APPROVAL_MISMATCH
BLOCKED_BRANCH_MISMATCH
BLOCKED_HEAD_MISMATCH
BLOCKED_INVENTORY_NOT_KNOWN_SCOPE
BLOCKED_UNKNOWN_DIRTY_SCOPE
FAIL_CLOSED_OVERCLAIM_OR_MUTATION_SIGNAL
ACCEPTED_FOR_SEPARATE_LOCAL_COMMIT_EXECUTION_NOT_EXECUTED
```

## Current Real Smoke

Command:

```powershell
node .\src\cli\selected-audit-correlation-local-commit-isolation-preflight.js --json --pretty
```

Result:

```text
status=blocked
preflightClass=BLOCKED_APPROVAL_MISSING
branch=main
head=16a9bf6ac0c74741c6b16c79e84fb61e1e7e194d
inventoryClass=KNOWN_CM_EVIDENCE_SCOPE_DIRTY_NOT_CLEAN
dirtyLineCount=80
unknownDirtyLineCount=0
approvalLineAccepted=false
localCommitExecutionAllowedNow=false
commitAuthorized=false
cleanAuthorized=false
pushAuthorized=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

## Validation

```text
node --check src/core/SelectedAuditCorrelationLocalCommitIsolationPreflight.js
node --check src/cli/selected-audit-correlation-local-commit-isolation-preflight.js
node --check tests/selected-audit-correlation-local-commit-isolation-preflight.test.js
node --check tests/selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
node --test tests/selected-audit-correlation-local-commit-isolation-preflight.test.js tests/selected-audit-correlation-local-commit-isolation-preflight-cli.test.js
```

Targeted tests passed `8/8`.

## Boundaries

- No staging.
- No commit.
- No push.
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
- No tag/release/deploy/cutover.
- No readiness or reliability claim.

## Next

If the user later provides the exact CM-1135 approval line, rerun this preflight first. A positive preflight still does not authorize push and must remain within the CM-1135 one-local-commit boundary.
