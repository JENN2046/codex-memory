# P63 Final RC Runtime Evidence Bridge

Phase: `P63-T1-final-rc-matrix-runner-real-execution-evidence-bridge`

Purpose: execute the local final RC matrix as a real allowlisted runner and feed sanitized command evidence into the existing ValidationAggregator evidence reader.

This bridge is local evidence only. It does not authorize or perform push, tag, release, deploy, config switch, watchdog/startup install, provider calls, real memory scans, migration/import/export/backup/restore apply, durable memory/audit writes, public MCP expansion, cutover, or `RC_READY`.

## Entry Point

```powershell
node .\src\cli\final-rc-matrix-runner.js --execute --json
```

Default mode is dry-run. Real local execution requires `--execute`.

## Allowlisted Matrix

- syntax checks for runtime schema helper, ValidationAggregator, runner core, and runner CLI
- targeted tests for runtime schema helper, runtime schema write-boundary guard, ValidationAggregator, and the P63 runner
- `npm run gate:ci -- --json`
- `npm run gate:mainline:strict -- --json`
- docs validation through `scripts/validate-local.ps1 -Area docs`
- `git diff --check`

The strict gate supplies local loopback health, MCP contract, full `npm test`, compare, and rollback evidence. The P63 report records only sanitized summaries, not raw command output.

## Completion Posture

When the matrix passes, P63 may locally evidence:

```text
runtime_schema_version_enforcement_not_fully_proven
final_rc_matrix_runner_not_executed_as_real_matrix
```

The following remain blocked or separately scoped:

```text
validation_aggregator_full_implementation_incomplete
governance_review_approval_audit_runtime_loop_not_executed
recall_isolation_runtime_proof_not_executed
migration_import_export_backup_restore_approval_execution_blocked
live_http_operation_readiness_not_claimed
mainline_strict_gate_not_executed_for_cutover
rc_cutover_not_executed
```

`mainline_strict_gate_not_executed_for_cutover` remains open because a fresh local strict gate is not the same thing as a cutover-authorized final gate.

## Safety Contract

The runner:

- uses a hardcoded local allowlist
- rejects A5 flags such as `--push`, `--tag`, `--release`, `--deploy`, `--config-switch`, `--provider`, `--real-memory`, `--apply`, and `--rc-ready`
- does not add a package script
- emits `NOT_READY_BLOCKED`
- keeps `runtimeReady`, `finalRcMatrixReady`, `v1RcReady`, and `rcReady` false
- forwards sanitized local validation evidence into `buildV1RcValidationAggregatorReport`
