# P39 Synthetic Migration Dry-run Contract

Status: fixture-only / synthetic planning contract.

P39 defines migration dry-run evidence without touching real memory. The dry-run contract represents only synthetic fixtures or sanitized metadata.

## Allowed Inputs

- `synthetic_fixture`
- `sanitized_metadata`

Denied inputs include real memory content, real diary data, real SQLite rows, real vector index data, real candidate cache data, and provider output.

## Required Plan Sections

- `source_summary`
- `mapping_plan`
- `parity_checks`
- `rollback_readiness`
- `blocked_actions`
- `failure_path`

Unknown, skipped, failed, or warning-only parity and rollback readiness checks fail closed with a nonzero failure path.

## Blocked Actions

P39 does not authorize real memory content read, preview, export, import, scan, SQLite migration apply, backup, restore, provider call, public MCP expansion, durable writes, push, tag, release, or deploy.

## Evidence

The committed fixture contract is [p39-synthetic-migration-dry-run-v1.json](/A:/codex-memory/tests/fixtures/p39-synthetic-migration-dry-run-v1.json).

The focused test is [p39-synthetic-migration-dry-run-fixture.test.js](/A:/codex-memory/tests/p39-synthetic-migration-dry-run-fixture.test.js).

## Non-Goals

P39 does not:

- implement a migration planner
- read or preview real memory content
- export or import real memory
- apply SQLite migrations
- create backups or perform restores
- claim real migration readiness
- claim v1.0 RC or runtime readiness
