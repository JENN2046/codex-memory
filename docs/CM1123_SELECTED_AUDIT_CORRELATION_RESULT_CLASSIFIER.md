# CM-1123 Selected Audit Correlation Result Classifier

Status: `CM1123_SELECTED_AUDIT_CORRELATION_RESULT_CLASSIFIER_COMPLETED_NOT_EXECUTED_NOT_READY`
Date: 2026-05-26
Area: P8-memory-governance / P9-codex-claude-client-scope / P0-mainline-health
Lane: Green local source/test helper

## Purpose

CM-1123 turns the CM-1119 selected audit-correlation interpretation matrix into a pure explicit-input classifier:

```text
source=src/core/SelectedAuditCorrelationResultClassifier.js
test=tests/selected-audit-correlation-result-classifier.test.js
entry=classifySelectedAuditCorrelationObservation(...)
```

The helper classifies a caller-supplied selected audit-correlation observation only after a caller-supplied CM-1121-style preflight summary is accepted.

It performs no file reads, no command execution, no true audit-log read, no raw audit/store/diary/`.jsonl` read, no metadata-store read, no memory tool call, no provider/API call, no durable memory/audit write, no tombstone/cleanup/rollback/migration/import/export/backup/restore apply, no public MCP expansion, and no config/watchdog/startup/package change.

## Accepted Inputs

The classifier accepts only explicit values supplied by the caller:

```text
preflightSummary
observation
followup
```

The preflight summary is normalized to these booleans:

```text
acceptedForExecutionPreflight
exactApprovalLineMatched
requestHashMatched
cleanTargetHead
requiredPriorResultsBound
currentArtifactsBound
observationSurfaceBound
boundaryFlagsBound
executionStarted
auditObservationStarted
```

The observation must be selected-field only:

```text
selectedFieldsOnly=true
rawAuditReturned=false
```

The expected selected audit family remains bound to the CM-1121 surface:

```text
memoryId=codex-process-50325be15fdb479d805728fe420b4838
eventType=memory_tombstone
toolName=tombstone-memory
requestSource=CM-1111-PROOF-MEMORY-RETENTION-APPLY-APPROVAL-001
pending.auditPhase=pending
pending.mutationApplied=false
committed.auditPhase=committed
committed.mutationApplied=true
fromStatus=active
toStatus=tombstoned
```

## Result Classes

CM-1123 preserves the CM-1119 result classes:

```text
DRAFT_ONLY_NO_EVIDENCE
FAIL_CLOSED_PRIOR_RESULTS_MISSING
FAIL_CLOSED_APPROVAL_INVALID
INVALID_SCOPE_EXPANSION
INVALID_RAW_OR_SECRET_OUTPUT
FAIL_CLOSED_READER_UNAVAILABLE
FAIL_CLOSED_AUDIT_READ_FAILED
AUDIT_CORRELATION_NOT_FOUND
AUDIT_MEMORY_ID_MISMATCH
AUDIT_EVENT_FAMILY_MISMATCH
AUDIT_REQUEST_SOURCE_MISMATCH
AUDIT_PENDING_MISSING
AUDIT_COMMITTED_MISSING
AUDIT_CORRELATION_ID_MISMATCH
AUDIT_PHASE_OR_MUTATION_FLAG_MISMATCH
AUDIT_LIFECYCLE_TRANSITION_MISMATCH
AUDIT_OBSERVED_BUT_METADATA_LIFECYCLE_MISSING
AUDIT_OBSERVED_BUT_RECALL_SUPPRESSION_MISSING
AUDIT_SELECTED_CORRELATION_OBSERVED
```

## Downgrade Boundary

Only this final path allows a narrow blocker downgrade:

```text
resultClass=AUDIT_SELECTED_CORRELATION_OBSERVED
followup.metadataLifecycleObserved=true
followup.recallSuppressionObserved=true
blockerDowngradeAllowed=true
```

The downgrade is limited to:

```text
one exact-approved selected-field audit-correlation observation for the exact proof memory
```

All classifier outputs keep:

```text
reliabilityClaimAllowed=false
readinessClaimAllowed=false
```

## Validation

Targeted validation:

```text
node --check .\src\core\SelectedAuditCorrelationResultClassifier.js
node --check .\tests\selected-audit-correlation-result-classifier.test.js
node --test .\tests\selected-audit-correlation-result-classifier.test.js
```

Targeted test result:

```text
6/6 passed
```

Covered cases:

- favorable selected observation still requires metadata lifecycle and recall suppression follow-up before blocker downgrade.
- unstarted observation, missing prior results, invalid approval, unavailable artifacts, and scope drift fail closed.
- malformed observation, raw/secret-like output, invalid reader flags, and not-found observation classify separately.
- memory id, event family, request source, pending, committed, correlation id, phase/mutation, and lifecycle mismatch cases fail closed.
- preflight normalization works without reading files or running commands.

## Boundaries

CM-1123 is source/test/helper evidence only.

It does not approve or execute CM-1111, CM-1115, CM-1120, or any future selected audit observation. It does not run `tombstone-memory`, `record_memory`, `search_memory`, or `memory_overview`. It does not read true audit logs, raw audit payloads, raw memory, diary files, `.jsonl` files, metadata stores, or project runtime stores. It does not write durable project memory/audit state, execute apply/cleanup/rollback/migration/import/export/backup/restore, start a worker, call provider/API/model endpoints, expand public MCP tools, edit config/watchdog/startup/package files, push, tag, release, deploy, cut over, or claim readiness/reliability.

## Next

The next safe step remains no-execution unless the user provides separate exact approval and the current-facts preflight passes. Future execution must still be classified through CM-1123 and cannot produce `memory write reliable`, `memory recall reliable`, `RC_READY`, runtime readiness, production readiness, release readiness, or cutover readiness.
