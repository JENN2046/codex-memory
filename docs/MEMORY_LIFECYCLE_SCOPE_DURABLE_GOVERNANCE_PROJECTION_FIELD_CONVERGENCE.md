# Memory Lifecycle Scope Durable Governance Projection Field Convergence

Status: `MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_PROJECTION_FIELD_CONVERGENCE_COMPLETED_NOT_READY`
Date: 2026-05-23
Task: `CM-0865`

## Purpose

CM-0864 fixed the next runtime direction:

- internal-only;
- tombstone-first;
- single-record before supersede;
- no runtime apply yet.

That review also left one narrow gap open:

- the CM-0863 projection preview still used logical field names such as `supersedes`, `supersededBy`, and `tombstoneReason`,
- while `lifecycle-sqlite-dry-run` already names the future SQLite lifecycle vocabulary as `supersedes_memory_id`, `superseded_by_memory_id`, and `tombstone_reason`.

CM-0865 closes that naming gap in the smallest safe way:

- no runtime mutation;
- no SQLite apply path;
- no public MCP change;
- no projection semantics rewrite.

## Current-State Note

This convergence evidence remains current as a projection-helper compatibility boundary.

Later internal tombstone/supersede services and entries build on newer seams, but this document still describes the additive preview-level vocabulary convergence that reduced field-name ambiguity before runtime-adjacent work. It must still not be read as runtime apply proof, live governance proof, recall/write reliability proof, or readiness evidence.

## What Changed

`src/core/DurableGovernanceShadowProjectionPreview.js` now does two bounded convergence steps.

### 1. Input normalization now accepts SQLite-style lifecycle fields

Current projection records may now provide either logical preview fields or SQLite-style names for:

- `statusReason` / `status_reason`
- `supersededBy` / `superseded_by_memory_id`
- `supersedes` / `supersedes_memory_id`
- `tombstoneReason` / `tombstone_reason`
- `lifecycleUpdatedAt` / `lifecycle_updated_at`
- `lifecycleActorClientId` / `lifecycle_actor_client_id`

This means the helper no longer assumes future temp-local/runtime-adjacent projection proof must pre-convert every SQLite-style row into the old logical preview dialect first.

### 2. Output now exposes SQLite-aligned alias surfaces

Each affected record preview now includes:

- `beforeSqliteColumns`
- `afterSqliteColumns`
- `fieldChangesSqliteColumns`

These fields mirror the existing logical preview while using SQLite lifecycle column vocabulary:

- `status`
- `status_reason`
- `supersedes_memory_id`
- `superseded_by_memory_id`
- `tombstone_reason`
- `lifecycle_updated_at`
- `lifecycle_actor_client_id`

The original logical preview shape remains intact.

So CM-0865 is additive convergence, not a breaking rename.

## Why This Is The Right Small Step

CM-0864 explicitly said runtime apply should remain blocked until naming convergence is clearer.

CM-0865 answers that requirement without skipping ahead into:

- runtime durable governance mutation;
- SQLite row apply;
- new transaction helpers;
- supersede-first runtime semantics.

The helper now speaks both:

- current logical preview language,
- and future SQLite lifecycle column language.

That makes later tombstone-first runtime-prep work less ambiguous while keeping the current bounded evidence stack stable.

## Validation

Validated:

- `node --check src\core\DurableGovernanceShadowProjectionPreview.js`
- `node --check tests\durable-governance-shadow-projection-preview.test.js`
- `node --test tests\durable-governance-shadow-projection-preview.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Targeted test coverage now includes:

- supersede preview still works and now exposes SQLite alias columns;
- tombstone preview still works and now exposes SQLite alias columns;
- SQLite-style current projection record input is accepted directly.

## Boundaries Preserved

CM-0865 does not:

- execute durable governance mutation;
- append durable audit intent or commit records;
- apply SQLite lifecycle mutation;
- expose new public MCP tools;
- call providers;
- execute true live `record_memory` or `search_memory`;
- read real memory content or direct real `.jsonl`;
- prove runtime apply;
- prove `memory write reliable`;
- prove `memory recall reliable`;
- prove `RC_READY`;
- prove production readiness.

## Next Safe Step

After CM-0865, the smallest next governance/runtime-prep move is still:

- a tombstone-first internal-only runtime-prep slice,

or:

- a bounded temp-local/runtime-adjacent proof that consumes the now-converged projection vocabulary.

`memory_supersede` runtime apply should remain deferred.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_DURABLE_GOVERNANCE_PROJECTION_FIELD_CONVERGENCE_COMPLETED_NOT_READY`

The CM-0863 projection helper now accepts SQLite-style lifecycle metadata and emits SQLite-aligned alias preview fields, so the naming-convergence blocker identified in CM-0864 is materially narrowed without introducing runtime durable governance apply.
