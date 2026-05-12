# CHECKPOINT.md — codex-memory

## Current Goal

P6 — 把 `Single-Window 4-Agent Compact Autopilot` 正式收束成一个命名明确的仓库能力说明，并挂接到稳定入口。

## Current Area

P6-docs-drift

## Current Status

命名能力说明批次已完成本地起草：新增 `Single-Window 4-Agent Compact Autopilot` 文档，并把入口挂到 `AGENTS.md` 与 `README.md`，让这套 autopilot rail 可以被稳定引用，而不是只散落在历史补丁和 board 里。

## Completed Work

- 新增 `docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md`，正式定义这套命名能力。
- `AGENTS.md` 已挂接这份文档，明确它是现有 hard-stop / validation / guarded-commit 规则之上的命名与操作说明。
- `README.md` 已新增稳定入口，方便新机器和后续维护直接找到这套模式。
- 文档内容明确区分了“仓库内可迁移能力”和“机器级仍需补齐的运行环境”。

## Changed Files

- `docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md`
- `AGENTS.md`
- `README.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/RUN_STATE.md`
- `.agent_board/HANDOFF.md`
- `.agent_board/VALIDATION_LOG.md`
- `.agent_board/CHECKPOINT.md`

## Validation Run

- `git diff --check` -> passed with repo-known LF normalization warnings only
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` -> passed

## Validation Not Run

- none

## Current Blockers

- none

## Remaining Risks

- 无明显实现风险；仅剩 commit/push 收口

## Next Safe Action

Inspect final diff, then guarded commit/push this naming/entry task.
