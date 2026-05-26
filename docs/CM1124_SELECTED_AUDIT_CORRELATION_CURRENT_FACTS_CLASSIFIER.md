# CM-1124 Selected Audit Correlation Current-Facts Classifier

Status: `CM1124_SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_CLASSIFIER_COMPLETED_NO_OBSERVATION_NOT_READY`
Date: 2026-05-26
Area: P8-memory-governance / P9-codex-claude-client-scope / P0-mainline-health
Lane: Green local read-only CLI

## Purpose

CM-1124 connects the CM-1122 read-only current-facts preflight with the CM-1123 result classifier:

```text
cli=src/cli/selected-audit-correlation-current-facts-classifier.js
test=tests/selected-audit-correlation-current-facts-classifier-cli.test.js
```

The command collects read-only Git facts through the CM-1122 path, builds the CM-1123 preflight summary, and classifies the current no-observation state.

It intentionally does not accept observation input.

## Behavior

Default behavior:

```text
collect_current_git_facts=true
evaluate_CM1120_preflight=true
classify_no_observation_state=true
observation=null
```

Expected no-observation classification:

```text
resultClass=DRAFT_ONLY_NO_EVIDENCE
reason=audit_observation_not_started
blockerDowngradeAllowed=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

Even if synthetic current facts are preflight-ready in tests, the classifier remains no-observation:

```text
currentFactsAcceptedForExecutionPreflight=true
resultClass=DRAFT_ONLY_NO_EVIDENCE
blockerDowngradeAllowed=false
```

## Rejected Flags

CM-1124 inherits CM-1122 execution/mutation/raw-input rejected flags and adds explicit observation/input-file rejections:

```text
--observation
--observation-file
--input
--input-file
--audit-json
--audit-log
```

Rejected flags stop before current-facts collection and before classifier execution.

## Validation

Targeted validation:

```text
node --check .\src\cli\selected-audit-correlation-current-facts-classifier.js
node --check .\tests\selected-audit-correlation-current-facts-classifier-cli.test.js
node --test .\tests\selected-audit-correlation-current-facts-classifier-cli.test.js
```

Targeted test result:

```text
6/6 passed
```

Adjacent validation:

```text
node --test .\tests\selected-audit-correlation-result-classifier.test.js
node --test .\tests\selected-audit-correlation-current-facts-preflight-cli.test.js
```

Adjacent test results:

```text
CM-1123 classifier: 6/6 passed
CM-1122 current-facts preflight CLI: 7/7 passed
```

Real read-only CLI smoke:

```text
command=node .\src\cli\selected-audit-correlation-current-facts-classifier.js --json --pretty
status=blocked
currentFactsStatus=blocked
currentFactsBlockerReasons=dirty_worktree,prior_result_CM-1111_missing,prior_result_CM-1115_missing
dirtyStatusLineCount=41
resultClass=DRAFT_ONLY_NO_EVIDENCE
blockerDowngradeAllowed=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
readsObservationInput=false
readsTrueAuditLog=false
readsRawAudit=false
callsRecordMemory=false
callsSearchMemory=false
callsMemoryOverview=false
```

## Boundaries

CM-1124 is no-observation read-only classification evidence only.

It does not approve or execute CM-1120. It does not run `tombstone-memory`, `record_memory`, `search_memory`, or `memory_overview`. It does not read true audit logs, raw audit payloads, raw memory, diary files, `.jsonl` files, metadata stores, project runtime stores, or observation input files. It does not write durable project memory/audit state, execute apply/cleanup/rollback/migration/import/export/backup/restore, start a worker, call provider/API/model endpoints, expand public MCP tools, edit config/watchdog/startup/package files, push, tag, release, deploy, cut over, or claim readiness/reliability.

## Current Meaning

CM-1124 improves the governance rail by making the no-observation current state mechanically classifiable. It prevents a preflight-ready shape from being mistaken for selected audit evidence.

It does not prove actual audit correlation, metadata lifecycle, recall suppression, cleanup safety, rollback safety, memory write reliability, memory recall reliability, runtime readiness, RC readiness, production readiness, release readiness, or cutover readiness.
