# P27 Migration Import-Export Approval Packet

Phase: `P27-migration-import-export-approval-packet`

Status: approval-packet planning

## Purpose

P27 defines the approval packet required before any non-fixture migration, import, export, backup, restore, or durable-memory operation can be proposed.

P27 is an approval packet, not an execution phase.

This phase is docs/status/board only. It does not scan real memory, read broad SQLite/diary/vector/audit/cache data, export or import real memory, run SQLite migration apply, run import/export apply, create backups, restore backups, write durable reports, start services, call providers, add package scripts, change public MCP tools or schemas, push, tag, release, or deploy.

## Current Evidence

P27 uses the P26 closeout as the current migration/import-export fact source:

- P26 planning, fixture contract, fixture-only CLI, and validation aggregator evidence are closed.
- P26 result is `P26_DRY_RUN_GATE_FIXTURE_ONLY_CHAIN_CLOSED`.
- P26 evidence is fixture-only and does not prove real durable-memory readiness.
- Expected decision remains `NOT_READY_BLOCKED` / `BLOCKED_PENDING_APPROVAL` until approved non-fixture evidence exists.

Reusable evidence sources:

- P13 object model, mapping, import/export shape, and migration readiness fixture evidence.
- P18 import/export/migration safety planning and backup/rollback safety route.
- P23.6 migration/import-export readiness plan.
- P26 dry-run gate fixture and fixture-only CLI evidence.
- P26.4 validation aggregator report-shape evidence.

## Non-Goals

P27 does not approve or perform:

- broad real-memory preview or scan
- real memory export
- real memory import
- SQLite migration apply or `ALTER TABLE`
- import/export apply
- backup creation
- restore or overwrite of live local state
- durable migration/import/export report writes
- provider/model calls
- service startup as a validation dependency
- package script wiring
- public MCP tool or schema expansion
- Codex/Claude config mutation
- push, tag, release, or deploy

## Approval Matrix

| Future action | Default status | Required explicit approval |
|---|---|---|
| Real-memory preview or scan | `BLOCKED_PENDING_APPROVAL` | exact data surfaces, read scope, redaction rules, output path, validation |
| Broad real memory export | `BLOCKED_PENDING_APPROVAL` | export scope, manifest shape, redaction policy, checksum, destination, retention |
| Real memory import | `BLOCKED_PENDING_APPROVAL` | source provenance, target scope, conflict rules, rollback plan, dry-run report |
| SQLite migration apply | `BLOCKED_PENDING_APPROVAL` | target DB path, migration SQL, backup, rollback, post-apply validation |
| Import/export apply | `BLOCKED_PENDING_APPROVAL` | manifest, checksums, dry-run evidence, backup, rollback, audit plan |
| Backup creation | `BLOCKED_PENDING_APPROVAL` | exact files, output directory, metadata redaction, retention, cleanup plan |
| Restore / overwrite live state | `BLOCKED_PENDING_APPROVAL` | target files, service isolation, verified backup, rollback of restore failure |
| Durable report write | `BLOCKED_PENDING_APPROVAL` | report path, content policy, secret/workspace redaction |
| Package script wiring | `BLOCKED_PENDING_APPROVAL` | script name, command, safety contract, tests |
| Public MCP expansion | `BLOCKED_PENDING_APPROVAL` | tool/schema proposal, compatibility review, strict gate |
| Provider/model call | `BLOCKED_PENDING_APPROVAL` | provider, purpose, secret handling, cost/rate expectations |
| Service startup | `BLOCKED_PENDING_APPROVAL` | command, port, health check, shutdown/cleanup path |
| Push/tag/release/deploy | `BLOCKED_PENDING_APPROVAL` | exact remote action, target ref, rollback/cleanup path |

## Real-Memory Preview Packet

Before any real-memory preview may run, the packet must define:

- exact read surfaces: SQLite, diary, vector index, audit log, cache, or config
- exact paths or discovery rules
- maximum record count or sampling rule
- fields allowed in low-risk output
- fields that must be redacted
- whether raw workspace identifiers are forbidden or hashed
- whether raw memory content may appear in output
- where preview output would be written, if anywhere
- validation command and expected `mutated=false`
- stop condition if secrets, provider keys, auth headers, cookies, `.env` values, or raw sensitive workspace identifiers appear

Default decision: `NOT_READY_BLOCKED`.

## Export Approval Packet

Before any real export may run, the packet must define:

- export envelope version
- source schema version
- source scope: client, workspace, project, task, conversation, visibility
- lifecycle status handling
- private/shared/project visibility preservation
- redaction policy
- manifest fields
- checksum strategy
- destination path and retention
- audit reference strategy
- dry-run report reference
- approval owner and timestamp expectations
- rollback or deletion path for generated export artifacts

Default decision: `NOT_READY_BLOCKED`.

## Import Approval Packet

Before any real import may run, the packet must define:

- source provenance and trust boundary
- source envelope version
- target schema version
- source and target scope mapping
- lifecycle status compatibility
- duplicate, conflict, supersession, tombstone, and proposal handling
- private/shared/project visibility policy
- checksum verification
- dry-run report
- backup requirement before apply
- rollback plan
- post-apply validation

Default decision: `NOT_READY_BLOCKED`.

## Backup And Restore Packet

Before backup creation may run, the packet must define:

- exact files and directories to copy
- output directory
- manifest fields
- checksum policy
- secret redaction in metadata
- retention and cleanup policy

Before restore may run, the packet must define:

- exact restore target files
- service isolation requirement
- backup manifest verification
- overwrite confirmation
- post-restore health check
- post-restore audit/read validation
- failure evidence retention

Restore that overwrites live local state remains blocked until explicitly approved.

Default decision: `NOT_READY_BLOCKED`.

## Rollback And Partial Failure Packet

Any future apply packet must define:

- fail-before-mutation checks
- invalid manifest behavior
- checksum failure behavior
- scope leak behavior
- backup missing behavior
- skipped versus failed record reporting
- rollback trigger conditions
- rollback validation
- public MCP contract validation after rollback
- audit/read consistency validation after rollback

Destructive rollback execution remains blocked until explicitly approved.

## Validation Matrix

P27 default validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
rg -n "P27|approval packet|BLOCKED_PENDING_APPROVAL|NOT_READY_BLOCKED|real-memory|backup|restore|import/export apply" docs\P27_MIGRATION_IMPORT_EXPORT_APPROVAL_PACKET.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md STATUS.md
```

Future approval packets may name additional validation, but P27 does not run those commands:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
npm run gate:ci -- --json
npm test
```

Future real actions require separate validation tied to the approved action.

## Stop Conditions

Stop immediately if the next step requires:

- broad real memory, SQLite, diary, vector, audit, cache, or client config reading
- real memory export or import
- SQLite migration apply
- import/export apply
- backup creation or restore
- durable writes
- runtime service startup
- provider/model calls
- package script changes
- public MCP tool/schema expansion
- config/env/secret edits
- push, tag, release, or deploy

## Required Wording

Use:

- P27 is an approval packet, not an execution phase.
- P26 evidence is fixture-only and does not prove real durable-memory readiness.
- Apply, backup/restore, real-memory preview, provider calls, and service/runtime actions remain blocked pending explicit approval.
- Expected decision remains `NOT_READY_BLOCKED` / `BLOCKED_PENDING_APPROVAL` until approved non-fixture evidence exists.

Do not claim:

- real migration/import-export readiness is validated
- backup/restore is verified
- real memory preview is complete
- the project is ready for apply
- v1.0 RC readiness is unblocked
- provider validation passed

## Decision

Decision: `P27_APPROVAL_PACKET_DEFINED_EXECUTION_BLOCKED`.

P27 defines the future approval packet boundary. It does not authorize non-fixture migration/import-export work.

## P27.1 Fixture Shape Result

P27.1 adds a synthetic fixture/test contract:

- fixture: `tests/fixtures/migration-import-export-approval-packet-v1.json`
- test: `tests/migration-import-export-approval-packet-fixture.test.js`

The fixture locks:

- schema `codex-memory.migration-import-export-approval-packet.v1`
- phase `P27.1-migration-import-export-approval-packet-fixture-shape`
- `fixtureOnly=true`
- `mode=fixture-only`
- `status=blocked`
- `decision=NOT_READY_BLOCKED`
- `approvalStatus=BLOCKED_PENDING_APPROVAL`
- `executionApproved=false`
- `mutated=false`
- `providerCalls=0`
- `realMemoryScanned=false`
- public MCP tools exactly `record_memory`, `search_memory`, and `memory_overview`
- approval packet sections for real-memory preview, export, import, SQLite migration apply, import/export apply, backup creation, restore overwrite, durable report write, package script wiring, public MCP expansion, provider/model call, service startup, and remote release action
- required approvals for every P27 hard-stop action family
- no-side-effect safety flags for real memory, apply, backup/restore, durable writes, provider calls, service startup, package/config/public MCP changes, push, tag, release, and deploy
- required wording and forbidden claims so future docs do not overclaim readiness

P27.1 remains fixture/test only. It does not scan real memory, export/import real memory, run SQLite migration apply, run import/export apply, create or restore backups, write durable state, call providers, expand public MCP tools, start services, change config/env/secrets, push, tag, release, or deploy.

P27.1 decision: `P27_APPROVAL_PACKET_FIXTURE_SHAPE_LOCKED`.

## Next Safe Action

The next safe local action is a docs-only review or a direct-node fixture-only approval-packet CLI plan, if separately scoped. Do not move from P27 directly to real memory preview, backup/restore, migration apply, import/export apply, provider calls, service startup, public MCP expansion, push, tag, release, or deploy.
