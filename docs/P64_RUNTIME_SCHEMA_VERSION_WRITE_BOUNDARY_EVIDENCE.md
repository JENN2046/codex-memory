# P64 Runtime Schema-Version Write Boundary Evidence

Phase: `P64-T1-runtime-schema-version-write-boundary-proof`

Purpose: close the local runtime schema/version enforcement proof gap without expanding public MCP tools or touching real memory.

## Change

- `MemoryWriteService.record()` now rejects direct core payloads containing schema/version metadata keys before diary persistence.
- The public `record_memory` MCP schema remains frozen and still rejects `schema_version` / `schemaVersion` through `ToolArgumentValidator`.
- ValidationAggregator now reports schema/version runtime enforcement as a local runtime write-boundary guard, while keeping `NOT_READY_BLOCKED`.
- The final RC runtime evidence runner matrix now includes `tests/schema-version-runtime-boundary.test.js`.

Rejected metadata keys:

```text
schema_version
schemaVersion
policy_version
policyVersion
manifest_version
manifestVersion
```

## Evidence

Latest local runner summary:

```text
node .\src\cli\final-rc-matrix-runner.js --execute --json
generatedAt: 2026-05-18T03:59:06.834Z
critical gates: 12/12 passed
decision: NOT_READY_BLOCKED
rcReady: false
```

Locally evidenced runtime gaps:

```text
runtime_schema_version_enforcement_not_fully_proven
final_rc_matrix_runner_not_executed_as_real_matrix
```

Remaining runtime gaps:

```text
validation_aggregator_full_implementation_incomplete
governance_review_approval_audit_runtime_loop_not_executed
recall_isolation_runtime_proof_not_executed
migration_import_export_backup_restore_approval_execution_blocked
live_http_operation_readiness_not_claimed
mainline_strict_gate_not_executed_for_cutover
rc_cutover_not_executed
```

## Boundaries

This phase did not push, tag, release, deploy, switch config, install watchdog/startup tasks, call providers, scan real memory/runtime stores, apply migration/import/export/backup/restore, write real durable memory/audit state, expand public MCP tools, change dependencies, cut over, or claim `RC_READY`.
