# Docs Governance

更新时间：2026-05-31

## 目的

`codex-memory` 已从阶段推进进入维护期。维护期最大风险不是缺少文档，而是当前状态、历史记录、任务队列和运行证据混在一起。

这份文档规定各文档的职责边界，避免 README、STATUS、PHASE_NAVIGATION、checkpoint index 和 `.agent_board` 互相争抢事实源。

## 当前瘦身路线

当前文档治理的优先级是先收束状态入口，再处理 runtime gap，最后进入 personal RC dogfood。

第一阶段只做文档面瘦身：

- 不改 runtime 行为。
- 不扩展 public MCP tools。
- 不声明 readiness、write reliability 或 recall reliability。
- 不新增并行的 root/current-state 状态源。
- 不把历史 CM/Pxx 审查流水继续复制到多个文件。

瘦身后的恢复路径应尽量只依赖少数入口：

1. [README.md](/A:/codex-memory/README.md)：操作地图和能力/命令入口。
2. [STATUS.md](/A:/codex-memory/STATUS.md)：当前事实摘要，不承载完整历史。
3. [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)：当前后续路线。
4. [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md) 与 [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)：当前任务和验证 ledger。

## 事实源分工

| 文件 | 职责 | 更新频率 |
|---|---|---|
| [README.md](/A:/codex-memory/README.md) | operation map：能力入口、架构入口、命令入口、接入入口 | 低频 |
| [STATUS.md](/A:/codex-memory/STATUS.md) | 当前事实状态：主线可用性、最新基线、关键能力摘要 | 中频 |
| [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md) | 当前后续路线和阶段顺序，不承担详细任务队列 | 低频 |
| [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md) | 当前 active/local task queue | 每批任务 |
| [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md) | 本地验证 ledger 和 board-only gate 记录 | 每批验证 |
| [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md) | 维护期候选任务池，不替代当前 active task queue | 中频 |
| [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md) | Phase D/E 历史运行记录索引和 checkpoint 历史 | 低频 |
| [PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md) | 只做导航，不承载实时状态正文 | 低频 |
| [MEMORY.md](/A:/codex-memory/MEMORY.md) | 历史阶段记忆索引；不作为当前状态源 | 低频 |
| [PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md) | 主项目收官记录，默认冻结 | 极低频 |

## README 规则

README 是操作地图，不是历史总汇。

README 可以保留：

- 当前能力概览
- 架构分层
- 常用命令
- Codex / Claude 接入入口
- gate / compare / rollback / provider / profile 命令入口
- 指向索引文档的链接

README 不应该继续堆：

- 每一次 checkpoint
- 每一次 push-after gate
- 每一次 suite 扩容流水
- 已有专门索引承载的历史记录明细

压缩 README 时，只迁移和索引历史细节，不删除启动、验证、回滚、provider/profile、Claude/Codex 接入命令入口。

## STATUS 规则

STATUS 只表达当前事实，不堆长历史。

STATUS 应该说明：

- 当前主线是否可用
- 最新远端基线和最新本地验证锚点
- 当前 health / compare / rollback 结论
- 当前重要接入状态，例如 Claude MCP
- 下一阶段入口

STATUS 不应该重复整条 Phase D/E 历史。历史细节进入 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)。

如果 STATUS 已经存在长历史，后续瘦身应只保留当前摘要，把历史 CM/Pxx 链接移入归档或索引；不要再在 README、PHASE_NAVIGATION、`.agent_board/HANDOFF.md` 中复制同一段状态正文。

## Maintenance Backlog 规则

维护期候选方向进入 [MAINTENANCE_BACKLOG.md](/A:/codex-memory/MAINTENANCE_BACKLOG.md)。

Active execution task 进入 [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)，验证进入 [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)。

Phase E 已经收官，后续 donor/provider/docs polish 不再回写 Phase E backlog，也不把完成流水继续追加到 `MAINTENANCE_BACKLOG.md`。

候选项状态应该保持简短：

- `todo`
- `in_progress`
- `done`
- `blocked`
- `skipped`

任务进入执行或完成时需要：

- 更新 `.agent_board/TASK_QUEUE.md`
- 记录验证
- 按聚合节奏本地提交

## Checkpoint 规则

checkpoint 是重要阶段记录，不是普通 gate 流水。

普通 push-after `git status --short` + `npm run gate:mainline` 结果默认只进入 `.agent_board/VALIDATION_LOG.md`。

不为普通 push-after gate 创建 checkpoint-20。

只有满足以下情况之一，才新建 checkpoint：

- runtime contract 或主链行为有实质变化
- rollback / migration / provider profile 有新的关键证据
- 用户明确要求正式 checkpoint
- 一个阶段真的收口，需要独立记录

## Board-only 规则

`.agent_board` 是 sustained autopilot 的工作轨道。

适合放入 `.agent_board`：

- 本地验证结果
- board-only push-after gate
- 当前任务状态
- handoff
- blocker
- 决策

不适合放入 `.agent_board`：

- 大段历史解释
- 可由索引链接表达的重复记录
- secrets / provider key / `.env` 值

## Memory 规则

`MEMORY.md` 只保留历史阶段记忆索引。

它不应该再记录“当前远端提交”、“当前 gate 结果”、“当前 handoff”或 active task 状态。此类事实进入 `STATUS.md`、`.agent_board/TASK_QUEUE.md`、`.agent_board/VALIDATION_LOG.md` 和 `.agent_board/HANDOFF.md`。

## Drift Handling

发现文档漂移时，按这个顺序判断事实：

1. Git / command output
2. source behavior / tests
3. README / STATUS / MAINTENANCE_BACKLOG
4. `.agent_board`
5. historical phase docs
6. memory / handoff

如果“最新远端提交”之类字段与 `git log` 或 `git status --branch --short` 冲突，以 Git 输出为准。

如果 README 与 source 冲突，以 source/tests 为准，然后更新 README。

## Validation Before Docs Commit

docs-only commit 前至少执行：

```powershell
git diff --check
```

如果文档新增或修改 npm script 引用，确认脚本存在于 `package.json`。

如果当前基线、gate 结果、mainline 状态或验证入口变化，执行：

```powershell
npm run gate:mainline
```

如果只更新索引、链接或 handoff，可以不跑全量 `npm test`，但必须说明未运行。

## Commit And Push

本地 commit 可以在 guarded auto-commit 条件满足时执行。

push 永远需要明确授权。

任何涉及 provider、profile confirm、cleanup apply、真实配置、真实数据迁移、dependency 或 `.env` 的变更，都不能因为是“文档相关”而绕过授权。
