# P22 Release Candidate Planning

Phase: `P22-release-candidate-planning`

Status: planning

## Purpose

Plan the VCP practical parity release-candidate path without creating a release candidate.

P22 should freeze the candidate contract, collect parity evidence, define rollback and support expectations, and make remaining gaps explicit before any live release-candidate operation is attempted.

This phase is docs/status/board only. It does not change runtime behavior, edit Codex configuration, edit Claude configuration, run `claude mcp`, start HTTP MCP, install startup or watchdog tasks, change MCP schema, expand public MCP tools, call providers, read real memory content, run migration, apply import/export, create a release candidate, tag, release, or deploy.

## Prerequisite Evidence

P22 planning starts from the completed evidence chain:

| Area | Required baseline | Current evidence |
|---|---|---|
| Runtime safety | Narrow internal runtime mutation protocol exists and remains guarded. | P12.5 two-phase `validate_memory` audit protocol; `validate_memory` remains internal-only. |
| Object model / migration safety | VCP-compatible object model is fixture / dry-run / readiness backed, not migrated. | P13 closeout and migration readiness report. |
| Donor behavior parity | DeepMemo / TopicMemo / error/meta / ranking standing gate is documented. | P14 standing gate and closeout evidence. |
| Query quality | Fixture recall dry-run and query quality gates exist. | P15 closeout evidence. |
| Semantic association | TagMemo semantic association is fixture-backed and gate checked. | P16 closeout evidence. |
| V8 diagnostics | Advanced memory intelligence diagnostics are fixture-backed only. | P17 closeout evidence. |
| Import/export/migration | Dry-run safety and backup/rollback review exist; apply remains blocked. | P18 closeout evidence. |
| Observability/admin review | Read-only admin review surfaces are fixture-backed and operator-noted. | P19 closeout evidence. |
| Local production hardening | Startup/watchdog/config/backup operations are planned and blocked for apply. | P20 closeout and safety checklist. |
| Client integration | Codex / Claude scope, privacy, and acceptance planning are closed for P22 planning. | P21 closeout evidence. |

## Candidate Contract Freeze

P22 planning treats these as frozen unless a later approved phase changes them deliberately:

- MCP service name remains `vcp_codex_memory`
- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only
- HTTP MCP remains the default Codex Desktop stability path
- stdio MCP remains a debug / compatibility path
- diary-compatible write path remains protected
- SQLite shadow store remains protected from unapproved migration
- object model migration remains dry-run / readiness only until approved
- import/export apply remains absent until approved
- client privacy fixtures remain non-regression evidence
- low-risk summaries must not expose raw secrets or raw `workspace_id`

## Required Readiness Gates

P22 release-candidate readiness should require an explicit gate matrix before any RC implementation:

| Gate | Command / evidence | Notes |
|---|---|---|
| Full test suite | `npm test` | Required before RC implementation. |
| Strict mainline gate | `npm run gate:mainline:strict` | Required for MCP / donor / rollback-sensitive behavior. |
| Compare standard suite | `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` | Should preserve current standard-suite parity. |
| Rollback standard suite | `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` | Required rollback readiness evidence. |
| Query quality gate | `npm run gate:ci -- --json` | Should include query fixture dry-run, `mutated=false`, and no provider calls. |
| Docs validation | `git diff --check`; `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` | Required for docs/status/board work. |
| Local production safety review | P20 checklist review | Must be current before any startup/watchdog/config operation. |
| Client integration boundary review | P21 closeout review | Must remain consistent before any Codex / Claude live config operation. |

Provider smoke / benchmark are not routine P22 planning checks. They require explicit provider approval because they may call external configured services.

## Approval Packet Requirements

Any future operation that creates a release candidate or performs live-adjacent local production work requires an explicit A5 approval packet naming:

- exact phase and operation
- exact target branch and commit
- exact files, config paths, task names, service endpoints, or data paths
- mutation scope
- backup requirement
- rollback story
- validation commands
- expected output
- stop conditions
- safe-push behavior
- explicit user approval sentence

Ambiguous phrases such as `continue`, `go ahead`, `do it`, or `自动推进` are not approval.

## Future P22 Sequence

| Phase | Target | Allowed work | Validation |
|---|---|---|---|
| P22 planning | This plan and board/status sync | docs/status/board only | `git diff --check`; docs validation |
| P22.1 readiness inventory | Inventory required gates, evidence freshness, known gaps, and approval blockers | docs/status/board only | docs validation |
| P22.2 gate matrix dry-run plan | Define exact validation matrix and expected report shape | docs/tests-design only | docs validation |
| P22.3 rollback/support story | Define rollback, support, troubleshooting, and operator handoff expectations | docs/status/board only | docs validation |
| P22.4 RC approval packet template | Prepare explicit A5 approval packet template without executing it | docs/status/board only | docs validation |
| P22.x closeout | Judge whether RC implementation can be requested | docs/status/board only | docs validation |

P22 implementation, tag, release, or deploy are not part of this planning chain.

## Safety Rules

P22 planning keeps these rules:

- no release candidate creation
- no tag, release, or deploy
- no real Codex configuration mutation
- no real Claude configuration mutation
- no `claude mcp` command
- no HTTP MCP start unless a later phase explicitly scopes runtime validation
- no startup or watchdog install
- no provider smoke / benchmark without explicit provider approval
- no real memory content preview by default
- no durable DB / memory / diary write
- no SQLite migration or `ALTER TABLE`
- no import/export apply
- no MCP schema change
- no public MCP tool expansion
- no package or lockfile change
- no dependency change

## Non-Goals

P22 planning does not:

- make a release candidate
- tag, release, deploy, or publish
- install startup or watchdog tasks
- edit real Codex / Claude configuration
- expose `validate_memory` as a public MCP tool
- add new public MCP tools
- implement import/export apply
- run SQLite migration
- run provider smoke or benchmark
- read or print broad real memory content
- implement UI
- start P23 v1.0 work

## Planning Result

Result: `P22_RELEASE_CANDIDATE_PLANNED_BLOCKED_FOR_IMPLEMENTATION_APPROVAL`

P22 may proceed to release-candidate readiness inventory.

It is not sufficient to authorize RC implementation, startup/watchdog installation, real config mutation, provider calls, migration, import/export apply, public MCP expansion, tag, release, or deploy.

## Next Recommended Phase

P22.1 release-candidate readiness inventory is captured in [P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md](./P22_RELEASE_CANDIDATE_READINESS_INVENTORY.md).

P22.2 release-candidate gate matrix dry-run plan is captured in [P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md](./P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md).

P22.3 rollback/support story is captured in [P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md](./P22_RELEASE_CANDIDATE_ROLLBACK_SUPPORT_STORY.md).

P22.4 approval packet template is captured in [P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md](./P22_RELEASE_CANDIDATE_APPROVAL_PACKET_TEMPLATE.md).

`P22.x-release-candidate-planning-closeout-review`
