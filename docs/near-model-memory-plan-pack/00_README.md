# codex-memory｜接近模型内置记忆体验计划包 v1.0

本计划包用于指导 `codex-memory` 从“Codex 通过 MCP 查询 VCPToolBox 原生记忆”升级为：

> Codex 通过 MCP、codex-memory 治理层、VCPToolBox native memory runtime，获得接近模型内置记忆体验的外部长期记忆能力。

## 核心判断

这条路线现实可行，但不能把“两个 MCP 通道连通”直接宣称为“完整实时记忆能力”。

正确表达是：

> Codex 通过 MCP 拥有对 VCPToolBox 原生记忆的完整、实时、受治理访问能力，并在此基础上通过 memory context package、任务前自动召回、任务后 memory delta，逐步获得接近模型内置记忆的使用体验。

## 包内文件

| 文件 | 用途 |
|---|---|
| `01_EXECUTIVE_SUMMARY.md` | 总结版结论，适合先读 |
| `02_FINAL_GOAL_AND_NON_CLAIMS.md` | 最终目标、非目标、禁止声明 |
| `03_ARCHITECTURE_PLAN.md` | 目标架构与通道设计 |
| `04_PHASE_PLAN.md` | 阶段总计划 |
| `05_TASKBOOKS.md` | 每阶段执行任务书 |
| `06_ACCEPTANCE_MATRIX.md` | 验收标准与 gate 矩阵 |
| `07_CAPABILITY_MATRIX.md` | 能力矩阵 |
| `08_RISK_REGISTER.md` | 风险登记表 |
| `09_CODEX_EXECUTION_PROMPT.md` | 可直接发给 Codex 的执行任务书 |
| `10_EXTERNAL_REVIEW_REQUEST.md` | 可直接发给 Pro / 外部审查者的审查申请 |
| `11_SELF_REVIEW_ROUND_1.md` | 第一轮自审报告 |
| `12_SELF_REVIEW_ROUND_2.md` | 第二轮自审报告 |
| `13_CHANGELOG.md` | 版本说明 |

## 当前建议

先执行 Phase 1：

1. 修复 `hardened` 下 explicit MCP public tools 绕过 read-only 的风险。
2. 修复 `AtomicFileWriter` stale lock cleanup 的 TOCTOU 风险。
3. 重新跑 `npm run test:all`。
4. 重新跑 `npm run gate:ci -- --json`。
5. 之后再进入 `prepare_memory_context` 的实现。

不要在 blocker 未清时直接扩展 full surface 或 native write。
