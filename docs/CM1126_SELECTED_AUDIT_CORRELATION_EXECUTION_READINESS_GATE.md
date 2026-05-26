# CM-1126 Selected Audit Correlation Execution Readiness Gate

Status: `CM1126_SELECTED_AUDIT_CORRELATION_EXECUTION_READINESS_GATE_COMPLETED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1126 adds a local explicit-input gate for the CM-1120 selected audit-correlation path.

It exists to prevent three operator mistakes:

- treating CM-1124 no-observation current-facts output as selected audit evidence
- treating missing CM-1111 / CM-1115 prior results as executable CM-1120 state
- treating any favorable selected audit observation as `memory write reliable`, `memory recall reliable`, or readiness

## Added Surface

```text
src/core/SelectedAuditCorrelationExecutionReadiness.js
tests/selected-audit-correlation-execution-readiness.test.js
```

The helper consumes only explicit input:

```text
preflightSummary
classification
```

It does not read files, run commands, read audit logs, accept observation input, call memory tools, call providers, write durable state, or apply mutations.

## Result Classes

```text
BLOCKED_PREFLIGHT_NOT_READY
READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED
SELECTED_AUDIT_OBSERVED_BUT_FOLLOWUP_MISSING
SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY
FAIL_CLOSED_CLASSIFICATION_MISSING
FAIL_CLOSED_PREFLIGHT_INCONSISTENT
FAIL_CLOSED_INVALID_OVERCLAIM_SIGNAL
FAIL_CLOSED_INVALID_DOWNGRADE_SIGNAL
FAIL_CLOSED_UNFAVORABLE_CLASSIFICATION
```

The only downgrade-positive class is:

```text
SELECTED_AUDIT_CORRELATION_DOWNGRADE_ALLOWED_NOT_READY
```

That class requires CM-1123 classification result `AUDIT_SELECTED_CORRELATION_OBSERVED` and still keeps:

```text
readinessClaimAllowed=false
reliabilityClaimAllowed=false
observationExecutionAuthorizedByThisHelper=false
```

## Current Meaning

Against the current CM-1124 state, the expected result is still blocked because current facts reported:

```text
dirty_worktree
prior_result_CM-1111_missing
prior_result_CM-1115_missing
```

Therefore CM-1126 does not make CM-1120 executable.

## Validation

```text
node --check .\src\core\SelectedAuditCorrelationExecutionReadiness.js
node --check .\tests\selected-audit-correlation-execution-readiness.test.js
node --test .\tests\selected-audit-correlation-execution-readiness.test.js
```

Targeted test covers:

- blocked current-facts state with missing prior results
- preflight-ready but no-observation state
- inconsistent accepted preflight summaries and favorable observations not tied to started execution
- invalid readiness/reliability overclaim signal
- invalid downgrade signal on non-favorable result
- selected audit observed but follow-up missing
- favorable selected audit plus follow-up allowing only narrow downgrade and still denying readiness/reliability

## Boundary

CM-1126 does not:

- approve CM-1120
- execute CM-1120
- read true audit logs
- read observation input
- read raw audit, raw memory, store, diary, `.jsonl`, or metadata store
- call `record_memory`
- call `search_memory`
- call `memory_overview`
- run `tombstone-memory`
- write durable project memory or audit
- apply retention, tombstone, cleanup, rollback, migration, import, export, backup, or restore
- call provider/model/API
- expand public MCP tools
- change config, watchdog, startup, package, or lockfile
- push, tag, release, deploy, or cut over
- claim `memory write reliable`, `memory recall reliable`, runtime readiness, RC readiness, production readiness, release readiness, or cutover readiness
