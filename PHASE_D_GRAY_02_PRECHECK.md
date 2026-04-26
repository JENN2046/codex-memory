# Phase D Gray-02 Precheck

更新时间：2026-04-23

这份清单用于执行 `Gray-02` 之前的最后一轮准备检查。

定位：

- `Gray-01` 是灰度前基线记录
- `Gray-02` 目标是第一次真实主入口灰度切换观察
- 这份文档只负责切换前准备，不负责记录切换后的结果

配套文档：

- 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)
- 灰度执行记录模板：[PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md)
- `Gray-01` 基线记录：[phase-d-gray-rollout-gray-01.md](/A:/codex-memory/logs/phase-d-gray-rollout-gray-01.md)

## 一、这次到底切哪一层

`Gray-02` 真正要切的不是记忆核心本身，而是 Codex 侧访问 `vcp_codex_memory` 的主入口。

当前仓库内已经明确的入口点：

- 服务名常量：[constants.js](/A:/codex-memory/src/core/constants.js)
  - `SERVER_NAME = 'vcp_codex_memory'`
- `stdio MCP` 入口：[index.js](/A:/codex-memory/src/index.js)
- `HTTP MCP` 入口：[http-index.js](/A:/codex-memory/src/http-index.js)
- `npm` 启动脚本：[package.json](/A:/codex-memory/package.json)
  - `npm run start`
  - `npm run start:http`
  - `npm run start:http:ensure`
- HTTP 启动包装：[serve-codex-memory-http.js](/A:/codex-memory/scripts/serve-codex-memory-http.js)
- HTTP 自愈脚本：[ensure-codex-memory-http.ps1](/A:/codex-memory/scripts/ensure-codex-memory-http.ps1)

当前建议切换层：

- 优先切 `HTTP MCP`
- 不优先切 `stdio MCP`

原因：

- README 已明确当前对 Codex Desktop 最稳的是 `HTTP MCP`
- `stdio` 更适合本地调试，不适合作为线程恢复时的第一灰度入口

## 二、当前默认目标地址

当前默认 HTTP 配置来自 [createConfig.js](/A:/codex-memory/src/config/createConfig.js)：

- `CODEX_MEMORY_HTTP_HOST` 默认 `127.0.0.1`
- `CODEX_MEMORY_HTTP_PORT` 默认 `7605`
- `CODEX_MEMORY_HTTP_PATH` 默认 `/mcp/codex-memory`

因此当前默认主入口是：

```text
http://127.0.0.1:7605/mcp/codex-memory
```

健康检查地址：

```text
http://127.0.0.1:7605/health
```

## 三、Codex 侧应该接哪种配置

推荐的 Codex 配置在 [README.md](/A:/codex-memory/README.md) 已经写明，`Gray-02` 应优先使用：

```toml
[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7605/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
```

不建议在 `Gray-02` 同时做这两件事：

1. 从 donor / 旧实现切到 `codex-memory`
2. 再把 `HTTP MCP` 改成 `stdio MCP`

这样会把入口切换和协议入口切换混在一起，排障成本会变高。

## 四、切换前必须确认的文件 / 脚本

- [x] `package.json` 中 `start:http` / `start:http:ensure` 存在
- [x] [http-index.js](/A:/codex-memory/src/http-index.js) 可作为 HTTP 主入口
- [x] [serve-codex-memory-http.js](/A:/codex-memory/scripts/serve-codex-memory-http.js) 会先 `bootstrapUserEnvironment()` 再起 HTTP MCP
- [x] [ensure-codex-memory-http.ps1](/A:/codex-memory/scripts/ensure-codex-memory-http.ps1) 会先做 `/health` 检查，再尝试拉起服务
- [x] [README.md](/A:/codex-memory/README.md) 已有 Codex 接入示例

## 五、Gray-02 执行前命令

建议顺序：

```powershell
cd A:\codex-memory
npm test
npm run start:http:ensure
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

通过标准：

- `npm test` 全绿
- HTTP 服务健康检查返回 `ok = true`
- compare 仍为 `25/25 matched`
- rollback 仍为 `25/25 rollback-safe`

## 六、切换前必须保留的回退点

执行 `Gray-02` 之前，不要动掉这些东西：

- donor / 旧实现的入口信息
- compare / rollback 标准 suite
- `Gray-01` 基线记录
- 迁移验收清单
- 灰度切主链 playbook

最小要求：

- 新入口改完之前，旧入口信息必须还能恢复
- 切换过程中不要删除 donor 对照能力
- 不要同时清理旧脚本、旧日志、旧配置

## 七、切换时要看的现场证据

切换前后建议同时保留这些证据：

- 健康检查结果
- compare 文本或 JSON 报告
- rollback 文本或 JSON 报告
- HTTP 日志：[codex-memory-http.log](/A:/codex-memory/logs/codex-memory-http.log)
- bridge audit：[codex-memory-bridge.jsonl](/A:/codex-memory/logs/codex-memory-bridge.jsonl)
- recall audit：[codex-memory-recall.jsonl](/A:/codex-memory/logs/codex-memory-recall.jsonl)

## 八、这一步完成后的出口

如果本清单全部满足，下一步就是：

- 创建 `Gray-02` 真实切换观察记录
- 执行第一次真实主入口切换
- 切换后立即补 compare / rollback / MCP 观察结果

如果本清单任何一项不满足，下一步不是硬切，而是：

- 先修复入口问题
- 再回到本清单复检
