# CM-1127 Selected Audit Correlation Current-Facts Readiness CLI

Status: `CM1127_SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_READINESS_CLI_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1127 exposes the CM-1126 execution-readiness gate through a read-only current-facts CLI.

It composes:

```text
CM-1122 current Git facts preflight
CM-1123 selected audit-correlation classifier
CM-1124 current-facts no-observation classifier wrapper
CM-1126 execution-readiness gate
```

## Added Surface

```text
src/cli/selected-audit-correlation-current-facts-readiness.js
tests/selected-audit-correlation-current-facts-readiness-cli.test.js
```

The CLI collects only read-only local Git facts through the existing CM-1122 path. It does not accept observation input.

Rejected flags include inherited execution/raw/mutation flags and observation/audit input flags such as:

```text
--observation
--observation-file
--input
--input-file
--audit-json
--audit-log
--audit-read
--record-memory
--search-memory
--memory-overview
--apply
```

## Expected Current Meaning

Against current dirty worktree facts, the CLI should remain blocked:

```text
status=blocked
readinessClass=BLOCKED_PREFLIGHT_NOT_READY
blockerDowngradeAllowed=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

Even with synthetic clean current facts and satisfied prior-result fixtures, no selected audit observation is read, so the strongest state remains:

```text
READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED
```

## Validation

```text
node --check .\src\cli\selected-audit-correlation-current-facts-readiness.js
node --check .\tests\selected-audit-correlation-current-facts-readiness-cli.test.js
node --test .\tests\selected-audit-correlation-current-facts-readiness-cli.test.js
```

Targeted test covers:

- dirty or missing-prior current facts -> `BLOCKED_PREFLIGHT_NOT_READY`
- preflight-ready synthetic facts -> `READY_FOR_SEPARATE_EXACT_SELECTED_OBSERVATION_NOT_EXECUTED`
- rejected observation/audit flags stop before Git collection
- help/text output remains no-execution

## Boundary

CM-1127 does not:

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
