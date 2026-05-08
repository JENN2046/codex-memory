# Local-Only Web UI — 评估

更新时间：2026-05-08

## 背景

`npm run dashboard` 现在提供 CLI 文本和 JSON 两种输出。是否需要在此基础上做一个 local-only Web UI？

## 评估结论

**当前不建议实现 Web UI。** CLI + JSON 已满足观测需求，Web UI 的额外价值不足以覆盖新增复杂度。

## 分析

### 当前能力

| 需求 | 当前方案 | 覆盖 |
|------|---------|------|
| 人类可读排障 | `npm run dashboard` 文本输出 | ✅ |
| 自动化/CI 集成 | `npm run dashboard -- --json` | ✅ |
| 轻量检查 | `npm run dashboard -- --json --summary-only` | ✅ |
| 单数据源深挖 | `npm run observe:http`、`profile-health` 等 | ✅ |
| 持续监控 | watchdog + `gate:mainline` | ✅ |

### Web UI 的潜在价值

| 场景 | 价值 | CL​I 替代方案 |
|------|------|-------------|
| 可视化趋势 | 中 | JSON + 外部工具（如 Grafana） |
| 非 CLI 用户 | 低 | 当前用户均为 CLI 环境 |
| 实时刷新 | 低 | 后台 watchdog 已做持续健康检查 |
| 搜索/过滤 | 低 | `search_memory` MCP tool |
| 管理操作 | 待定 | 未来 proposal review 操作可能需要 UI |

### 成本

| 项目 | 估计 |
|------|------|
| 技术选型 | Express/静态 HTML + 内嵌 JSON API |
| 前后端开发 | 1-3 天 |
| 维护 | 新 surface，需要安全审查、依赖管理 |
| 安全 | localhost-only 绑定 + 无写入口，风险可控 |
| 测试 | 新测试面，增加 CI 负担 |

### 决定

**不实现**。理由：

1. 当前 CLI dashboard 已覆盖所有观测需求
2. 用户群体全部在 CLI 环境中工作
3. 没有非 CLI 用户或管理 UI 需求
4. Web UI 的图表和实时刷新在其他场景（Grafana）更合适
5. 在维护期新增 Web UI 违反了"只接小而可证的增量"原则

### 何时重新评估

- 出现非 CLI 用户或需要管理 UI 的场景
- proposal review 流程需要人工界面
- dashboard 数据变得复杂到 CLI 无法有效呈现
- 用户明确要求 Web UI

## 替代方向

与其做 Web UI，更值得投入的方向是：

1. **Dashboard 输出格式化改进**：颜色、分组、diff 高亮
2. **定期 snapshot**：`npm run dashboard -- --json` 输出定期存档到 `logs/dashboard-snapshots/`
3. **外部集成**：JSON 输出可直接被 Grafana/Telegraf 采集
