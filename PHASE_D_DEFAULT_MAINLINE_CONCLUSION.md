# Phase D Default Mainline Cutover Conclusion

更新时间：2026-04-23

这份文档用于给出 `Phase D` 的最终收官结论：`codex-memory` 是否已经可以从“灰度主链”提升为“默认主链”。

配套文档：

- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)
- `Gray-02` 真实观察记录：[phase-d-gray-rollout-gray-02.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-02.md)
- `Gray-03` 稳定性观察记录：[phase-d-gray-rollout-gray-03.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-03.md)
- `Gray-04` 稳定性观察记录：[phase-d-gray-rollout-gray-04.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-04.md)
- `Gray-05` 稳定性观察记录：[phase-d-gray-rollout-gray-05.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-05.md)

## 最终结论

结论：`codex-memory` 现在可以作为 `vcp_codex_memory` 的默认主链实现。

结论级别：

- [x] 默认主链可切换
- [ ] 继续仅限灰度
- [ ] 需要回退到 donor / 旧实现

## 结论依据

### 1. 迁移验收已通过

首轮迁移验收结论已是 `Pass with Known Gaps`，且 gap 不属于 blocker：

- `npm test = 80/80`
- compare `25/25 matched`
- rollback `25/25 rollback-safe`
- `coreMismatchCountTotal = 0`
- `blockerBreakdown = {}`

### 2. 真实主入口灰度观察已通过

`Gray-02` 已确认：

- Codex 配置已指向 `http://127.0.0.1:7605/mcp/codex-memory`
- 用户重启后成功回到当前会话
- 当前未出现 `vcp_codex_memory` 初始化失败或握手超时
- compare / rollback 在重启后再次复跑仍然全绿

### 3. 后续稳定性观察已完成

`Gray-03 / Gray-04 / Gray-05` 都通过，意味着它不只是“能切上去”，而是“切上去后持续稳定”：

- HTTP `/health` 持续为绿
- MCP 契约持续可用
- compare 持续 `25/25 matched`
- rollback 持续 `25/25 rollback-safe`
- 日志侧没有新的异常迹象

## 默认主链切换判断

当前判断如下：

- 默认推荐入口：`HTTP MCP`
- 默认目标地址：`http://127.0.0.1:7605/mcp/codex-memory`
- 默认服务名：`vcp_codex_memory`
- 当前默认主链角色：由 `codex-memory` 承接

也就是说，从项目治理角度看，当前已经不需要再把 donor / 旧实现当作日常主链，只需要保留它作为只读对照和回滚参考。

## 已知差距

当前仍然存在一类已知 gap，但不阻断默认主链结论：

```text
extended-only-drift
extendedMismatchCountTotal = 185
```

主要集中在扩展字段：

- `toolName / tool_name`
- `agentId / agent_id`
- `maid / maidName`
- `command`
- `resultCount / result_count`
- 部分 error case 的 `code`

判断：

- 这些差距不影响 core compatibility path
- 这些差距不影响 rollback readiness
- 这些差距不阻断默认主链切换

## 后续维护建议

后续建议分成两条线：

### 主线

把 `codex-memory` 当作默认主链继续使用，并保留：

- compare suite
- rollback suite
- 标准 fixture manifest 守门
- HTTP MCP 健康检查

### 精修线

如果后续仍希望 donor 风格再贴近一层，就单独处理扩展字段对齐，而不是再回退主链决策。

## 收官说明

`Phase D` 到这里可以认为已经完成主目标：

- `codex-memory` 已脱离 `VCPToolBox` 运行时依赖
- 已独立承接 `vcp_codex_memory` 主链
- 已完成迁移验收
- 已完成真实主入口灰度观察
- 已完成后续稳定性观察
- 已具备默认主链结论

剩余工作不再属于“能不能独立出来”，而属于“精修 donor 扩展 payload 手感”。

## 一句话结论

```text
codex-memory 现在已经可以作为 vcp_codex_memory 的默认主链实现。

如无新的运行态异常或产品方向变化，不再建议回到 donor / 旧实现作为日常主链。
```
