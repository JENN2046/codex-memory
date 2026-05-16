# P23.3 Validation Matrix Hardening

Phase: `P23.3-validation-matrix-hardening`

Status: planning

## 1. Purpose

This document defines the v1.0 validation matrix hardening plan after the P23 planning baseline, P23.1 MCP contract inventory, and P23.2 schema/versioning plan.

The purpose is to make the release-blocking evidence explicit before any validator implementation, runtime change, schema change, migration apply, import/export apply, deployment action, startup/watchdog installation, or client configuration switch.

This phase does not implement new validators.
This phase does not modify runtime code.
This phase does not modify tests.
This phase does not run SQLite migration apply.
This phase does not run import/export apply.
This phase does not mutate durable memory.
This phase does not change public MCP tools.
This phase does not perform production deploy.
This phase does not install watchdog/startup task.
This phase does not switch Codex/Claude config.

## 2. Current Validation Baseline

Current P22/P23 evidence baseline:

- P22 local HTTP MCP deploy/validation evidence is recorded and closed.
- `/health ok`.
- live `initialize/tools/list ok`.
- public MCP tools remain exactly `record_memory`, `search_memory`, `memory_overview`.
- `observe:http status=ok`.
- MCP/HTTP tests `12/12`.
- P23 planning baseline is drafted.
- P23.1 MCP contract inventory is drafted.
- P23.2 schema/versioning plan is drafted.

Current P23 docs-only validation baseline:

- `git diff --check` passed for P23 planning.
- docs validation passed for P23 planning.
- `git diff --check` passed for P23.1.
- docs validation passed for P23.1.
- `git diff --check` passed for P23.2.
- docs validation passed for P23.2.
- P23 docs trailing whitespace check passed for P23.2.

This baseline is local planning evidence. It is not a production deploy, startup hardening, watchdog installation, Codex/Claude client switch, provider validation, migration apply, import/export apply, tag, release, or v1.0 release.

## 3. v1.0 Validation Goals

v1.0 validation goals:

- preserve the public MCP contract
- prove local HTTP MCP health and tool discovery
- prove docs/status/board consistency
- prove schema/versioning readiness before implementation
- prove security and secret-exposure boundaries
- prove migration/import-export readiness through dry-run evidence before apply
- prove rollback readiness
- prove client boundary readiness for Codex and Claude
- separate local deployment validation from production deployment
- identify release-blocking gaps before v1.0 release-candidate work

The matrix should be hard enough to block v1.0 on missing or failing evidence, but conservative enough to keep A5-gated operations outside automatic execution.

## 4. Validation Matrix Overview

| Area | Purpose | Command or evidence source | Required before v1.0 | Blocks v1.0 if failing | A4.8-safe or A5-gated | Notes / open gaps |
|---|---|---|---|---|---|---|
| Docs/status/board | Verify text changes are whitespace-safe and locally consistent. | `git diff --check` | yes | yes | A4.8-safe | Required for every docs/status/board phase. |
| Docs/status/board | Verify docs validation rules. | `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | yes | yes | A4.8-safe | Required when docs/status/board files change. |
| Docs/status/board | Verify P23 docs have no trailing whitespace. | `Get-ChildItem docs\P23*.md` trailing whitespace scan | yes | yes | A4.8-safe | P23-specific hygiene check. |
| MCP/HTTP contract | Verify local HTTP health. | `/health ok` evidence | yes | yes | A4.8-safe when service is already approved/running; A5-gated if starting/deploying service is required | P22 evidence exists; refresh requires explicit scope. |
| MCP/HTTP contract | Verify MCP initialize and tool discovery. | live `initialize/tools/list ok` evidence | yes | yes | A4.8-safe when read-only against approved local service; A5-gated if deployment/startup is required | Must confirm exactly three public tools. |
| MCP/HTTP contract | Verify public MCP tool freeze. | tools list exactly `record_memory`, `search_memory`, `memory_overview` | yes | yes | A4.8-safe as read-only evidence | Any expansion requires separate A5 approval. |
| MCP/HTTP contract | Verify HTTP observability summary. | `observe:http status=ok` evidence | yes | yes | A4.8-safe when service is already approved/running; A5-gated if startup/deploy is required | P22 evidence exists; refresh should not imply production deploy. |
| MCP/HTTP contract | Verify MCP/HTTP tests. | `node --test tests\mcp-contract.test.js tests\mcp-http.test.js` with `12/12` evidence | yes | yes | A4.8-safe | Current P22 evidence is `12/12`. Future count drift must be explained. |
| Schema/versioning | Review version identifiers and compatibility expectations. | P23.2 schema/versioning review gate | yes | yes | A4.8-safe | Implementation remains separate. |
| Migration dry-run | Verify migration readiness remains dry-run first. | `npm run vcp-memory:migration-readiness -- --json`; `npm run vcp-memory:mapping:dry-run -- --json`; `npm run lifecycle:sqlite:dry-run -- --json` | yes | yes | A4.8-safe dry-run only | Apply remains A5-gated. |
| Import/export dry-run | Verify import/export envelope and no-apply boundary. | import/export fixture shape tests and dry-run evidence | yes | yes | A4.8-safe for fixtures/dry-run; A5-gated for apply | Broad real export/import apply remains blocked. |
| Rollback | Verify active-memory rollback readiness. | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` | yes | yes | A4.8-safe | Destructive rollback execution is not authorized. |
| Rollback | Verify compare baseline. | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` | yes | yes | A4.8-safe | Compare mismatch blocks v1.0 until explained or fixed. |
| Security | Verify write policy and secret boundaries. | `node --test tests\security-write-policy.test.js`; secret/workspace exposure check | yes | yes | A4.8-safe | Must avoid raw secrets and raw workspace identifiers in low-risk summaries. |
| Security | Verify broader no-secret exposure. | diff review, docs validation, targeted forbidden-pattern review | yes | yes | A4.8-safe | Do not inspect or print `.env` values. |
| Client boundary | Verify Codex/Claude contract and visibility boundaries. | Codex/Claude client boundary review; scope/privacy fixture evidence | yes | yes | A4.8-safe docs/fixtures; A5-gated for config switch | Config mutation remains blocked. |
| Local deployment | Verify local HTTP MCP deploy validation evidence. | P22 local deploy result and closeout docs | yes | yes | A4.8-safe to record/review evidence; A5-gated to deploy/start service if not already scoped | Local deploy is not production deploy. |
| Production deploy | Confirm production deploy remains separately approved. | production deploy gate approval packet | no for local v1.0 planning; yes before production release | yes for production release | A5-gated | Not automatic. |
| Startup/watchdog | Confirm startup/watchdog remains separately approved. | startup/watchdog gate approval packet | no for local v1.0 planning; yes before startup hardening | yes if claimed | A5-gated | Installation is blocked without explicit approval. |
| Tag/release | Confirm publication approval. | tag/release gate approval packet | yes before publication | yes | A5-gated | Tag/release/deploy are separate decisions. |

## 5. Docs/Status/Board Validation

Docs/status/board validation covers low-risk planning phases and state synchronization.

Required commands:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
powershell -NoProfile -Command "Get-ChildItem docs\P23*.md | ForEach-Object { if ((Get-Content $_.FullName) -match '\s+$') { Write-Error \"Trailing whitespace in $($_.FullName)\" } }"
```

v1.0 blocking criteria:

- whitespace errors block v1.0 docs readiness
- docs validation failures block v1.0 docs readiness
- stale board state blocks release-candidate handoff
- docs claiming unperformed A5 actions block v1.0 readiness until corrected

## 6. MCP/HTTP Contract Validation

MCP/HTTP validation must prove the local public MCP surface remains stable.

Required evidence before v1.0:

- `/health ok`
- live `initialize/tools/list ok`
- public tools exactly:
  - `record_memory`
  - `search_memory`
  - `memory_overview`
- `observe:http status=ok`
- MCP/HTTP tests `12/12` or an updated count with documented reason

Required commands when refresh is in scope:

```powershell
node --test tests\mcp-contract.test.js tests\mcp-http.test.js
npm run observe:http -- --json
```

Hard boundary:

- starting or deploying a service is not implied by this planning phase
- public MCP tool additions remain A5-gated
- `validate_memory` remains internal-only

## 7. Schema/Versioning Validation

Schema/versioning validation must prove the P23.2 plan is specific enough to guide v1.0 without forcing immediate implementation.

Required evidence:

- current schema baseline documented
- version identifiers proposed
- compatibility policy documented
- migration boundary documented
- import/export boundary documented
- rollback requirements documented
- A5-gated schema actions documented

Future implementation validation may include:

```powershell
node --test tests\mcp-contract.test.js
node --test tests\vcp-memory-object-model-fixture.test.js
node --test tests\vcp-memory-import-export-shape.test.js
node --test tests\vcp-memory-migration-readiness-cli.test.js
npm test
npm run gate:ci -- --json
```

This phase does not run schema implementation validation beyond docs checks.

## 8. Security and Secret-Exposure Validation

Security validation must prove v1.0 does not expose secrets, provider keys, authorization headers, cookies, `.env` values, raw workspace identifiers in low-risk summaries, or raw production memory snippets in release evidence.

Required evidence:

- `security-write-policy` targeted test evidence before release candidate
- no `.env` or secret file modifications
- no provider key or authorization header in docs/status/board diffs
- public MCP summaries avoid raw `workspace_id` exposure
- local deploy evidence remains sanitized

Future validation:

```powershell
node --test tests\security-write-policy.test.js
npm run gate:ci -- --json
git diff --check
```

Do not read or print secret values as part of this validation.

## 9. Migration / Import-Export Dry-Run Validation

Migration and import/export validation must stay dry-run first.

Required migration dry-run evidence:

```powershell
npm run vcp-memory:migration-readiness -- --json
npm run vcp-memory:mapping:dry-run -- --json
npm run lifecycle:sqlite:dry-run -- --json
```

Required import/export dry-run evidence:

- import/export envelope shape fixture evidence
- checksum/manifest expectation review
- redaction status review
- lifecycle/scope compatibility review
- no apply flag used

Blocking criteria:

- missing dry-run evidence blocks v1.0 release-candidate readiness
- any apply requirement without explicit approval blocks progression
- backup/rollback gaps block migration/import-export apply

## 10. Rollback Validation

Rollback validation must prove that the project can identify and refuse unsafe drift.

Required gates before v1.0:

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
npm run rollback:mainline:plan -- --json
```

The compare/rollback gates are A4.8-safe when they remain read-only.

Destructive rollback execution is A5-gated and is not authorized by this plan.

## 11. Client Boundary Validation

Client boundary validation must show Codex and Claude can rely on the same local MCP contract without silent config mutation or cross-client private leakage.

Required evidence:

- Codex integration guidance review
- Claude integration guidance review
- client identity and visibility policy review
- scope/privacy fixture evidence
- public MCP tools remain frozen at three tools

Blocked without A5 approval:

- Codex config switching
- Claude config switching
- service startup/watchdog installation for client integration
- provider/model execution

## 12. Local Deployment Validation

Local deployment validation for v1.0 is the local HTTP MCP validation chain, not production deployment.

Current recorded evidence:

- `/health ok`
- live `initialize/tools/list ok`
- public MCP tools exactly three
- `observe:http status=ok`
- MCP/HTTP tests `12/12`

Remaining non-actions:

- no production deploy
- no startup/watchdog install
- no Codex/Claude config switch
- no provider execution
- no migration/import-export apply
- no durable memory activation beyond already approved local behavior

## 13. Failure Semantics

Validation failures should be classified as:

- docs validation failure
- contract failure
- schema/versioning drift
- security or secret-exposure failure
- migration/import-export dry-run failure
- rollback/compare failure
- client boundary failure
- production/startup/release approval gap

Default handling:

- stop expansion
- identify failure type
- attempt one narrow safe fix only when clearly within scope
- do not weaken tests to pass
- do not delete safety gates
- do not reframe runtime bugs as docs wording
- stop if the fix requires A5 approval

## 14. Required Gates Before v1.0

Required before v1.0 release-candidate readiness:

- docs/status/board validation
- P23 docs trailing whitespace check
- MCP/HTTP contract validation
- public MCP tool freeze confirmation
- security-write policy validation
- full `npm test`
- `gate:ci`
- compare active-memory standard suite
- rollback active-memory standard suite
- schema/versioning review gate
- migration dry-run gate
- import/export dry-run gate
- rollback story review
- client boundary review
- known gaps review
- A5 approval packet review for any production, startup, provider, config, migration, import/export apply, tag, release, or deploy action

## 15. A5-Gated Validation Actions

The following remain A5-gated:

- production deploy
- startup/watchdog installation
- Codex/Claude config switching
- provider execution
- durable memory mutation expansion
- SQLite migration apply
- import/export apply
- public MCP contract-breaking changes
- tag/release/deploy
- any destructive rollback execution

This P23.3 phase does not approve or execute any of those actions.

## 16. Known Validation Gaps

Known v1.0 blocking validation gaps:

- P23 validation matrix is not yet implemented as an automated aggregator.
- MCP/HTTP live evidence is recorded from P22 but not freshly rerun in this P23.3 docs-only phase.
- schema/versioning identifiers are planned but not implemented in runtime schema code.
- migration/import-export apply remains unapproved and untested by design.
- production deployment remains unapproved and unperformed.
- startup/watchdog installation remains unapproved and unperformed.
- Codex/Claude config switching remains unapproved and unperformed.
- provider execution remains unapproved and unperformed.
- tag/release/deploy for v1.0 remains unapproved and unperformed.
- destructive rollback execution remains unapproved and unperformed.

These gaps do not block P23.3 planning completion. They block v1.0 release-candidate or production claims until addressed through the appropriate safe phase or A5 approval.

## 17. Proposed P23.4 Next Phase

Next recommended phase:

`P23.4-local-production-hardening-plan`

P23.4 should plan local production hardening requirements without installing startup/watchdog tasks, switching Codex/Claude configs, running provider commands, applying migrations/import-export, mutating durable memory, or performing production deploy.

P23.4 local production hardening planning is tracked in [P23_4_LOCAL_PRODUCTION_HARDENING_PLAN.md](/A:/codex-memory/docs/P23_4_LOCAL_PRODUCTION_HARDENING_PLAN.md).

P23.5 client integration readiness planning is tracked in [P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md](/A:/codex-memory/docs/P23_5_CLIENT_INTEGRATION_READINESS_PLAN.md). It expands the client boundary validation expectations before any real Codex or Claude config switch.

P23.6 migration/import-export readiness planning is tracked in [P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md](/A:/codex-memory/docs/P23_6_MIGRATION_IMPORT_EXPORT_READINESS_PLAN.md). It expands the migration dry-run, import/export dry-run, manifest, checksum, backup, rollback, and durable mutation validation expectations before any apply action.

P23.7 v1.0 release-candidate checklist is tracked in [P23_7_V1_0_RELEASE_CANDIDATE_CHECKLIST.md](/A:/codex-memory/docs/P23_7_V1_0_RELEASE_CANDIDATE_CHECKLIST.md). It consolidates RC gate readiness and remaining blockers without creating a tag, release, deploy, or push.

P23.10 final RC validation matrix execution planning is tracked in [P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md](/A:/codex-memory/docs/P23_10_FINAL_RC_VALIDATION_MATRIX_EXECUTION_PLAN.md). It plans final matrix execution without executing the matrix or implementing validators.

P23.11 final RC validation matrix execution scope review is tracked in [P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md](/A:/codex-memory/docs/P23_11_FINAL_RC_VALIDATION_MATRIX_EXECUTION_SCOPE_REVIEW.md). It classifies matrix items by A4.8-safe, A5-gated, runtime-implementation-required, and blocked execution boundaries.
