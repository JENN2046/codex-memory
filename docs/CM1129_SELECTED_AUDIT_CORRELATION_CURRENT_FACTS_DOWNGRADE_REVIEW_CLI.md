# CM-1129 Selected Audit Correlation Current-Facts Downgrade Review CLI

Status: `CM1129_SELECTED_AUDIT_CORRELATION_CURRENT_FACTS_DOWNGRADE_REVIEW_CLI_COMPLETED_BLOCKED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-26

## Purpose

CM-1129 exposes the CM-1128 blocker-downgrade review guard through a read-only current-facts CLI.

It composes:

```text
CM-1127 current-facts readiness CLI
CM-1128 explicit-input blocker-downgrade review guard
```

## Added Surface

```text
src/cli/selected-audit-correlation-current-facts-downgrade-review.js
tests/selected-audit-correlation-current-facts-downgrade-review-cli.test.js
```

The CLI collects only read-only local Git facts through the existing CM-1127 path. It does not accept observation input.

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

## Current Meaning

Against current dirty worktree facts, the CLI remains blocked:

```text
status=blocked
readinessClass=BLOCKED_PREFLIGHT_NOT_READY
reviewClass=BLOCKED_CURRENT_FACTS_NOT_READY
currentFactsBlockerReasons=dirty_worktree,prior_result_CM-1111_missing,prior_result_CM-1115_missing
blockerDowngradeAllowed=false
readinessClaimAllowed=false
reliabilityClaimAllowed=false
```

Even with synthetic clean current facts and satisfied prior-result fixtures, no selected audit observation is read, so the review remains:

```text
READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE
```

## Validation

```text
node --check .\src\cli\selected-audit-correlation-current-facts-downgrade-review.js
node --check .\tests\selected-audit-correlation-current-facts-downgrade-review-cli.test.js
node --test .\tests\selected-audit-correlation-current-facts-downgrade-review-cli.test.js
node --test .\tests\selected-audit-correlation-current-facts-downgrade-review-cli.test.js .\tests\selected-audit-correlation-blocker-downgrade-review.test.js .\tests\selected-audit-correlation-current-facts-readiness-cli.test.js .\tests\selected-audit-correlation-execution-readiness.test.js .\tests\selected-audit-correlation-result-classifier.test.js
node .\src\cli\selected-audit-correlation-current-facts-downgrade-review.js --json --pretty
```

Targeted test covers:

- dirty or missing-prior current facts -> `BLOCKED_CURRENT_FACTS_NOT_READY`
- preflight-ready synthetic facts -> `READY_FOR_SEPARATE_EXACT_OBSERVATION_NOT_DOWNGRADE`
- rejected observation/audit flags stop before Git collection
- help/text output remains no-execution

## Boundary

CM-1129 does not:

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
