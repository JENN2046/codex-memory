# P22.2 Release Candidate Gate Matrix Dry-Run Plan

Phase: `P22.2-release-candidate-gate-matrix-dry-run-plan`

Status: docs/tests-design planning

## Purpose

Define the release-candidate gate matrix dry-run plan and expected report shape before any heavy gate execution or RC implementation.

This phase is docs/status/board only. It does not add a CLI, add tests, run `npm test`, run `gate:mainline:strict`, run compare / rollback standard suites, run `gate:ci`, start HTTP MCP, install startup or watchdog tasks, edit Codex or Claude configuration, run `claude mcp`, call providers, read real memory content, run migration, apply import/export, create a release candidate, tag, release, or deploy.

## Dry-Run Matrix Goal

The future dry-run matrix should answer:

- which RC gates are required
- which gates are safe to run without A5 approval
- which gates are heavy but local
- which gates are live-adjacent and require explicit scoping
- which gates are provider-backed and require explicit provider approval
- what output shape should be captured
- how blockers are reported without treating stale evidence as fresh
- whether the project remains blocked for RC implementation

## Proposed Report Shape

A future P22 gate matrix dry-run report should use a stable JSON-like shape:

```json
{
  "status": "blocked",
  "phase": "P22.2-release-candidate-gate-matrix-dry-run",
  "mutated": false,
  "releaseCandidateCreated": false,
  "targetCommit": "<commit>",
  "gateCount": 0,
  "requiredGateCount": 0,
  "passedGateCount": 0,
  "failedGateCount": 0,
  "skippedGateCount": 0,
  "staleGateCount": 0,
  "approvalRequiredCount": 0,
  "providerCallCount": 0,
  "durableMemoryTouched": false,
  "realConfigTouched": false,
  "startupOrWatchdogTouched": false,
  "migrationOrImportExportTouched": false,
  "gates": [],
  "blockers": [],
  "knownGaps": [],
  "nextStep": "refresh-required-gates-before-rc-implementation"
}
```

The report must not expose raw secrets, raw `workspace_id`, broad real memory content, provider keys, config values, or `.env` contents.

## Gate Matrix

| Gate ID | Gate | Future command / evidence | Default P22.2 status | Approval needed before run | Expected report fields |
|---|---|---|---|---|---|
| `docs-validation` | Docs diff and local docs validation | `git diff --check`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | runnable in docs phases | no | `status`, `command`, `passed`, `notes` |
| `full-suite` | Full test suite | `npm test` | planned, not run in P22.2 | no, if local and clean | `passedCount`, `failedCount`, `durationMs`, `failedTests` |
| `strict-mainline` | Strict mainline gate | `npm run gate:mainline:strict` | planned, not run in P22.2 | no, if scoped as local gate; review first because it may start/observe HTTP depending implementation | `status`, `health`, `contract`, `tests`, `compare`, `rollback` |
| `compare-standard` | Donor compare standard suite | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` | planned, not run in P22.2 | no, if local and fixture/donor reference only | `matchedCaseCount`, `mismatchCount`, `extendedMismatchCountTotal` |
| `rollback-standard` | Rollback standard suite | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` | planned, not run in P22.2 | no, if local and fixture/donor reference only | `readyCaseCount`, `notReadyCount`, `extendedMismatchCountTotal` |
| `gate-ci` | CI-safe fixture gate | `npm run gate:ci -- --json` | planned, not run in P22.2 | no, if local and fixture-only | `summary.ok`, `tests`, `compare`, `rollback`, `queries`, `mutated`, `providerCalls` |
| `client-privacy` | Client privacy non-regression | `node --test tests\p21-client-privacy-boundary-fixture.test.js` | planned, not run in P22.2 | no | `passedCount`, `failedCount`, `rawWorkspaceIdExposed`, `rawSecretExposed` |
| `local-production-safety` | Operator safety review | P20 checklist and closeout review | reviewed by docs | no | `startupBlocked`, `watchdogBlocked`, `configBlocked`, `backupRequired` |
| `claude-live-acceptance` | Claude live acceptance | manual / `claude mcp` only if approved | blocked | yes | `manualEvidence`, `configTouched`, `modelCall` |
| `provider-smoke` | Provider smoke | `npm run provider-smoke -- --json` | blocked | yes | `provider`, `model`, `networkCall`, `redacted` |
| `provider-benchmark` | Provider benchmark | `npm run provider-benchmark -- --json` | blocked | yes | `provider`, `model`, `networkCall`, `redacted` |
| `migration-readiness` | Migration readiness, no apply | `npm run vcp-memory:migration-readiness -- --json` | planned, not run in P22.2 | no, if fixture/dry-run only | `migrationBlocked`, `mutated`, `requiredApprovals` |

## Blocker Semantics

The future dry-run report must classify blockers clearly:

| Blocker type | Meaning | Required handling |
|---|---|---|
| `stale-evidence` | Existing evidence is useful but not fresh for target commit. | Mark blocked for refresh; do not infer pass. |
| `approval-required` | Gate may mutate config, call provider, start services, or touch live data. | Stop until explicit A5 approval. |
| `failed-gate` | Gate ran and failed. | Stop; record failure without broadening scope. |
| `unsafe-output` | Gate might expose secrets or raw memory/config. | Redesign evidence path before running. |
| `dirty-worktree` | Worktree has unrelated or unexplained changes. | Stop before gate execution or commit. |
| `remote-drift` | Remote changed before push or RC request. | Reconcile before continuing. |

## Future Execution Order

When a later approved phase actually runs the matrix, use this order:

1. Verify clean worktree and target commit.
2. Run docs validation.
3. Run full test suite.
4. Run fixture-only `gate:ci -- --json`.
5. Run compare standard suite.
6. Run rollback standard suite.
7. Review strict mainline gate scope before running.
8. Run strict mainline gate only if the phase explicitly allows it.
9. Keep provider and live Claude checks blocked unless explicitly approved.
10. Summarize blockers and next action without creating RC artifacts.

## Safety Rules

P22.2 keeps these rules:

- no gate matrix execution beyond docs validation
- no new CLI
- no new tests or fixtures
- no `src/` change
- no package or lockfile change
- no release candidate creation
- no tag, release, or deploy
- no real Codex configuration mutation
- no real Claude configuration mutation
- no `claude mcp` command
- no HTTP MCP start
- no startup or watchdog install
- no provider smoke / benchmark
- no real memory content preview
- no durable DB / memory / diary write
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no MCP schema change
- no public MCP tool expansion

## P22.2 Result

Result: `P22_GATE_MATRIX_DRY_RUN_PLANNED_BLOCKED_FOR_EXECUTION_APPROVAL`

P22.2 is sufficient to proceed to rollback/support story planning.

It is not sufficient to authorize gate execution, RC implementation, startup/watchdog installation, config mutation, provider calls, migration, import/export apply, public MCP expansion, tag, release, or deploy.

## Next Recommended Phase

P22.3 rollback/support story is captured in [P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](./P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md).

`P22.4-release-candidate-approval-packet-template`
