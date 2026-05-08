# Scope Backfill Policy

更新时间：2026-05-09

## 1. 为什么不能直接回填真实数据

历史 memory records 可能存在：
- 没有 `project_id`
- 没有 `client_id`
- 没有 `workspace_id`
- `visibility` 不完整
- `retention_policy` 不完整

直接回填的风险：
- 错误归类可能导致 scope 串线
- 批量 UPDATE 无法精确回滚
- 可能覆盖用户手工维护的元数据
- 无法验证回填后 scope 语义是否正确

## 2. 三种策略

### 策略 A：保持 null，只让新记忆进入 scoped 模式

- 风险：最低
- 效果：历史记忆不参与 scope 过滤，scope.strict 查询可能遗漏历史相关记录
- 适用：刚刚引入 scope 的阶段

### 策略 B：默认回填 `project_id=codex-memory`

- 风险：中等
- 效果：所有历史记忆归属到默认项目，scope.strict 查询包含历史记忆
- 适用：单项目仓库，不涉及多项目隔离

### 策略 C：按来源 / tags / path / title 推断 project_id

- 风险：最高
- 效果：根据记忆内容智能推断归属
- 适用：多项目环境，且有明确的推断规则

## 3. 推荐策略

**先 dry-run，再人工确认，再小批量 confirm。**

具体步骤：
1. 运行 `npm run scope:backfill:dry-run -- --json` 生成 dry-run 报告
2. 人工审查报告，确认 `wouldUpdate` 数量和 `suggestedDefaults`
3. 如果 dry-run 结果合理，在独立分支上执行小批量 backfill（限 10 条）
4. 运行 `npm run scope:acceptance -- --json` 验证 scope 隔离
5. 确认无误后继续下一批

## 4. Rollback 方法

- 每次 backfill 前记录 `data/codex-memory.sqlite` 的备份
- 如果回填结果不符合预期，恢复备份的 SQLite 文件
- 不要依赖 `git revert` 来恢复数据状态

## 5. 不允许自动写真实 DB 的原因

- Scope backfill 是破坏性操作（修改历史数据）
- 无法自动判断回填语义是否正确
- 需要人工确认项目归属
- 回滚依赖完整备份，不是代码 revert

## 6. 与 P1.2 scope-backfill-dry-run 的关系

`scope:backfill:dry-run` 是本策略的只读执行入口。它：
- 只读 SQLite shadow store
- 统计 scope 覆盖情况
- 输出 `wouldUpdate` 数量和建议默认值
- `mutated` 永远为 `false`
- 不提供 `--confirm`
