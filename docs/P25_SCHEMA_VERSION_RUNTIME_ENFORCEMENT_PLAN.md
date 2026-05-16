# P25 Schema Version Runtime Enforcement Plan

Phase: `P25-schema-version-runtime-enforcement-plan`

Status: planning; P25.3 report-shape status documented

## 1. Purpose

This document plans schema/version runtime enforcement for `codex-memory` after the P23 v1.0 planning chain and P24 validation aggregator work.

The goal is to define what runtime enforcement would mean before any implementation touches durable records, public MCP contracts, import/export, or migration code.

This phase does not implement schema/version runtime enforcement.
This phase does not change public MCP tools or schemas.
This phase does not run SQLite migration apply.
This phase does not run import/export apply.
This phase does not mutate durable memory.
This phase does not start services, run providers, push, tag, release, or deploy.

## 2. Current Baseline

Current public MCP tools remain exactly:

- `record_memory`
- `search_memory`
- `memory_overview`

Current schema/version evidence exists in:

- [P23_2_SCHEMA_VERSIONING_PLAN.md](./P23_2_SCHEMA_VERSIONING_PLAN.md)
- [P23_3_VALIDATION_MATRIX_HARDENING.md](./P23_3_VALIDATION_MATRIX_HARDENING.md)
- [P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md](./P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md)
- [P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md](./P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md)
- [P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md](./P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_PLAN.md)
- memory object model, import/export, migration readiness, lifecycle, mutation audit, and validation aggregator fixture tests

Current gap:

- schema/version fields and compatibility expectations are planned and partially represented in fixture/report shapes.
- runtime enforcement for durable records and reports is not implemented.
- no automatic schema migration or durable data rewrite is approved.

## 3. Enforcement Surfaces

Potential enforcement surfaces:

| Surface | Candidate enforcement | Risk | Default P25 decision |
|---|---|---:|---|
| Public MCP tool list | assert exactly `record_memory`, `search_memory`, `memory_overview` | A2 | Keep frozen; no expansion |
| MCP argument schemas | reject unknown fields and invalid enum/scope values | A2 | Existing behavior should remain protected by tests |
| MCP response envelopes | preserve response keys and safe metadata placement | A2 | Plan shape tests before runtime changes |
| Durable memory records | tolerate missing version fields with fallback | A3/A5 | Plan compatibility gate first |
| Diary-compatible records | remain readable without forced version rewrite | A3 | No automatic rewrite |
| SQLite shadow rows | read old rows safely; add version only through approved migration | A3/A5 | Dry-run before any apply |
| Audit events | keep parseable event shape and version tags where present | A2/A3 | Add fixture gate first |
| Lifecycle/scope policy summaries | preserve low-risk summary and redaction flags | A2 | Protect existing no-raw-workspace boundary |
| Import/export envelopes | require explicit envelope version in dry-run/import plans | A3/A5 | Planning/dry-run only |
| Validation aggregator reports | report schema/runtime enforcement status honestly | A2 | Keep `NOT_READY_BLOCKED` until implemented |

## 4. Compatibility Policy

Runtime enforcement must not break existing records by making planned version fields mandatory without fallback.

Compatibility rules:

- missing durable record version fields must use documented fallback.
- missing optional vNext fields must normalize to `null`, `unknown`, or a documented safe default.
- public MCP schemas must remain backward-compatible unless a dedicated approved contract phase changes them.
- schema checks must not expose raw secrets, raw `.env` values, provider keys, auth headers, cookies, or raw workspace identifiers.
- enforcement must distinguish invalid new writes from old records that are still safe to read.
- migration apply remains blocked until dry-run, backup, rollback, and approval exist.

## 5. Runtime Enforcement Candidates

Implementation candidates for a later phase:

1. `SchemaVersionPolicy` helper for known schema families and fallback behavior.
2. Read-only compatibility scanner for fixture or sandbox records.
3. Validation aggregator field that reports `schemaVersionRuntimeEnforcement.status`.
4. Fixture tests for accepted/missing/unknown version cases.
5. CLI dry-run that reports compatibility without reading real memory by default.

These are candidates only. This P25 planning phase does not implement them.

## 6. Required Test Plan Before Implementation

Before any runtime enforcement implementation, add or update focused tests for:

- public MCP tools remain exactly three.
- existing MCP argument validation still rejects unknown fields.
- durable record missing-version fallback.
- import/export envelope version required in fixture shape.
- migration readiness report version fields.
- lifecycle and audit summary redaction flags.
- validation aggregator reports enforcement status without claiming readiness.
- no raw secret or raw workspace ID appears in low-risk summaries.
- P25.2 schema-version policy fixture evidence appears in the validation aggregator report shape without claiming runtime schema/version enforcement.

Suggested future targeted commands:

```powershell
node --test tests\mcp-contract.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
node --test tests\vcp-memory-import-export-shape.test.js
node --test tests\vcp-memory-migration-readiness-cli.test.js
node --test tests\v1-rc-validation-aggregator.test.js
node --test tests\v1-rc-validation-aggregator-implementation.test.js
```

Broader future validation:

```powershell
npm test
npm run gate:ci
```

## 7. Dry-Run Boundary

A future dry-run is allowed only if it remains:

- local.
- read-only.
- fixture-backed or sandbox-backed by default.
- no provider call.
- no service startup.
- no durable memory mutation.
- no SQLite migration apply.
- no import/export apply.
- no backup/restore side effect.
- no raw secret or raw workspace exposure.

Real local memory scan or preview requires a separate explicit approval if it reads broad durable user memory.

## 8. A5 Hard Stops

Stop and request explicit approval before:

- implementing runtime enforcement that changes write/read behavior.
- making version fields mandatory for existing durable records.
- running SQLite `ALTER TABLE` or migration apply.
- applying import/export.
- writing durable memory.
- creating backups or restore artifacts outside a scoped approval.
- changing public MCP tools or schemas.
- changing package manifests or lockfiles.
- editing `.env`, secrets, or client config.
- starting or installing services, startup tasks, or watchdogs.
- running providers.
- pushing, tagging, releasing, or deploying.

## 9. Proposed Phase Split

Recommended next phases:

1. `P25.1-schema-version-enforcement-fixture-inventory`
2. `P25.2-schema-version-policy-fixture-tests`
3. `P25.3-validation-aggregator-schema-status-report-shape`
4. `P25.4-schema-compatibility-dry-run-cli-plan`
5. `P25.x-schema-version-runtime-enforcement-closeout-review`

Implementation phases must define allowed files, forbidden files, rollback story, and validation commands before editing runtime code.

P25.1 inventory is tracked in [P25_1_SCHEMA_VERSION_ENFORCEMENT_FIXTURE_INVENTORY.md](./P25_1_SCHEMA_VERSION_ENFORCEMENT_FIXTURE_INVENTORY.md). It confirms existing fixture/test coverage and identifies the missing fixture contract for accepted/missing/unknown schema-version behavior.

P25.2 fixture policy tests are implemented in `tests/fixtures/schema-version-policy-v1.json` and `tests/schema-version-policy-fixture.test.js`. They lock known schema families, accepted current versions, missing-version fallback behavior, unknown-version rejection/warning policy, public MCP three-tool freeze, no-migration/no-mutation safety flags, and no raw secret/workspace exposure.

P25.3 validation aggregator schema status report shape is represented by the current `src/core/ValidationAggregatorService.js` and `tests/fixtures/v1-rc-validation-aggregator-v1.json` changes from the main implementation thread. It adds report-shape evidence for the P25.2 schema-version policy fixture through `schemaVersionPolicyFixture`, `evidence.p25SchemaVersionPolicy`, and `evidence_sources.schema_version_policy_fixture`.

P25.3 does not implement runtime schema/version enforcement. The aggregator still reports `runtimeEnforcementImplemented=false` for the P25 policy evidence and keeps schema/version runtime enforcement as a blocker. Public MCP tools remain frozen at `record_memory`, `search_memory`, and `memory_overview`.

## 10. Validation For This Planning Phase

Docs-only validation:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

This phase is `COMPLETED_VALIDATED` only if the diff remains docs/board-only and no hard-stop action is crossed.
