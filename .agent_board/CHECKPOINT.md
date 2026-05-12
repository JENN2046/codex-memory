# CHECKPOINT.md — codex-memory

## Current Goal

P9 R3 — Surface scoped recall summary in dashboard / `http-observe`。

## Current Area

P9-codex-claude-client-scope

## Current Status

R3 已完成并验证：`dashboard` 与 `http-observe` 现已展示 scoped recall 低风险 summary，包括 scoped/strict 计数与 `scopeMode` / `scopeDimensions` breakdown；针对性 CLI 测试、`npm test`、`gate:mainline:strict` 均已通过，当前只差最终 commit/push 收口。

## Completed Work

- R1：recall audit 记录 `scopeApplied` / `scopeMode` / `scopeDimensions` / `scopeStrict` 与低风险 scope 字段，不写 raw `workspace_id`。
- R2：`memory_overview.recall.summary.scope` 聚合 scoped recall 活跃度与 low-risk breakdown。
- R3：`dashboard` 与 `http-observe` 现在展示 scoped recall 的低风险 summary。
- `tests/dashboard-cli.test.js` 已补 scoped recall 字段存在性断言。
- `tests/http-observe-cli.test.js` 已补 scoped recall summary 回归，并确认不会暴露 raw `workspace_id`。

## Changed Files

- `src/cli/dashboard.js`
- `src/cli/http-observe.js`
- `tests/dashboard-cli.test.js`
- `tests/http-observe-cli.test.js`
- `docs/SCOPE_ACCEPTANCE.md`
- `docs/SCOPE_RECALL_AUDIT_DESIGN.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/CHECKPOINT.md`

## Validation Run

- `node --test tests\dashboard-cli.test.js` passed (`4/4`)
- `node --test tests\http-observe-cli.test.js` passed (`2/2`)
- `npm test` passed (`145/145`)
- `npm run gate:mainline:strict` passed
- `git diff --check` passed with LF normalization warnings only

## Validation Not Run

- none

## Current Blockers

- none

## Remaining Risks

- none beyond ordinary final diff inspection and commit/push bookkeeping

## Next Safe Action

Select the next post-R3 safe task; `governance-report` CLI is the current leading candidate.
