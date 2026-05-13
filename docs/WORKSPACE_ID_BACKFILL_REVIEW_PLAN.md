# Workspace ID Backfill Review Plan

更新时间：2026-05-13

## 1. 目的

这份计划只定义 `workspace_id` 回填前的人工审查流程，不授权真实数据写入。

当前结论：不要自动给历史 memory records 生成或猜测 `workspace_id`。`workspace_id` 可能代表本地工作区、路径或客户端边界，错误回填会造成 scope 串线，也可能在审计或 dashboard 中暴露不该公开的本地上下文。

## 2. 当前 Dry-Run 基线

命令：

```powershell
npm run scope:backfill:dry-run -- --json
```

2026-05-13 基线：

| Field | Value |
|---|---:|
| totalRecords | 450 |
| alreadyScoped | 8 |
| missingProjectId | 0 |
| missingClientId | 0 |
| missingWorkspaceId | 442 |
| missingVisibility | 0 |
| wouldUpdate | 442 |
| mutated | false |

解释：

- 当前缺口集中在 `workspace_id`。
- `project_id`、`client_id`、`visibility` 当前 dry-run 未显示缺口。
- `wouldUpdate=442` 只是只读统计，不代表可以安全批量写入。

## 3. 人工分类

审查时只记录脱敏结论，不把原始内容、secret、完整本地路径或私有片段写入文档。

| Class | Meaning | Default Action |
|---|---|---|
| A | 来源、标题、低敏 metadata 能清楚映射到当前 `A:\codex-memory` 工作区 | 形成人工 mapping proposal，等待确认 |
| B | 来源不清楚、跨项目、跨客户端或证据不足 | 保持 `workspace_id` 为空 |
| C | 可能包含敏感路径、个人上下文、外部项目或需要用户确认 | 保持 `workspace_id` 为空，等待显式确认 |

## 4. 审查流程

1. 运行 `scope:backfill:dry-run`，只保存脱敏数量。
2. 本地抽样查看候选记录，但不把 raw memory content、secret、完整路径或私有上下文写入报告。
3. 产出人工 mapping proposal，只描述规则和数量，不产出可直接执行的 SQL。
4. 与用户确认 mapping proposal。
5. 如果未来获得真实回填授权，先备份 SQLite，再小批量执行，并立即运行验收。

## 5. Hard Stops

- 不自动执行 `UPDATE`。
- 不自动运行真实 durable state 的 `rebuild-shadow`。
- 不 broad export 真实 memory。
- 不把 raw `workspace_id`、完整本地路径、secret 或 raw memory content 写进 docs / board / audit 摘要。
- 不从当前路径自动推断所有历史记录的 `workspace_id`。

## 6. 未来验证矩阵

当前 docs-only 阶段：

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

未来只读复核：

```powershell
npm run scope:backfill:dry-run -- --json
```

未来真实回填如果被显式批准：

```powershell
npm run scope:acceptance -- --json
npm run gate:mainline:strict
```

真实回填前还必须先完成 SQLite 备份，并把 batch size 限制在可人工复核的小批次。

## 7. 当前建议

当前建议是保持 `442` 条缺失 `workspace_id` 的历史记录不变，直到存在人工审查过的 mapping proposal。
