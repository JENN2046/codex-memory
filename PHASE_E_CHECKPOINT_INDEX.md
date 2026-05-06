# Phase E Checkpoint Index

更新时间：2026-05-06

这份文档用于收束 Phase E 的重复运行记录链接。

入口文档只保留：

- 最新独立检查点
- 当前主线基线
- 本索引入口

详细流水记录统一沉淀在这里，避免 `README.md`、`PHASE_NAVIGATION.md`、`PHASE_E_DAILY_SELF_CHECK.md` 继续被 checkpoint 列表撑长。

## 当前最新状态

- 最新远端主线提交：`13d7c6b docs: sync p2-2 provider handoff state`
- 最新独立 mainline gate 检查点：[phase-e-mainline-gate-checkpoint-19.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-19.md)（对应 `000c149` 推送后正式 checkpoint）
- 最新 board-only 推送后复核：`.agent_board/VALIDATION_LOG.md` 的 `CMV-0024`（对应 `13d7c6b`，不创建 checkpoint-20）
- 最新标准 suite 扩容记录：[phase-e-standard-suite-expansion-09.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-09.md)
- 最新 P1-3 错误语义记录：[phase-e-standard-suite-expansion-09.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-09.md)
- 最新 P2-2 provider 留档入口：[PHASE_E_PROVIDER_BENCHMARK.md](/A:/codex-memory/PHASE_E_PROVIDER_BENCHMARK.md)
- 最新 P2-2 provider reports 索引：[benchmarks/reports/README.md](/A:/codex-memory/benchmarks/reports/README.md)
- 最新 P2-2 provider 记录模板：[phase-e-provider-benchmark-record-template.md](/A:/codex-memory/logs/phase-e-provider-benchmark-record-template.md)
- `13d7c6b` 推送后已复核 `git status --short` + `npm run gate:mainline`：
  - `git status --short`：工作区干净
  - health：`ok`，`httpStatus=200`
  - compare：`39/39 matched`
  - rollback：`39/39 rollback-ready`

## 日常运行记录

- 日常自检验收：[phase-e-daily-self-check-01.md](/A:/codex-memory/logs/phase-e-daily-self-check-01.md)
- 主线 gate 检查点 01：[phase-e-mainline-gate-checkpoint-01.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-01.md)
- 主线 gate 检查点 02：[phase-e-mainline-gate-checkpoint-02.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-02.md)
- 主线 gate 检查点 03：[phase-e-mainline-gate-checkpoint-03.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-03.md)
- 主线 gate 检查点 04：[phase-e-mainline-gate-checkpoint-04.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-04.md)
- 主线 gate 检查点 05：[phase-e-mainline-gate-checkpoint-05.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-05.md)
- 主线 gate 检查点 06：[phase-e-mainline-gate-checkpoint-06.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-06.md)
- 主线 gate 检查点 07：[phase-e-mainline-gate-checkpoint-07.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-07.md)
- 主线 gate 检查点 08：[phase-e-mainline-gate-checkpoint-08.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-08.md)
- 主线 gate 检查点 09：[phase-e-mainline-gate-checkpoint-09.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-09.md)
- 主线 gate 检查点 10：[phase-e-mainline-gate-checkpoint-10.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-10.md)
- 主线 gate 检查点 11：[phase-e-mainline-gate-checkpoint-11.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-11.md)
- 主线 gate 检查点 12：[phase-e-mainline-gate-checkpoint-12.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-12.md)
- 主线 gate 检查点 13：[phase-e-mainline-gate-checkpoint-13.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-13.md)
- 主线 gate 检查点 14：[phase-e-mainline-gate-checkpoint-14.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-14.md)
- 主线 gate 检查点 15：[phase-e-mainline-gate-checkpoint-15.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-15.md)
- 主线 gate 检查点 16：[phase-e-mainline-gate-checkpoint-16.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-16.md)
- 主线 gate 检查点 17：[phase-e-mainline-gate-checkpoint-17.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-17.md)
- 主线 gate 检查点 18：[phase-e-mainline-gate-checkpoint-18.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-18.md)
- 主线 gate 检查点 19：[phase-e-mainline-gate-checkpoint-19.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-19.md)

## Board-only 推送后复核

为了减少 checkpoint 噪音，checkpoint-19 之后的若干小批次推送后复核只记入 `.agent_board`，不单独创建 checkpoint-20。

| Commit | Scope | Result | Where |
|---|---|---|---|
| `8e3ae8d` | checkpoint-19 baseline sync | health `200`; compare `39/39`; rollback `39/39` | `.agent_board/VALIDATION_LOG.md` `CMV-0018` |
| `ba7031a` | provider benchmark entrypoint | health `200`; compare `39/39`; rollback `39/39` | `.agent_board/VALIDATION_LOG.md` `CMV-0020` |
| `f40a6f6` | provider benchmark reports index | health `200`; compare `39/39`; rollback `39/39` | `.agent_board/VALIDATION_LOG.md` `CMV-0022` |
| `13d7c6b` | provider record template + handoff state | health `200`; compare `39/39`; rollback `39/39` | `.agent_board/VALIDATION_LOG.md` `CMV-0024` |

## HTTP 运行态记录

- HTTP MCP 运行态观察 01：[phase-e-http-observability-01.md](/A:/codex-memory/logs/phase-e-http-observability-01.md)
- HTTP MCP 运行态观察 02：[phase-e-http-observability-02.md](/A:/codex-memory/logs/phase-e-http-observability-02.md)
- HTTP MCP 运行态观察 03：[phase-e-http-observability-03.md](/A:/codex-memory/logs/phase-e-http-observability-03.md)
- HTTP MCP 运行态观察 04：[phase-e-http-observability-04.md](/A:/codex-memory/logs/phase-e-http-observability-04.md)

## 回滚与 handoff 记录

- 回滚 runbook 验收：[phase-e-rollback-runbook-01.md](/A:/codex-memory/logs/phase-e-rollback-runbook-01.md)
- 回滚演练：[phase-e-mainline-rollback-drill-01.md](/A:/codex-memory/logs/phase-e-mainline-rollback-drill-01.md)
- `MEMORY.md` 状态 handoff：[phase-e-memory-status-handoff-01.md](/A:/codex-memory/logs/phase-e-memory-status-handoff-01.md)

## 标准 suite 扩容记录

- suite 扩容 01：[phase-e-standard-suite-expansion-01.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-01.md)
- suite 扩容 02：[phase-e-standard-suite-expansion-02.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-02.md)
- suite 扩容 03：[phase-e-standard-suite-expansion-03.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-03.md)
- suite 扩容 04：[phase-e-standard-suite-expansion-04.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-04.md)
- suite 扩容 05：[phase-e-standard-suite-expansion-05.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-05.md)
- suite 扩容 06：[phase-e-standard-suite-expansion-06.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-06.md)
- suite 扩容 07：[phase-e-standard-suite-expansion-07.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-07.md)
- suite 扩容 08：[phase-e-standard-suite-expansion-08.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-08.md)
- suite 扩容 09：[phase-e-standard-suite-expansion-09.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-09.md)

## P1-3 错误语义与诊断基线

- baseline 01：[phase-e-error-semantics-suite-gate-01.md](/A:/codex-memory/logs/phase-e-error-semantics-suite-gate-01.md)
- baseline 02：[phase-e-error-semantics-suite-gate-02.md](/A:/codex-memory/logs/phase-e-error-semantics-suite-gate-02.md)
- suite 扩容 09：[phase-e-standard-suite-expansion-09.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-09.md)

## 后续维护规则

- 入口文档不再逐条追加所有 gate checkpoint。
- 新增单条运行记录时，优先更新本索引和对应专题文档的“最新记录”。
- 多条小闭环优先聚合成一批 checkpoint，减少无意义的提交和导航噪音。
- checkpoint-19 之后的常规 push-after gate 可以继续只记 `.agent_board`；只有形成阶段性判断、风险上升或用户明确要求时，再补新的独立 checkpoint。
