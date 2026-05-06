# CHECKPOINT.md — codex-memory

## Current Goal

Prepare Claude MCP minimal acceptance.

## Current Area

P9-codex-claude-client-scope

## Current Status

`bcb2d84 docs: add maintenance backlog` is already synchronized with `origin/main`. The local batch now also prepares Claude MCP minimal acceptance: local HTTP health and `claude mcp list` were checked without writing Claude config, and the actual `claude mcp add` step is documented as an explicit-authorization boundary.

## Completed Work

- P1-4 suite expansion committed as `1159873` and pushed to `origin/main`.
- P2-1 checkpoint index committed as `57aa164` and pushed to `origin/main`.
- P1-3 baseline record `phase-e-error-semantics-suite-gate-02.md` prepared.
- P1-3 suite expansion record `phase-e-standard-suite-expansion-09.md` prepared.
- Standard suite expanded to `37` cases with `TopicMemo GetTopicContent topicId alias` error coverage.
- `a39c1ff` committed and pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed.
- Mainline checkpoint record `phase-e-mainline-gate-checkpoint-17.md` prepared.
- Checkpoint-17 documentation committed and pushed as `a386bed`.
- Added `deepmemo-missing-maid-keyword-alias` to the standard suite.
- Updated DeepMemo CLI error meta to preserve `key_word` / `KeyWord` aliases in `keyword` / `query` diagnostics.
- Added `deepmemo-agent-not-found-keyword-alias` to the standard suite.
- Standard suite expanded to `39` cases.
- `56c647a` committed and pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed.
- Mainline checkpoint record `phase-e-mainline-gate-checkpoint-18.md` prepared.
- Checkpoint-18 documentation committed as `000c149` and pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `000c149`.
- Mainline checkpoint record `phase-e-mainline-gate-checkpoint-19.md` prepared.
- Phase E P2-1 recovery docs synced to checkpoint-19 / `39/39` baseline.
- STATUS / PROJECT_CLOSURE current baseline synced to checkpoint-19 / `39/39`.
- `8e3ae8d docs: sync phase e checkpoint 19 baseline` pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `8e3ae8d`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Added `PHASE_E_PROVIDER_BENCHMARK.md` as the Phase E P2-2 lightweight provider benchmark retention entrypoint.
- Linked the provider benchmark entrypoint from README, Phase navigation, Phase E backlog, and Phase E summary.
- `ba7031a docs: add phase e provider benchmark entrypoint` pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `ba7031a`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Added `benchmarks/reports/README.md` as the provider benchmark reports retention index.
- Linked the reports index from `PHASE_E_PROVIDER_BENCHMARK.md` and `benchmarks/provider-benchmark.md`.
- `f40a6f6 docs: add provider benchmark reports index` pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `f40a6f6`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Added `logs/phase-e-provider-benchmark-record-template.md` as a reusable sanitized record template for real provider benchmark / smoke / profile migration evidence.
- Linked the record template from `PHASE_E_PROVIDER_BENCHMARK.md` and `benchmarks/reports/README.md`.
- Clarified provider benchmark留档粒度 and result interpretation order.
- Updated `PHASE_E_BACKLOG.md` P2-2 status to reflect entrypoint, reports index, and record template coverage.
- `3eaf11f docs: polish provider benchmark retention docs` pushed to `origin/main`.
- `13d7c6b docs: sync p2-2 provider handoff state` pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `13d7c6b`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Updated `PHASE_E_CHECKPOINT_INDEX.md` to show `13d7c6b` as the latest remote mainline commit while keeping checkpoint-19 as the latest independent checkpoint.
- Added a board-only push-after table for `8e3ae8d`, `ba7031a`, `f40a6f6`, and `13d7c6b`.
- Linked provider benchmark reports and record template from Phase E navigation/summary surfaces.
- `59f1b03 docs: sync phase e board-only checkpoint index` pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `59f1b03`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Added `PHASE_E_FINAL_CLOSEOUT.md`.
- Updated Phase E backlog/summary/navigation/status/project closure/memory to reflect Phase E closeout.
- Moved remaining donor/provider/docs work into maintenance-phase incremental work instead of Phase E open backlog.
- `49537f6 docs: close phase e` pushed to `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `49537f6`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Added `MAINTENANCE_BACKLOG.md`.
- Linked the maintenance backlog from Phase E closeout, Phase navigation, README, status, project closure, and memory.
- Migrated donor/provider/docs follow-up items out of Phase E into the maintenance-phase queue.
- `bcb2d84 docs: add maintenance backlog` is present on `origin/main`.
- Push-after `git status --short` + `npm run gate:mainline` passed for `bcb2d84`.
- Result recorded in `.agent_board` only; checkpoint-20 intentionally not created.
- Project goal, roadmap, architecture, memory policy, validation policy, and maintenance docs now scope the product to `Codex` and `Claude`.
- Historical fixture identifiers containing `multi-agent` were left unchanged because they are standard suite names, not product targets.
- Added `CLAUDE_MCP_ACCEPTANCE.md`.
- Added `logs/claude-mcp-minimal-acceptance-01.md`.
- Linked Claude MCP acceptance from README, Phase navigation, status, memory, and maintenance backlog.
- Recorded `claude mcp add` as blocked until explicitly authorized because it writes Claude config outside the workspace.

## Changed Files

- `.agent_board/*.md`
- `benchmarks/active-memory-suite/inputs/topicmemo-gettopiccontent-missing-topic-topicid-alias.json`
- `benchmarks/active-memory-suite/standard-suite.json`
- `tests/compare-vcp-active-memory-cli.test.js`
- `tests/rollback-active-memory-cli.test.js`
- `logs/phase-e-error-semantics-suite-gate-02.md`
- `logs/phase-e-standard-suite-expansion-09.md`
- `PHASE_E_BACKLOG.md`
- `PHASE_E_CHECKPOINT_INDEX.md`
- `PHASE_E_FINAL_CLOSEOUT.md`
- `MAINTENANCE_BACKLOG.md`
- `PHASE_E_DAILY_SELF_CHECK.md`
- `PHASE_NAVIGATION.md`
- `logs/phase-e-mainline-gate-checkpoint-17.md`
- `benchmarks/active-memory-suite/inputs/deepmemo-missing-maid-keyword-alias.json`
- `benchmarks/active-memory-suite/inputs/deepmemo-agent-not-found-keyword-alias.json`
- `src/cli/deepmemo.js`
- `logs/phase-e-mainline-gate-checkpoint-18.md`
- `logs/phase-e-mainline-gate-checkpoint-19.md`
- `PHASE_NAVIGATION.md`
- `PHASE_E_SUMMARY.md`
- `PHASE_E_BACKLOG.md`
- `MEMORY.md`
- `STATUS.md`
- `PROJECT_CLOSURE.md`
- `PHASE_E_PROVIDER_BENCHMARK.md`
- `README.md`
- `benchmarks/reports/README.md`
- `benchmarks/provider-benchmark.md`
- `logs/phase-e-provider-benchmark-record-template.md`
- `PHASE_E_CHECKPOINT_INDEX.md`
- `PROJECT_GOAL.md`
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `MEMORY_POLICY.md`
- `AGENTS.md`
- `VALIDATION.md`
- `CLAUDE_MCP_ACCEPTANCE.md`
- `logs/claude-mcp-minimal-acceptance-01.md`
- `.agent_board/BLOCKERS.md`
- `.agent_board/DECISIONS.md`

## Validation Run

- `node --test .\tests\compare-vcp-active-memory-cli.test.js` passed (`14/14`).
- `node --test .\tests\rollback-active-memory-cli.test.js` passed (`11/11`).
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match` passed (`37/37 matched`).
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready` passed (`37/37 rollback-ready`).
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-match` passed (`5/5 matched`).
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category topic-state --json --require-ready` passed (`5/5 rollback-ready`).
- `npm run gate:mainline` passed (`health`/`compare`/`rollback` all `ok`).
- `git diff --check` passed.
- `npm test` passed (`123/123`).
- `git push origin main` succeeded (`c70b00e..a39c1ff`).
- Push-after `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `37/37 matched`, rollback `37/37 rollback-ready`.
- `node --test .\tests\vcp-active-memory-cli.test.js` passed (`17/17`).
- `node --test .\tests\compare-vcp-active-memory-cli.test.js` passed (`14/14`).
- `node --test .\tests\rollback-active-memory-cli.test.js` passed (`11/11`).
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category input-validation --json --require-match` passed (`5/5 matched`).
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category input-validation --json --require-ready` passed (`5/5 rollback-ready`).
- `npm run gate:mainline` passed: health `200`, compare `38/38 matched`, rollback `38/38 rollback-ready`.
- `npm test` passed (`123/123`).
- `git diff --check` passed.
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category agent-selection --json --require-match` passed (`8/8 matched`).
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category agent-selection --json --require-ready` passed (`8/8 rollback-ready`).
- `node --test .\tests\rollback-active-memory-cli.test.js` passed after updating the agent-selection aggregate assertion (`11/11`).
- `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `npm test` passed (`123/123`).
- `git diff --check` passed.
- `git push origin main` succeeded (`a386bed..56c647a`).
- Push-after `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git push origin main` succeeded (`56c647a..000c149`).
- Push-after `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for checkpoint-19 plus docs baseline sync, with CRLF warnings only.
- Recovery-doc stale/current reference scan confirmed current recovery docs point to checkpoint-19 / `39/39`; older `37/37` memory section is marked historical.
- STATUS / PROJECT_CLOSURE / Phase E entrypoint scan confirmed current baseline points to checkpoint-19 / `000c149` / `39/39`.
- `git push origin main` succeeded (`000c149..8e3ae8d`).
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for provider benchmark docs with CRLF warnings only.
- Package script references exist for `provider-smoke`, `provider-benchmark`, `profile-health`, `profile-gate`, `gate:mainline`, `compare-active-memory`, and `rollback-active-memory`.
- `git push origin main` succeeded (`8e3ae8d..ba7031a`).
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for provider reports index with CRLF warnings only.
- Provider reports link/secret/trailing-space scan passed; secret scan only found placeholder/safety text.
- Package script references still exist for provider/profile/mainline commands.
- `git push origin main` succeeded (`ba7031a..f40a6f6`).
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for the P2-2 provider benchmark record template batch, with CRLF warnings only.
- Trailing whitespace scan passed for the P2-2 provider docs/template files.
- Local link target check passed for referenced provider docs/template/report files.
- Package script reference check passed for provider/profile/mainline commands.
- High-confidence secret pattern scan passed.
- `git push origin main` succeeded (`f40a6f6..13d7c6b`).
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for the P2-1 checkpoint index/navigation sync, with CRLF warnings only.
- Trailing whitespace scan passed.
- Referenced local file check passed for checkpoint/provider/navigation links.
- High-confidence secret pattern scan passed.
- `git push origin main` succeeded (`13d7c6b..59f1b03`).
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for the Phase E final closeout batch, with CRLF warnings only.
- Trailing whitespace scan passed.
- Referenced local file check passed.
- High-confidence secret pattern scan passed.
- `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git push origin main` succeeded (`59f1b03..49537f6`).
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for the maintenance backlog docs batch, with CRLF warnings only.
- Trailing whitespace scan passed.
- Referenced local file check passed.
- High-confidence secret pattern scan passed.
- `git push origin main` reported `Everything up-to-date` for `bcb2d84`.
- Pre-board-update `git status --short` was clean.
- Push-after `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `git diff --check` passed for the Codex/Claude target-scope docs batch, with CRLF warnings only.
- Trailing whitespace scan passed.
- Target wording scan passed for old product-target phrases.
- `Get-Command claude` found `C:\Users\617\.local\bin\claude.exe` version `2.1.100.0`.
- `Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'` returned `ok=true`, `protocol=streamable-http`, path `/mcp/codex-memory`.
- `claude mcp list` ran successfully and showed `vcp_codex_memory` is not configured yet.
- Final docs validation passed: `git diff --check`, trailing whitespace scan, and local link check.
- `npm run gate:mainline` passed: health `200`, compare `39/39 matched`, rollback `39/39 rollback-ready`.
- `claude mcp add` was explicitly authorized and succeeded; `claude mcp get/list` showed `vcp_codex_memory` connected.
- Direct MCP protocol `tools/call memory_overview` succeeded with `overviewIsError=false`.
- User requested `deepseek-v4-pro`; model-mediated retry used `--model deepseek-v4-pro` but failed before tool execution with API `ConnectionRefused`.

## Validation Not Run

- `npm run gate:mainline:strict`
- `npm run provider-smoke -- --json`
- `npm run provider-benchmark -- --json`


## MCP / Runtime State

| Field | Value |
|---|---|
| MCP mode | HTTP mainline assumption; verify before runtime claims |
| HTTP health | latest known `200` from mainline gate |
| Mainline gate | latest local verification passed |
| Compare suite | latest known baseline `39/39 matched` |
| Rollback readiness | latest known baseline `39/39 rollback-ready` |
| Profile gate | not run |
| Provider smoke | not run |

## Audit / Recall Impact

- Write audit impact: none expected
- Recall audit impact: none expected
- Shadow/index impact: none expected
- Active-memory impact: standard suite fixture coverage plus DeepMemo CLI error diagnostic alias extraction only

## Current Blockers

- none

## Remaining Risks

- Current local changes are a docs-governance/client-scope aggregate batch: `bcb2d84` board-only post-push note, Codex/Claude target-scope alignment, and Claude MCP minimal acceptance preflight.
- Claude configuration write is complete.
- Model-mediated `memory_overview` remains blocked on model provider API connectivity, not on MCP server health.
- Any next push remains a hard stop without explicit remote authorization.

## Next Safe Action

Validate docs after the `deepseek-v4-pro` retry record, then create a guarded local commit if coherent. Stop before any remote write.

## Last Local Commit

- `bcb2d84 docs: add maintenance backlog` is on `origin/main`.

