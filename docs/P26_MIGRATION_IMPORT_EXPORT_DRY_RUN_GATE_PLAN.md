# P26 Migration Import-Export Dry-Run Gate Plan

Status: planning only

## 1. Purpose

P26 defines the v1.0 migration/import-export dry-run gate before any real migration, import, export, backup restore, or durable data rewrite can be proposed.

This phase does not implement a new CLI. It consolidates the existing P13/P18/P23 migration and import/export evidence into a release-gate contract with explicit pass, warn, and block semantics.

## 2. Current Evidence Base

Existing evidence already available:

- P13 object model fixture and round-trip fixtures.
- P13 SQLite/diary object mapping fixture tests.
- P13 fixture-safe mapping dry-run CLI: `npm run vcp-memory:mapping:dry-run -- --json`.
- P13 import/export-safe JSON shape fixture tests.
- P13 migration readiness report: `npm run vcp-memory:migration-readiness -- --json`.
- P18 import/export and migration safety planning, fixture inventory, dry-run evidence gate, backup/rollback safety review, and closeout review.
- P23.6 migration/import-export readiness plan.
- P23.9 blocker burn-down plan, which routes migration/import-export dry-run gate planning to P26.

P26 is not an apply phase. It is the gate plan that decides what evidence is required before any apply-phase approval packet can be considered.

## 3. Gate Scope

The dry-run gate should answer:

- Is the current object model fixture evidence present?
- Is mapping dry-run evidence available and non-mutating?
- Is migration readiness blocked by expected approvals rather than missing safety primitives?
- Is import/export envelope shape evidence present?
- Are backup and rollback requirements explicit before apply?
- Are scope, lifecycle, visibility, and audit boundaries represented?
- Are raw secrets and raw workspace identifiers excluded from low-risk summaries?
- Is public MCP contract still frozen to `record_memory`, `search_memory`, and `memory_overview`?

The gate must not decide to apply migration/import/export.

## 4. Gate Inputs

Planned read-only inputs:

```text
docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md
docs/VCP_MEMORY_OBJECT_MAPPING_DRY_RUN_PLAN.md
docs/P13_OBJECT_MODEL_CLOSEOUT_REVIEW.md
docs/P18_IMPORT_EXPORT_MIGRATION_SAFETY_PLAN.md
docs/P18_IMPORT_EXPORT_MIGRATION_CLOSEOUT_REVIEW.md
tests/fixtures/vcp-memory-object-mapping-dry-run-v1.json
tests/fixtures/vcp-memory-import-export-shape-v1.json
```

Fixture-safe command evidence may include, in a later scoped execution phase:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
node --test tests\vcp-memory-import-export-shape.test.js
node --test tests\vcp-memory-migration-readiness-cli.test.js
```

This P26 planning slice does not run those commands.

## 5. Proposed Gate Output Shape

Future gate output should be stable and machine-readable:

```json
{
  "schema": "codex-memory.migration-import-export-dry-run-gate.v1",
  "status": "blocked",
  "decision": "NOT_READY_BLOCKED",
  "mutated": false,
  "providerCalls": 0,
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "checks": {
    "objectModelFixtures": "present",
    "mappingDryRun": "fixture_only_ready",
    "migrationReadiness": "blocked_pending_approval",
    "importExportEnvelope": "fixture_shape_present",
    "backupRollback": "plan_present_apply_blocked",
    "scopeLifecycleAudit": "represented",
    "secretWorkspaceExposure": "not_exposed"
  },
  "requiredApprovals": [
    "sqlite_migration_apply",
    "import_export_apply",
    "backup_restore_overwrite",
    "broad_real_memory_export"
  ],
  "nextStep": "review-dry-run-evidence-before-apply-approval"
}
```

The normal pre-approval state is expected to be `blocked` / `NOT_READY_BLOCKED`, because apply actions remain A5-gated.

## 6. Pass / Warn / Block Semantics

Pass means:

- fixture and dry-run evidence is present;
- reports preserve `mutated=false`;
- public MCP tools remain frozen;
- low-risk summaries do not expose raw secrets or raw workspace ids;
- backup and rollback requirements are explicit.

Warn means:

- evidence is fixture-only or stale but still non-mutating;
- apply remains blocked but planning can continue;
- a future scoped fixture/test slice is needed before any apply packet.

Block means:

- any apply/mutate/confirm behavior is attempted;
- public MCP contract changes;
- package scripts are added without approval;
- real memory export/import is attempted;
- SQLite migration, backup restore, or durable rewrite is attempted;
- provider/model calls are required;
- secret or raw workspace identifiers appear in low-risk summaries.

## 7. Hard Stops

Stop before:

- SQLite migration apply.
- import/export apply.
- backup creation or restore that touches live state.
- broad real memory export.
- real memory import.
- durable memory rewrite.
- public MCP tool or schema expansion.
- package script wiring.
- provider/model calls.
- service startup unless explicitly scoped.
- config/env/secret edits.
- push, tag, release, or deploy.

## 8. Future Phase Split

Recommended sequence:

1. `P26.1-migration-import-export-dry-run-gate-fixture-contract`
   - Add a synthetic fixture for the proposed gate output shape.
   - No runtime code and no real data.
2. `P26.2-migration-import-export-dry-run-gate-cli-plan`
   - Plan a direct-node fixture-only CLI only after fixture contract exists.
   - Keep source mode fixture-only by default.
3. `P26.3-migration-import-export-dry-run-gate-implementation`
   - Only if separately approved as a scoped A2/A3 source/test slice.
   - Must remain read-only and non-mutating.
4. `P26.x-closeout-review`
   - Summarize evidence and decide whether an apply approval packet can be drafted.

Do not skip from this plan to apply.

## 9. Validation For This Planning Phase

Docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
rg -n "P26|migration/import-export|dry-run|apply|real memory|provider|public MCP" docs\P26_MIGRATION_IMPORT_EXPORT_DRY_RUN_GATE_PLAN.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md STATUS.md
```

No source tests are required for this planning slice because it does not change source, tests, package manifests, fixtures, or runtime behavior.

## 10. Current Decision

Decision: `P26_DRY_RUN_GATE_PLANNING_ONLY`.

The repository has enough prior P13/P18/P23 evidence to plan the gate, but it does not yet have a dedicated P26 gate fixture or implementation.

Next safe action after this plan is a separate `P26.1` fixture-contract slice. That next slice must remain synthetic and non-mutating.

## 11. P26.1 Fixture Contract Result

P26.1 adds a synthetic fixture/test contract:

- fixture: `tests/fixtures/migration-import-export-dry-run-gate-v1.json`
- test: `tests/migration-import-export-dry-run-gate-fixture.test.js`

The fixture locks:

- `schema=codex-memory.migration-import-export-dry-run-gate.v1`
- `decision=NOT_READY_BLOCKED`
- `mutated=false`
- `providerCalls=0`
- public MCP tools exactly `record_memory`, `search_memory`, and `memory_overview`
- required approval list for SQLite migration apply, import/export apply, backup restore overwrite, and broad real memory export
- safety flags that forbid real memory scan/export/import, migration/import-export apply, backup restore, durable writes, provider calls, public MCP expansion, push, tag, release, and deploy
- raw secret and raw workspace exposure guards
- no rewrite-on-read behavior

P26.1 remains fixture/test only. It does not implement a CLI, add a package script, scan real memory, run migration/import-export apply, create or restore backups, write durable state, call providers, expand public MCP tools, push, tag, release, or deploy.

## 12. P26.2 CLI Plan

P26.2 plans a future direct-node, fixture-only CLI for the P26 dry-run gate. It does not implement that CLI.

Future candidate files, if separately approved in P26.3:

- `src/cli/migration-import-export-dry-run-gate.js`
- `tests/migration-import-export-dry-run-gate-cli.test.js`

P26.2 does not add those files.

### Source Mode

The future CLI should default to:

```text
sourceMode=fixture
```

Allowed future source modes:

| Mode | Default | Notes |
|---|---|---|
| `fixture` | yes | Reads only `tests/fixtures/migration-import-export-dry-run-gate-v1.json` |
| `real-memory-preview` | no | Blocked until a separate explicit approval packet exists |
| `apply` | no | Forbidden for this CLI family |

### Future Invocation

Future direct-node invocation:

```powershell
node .\src\cli\migration-import-export-dry-run-gate.js --json
```

No npm package script should be added in P26.2. Package script wiring, if ever needed, must be separately approved after a working direct-node CLI exists.

### Future Output Contract

The future CLI should emit the same shape as the P26.1 fixture:

- schema `codex-memory.migration-import-export-dry-run-gate.v1`
- status `blocked`
- decision `NOT_READY_BLOCKED`
- `mutated=false`
- `providerCalls=0`
- public MCP three-tool freeze
- checks for object model fixtures, mapping dry-run, migration readiness, import/export envelope, backup rollback, scope/lifecycle/audit, and secret/workspace exposure
- required approvals
- safety flags
- `nextStep=review-dry-run-evidence-before-apply-approval`

### Rejected Flags

The future CLI must reject:

```text
--apply
--confirm
--migrate
--import
--export
--backup
--restore
--real-memory
--provider
--push
--tag
--release
--deploy
```

Rejected output should be valid JSON in `--json` mode, keep `mutated=false`, and preserve enough top-level shape for downstream report consumers.

### Future Validation Matrix

Future P26.3 implementation validation should include:

```powershell
node --check .\src\cli\migration-import-export-dry-run-gate.js
node --check .\tests\migration-import-export-dry-run-gate-cli.test.js
node --test .\tests\migration-import-export-dry-run-gate-cli.test.js
node --test .\tests\migration-import-export-dry-run-gate-fixture.test.js
node .\src\cli\migration-import-export-dry-run-gate.js --json
node .\src\cli\migration-import-export-dry-run-gate.js --json --apply
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Broad `npm test` is recommended before any guarded local commit that adds a new `tests/*.test.js` file.

### Stop Conditions

Stop before implementation if the future CLI requires:

- package script changes;
- real memory scan/export/import;
- SQLite migration apply;
- import/export apply;
- backup creation or restore touching live state;
- durable writes;
- provider/model calls;
- public MCP tool/schema expansion;
- service startup;
- config/env/secret edits;
- push, tag, release, or deploy.

P26.2 decision: `P26_DRY_RUN_GATE_CLI_PLANNED_NOT_IMPLEMENTED`.

Next safe action after P26.2 is either a guarded local commit or a separately scoped `P26.3` implementation plan/review. Do not implement the CLI from this planning text alone.

## 13. P26.3 Fixture-Only CLI Result

P26.3 adds a direct-node fixture-only CLI and targeted tests:

- CLI: `src/cli/migration-import-export-dry-run-gate.js`
- test: `tests/migration-import-export-dry-run-gate-cli.test.js`

The CLI reads only:

```text
tests/fixtures/migration-import-export-dry-run-gate-v1.json
```

It does not add an npm package script.

The CLI locks:

- `--json` fixture report output;
- `status=blocked`;
- `decision=NOT_READY_BLOCKED` for the normal fixture report;
- `mutated=false`;
- `providerCalls=0`;
- public MCP tools exactly `record_memory`, `search_memory`, and `memory_overview`;
- non-mutating safety flags for real memory scan/export/import, migration apply, import/export apply, backup restore, durable writes, provider calls, public MCP expansion, push, tag, release, and deploy;
- fail-closed JSON output for unsafe flags;
- non-fixture source modes rejected as invalid input;
- no raw secret, raw workspace id, or raw local path exposure in normal output.

Rejected unsafe flags:

```text
--apply
--confirm
--migrate
--import
--export
--backup
--restore
--real-memory
--provider
--push
--tag
--release
--deploy
```

P26.3 remains local and fixture-only. It does not scan real memory, export/import real memory, run SQLite migration apply, run import/export apply, create or restore backups, write durable state, call providers, expand public MCP tools, start services, change config/env/secrets, push, tag, release, or deploy.

P26.3 decision: `P26_DRY_RUN_GATE_FIXTURE_ONLY_CLI_IMPLEMENTED`.
