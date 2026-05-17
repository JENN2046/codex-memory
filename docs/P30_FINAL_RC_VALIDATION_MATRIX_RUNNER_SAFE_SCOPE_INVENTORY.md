# P30 Final RC Validation Matrix Runner Safe-Scope Inventory

Phase: `P30-final-rc-validation-matrix-runner-safe-scope-inventory`

Status: safe-scope inventory

## Purpose

Define the safe input and boundary contract for a future final RC validation matrix runner.

This phase is docs/status/board only. It does not implement a runner, execute the final RC matrix, start services, refresh live MCP/HTTP evidence, call providers, scan real memory, apply SQLite migrations, apply import/export, create backups, restore backups, mutate durable memory, change package scripts, change public MCP tools or schemas, change config, push, tag, release, or deploy.

## Current Source Reality

The repository already has these relevant pieces:

- P23.10 planned the final RC validation matrix.
- P23.11 split validation items into A4-safe, conditional live, runtime-required, A5-gated, and blocked classes.
- P23.12 executed only the A4-safe slice and recorded `A4_SAFE_SLICE_PASSED`; conditional live evidence was not refreshed.
- P24 added the minimal ValidationAggregator report builder and direct-node CLI.
- P28 added explicit safe validation evidence inputs for `committed_validation` and `local_validation`.
- P29 added explicit-input schema/version helper evidence, evaluation-report evidence, runtime boundary guard evidence, and closeout review.

The current aggregator remains a report builder and explicit-input evidence reader. It is not a final matrix executor.

## Safe Evidence Inputs

A future P30 runner may consume these inputs only if they are supplied explicitly or are committed fixture/report-shape evidence:

| Input class | Safe source | Notes |
|---|---|---|
| Git hygiene | caller-provided command summaries for `git status`, `git diff --stat`, `git diff --check` | Runner must not stage, commit, push, rebase, or reset. |
| Docs validation | caller-provided local docs validation result | Runner must not run broad live actions while collecting docs evidence. |
| P23 matrix docs | P23.10/P23.11/P23.12 committed docs | Treat P23.12 as historical A4-safe evidence, not full RC readiness. |
| ValidationAggregator report | `buildV1RcValidationAggregatorReport({ validationEvidenceSources })` output | Report builder accepts explicit inputs; it does not read files or execute commands. |
| Validation evidence reader | `evidence.p28ValidationEvidenceReader` | Accept only `committed_validation` and `local_validation` records with safe flags. |
| Evidence provenance map | `evidence_sources` | Use as source trace, not as proof that a command ran. |
| Fixture-only CLI evidence | P25/P26/P27 fixture-only CLI surfaces | Preserve `fixtureOnly=true`, `cliExecuted=false`, and no real memory scan/apply claims. |
| Schema/version evidence | P25/P29 policy fixture/helper/evaluation/boundary evidence | Preserve `runtimeEnforcementImplemented=false`. |
| Public MCP contract | committed docs/tests and aggregator public tool list | Public tools must remain exactly `record_memory`, `search_memory`, `memory_overview`. |
| Secret/workspace scan | diff/docs scan only | Do not read `.env`, secret files, provider keys, auth headers, cookies, or raw durable memory. |

## Required Rejection Defaults

A future P30 runner must fail closed or mark blocked for:

- missing explicit evidence
- stale evidence
- failed or blocked evidence
- rejected unsafe evidence
- unsupported evidence source types
- evidence with provider calls
- evidence with service startup
- evidence with durable memory mutation
- evidence with real memory preview/export/import
- evidence with migration/import-export apply
- evidence with config mutation
- evidence with public MCP expansion
- evidence with push, tag, release, deploy, or remote write
- raw secret, auth header, cookie, `.env` value, raw workspace identifier, or production memory exposure

## Hard Blockers

P30 safe-scope inventory keeps these blockers honest:

- full final RC validation matrix is still not executed
- schema/version runtime enforcement is still not implemented
- ValidationAggregator full implementation is still incomplete
- live MCP/HTTP evidence is not freshly refreshed by this phase
- migration/import-export apply remains A5-gated
- backup/restore execution remains A5-gated
- provider execution remains A5-gated
- startup/watchdog installation remains A5-gated
- Codex/Claude config switching remains A5-gated
- production deploy remains A5-gated
- push/tag/release/deploy remain A5-gated
- public MCP tool/schema expansion remains blocked

## Future Runner Contract

A later P30 runner implementation is safe only if it starts with a fixture/manifest contract, not live execution.

Allowed first implementation shape:

- committed synthetic fixture manifest
- direct function tests over explicit manifest input
- no package script
- no service startup
- no provider calls
- no real memory scan
- no migration/import-export apply
- no backup/restore
- no durable writes
- no config mutation
- no public MCP expansion
- no push/tag/release/deploy

Suggested future files for the first implementation slice:

- `tests/fixtures/final-rc-validation-matrix-runner-safe-scope-v1.json`
- `tests/final-rc-validation-matrix-runner-safe-scope-fixture.test.js`
- `docs/P30_FINAL_RC_VALIDATION_MATRIX_RUNNER_SAFE_SCOPE_INVENTORY.md`
- status and `.agent_board` files

Do not add `src/cli/*`, `package.json` scripts, service checks, or runtime execution in the first P30 slice.

## Validation Contract

Minimum validation for this inventory phase:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
rg -n "P30|NOT_READY_BLOCKED|runtime enforcement|public MCP|provider|migration|push|release|deploy" docs\P30_FINAL_RC_VALIDATION_MATRIX_RUNNER_SAFE_SCOPE_INVENTORY.md STATUS.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md README.md .agent_board
```

No `node --test`, `npm test`, live MCP/HTTP probe, provider command, migration/import-export command, backup/restore command, or package script change is required for this docs-only inventory.

## Result

Result: `P30_FINAL_RC_MATRIX_RUNNER_SAFE_SCOPE_INVENTORY_ADDED_FULL_MATRIX_STILL_BLOCKED`

P30 is opened only as a safe-scope inventory. The final RC matrix runner is not implemented, the final RC matrix is not executed, and v1.0 RC remains `NOT_READY_BLOCKED`.

## Next Recommended Phase

`P30.1-final-rc-validation-matrix-runner-fixture-contract`

The next safe phase may add a committed synthetic fixture and focused fixture test for the runner manifest. It must not implement a runner, add a package script, start services, call providers, scan real memory, apply migrations/import-export, create backups, restore backups, mutate durable state, expand public MCP tools, push, tag, release, or deploy.

## P30.1 Result

P30.1 adds the committed synthetic fixture `tests/fixtures/final-rc-validation-matrix-runner-safe-scope-v1.json` and focused fixture test `tests/final-rc-validation-matrix-runner-safe-scope-fixture.test.js`.

The fixture locks the future runner manifest boundary: explicit safe inputs only, no runner implementation, no final RC matrix execution, public MCP three-tool freeze, no side effects, fail-closed rejection defaults, and A4/conditional-live/runtime-required/A5 split.

Next recommended phase: `P30.2-final-rc-validation-matrix-runner-manifest-helper`, limited to a pure helper over explicit fixture input. No CLI, package script, live service, provider call, real memory scan, durable mutation, migration/import-export apply, backup/restore, public MCP expansion, push, tag, release, or deploy is approved by P30.1.

## P30.2 Result

P30.2 adds the pure helper `src/core/FinalRcValidationMatrixManifest.js` and focused test `tests/final-rc-validation-matrix-runner-manifest-helper.test.js`.

The helper accepts an already-provided manifest object, normalizes the safe contract, and summarizes whether it is acceptable for planning. It does not read fixture files, execute commands, start services, call providers, mutate input, touch durable memory, or execute a runner.

The helper keeps `canExecuteRunner=false`, `canClaimFinalRcReady=false`, `decision=NOT_READY_BLOCKED`, public MCP three-tool freeze, runtime-required blockers, A5-gated blockers, and fail-closed rejection defaults visible.

Next recommended phase: `P30.3-final-rc-validation-matrix-aggregator-evidence-shape`, limited to report-shape evidence only if selected. No runner execution, package script, live service, provider call, real memory scan, durable mutation, migration/import-export apply, backup/restore, public MCP expansion, push, tag, release, or deploy is approved by P30.2.
