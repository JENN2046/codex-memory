# CHECKPOINT.md — codex-memory

## Current Goal

P8 / PL-2 — 用 fixture-backed preflight 量化 lifecycle + private visibility soft read policy 对默认 recall 集合的影响，但不改 runtime 行为。

## Current Area

P8-memory-governance

## Current Status

soft read-policy preflight 已完成本地实现：新增测试证明当前默认 `search_memory` 仍会返回 mixed-governance records，并量化假设中的 status + client-aware private visibility 过滤会把 fixture 结果从 `6` 条收窄到 `2` 条。

## Completed Work

- 新增 `tests/policy-read-preflight.test.js`，构造 mixed `status/visibility/client` fixture，证明当前默认读路径仍然宽松。
- 新增 `docs/SOFT_READ_POLICY_PREFLIGHT.md`，把 preflight 结果整理成可执行结论。
- `docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md` 已挂接这次 `PL-2` preflight 入口。
- preflight 结论已明确：默认读策略一旦改成 status + private visibility soft policy，会真实改变召回集合，不适合伪装成内部小优化。

## Changed Files

- `tests/policy-read-preflight.test.js`
- `docs/SOFT_READ_POLICY_PREFLIGHT.md`
- `docs/POLICY_LAYER_PROPOSAL_SCOPE_INTEGRATION.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/CHECKPOINT.md`

## Validation Run

- `node --test tests\policy-read-preflight.test.js` -> `2/2`
- `npm test` -> `150/150`
- `git diff --check` -> passed with repo-known LF normalization warning only
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` -> passed

## Validation Not Run

- none

## Current Blockers

- none

## Remaining Risks

- runtime 行为仍未改变；这批只提供 fixture-backed preflight 证据，后续若真要改默认 read policy 仍需拆成独立决策批次

## Next Safe Action

Inspect final diff, then guarded commit/push this preflight task.
