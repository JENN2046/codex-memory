# P25.4 Schema Compatibility Dry-Run CLI Plan

Phase: `P25.4-schema-compatibility-dry-run-cli-plan`

Status: planning documented; P25.5 fixture contract added

## 1. Purpose

This document plans a future schema compatibility dry-run CLI for `codex-memory`.

The goal is to define the CLI boundary before any implementation reads durable memory, changes runtime schema enforcement, adds package scripts, touches migration/import-export behavior, or writes compatibility results into durable state.

This phase does not implement a CLI.
This phase does not add a package script.
This phase does not implement runtime schema/version enforcement.
This phase does not run a real memory scan.
This phase does not run migration apply or import/export apply.
This phase does not write durable memory, SQLite rows, diary entries, vector indexes, audit logs, cache files, or rollback artifacts.
This phase does not start services, call providers, push, tag, release, or deploy.

## 2. Current Baseline

Current schema/version planning and evidence:

- [P23_2_SCHEMA_VERSIONING_PLAN.md](./P23_2_SCHEMA_VERSIONING_PLAN.md)
- [P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md](./P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md)
- [P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md](./P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md)
- [P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md](./P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md)
- [P25_1_SCHEMA_VERSION_ENFORCEMENT_FIXTURE_INVENTORY.md](./P25_1_SCHEMA_VERSION_ENFORCEMENT_FIXTURE_INVENTORY.md)

Current P25 evidence:

- P25.2 fixture policy tests define accepted, missing, and unknown schema-version behavior.
- P25.3 validation aggregator report shape exposes P25.2 policy fixture evidence.
- P25.5 fixture contract locks the planned dry-run report shape without implementing the CLI.
- runtime schema/version enforcement still reports as not implemented.
- public MCP tools remain exactly `record_memory`, `search_memory`, and `memory_overview`.

## 3. Future CLI Goal

Candidate future CLI name:

```powershell
node .\src\cli\schema-compatibility-dry-run.js --json
```

Candidate future npm script, if separately approved:

```powershell
npm run schema:compatibility:dry-run -- --json
```

The first implementation should prefer direct-node execution without a package script unless a dedicated phase approves package manifest changes.

The CLI should answer:

- which schema families are checked.
- which fixture or sandbox source was used.
- whether legacy missing-version records can be read through fallback policy.
- whether unknown versions are warnings, skips, or blockers by schema family.
- whether any compatibility issue would block future runtime enforcement.
- whether any action would mutate state.
- which A5 approvals remain required before real scans, migrations, import/export apply, or runtime enforcement.

## 4. Default Source Mode

Default mode must be fixture-only or sandbox-only.

Allowed default source candidates:

| Source mode | Allowed by default | Notes |
|---|---:|---|
| `fixture` | yes | Preferred first implementation; uses committed synthetic fixture data only |
| `sandbox` | yes, if explicitly scoped | Must point to a temporary test fixture path inside the repo |
| `real-memory-preview` | no | Requires separate explicit approval because it may read broad durable user memory |
| `real-memory-apply` | no | Forbidden for dry-run CLI |

The CLI must fail closed for unsupported source modes and for apply-like flags.

## 5. Future Allowed Files

For a later implementation phase, allowed files should be declared narrowly before editing.

Candidate implementation files:

- `src/cli/schema-compatibility-dry-run.js`
- `src/core/SchemaCompatibilityDryRunService.js`
- `tests/fixtures/schema-compatibility-dry-run-v1.json`
- `tests/schema-compatibility-dry-run-cli.test.js`
- `docs/P25_SCHEMA_COMPATIBILITY_DRY_RUN_CLI_PLAN.md`
- `docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `MAINTENANCE_BACKLOG.md`
- `STATUS.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/CHECKPOINT.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`

Candidate package script file:

- `package.json` only if a separate dedicated approval explicitly allows package script wiring.

Future implementation must still avoid unrelated runtime modules unless the implementation plan is revised and approved.

## 6. Disallowed Files And Actions

Disallowed by default:

- `src/adapters/**`
- `src/storage/**`
- real diary, SQLite, vector index, audit log, cache, provider, or client config files.
- `.env` and secrets.
- lockfiles and dependency manifests, unless package script wiring is explicitly approved.
- `.github/**`
- runtime data directories.
- Codex or Claude client config files.

Disallowed actions:

- adding or changing public MCP tools.
- changing public MCP schemas.
- implementing runtime schema/version enforcement.
- making version fields mandatory for existing durable records.
- scanning broad real memory.
- running migration/import-export apply.
- writing durable memory or audit logs.
- creating backup/restore artifacts.
- starting HTTP/stdio MCP services.
- running providers.
- pushing, tagging, releasing, or deploying.

## 7. Candidate Output Contract

The future JSON output should be stable enough for the validation aggregator to consume without claiming runtime enforcement is complete.

Candidate top-level shape:

```json
{
  "schema": "codex-memory.schema-compatibility-dry-run.v1",
  "phase": "P25.4",
  "decision": "DRY_RUN_COMPATIBLE_WITH_WARNINGS",
  "source": {
    "mode": "fixture",
    "fixture": "tests/fixtures/schema-compatibility-dry-run-v1.json",
    "realMemoryScanned": false
  },
  "summary": {
    "familiesChecked": 0,
    "recordsChecked": 0,
    "compatibleCount": 0,
    "warningCount": 0,
    "blockerCount": 0
  },
  "compatibility": {
    "missingVersionFallbackAccepted": true,
    "unknownReadVersionPolicy": "warn_or_skip_by_family",
    "unknownWriteVersionPolicy": "reject",
    "runtimeEnforcementImplemented": false,
    "migrationRequired": false
  },
  "families": [],
  "blockers": [],
  "warnings": [],
  "safety": {
    "dryRun": true,
    "mutated": false,
    "durableMemoryTouched": false,
    "migrationApplied": false,
    "importExportApplied": false,
    "providerCalls": 0,
    "serviceStarted": false,
    "rawSecretsExposed": false,
    "rawWorkspaceIdsExposed": false
  },
  "next": {
    "runtimeEnforcementStillBlocked": true,
    "requiresApprovalForRealMemoryScan": true,
    "requiresApprovalForMigrationApply": true
  }
}
```

Candidate decision labels:

- `DRY_RUN_COMPATIBLE`
- `DRY_RUN_COMPATIBLE_WITH_WARNINGS`
- `DRY_RUN_BLOCKED`
- `DRY_RUN_INVALID_INPUT`

The CLI must not output raw secret values, raw `.env` values, provider keys, authorization headers, cookies, private file contents, or raw workspace identifiers.

## 8. Candidate Flag Policy

Allowed first implementation flags:

```text
--json
--fixture <path>
--source-mode fixture
--strict
--help
```

Rejected flags:

```text
--apply
--confirm
--write
--mutate
--migrate
--import
--export
--real-memory
--provider
--start-service
--deploy
--release
--push
```

Rejected flags should emit the normal JSON contract with `decision=DRY_RUN_INVALID_INPUT`, `safety.mutated=false`, and a clear blocker entry.

## 9. Validation Plan

For this planning-only phase:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

For a future fixture-only CLI implementation:

```powershell
node --check .\src\cli\schema-compatibility-dry-run.js
node --check .\src\core\SchemaCompatibilityDryRunService.js
node --check .\tests\schema-compatibility-dry-run-cli.test.js
node --test .\tests\schema-compatibility-dry-run-cli.test.js
node .\src\cli\schema-compatibility-dry-run.js --json
node .\src\cli\schema-compatibility-dry-run.js --json --apply
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

For broader future validation, only after the fixture-only CLI passes:

```powershell
npm test
npm run gate:ci -- --json
```

Do not run `gate:mainline`, live MCP/HTTP refresh, provider smoke, provider benchmark, rebuild-profile confirm, cleanup apply, migration apply, or import/export apply for this planning phase.

For the P25.5 fixture-contract phase:

```powershell
node --check .\tests\schema-compatibility-dry-run-fixture.test.js
node --test .\tests\schema-compatibility-dry-run-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

P25.5 deliberately does not run `npm test` as a broad suite and does not execute any future CLI command because the CLI is not implemented in this phase.

## 10. Hard Stops

Stop and request explicit approval before:

- implementing runtime schema/version enforcement.
- adding package script wiring.
- scanning real durable memory.
- running SQLite migration apply or `ALTER TABLE`.
- applying import/export.
- writing durable memory, diary, SQLite, vector, audit, or cache state.
- creating backups or restore artifacts.
- changing public MCP tools or schemas.
- editing `.env`, secrets, provider keys, or client config.
- starting services or installing startup/watchdog tasks.
- running providers.
- pushing, tagging, releasing, or deploying.

## 11. Rollback Path

For this planning phase:

- remove this document and its docs/board references.
- no source, test, package, runtime, or durable data rollback is needed.

For a future fixture-only CLI implementation:

- remove `src/cli/schema-compatibility-dry-run.js`.
- remove `src/core/SchemaCompatibilityDryRunService.js`.
- remove `tests/fixtures/schema-compatibility-dry-run-v1.json`.
- remove `tests/schema-compatibility-dry-run-cli.test.js`.
- remove docs/board references.
- if a package script was separately approved, remove only that script entry.

No rollback should delete real memory, real SQLite data, diary files, audit logs, vector indexes, provider config, or client config.

## 12. Recommended Next Step

If P25.4 planning is accepted, the next safe local slice is:

```text
P25.5-schema-compatibility-dry-run-fixture-contract
```

That slice should add only synthetic fixture data and fixture tests before any CLI implementation. Runtime schema/version enforcement remains blocked until dry-run evidence and explicit approval exist.

## 13. P25.5 Fixture Contract Result

P25.5 adds:

- `tests/fixtures/schema-compatibility-dry-run-v1.json`
- `tests/schema-compatibility-dry-run-fixture.test.js`

The fixture is synthetic and fixture-only. It locks the planned dry-run report contract fields, accepted/missing/unknown policy counts, fail-closed `DRY_RUN_BLOCKED` semantics when blockers are present, no-side-effect safety flags, public MCP three-tool freeze, rejected flag list, and no raw secret/workspace exposure boundary.

P25.5 does not implement the CLI, add a package script, implement runtime schema/version enforcement, scan real memory, run migration/import-export apply, write durable state, start services, call providers, push, tag, release, or deploy.
