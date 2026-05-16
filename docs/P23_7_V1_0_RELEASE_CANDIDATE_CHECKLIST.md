# P23.7 v1.0 Release-Candidate Checklist

## 1. Purpose

This document records the v1.0 Memory Kernel release-candidate checklist after the P22 local HTTP MCP deploy/validation evidence chain and the P23 planning sequence.

This is a checklist and planning record only. It does not create a release candidate, tag, GitHub release, production deploy, startup task, watchdog, client config switch, migration, import/export apply, provider run, or durable memory mutation.

## 2. Current RC Baseline

Current baseline:

- P22 local HTTP MCP evidence chain is recorded and closed.
- `/health` was recorded as ok.
- live `initialize/tools/list` was recorded as ok.
- public MCP tools remain exactly:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- `observe:http` was recorded as `status=ok`.
- MCP/HTTP tests were recorded as `12/12`.
- P23 v1.0 Memory Kernel plan exists.
- P23.1 MCP contract inventory exists.
- P23.2 schema/versioning plan exists.
- P23.3 validation matrix hardening exists.
- P23.4 local production hardening plan exists.
- P23.5 client integration readiness plan exists.
- P23.6 migration/import-export readiness plan exists.
- production deploy has not been performed.
- startup/watchdog has not been installed.
- Codex/Claude config has not been switched by this P23 chain.
- provider has not been run by this P23 chain.
- migration/import-export apply has not been run.
- durable memory mutation expansion has not been performed.
- tag/release/deploy has not been performed by this phase.

## 3. What This Checklist Means

This checklist consolidates readiness evidence and blockers before any v1.0 release-candidate claim.

It means:

- planning coverage exists for the v1.0 Memory Kernel path.
- the public MCP contract is documented and frozen for the current baseline.
- local HTTP MCP validation evidence is recorded from P22.
- known A5-gated actions remain separated from docs-only planning.
- remaining blockers are explicit before any RC publication step.

It does not mean v1.0 is released, production-ready, deployed, or fully activated for Codex/Claude clients.

## 4. What This Phase Explicitly Does Not Do

This phase explicitly does not:

- create a tag.
- create a release.
- deploy.
- push.
- modify runtime code.
- modify tests.
- modify package files.
- modify `.env`.
- modify Codex config.
- modify Claude config.
- run provider.
- run SQLite migration apply.
- run import/export apply.
- mutate durable memory.
- alter public MCP tools.
- install watchdog/startup task.

## 5. P23 Planning Chain Coverage

Covered planning chain:

| Area | Evidence | RC status |
|---|---|---|
| P22 local deploy evidence | [P22_LOCAL_DEPLOY_RESULT_RECORD.md](/A:/codex-memory/docs/P22_LOCAL_DEPLOY_RESULT_RECORD.md), [P22_LOCAL_DEPLOY_CLOSEOUT.md](/A:/codex-memory/docs/P22_LOCAL_DEPLOY_CLOSEOUT.md) | Ready as recorded local evidence |
| P23 v1.0 Memory Kernel plan | [P23_V1_0_MEMORY_KERNEL_PLAN.md](/A:/codex-memory/docs/P23_V1_0_MEMORY_KERNEL_PLAN.md) | Ready as planning baseline |
| P23.1 MCP contract inventory | [P23_1_MCP_CONTRACT_INVENTORY.md](/A:/codex-memory/docs/P23_1_MCP_CONTRACT_INVENTORY.md) | Ready as inventory |
| P23.2 schema/versioning plan | [P23_2_SCHEMA_VERSIONING_PLAN.md](/A:/codex-memory/docs/P23_2_SCHEMA_VERSIONING_PLAN.md) | Planned but not implemented |
| P23.3 validation matrix | [P23_3_VALIDATION_MATRIX_HARDENING.md](/A:/codex-memory/docs/P23_3_VALIDATION_MATRIX_HARDENING.md) | Planned but not implemented as an aggregator |
| P23.4 local production hardening | [P23_4_LOCAL_PRODUCTION_HARDENING_PLAN.md](/A:/codex-memory/docs/P23_4_LOCAL_PRODUCTION_HARDENING_PLAN.md) | Planned; activation remains gated |
| P23.5 client integration readiness | [P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md](/A:/codex-memory/docs/P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md) | Planned; config switch remains gated |
| P23.6 migration/import-export readiness | [P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md](/A:/codex-memory/docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md) | Planned; apply remains gated |

## 6. MCP Contract RC Gate

RC gate expectations:

- Public MCP tools remain exactly `record_memory`, `search_memory`, and `memory_overview`.
- Tool names must not be renamed before v1.0.
- Argument semantics must not silently change.
- Output semantics must not silently change.
- Durable mutation behavior must not expand without an explicit gate.
- `validate_memory` remains internal-only.
- `update_memory`, `supersede_memory`, `forget_memory`, `checkpoint_memory`, `handoff_memory`, `audit_memory`, `import_memory`, and `export_memory` remain outside this v1.0 public baseline unless separately authorized.

Current RC status: ready as a documented freeze, blocked for any public contract-breaking change without explicit A5 authorization.

## 7. Schema / Versioning RC Gate

RC gate expectations:

- Schema/version identifiers must be reviewed against current durable record compatibility.
- Existing durable records must remain backward-compatible.
- No immediate data rewrite is required by this checklist.
- Migration planning must stay separate from migration apply.
- Import/export planning must stay separate from import/export apply.
- Rollback expectations must be documented before any schema implementation.

Current RC status: planned but not implemented. Runtime schema changes and SQLite migration apply remain blocked pending explicit authorization and validation.

## 8. Validation Matrix RC Gate

RC gate expectations:

- `git diff --check` passes.
- docs validation passes.
- P23 docs trailing whitespace check passes.
- MCP `/health` evidence is available.
- live `initialize/tools/list` evidence is available.
- public MCP tools are exactly the three-tool baseline.
- `observe:http status=ok` evidence is available.
- MCP/HTTP tests evidence is available.
- schema/versioning review gate is complete.
- migration dry-run gate is complete before apply.
- import/export dry-run gate is complete before apply.
- rollback readiness gate is complete.
- secret/workspace exposure checks are complete.
- Codex/Claude client boundary review is complete.
- production deploy, startup/watchdog, tag, and release gates remain blocked until explicitly authorized.

Current RC status: matrix is planned and prior evidence is recorded, but a fresh automated v1.0 RC matrix aggregator is not implemented in this phase.

## 9. Local Production Hardening RC Gate

RC gate expectations:

- local HTTP MCP health and observation remain checkable.
- startup/watchdog requirements are documented before installation.
- port/session/log expectations are documented.
- SQLite backup/restore and corruption recovery expectations are documented.
- restart/recovery expectations are documented.
- operator runbook requirements are documented.

Current RC status: planned; real startup/watchdog installation and production deploy remain A5-gated and unperformed.

## 10. Client Integration RC Gate

RC gate expectations:

- Codex and Claude client identities are documented.
- private/shared/project visibility rules are documented.
- cross-client writes remain proposal-first where sensitive or shared.
- read/write policies are documented.
- client-originated writes require audit expectations.
- config switch readiness checklist exists before real switching.

Current RC status: planned; real Codex/Claude config switching remains A5-gated and unperformed.

## 11. Migration / Import-Export RC Gate

RC gate expectations:

- migration dry-run must precede migration apply.
- export/import manifests must be defined.
- checksums and integrity verification must be defined.
- scope isolation rules must preserve private/shared/project boundaries.
- audit trail expectations must be documented.
- backup/restore expectations must be documented.
- partial failure and rollback semantics must be defined.
- no silent durable rewrite is allowed.

Current RC status: planned; SQLite migration apply, import/export apply, durable data rewrite, and durable mutation expansion remain A5-gated and unperformed.

## 12. Security and Secret-Exposure RC Gate

RC gate expectations:

- raw secrets are not exposed in docs or reports.
- raw `.env` values are not read, copied, or recorded.
- provider keys, authorization headers, and cookies are not recorded.
- raw workspace IDs are not exposed in low-risk summaries.
- public MCP contract remains frozen.
- secret/workspace exposure checks remain part of the RC gate matrix.

Current RC status: planned and partially evidenced by prior P22/P23 records; a fresh final security review remains required before any v1.0 release claim.

## 13. Rollback Readiness RC Gate

RC gate expectations:

- rollback story exists for docs-only planning commits.
- runtime rollback remains documented separately before runtime changes.
- schema/migration rollback must be validated before any apply.
- destructive rollback execution requires explicit authorization.
- known gaps and support handoff must be available before release publication.

Current RC status: planned; destructive rollback execution remains A5-gated and unperformed.

## 14. Documentation Consistency RC Gate

RC gate expectations:

- STATUS, backlog, next phase plan, and `.agent_board` agree on the current phase.
- P22 local deploy evidence remains clearly local-only.
- P23 planning docs do not claim production deploy or v1.0 release.
- public MCP tools remain documented as the three-tool baseline.
- A5-gated actions remain blocked unless separately approved.

Current RC status: this phase aligns the docs/status/board layer with the P23.7 checklist.

## 15. A5-Gated Release Actions

The following remain A5-gated:

- push.
- tag.
- release.
- deploy.
- production deploy.
- startup/watchdog installation.
- Codex config switching.
- Claude config switching.
- provider execution.
- durable memory mutation expansion.
- SQLite migration apply.
- import/export apply.
- public MCP contract-breaking changes.
- destructive rollback execution.

None of these actions is approved or performed by this checklist.

## 16. Known RC Blockers

Remaining v1.0 RC blockers:

- no fresh final v1.0 RC validation matrix has been executed in this phase.
- no automated v1.0 validation aggregator exists yet.
- schema/versioning is planned but not runtime-enforced as a v1.0 versioned schema gate.
- migration/import-export dry-run readiness is planned, but apply remains unapproved.
- production deploy remains unapproved and unperformed.
- startup/watchdog installation remains unapproved and unperformed.
- Codex/Claude config switching remains unapproved and unperformed.
- provider execution remains unapproved and unperformed.
- durable memory mutation expansion remains unapproved and unperformed.
- backup/restore has not been executed as part of a v1.0 RC gate.
- destructive rollback execution remains unapproved and unperformed.
- push/tag/release/deploy remain unapproved and unperformed by this phase.

## 17. RC Decision Table

| Item | Decision class | Notes |
|---|---|---|
| P22 local HTTP MCP evidence chain | Ready | Recorded and closed as local-only evidence. |
| P23 v1.0 Memory Kernel plan | Ready | Planning baseline exists. |
| P23.1 MCP contract inventory | Ready | Public tools are documented as three-tool baseline. |
| P23.2 schema/versioning plan | Planned but not implemented | Runtime schema enforcement is not changed. |
| P23.3 validation matrix hardening | Planned but not implemented | No validator or aggregator is implemented. |
| P23.4 local production hardening plan | Planned but not implemented | Startup/watchdog activation remains gated. |
| P23.5 client integration readiness plan | Planned but not implemented | Config switching remains gated. |
| P23.6 migration/import-export readiness plan | Planned but not implemented | Apply remains gated. |
| Public MCP tools freeze | Ready | Current public tools remain `record_memory`, `search_memory`, `memory_overview`. |
| `validate_memory` public MCP tool | Not in v1.0 scope | Remains internal-only unless separately approved. |
| update/supersede/forget/import/export public tools | Not in v1.0 scope | Post-v1.0 or separately authorized proposal only. |
| Schema/version runtime implementation | Blocked pending runtime implementation | Requires a scoped implementation phase and validation. |
| Migration/import-export apply | Blocked pending A5 | Requires explicit authorization, backup, and rollback story. |
| Production deploy | Blocked pending A5 | Not performed. |
| Startup/watchdog installation | Blocked pending A5 | Not installed. |
| Codex/Claude config switching | Blocked pending A5 | Config remains unchanged by this phase. |
| Provider execution | Blocked pending A5 | Not run. |
| Durable memory mutation expansion | Blocked pending A5 | Not performed. |
| Fresh final RC validation matrix execution | Blocked pending validation | Requires a later validation phase. |
| Push/tag/release/deploy | Blocked pending A5 | Not performed by this phase. |

## 18. Proposed Next Phase

Next recommended phase:

`P23.7-v1.0-rc-checklist-local-commit`

That phase should validate the docs/status/board-only checklist bundle, stage only the intended files explicitly, create one local-only commit if authorized, and still avoid push, tag, release, deploy, runtime code changes, tests changes, package changes, config mutation, provider execution, migration/import-export apply, durable memory writes, public MCP changes, and startup/watchdog installation.

P23.8 final v1.0 RC readiness review is tracked in [P23_8_V1_0_FINAL_RC_READINESS_REVIEW.md](/A:/codex-memory/docs/P23_8_V1_0_FINAL_RC_READINESS_REVIEW.md). It records the final docs-only readiness decision without claiming full v1.0 RC readiness.
