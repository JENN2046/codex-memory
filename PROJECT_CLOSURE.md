# Project Closure

更新时间：2026-05-08

## 正式结论

`codex-memory` 主项目现正式收官。

这里的“收官”指的是：

- 独立仓库目标已经达成
- 默认主链切换已经完成
- compare / rollback / gate / observe / rollback drill 已具备
- 标准 suite 已能持续守门
- 当前不存在阻断默认主链继续使用的兼容缺口

从现在开始，项目状态从“主项目实施期”切换为“维护与精修期”。

## 已完成范围

以下内容已经不再视为未完成事项：

- `codex-memory` 脱离 `VCPToolBox` 运行时独立承接 `vcp_codex_memory`
- Codex Desktop 默认通过 HTTP MCP 接入新主链
- `record_memory / search_memory / memory_overview` 主链稳定运行
- `Phase B` 被动召回主链可用并可回归
- `Phase C` 主动记忆主链可用并具备高 donor 兼容度
- `Phase D` 验收、灰度、回滚闭环已跑通
- `Phase E / P0` 主线资产已落地：
  - `gate:mainline`
  - `gate:mainline:strict`
  - `observe:http`
  - `rollback:mainline:plan`
- `Phase E / P1` 高价值 donor 精修已完成主体收口：
  - 扩展字段 drift 收零
  - 排序 tie-breaker 回归链稳定
  - `TopicMemo` 错误语义与路由边界收口
  - `DeepMemo` 错误 `meta` donor 别名层收口
  - donor 风格错误语义进入标准 suite 与 compare / rollback 门禁
- `Phase E` 已最终收官：[PHASE_E_FINAL_CLOSEOUT.md](/A:/codex-memory/PHASE_E_FINAL_CLOSEOUT.md)

## 当前稳定基线

- 最新远端主线提交：`bcb2d84 docs: add maintenance backlog`
- 最新维护期验收：[maintenance-acceptance-2026-05-08.md](/A:/codex-memory/logs/maintenance-acceptance-2026-05-08.md)
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount = 43`
  - `extendedMismatchCountTotal = 0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount = 43`
  - `extendedMismatchCountTotal = 0`
- `npm test`
  - `131/131`

## 收官后进展（2026-05-08）

- Phase H-J 全部完成（governance + client scope + observability）
- 28-column SQLite migration（governance + scope 字段）
- `npm run dashboard` 统一观测 CLI
- `npm run gate:ci` fixture-only CI 门禁
- LightMemo CLI
- `search_memory` scope filter

## 不再作为 blocker 的事项

这些事项统一归入维护与精修期 backlog，而不是主项目交付阻断项。

## 维护期定义

维护期的工作方式应当是：

- 默认不再开启“大迁移模式”
- 默认做小步、可回滚、可验证的增量精修
- 以 `Phase E backlog` 为主，而不是重新打开“主项目是否完成”的讨论

## 推荐后续入口

如果后面要继续推进，推荐按这个顺序看：

1. [PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md)
2. [PHASE_E_SUMMARY.md](/A:/codex-memory/PHASE_E_SUMMARY.md)
3. [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)
4. [PHASE_E_BACKLOG.md](/A:/codex-memory/PHASE_E_BACKLOG.md)

## 一句话收尾

`codex-memory` 现在已经不是“一个还在证明可行性的迁移项目”，而是“一个已经完成主线建设、正在进入维护与精修阶段的正式主链仓库”。
