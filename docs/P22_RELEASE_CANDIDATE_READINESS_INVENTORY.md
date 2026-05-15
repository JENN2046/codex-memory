# P22.1 Release Candidate Readiness Inventory

Phase: `P22.1-release-candidate-readiness-inventory`

Status: readiness inventory

## Purpose

Inventory release-candidate readiness evidence, freshness, known gaps, and approval blockers before any release-candidate implementation.

This phase is docs/status/board only. It does not run the release-candidate gate matrix, start HTTP MCP, install startup or watchdog tasks, edit Codex or Claude configuration, run `claude mcp`, call providers, read real memory content, run migration, apply import/export, create a release candidate, tag, release, or deploy.

## Readiness Inventory Summary

P22.1 result: `P22_RELEASE_CANDIDATE_READINESS_INVENTORIED_BLOCKED_FOR_GATE_REFRESH`

The project has strong planning, fixture, dry-run, closeout, and local docs validation evidence from P12-P22. It does not yet have a fresh release-candidate gate run at the current `main` head specifically for RC implementation.

## Current Baseline

| Item | Current state |
|---|---|
| Current branch | `main` |
| Latest pushed baseline before P22.1 | `a05c2ce81be1fe2013eceef9472ad974cd7a4440` |
| Public MCP tools | `record_memory`, `search_memory`, `memory_overview` |
| Internal-only tool boundary | `validate_memory` remains internal-only |
| RC implementation | blocked |
| Tag / release / deploy | blocked |
| Provider calls | blocked without explicit approval |
| Startup / watchdog install | blocked without explicit approval |
| Real config mutation | blocked without explicit approval |
| Migration / import-export apply | blocked without explicit approval |

## Gate Freshness Inventory

| Gate | Latest known evidence | Freshness for RC implementation | Required next action |
|---|---|---|---|
| Full test suite | P21.4 latest full `npm test` passed `472/472`. | useful but not fresh enough for RC implementation | Rerun before any RC implementation. |
| Strict mainline gate | P12.5 safety baseline records `gate:mainline:strict` PASS with compare `43/43` and rollback `43/43`. | stale for RC implementation | Rerun in P22 gate matrix / RC approval path. |
| Compare standard suite | P20.2b `gate:ci` and P14 standing evidence record compare `43/43`. | useful standing baseline, stale for RC implementation | Rerun explicit compare standard suite. |
| Rollback standard suite | P20.2b `gate:ci` and P14 standing evidence record rollback `43/43`. | useful standing baseline, stale for RC implementation | Rerun explicit rollback standard suite. |
| Query quality gate | P20.2b `gate:ci` records queries `14/14`, `mutated=false`, `providerCalls=0`, `durableMemoryTouched=false`. | useful standing baseline, stale for RC implementation | Rerun `gate:ci -- --json` before RC implementation. |
| Client scope / privacy | P21.2 targeted scope tests passed `18/18`, `5/5`, `7/7`; P21.4 privacy fixture passed `8/8`. | fresh enough as fixture evidence; still requires non-regression rerun if files change | Keep as P22 non-regression evidence; rerun if scope/client files change. |
| Local production safety | P20.4 checklist and P20.x closeout are current planning artifacts. | current as policy evidence | Reuse for approval packet and operator checklist. |
| Docs validation | P22 planning passed `git diff --check` and docs validation. | fresh for docs-only work | Rerun for P22.1 changes. |

## Evidence Inventory By Area

| Area | Evidence | Inventory status | RC blocker |
|---|---|---|---|
| Runtime mutation safety | P12.5 two-phase `validate_memory` audit protocol and internal-only boundary. | evidence available | no public MCP expansion allowed |
| Object model and migration | P13 fixture / dry-run / readiness chain. | evidence available | migration remains blocked |
| Donor parity | P14 DeepMemo / TopicMemo / error-meta / ranking / standing gate evidence. | evidence available | explicit compare/rollback refresh required before RC implementation |
| Query quality | P15 fixture recall dry-run and `gate:ci` query shape evidence. | evidence available | fresh `gate:ci` required before RC implementation |
| Semantic association | P16 TagMemo semantic association gate evidence. | evidence available | provider benchmark remains blocked |
| V8 diagnostics | P17 fixture-backed diagnostics. | evidence available | diagnostic evidence only, not V8 runtime implementation |
| Import/export/migration safety | P18 dry-run and backup/rollback safety closeout. | evidence available | apply/migration remain blocked |
| Observability/admin review | P19 fixture-backed review surfaces and operator notes. | evidence available | UI and live admin changes remain blocked |
| Local production safety | P20 startup/watchdog inventory, health readiness, backup/rollback plan, safety checklist, closeout. | evidence available | startup/watchdog/config/backup apply remain blocked |
| Client integration | P21 planning, inventory, scope review, Claude refresh plan, privacy fixtures, standing gate, closeout. | evidence available | live Claude / config refresh remains blocked |

## Known Gaps

- No current-head RC gate matrix has been run after P22 planning.
- Strict mainline gate evidence is not fresh enough for RC implementation.
- Compare / rollback standard suite evidence is standing evidence, not current-head RC evidence.
- Interactive Claude `/mcp` panel evidence remains manual / live-check blocked.
- Provider smoke / benchmark remain unrun and require explicit provider approval.
- Real Codex / Claude config guidance remains docs-only.
- Startup/watchdog install remains blocked.
- Migration and import/export apply remain blocked.
- RC creation, tag, release, and deploy remain blocked.

## Approval Blockers

These must be resolved before any RC implementation:

- explicit approval for RC implementation scope
- exact target commit
- fresh full test suite
- fresh strict mainline gate
- fresh compare / rollback standard suite
- fresh `gate:ci -- --json`
- documented rollback story
- documented support / troubleshooting story
- explicit decision on whether live HTTP observation is in scope
- explicit decision on whether Claude live acceptance refresh is in scope
- explicit provider approval if provider smoke / benchmark is requested
- explicit config approval before any Codex / Claude config mutation
- explicit startup/watchdog approval before any service operation

## Safe Next Step

P22.2 should define the release-candidate gate matrix dry-run plan and expected report shape.

P22.2 must still avoid running provider calls, starting services, mutating config, touching real memory, creating a release candidate, tagging, releasing, or deploying unless a separate explicit A5 approval is provided.

## Boundary Confirmation

P22.1 does not:

- change `src/`
- add or modify tests / fixtures
- change `package.json` or lockfiles
- change MCP schema or public tools
- expose `validate_memory` publicly
- start HTTP MCP
- start watchdog
- install scheduled tasks
- edit HKCU Run
- edit Codex or Claude configuration
- run `claude mcp`
- call providers
- read real memory content
- write durable DB / memory / diary data
- run SQLite migration or `ALTER TABLE`
- apply import/export
- create a release candidate
- tag, release, or deploy

## Next Recommended Phase

P22.2 release-candidate gate matrix dry-run plan is captured in [P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md](./P22_RELEASE_CANDIDATE_GATE_MATRIX_DRY_RUN_PLAN.md).

`P22.3-release-candidate-rollback-support-story`
