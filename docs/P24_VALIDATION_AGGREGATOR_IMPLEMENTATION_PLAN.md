# P24 Validation Aggregator Implementation Plan

## 1. Purpose

This document plans a future automated v1.0 validation aggregator for `codex-memory`.

The aggregator should collect validation evidence, classify blocked items, preserve A4/A5 boundaries, and produce a final RC decision summary without executing unsafe or unauthorized actions.

This phase does not implement the aggregator.

## 2. Current Validation State

Current P23 baseline:

- P23.10 planned the final RC validation matrix.
- P23.11 scoped matrix execution into A4-safe, conditional A4, A5-gated, runtime-required, and blocked items.
- P23.12 executed the A4-safe slice and recorded `A4_SAFE_SLICE_PASSED`.
- Conditional live MCP/HTTP evidence was not refreshed in P23.12 because local HTTP MCP was not already reachable.
- Full final RC matrix remains not executed.
- Validation aggregator remains not implemented.
- Schema/version runtime enforcement remains not implemented.

P22 historical local HTTP MCP evidence remains recorded but not freshly refreshed in P23.12:

- `/health ok`
- live `initialize/tools/list ok`
- public MCP tools exactly `record_memory`, `search_memory`, `memory_overview`
- `observe:http status=ok`
- MCP/HTTP tests `12/12`

## 3. Problem Statement

The repository now has enough planning and partial evidence to support a v1.0 RC review, but the evidence is distributed across multiple docs, board files, prior gate records, and conditional live checks.

Without an aggregator:

- final RC status depends on manual collation.
- A4-safe pass results can be confused with full RC readiness.
- conditional live checks can be overclaimed.
- A5-gated blockers can be buried in prose.
- runtime-required gaps can be mistaken for completed validation.

The aggregator should make these distinctions machine-readable and reviewable.

## 4. Aggregator Goals

The future aggregator should:

- summarize docs/status/board validation.
- summarize git diff hygiene.
- summarize P2/P23 docs trailing whitespace checks.
- aggregate validation matrix status by group.
- track public MCP tool contract evidence.
- track schema/version enforcement status.
- track migration/import-export dry-run status.
- track conditional live MCP/HTTP evidence status.
- track A5-gated action status without executing A5 actions.
- track runtime-required items without implementing them.
- produce a final RC decision summary.
- preserve local-first, read-only, auditable evidence collection.

## 5. Non-Goals

P24 planning does not:

- implement the aggregator.
- modify runtime code.
- modify tests.
- start services.
- refresh live MCP/HTTP evidence.
- call providers.
- run SQLite migration apply.
- run import/export apply.
- mutate durable memory.
- install watchdog/startup tasks.
- modify Codex or Claude config.
- push, tag, release, or deploy.
- change public MCP tools.

The future aggregator should also not execute A5-gated actions by default.

## 6. Proposed Aggregator Scope

The first aggregator implementation should be a local CLI or report module that reads existing local evidence and emits a deterministic JSON/Markdown summary.

Proposed behavior:

- default mode: read-only.
- default input: checked-in docs/status/board plus optional fixture evidence.
- output: JSON summary and optional Markdown report.
- no provider calls.
- no service startup.
- no durable writes.
- no migration/import-export apply.
- no config mutation.
- no public MCP tool changes.

The aggregator may mark conditional live checks as one of:

- `RECORDED_HISTORICAL`
- `FRESH_PASS`
- `FRESH_FAIL`
- `NOT_EXECUTED_SERVICE_NOT_RUNNING`
- `BLOCKED_REQUIRES_A5_OR_STARTUP_SCOPE`

## 7. Inputs and Evidence Sources

Candidate inputs:

| Evidence area | Source |
|---|---|
| Git hygiene | command output from `git status -sb`, `git status --short`, `git diff --check` |
| Docs validation | `scripts/validate-local.ps1 -Area docs` result |
| P2/P23 whitespace | docs scan result |
| P23 matrix scope | [P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md](/A:/codex-memory/docs/P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md), [P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md](/A:/codex-memory/docs/P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md) |
| A4-safe execution | [P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md](/A:/codex-memory/docs/P23_12_FINAL_RC_VALIDATION_MATRIX_A4_SAFE_EXECUTION.md) |
| MCP contract | [P23_1_MCP_CONTRACT_INVENTORY.md](/A:/codex-memory/docs/P23_1_MCP_CONTRACT_INVENTORY.md), P22 local deploy evidence |
| Schema/version status | [P23_2_SCHEMA_VERSIONING_PLAN.md](/A:/codex-memory/docs/P23_2_SCHEMA_VERSIONING_PLAN.md) |
| Client boundary | [P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md](/A:/codex-memory/docs/P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md) |
| Migration/import-export boundary | [P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md](/A:/codex-memory/docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md) |
| RC readiness | [P23_7_V1_0_RELEASE_CANDIDATE_CHECKLIST.md](/A:/codex-memory/docs/P23_7_V1_0_RELEASE_CANDIDATE_CHECKLIST.md), [P23_8_V1_0_FINAL_RC_READINESS_REVIEW.md](/A:/codex-memory/docs/P23_8_V1_0_FINAL_RC_READINESS_REVIEW.md) |
| Blockers | [P23_9_V1_0_BLOCKER_BURN_DOWN_PLAN.md](/A:/codex-memory/docs/P23_9_V1_0_BLOCKER_BURN_DOWN_PLAN.md) |
| Board state | `.agent_board/RUN_STATE.md`, `.agent_board/TASK_QUEUE.md`, `.agent_board/VALIDATION_LOG.md`, `.agent_board/CHECKPOINT.md`, `.agent_board/HANDOFF.md` |

## 8. Output Contract

Recommended JSON shape:

```json
{
  "phase": "P24-validation-aggregator",
  "mode": "read-only",
  "mutated": false,
  "providerCalls": 0,
  "serviceStarted": false,
  "publicMcpTools": ["record_memory", "search_memory", "memory_overview"],
  "checks": {
    "git": { "status": "pass" },
    "docs": { "status": "pass" },
    "mcpContract": { "status": "recorded_historical" },
    "schemaVersion": { "status": "planned_not_enforced" },
    "migrationImportExport": { "status": "planned_apply_blocked" },
    "liveMcpHttp": { "status": "not_executed_service_not_running" },
    "a5Gated": { "status": "blocked_pending_approval" }
  },
  "decision": "NOT_READY_BLOCKED",
  "blockers": []
}
```

Required top-level fields:

- `phase`
- `mode`
- `mutated`
- `providerCalls`
- `serviceStarted`
- `publicMcpTools`
- `checks`
- `decision`
- `blockers`
- `warnings`
- `generatedAt`

## 9. Pass / Fail / Warn Semantics

Suggested statuses:

- `pass`: required check passed.
- `fail`: required check failed.
- `warn`: non-blocking issue exists.
- `blocked`: check cannot run without approval or implementation.
- `not_executed`: check intentionally not run.
- `recorded_historical`: evidence exists but was not freshly refreshed.
- `planned_not_implemented`: planning exists but implementation is absent.

Decision labels:

- `A4_SAFE_SLICE_PASSED`
- `READY_FOR_DOCS_ONLY_RC_REVIEW`
- `READY_PENDING_A5_AUTHORIZATION`
- `NOT_READY_BLOCKED`
- `FAILED_VALIDATION`

The aggregator must not report `READY_FOR_V1_0_RC` while full matrix execution, schema/runtime enforcement, or required A5 approvals remain unresolved.

## 10. A4-Safe Checks

A4-safe checks planned for aggregator support:

- git status hygiene.
- git diff hygiene.
- docs validation.
- P2/P23 docs trailing whitespace check.
- docs/status/board consistency.
- schema/version docs status.
- client boundary docs status.
- migration/import-export boundary docs status.
- RC checklist and blocker alignment.
- public MCP tool freeze from recorded docs/evidence.

## 11. Conditional Live Checks

Conditional live checks:

- `/health`
- initialize/tools/list
- `observe:http`
- MCP/HTTP tests `12/12`

Aggregator rule:

- Never start services.
- Never mutate config.
- If a service is already running and a read-only check is explicitly in scope, record fresh evidence.
- If service is not already running, mark `NOT_EXECUTED_SERVICE_NOT_RUNNING`.
- Preserve P22 evidence as historical evidence only.

## 12. A5-Gated Checks

The aggregator may report these checks but must not execute them:

- production deploy validation.
- startup/watchdog installation validation.
- Codex config switch validation.
- Claude config switch validation.
- provider execution validation.
- durable memory mutation expansion validation.
- SQLite migration apply validation.
- import/export apply validation.
- destructive rollback execution.
- push/tag/release/deploy.
- public MCP contract-breaking validation.

Default status should be `BLOCKED_PENDING_A5`.

## 13. Runtime-Required Checks

Runtime-required checks that need implementation before full validation:

- schema/version runtime enforcement gate.
- validation aggregator executable gate itself.
- any future machine-readable schema compatibility gate.
- any future durable migration dry-run implementation if current evidence is insufficient.

Default status should be `PLANNED_NOT_IMPLEMENTED` until a scoped implementation phase lands.

## 14. File / Module Candidate Map

Future implementation candidates:

| Candidate | Purpose | Risk |
|---|---|---|
| `src/cli/v1-rc-validation-aggregator.js` | CLI entrypoint for JSON/Markdown report | A2 |
| `src/core/ValidationAggregatorService.js` | Pure aggregation and decision logic | A2 |
| `tests/fixtures/v1-rc-validation-aggregator-v1.json` | Synthetic evidence fixture | A1 |
| `tests/v1-rc-validation-aggregator.test.js` | Fixture-backed contract tests | A1 |
| `package.json` script | Optional `v1:rc:aggregate` command | A5 if package change is treated as dependency/manifest boundary |
| `docs/P24_VALIDATION_AGGREGATOR_IMPLEMENTATION_RESULT.md` | Future result record | A1 |

Implementation should avoid package changes unless explicitly approved. If package script addition is desired, request separate approval because package manifest changes are currently hard-stop constrained.

P24.1 fixture/shape-test work locks the first expected aggregator output contract in `tests/fixtures/v1-rc-validation-aggregator-v1.json` and `tests/v1-rc-validation-aggregator.test.js`. It does not implement the aggregator executable or modify package scripts.

## 15. Test Plan

Future tests should cover:

- fixture parses.
- required output fields exist.
- `mutated=false`.
- `providerCalls=0`.
- `serviceStarted=false`.
- public MCP tools exactly three.
- A4-safe pass aggregation.
- conditional live checks can be represented as not executed.
- A5-gated checks are reported but never executed.
- runtime-required checks report planned/not implemented.
- final decision remains blocked when required blockers remain.
- no raw secrets, raw `.env` values, authorization headers, cookies, or raw workspace IDs appear.

Validation commands for implementation phase should include:

```powershell
node --test tests\v1-rc-validation-aggregator.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## 16. Rollback Plan

For this planning phase:

- rollback is revert of docs/status/board edits.

For future implementation:

- revert aggregator CLI/service/tests as one coherent commit.
- remove any package script only if it was added in the implementation commit.
- preserve prior P23 evidence docs.
- do not delete validation history.
- do not alter durable memory or runtime config during rollback.

## 17. Security and Secret-Exposure Boundaries

The aggregator must not:

- print `.env` values.
- print provider keys.
- print authorization headers.
- print cookies.
- print raw workspace IDs in public summaries.
- print production memory snippets.
- read secret files unless explicitly scoped for a redacted existence check.
- send evidence to external services.

Reports should include redaction flags:

- `redactionApplied`
- `rawSecretExposed`
- `rawWorkspaceIdExposed`
- `providerCalls`
- `durableMemoryTouched`
- `serviceStarted`

## 18. Implementation Phases

Suggested sequence:

1. `P24.1-validation-aggregator-fixture-shape-tests`
2. `P24.2-validation-aggregator-cli-plan`
3. `P24.3-validation-aggregator-runtime-implementation`
4. `P24.4-validation-aggregator-report-shape-gate`
5. `P24.5-validation-aggregator-closeout-review`

Do not combine package script addition, runtime implementation, live MCP refresh, provider execution, migration apply, or release action into the same phase.

## 19. Stop Conditions

Stop if the next action requires:

- modifying runtime code in this planning phase.
- modifying tests in this planning phase.
- modifying package manifests or lockfiles.
- starting services.
- refreshing live MCP/HTTP evidence.
- running providers.
- applying SQLite migrations.
- applying import/export.
- writing durable memory.
- installing watchdog/startup tasks.
- modifying Codex/Claude config.
- changing public MCP tools or schema.
- executing destructive rollback.
- pushing, tagging, releasing, or deploying.

## 20. Proposed Next Phase

`P24-validation-aggregator-implementation-plan-local-commit`

After this planning commit, the next implementation-safe phase should be `P24.1-validation-aggregator-fixture-shape-tests`, unless package script or runtime implementation approval is requested first.

P24.1 fixture/shape-test work is the next completed implementation-facing contract layer. The next safe phase after P24.1 is `P24.1-validation-aggregator-fixture-shape-tests-local-commit`, followed by a separate scoped CLI/service implementation phase.
