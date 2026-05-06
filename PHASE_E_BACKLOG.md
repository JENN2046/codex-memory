# Phase E Backlog

更新时间：2026-05-06

这份 backlog 用于承接 `Phase D` 收官之后的后续精修工作。

定位：

- `Phase D` 已完成“独立主链 + 默认主链切换”目标
- `Phase E` 不再解决“能不能独立出来”
- `Phase E` 主要解决“如何把默认主链继续打磨得更稳、更像 donor、更易维护”

配套文档：

- 默认主链切换结论：[PHASE_D_DEFAULT_MAINLINE_CONCLUSION.md](/A:/codex-memory/PHASE_D_DEFAULT_MAINLINE_CONCLUSION.md)
- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- `Gray-05` 稳定性观察记录：[phase-d-gray-rollout-gray-05.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-05.md)

## 总原则

`Phase E` 的工作分两条线：

1. 主线：默认主链的持续稳定性与可运营性
2. 精修线：donor 扩展 payload / 排序手感 / 诊断体验继续贴齐

非目标：

- 不再回到 donor 仓库里做运行时开发
- 不再把 donor 作为主链前提
- 不把扩展字段零漂移当成默认主链阻断项

## 优先级定义

- `P0`
  - 影响默认主链稳定性、回滚能力、日常可运营性
- `P1`
  - 不阻断主链，但明显影响 donor 兼容手感或后续维护效率
- `P2`
  - 体验优化、精修、扩展覆盖

## A. 主线 Backlog

### P0-1 持续门禁常态化

状态：已落地为日常入口：[PHASE_E_DAILY_SELF_CHECK.md](/A:/codex-memory/PHASE_E_DAILY_SELF_CHECK.md)

目标：

- 把 compare / rollback 从“阶段性验证工具”收成默认主链的日常门禁

建议动作：

- 固化一套最小日常检查命令
- 约定关键改动后必须补跑 compare / rollback
- 必要时补一份更简洁的日常值班 / 自检说明

验收口径：

- 团队后续推进时，不需要再翻历史文档找命令
- compare / rollback 被明确纳入日常变更流程

阻断级别：`P0`

### P0-2 HTTP MCP 运行态可观测性再补一层

状态：已落地为运行态排障入口：[PHASE_E_HTTP_OBSERVABILITY.md](/A:/codex-memory/PHASE_E_HTTP_OBSERVABILITY.md)

目标：

- 让默认主链在日常使用里更容易定位“健康但不好用”这类问题

建议动作：

- 补一层更明确的运行态自检说明
- 视情况补轻量健康 / 日志诊断 CLI
- 明确 health、bridge audit、recall audit、http log 的排障顺序

验收口径：

- 出现运行态问题时，排障路径更短
- 不需要重新从 README 各处拼排障线索

阻断级别：`P0`

### P0-3 回滚流程再收紧一层

状态：已落地为只读回滚 runbook：[PHASE_E_ROLLBACK_RUNBOOK.md](/A:/codex-memory/PHASE_E_ROLLBACK_RUNBOOK.md)

目标：

- 保证默认主链状态下，仍能快速回到 donor / 旧实现参考链

建议动作：

- 把“切回旧入口”的最小动作再写得更明确
- 视情况补一个更直接的回滚操作说明

验收口径：

- 新同事看文档也能明确知道如何回滚
- 回滚路径不依赖口头记忆

阻断级别：`P0`

## B. 精修线 Backlog

### P1-1 扩展字段 drift 收口

状态：当前标准 suite 已扩至 `39/39 matched`，`extendedMismatchCountTotal=0`；P1-1 基线记录：[phase-e-extended-drift-baseline-02.md](/A:/codex-memory/logs/phase-e-extended-drift-baseline-02.md)，最新推送后复验记录：[phase-e-mainline-gate-checkpoint-19.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-19.md)

目标：

- 保持当前 `extended-only-drift` 归零状态；后续只在新增 case 或新增字段族出现 drift 时再收口。

当前已知集中项：

- `toolName / tool_name`
- `agentId / agent_id`
- `maid / maidName`
- `command`
- `resultCount / result_count`
- 部分 error case 的 `code`

建议动作：

- 先按字段族分批收，不做一次性大收口
- 每收一批都用 compare 标准集验证 drift 是否下降

验收口径：

- `extendedMismatchCountTotal` 逐步下降
- compare 的 `driftReasonBreakdown` 不新增新的原因类

阻断级别：`P1`

### P1-2 donor 排序手感继续贴齐

目标：

- 继续把 `DeepMemo / TopicMemo / LightMemo` 的结果顺序和边界手感向 donor 靠近

当前 `ordering` 专项复验：`4/4 matched`，`4/4 rollback-ready`（最新记录：[phase-e-ordering-tiebreaker-06.md](/A:/codex-memory/logs/phase-e-ordering-tiebreaker-06.md)）

建议动作：

- 继续补标准集 case，而不是依赖临时样本
- 优先收那些用户真正能感知到的排序差异

验收口径：

- 新增 case 能稳定复现并锁住 donor 手感
- 不引入新的 core mismatch

阻断级别：`P1`

### P1-3 错误语义与诊断输出继续贴齐

状态：当前标准 suite 已补入 `TopicMemo GetTopicContent topicId alias topic-not-found` case；最新错误语义收口记录：[phase-e-standard-suite-expansion-09.md](/A:/codex-memory/logs/phase-e-standard-suite-expansion-09.md)

目标：

- 让 donor 风格错误语义和 codex-memory 的诊断体验同时兼顾

建议动作：

- 梳理当前错误 `code / error / toolName` 这类扩展字段
- 明确哪些保留 codex-memory 的增强，哪些更值得贴 donor

验收口径：

- 错误输出更稳定
- compare 里的 error-path drift 继续下降

阻断级别：`P1`

## C. 可维护性 Backlog

### P1-4 suite 数据集继续扩容

状态：已继续扩容至 `39/39 matched`，最新新增 `DeepMemo key_word / KeyWord keyword alias` error-path case；最新推送后复验记录：[phase-e-mainline-gate-checkpoint-19.md](/A:/codex-memory/logs/phase-e-mainline-gate-checkpoint-19.md)

目标：

- 让后续精修更多依赖仓库内标准集，而不是临时 case

建议动作：

- 优先补高价值真实场景
- 继续保持 manifest 化和分类元数据完整

验收口径：

- 每次新增 donor 细节对齐，都能优先落进标准集
- 不新增未 manifest 化的 fixture 漏洞

阻断级别：`P1`

### P2-1 文档压缩与导航优化

状态：已落地为运行记录索引：[PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)

目标：

- 当前文档资产已经很多，后续要避免“信息全在但不好找”

建议动作：

- 视情况补一个更薄的文档导航页
- 把阶段性文档和日常运行文档分层

验收口径：

- 新人能快速找到：
  - 当前主链结论
  - 日常检查方法
  - 回滚方法
  - backlog 优先级

阻断级别：`P2`

### P2-2 provider / embedding / rerank 对照继续完善

目标：

- 在默认主链稳定后，再继续把 provider 侧表现差异做成长期可跟踪资产

建议动作：

- 继续补 benchmark 使用说明和结果留档方式
- 将来有需要再恢复更系统的 provider 对照

验收口径：

- provider 差异分析不再依赖一次性实验

阻断级别：`P2`

## 建议的 Phase E 起步顺序

建议顺序：

1. `P0-1` 持续门禁常态化
2. `P0-2` 运行态可观测性
3. `P0-3` 回滚流程再收紧
4. `P1-1` 扩展字段 drift 收口
5. `P1-4` 标准集继续扩容
6. 其余 `P1 / P2` 按用户感知价值推进

## 一句话总结

```text
Phase E 的重点不再是“切不切主链”，而是：

在 codex-memory 已经成为默认主链的前提下，
继续把它打磨得更稳、更易维护、更贴 donor 手感。
```
