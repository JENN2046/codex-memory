# Phase E Rollback Runbook

更新时间：2026-05-05

这份文档是 `Phase E / P0-3 回滚流程再收紧一层` 的只读回滚入口。

目标：让默认 HTTP MCP 主链出现不可接受问题时，能快速知道如何生成回滚计划、如何判断 donor / legacy 目标是否可用，以及真正修改 Codex 配置前必须停在哪里。

## 先跑只读计划

```powershell
cd A:\codex-memory
npm run rollback:mainline:plan -- --json
```

这条命令只读：

- 读取当前 Codex MCP 配置
- 推断当前 `vcp_codex_memory` 指向
- 发现或使用 legacy rollback target
- 生成最小 rollback patch
- 探测 HTTP legacy target 是否可达

它不会修改 `config.toml`。

## 看 summary

先看：

- `summary.status`
- `summary.currentMode`
- `summary.rollbackTargetReady`
- `summary.rollbackTargetReachable`

判断方式：

- `status=ok` 且 `rollbackTargetReady=true`：已有可用回滚 patch。
- `rollbackTargetReachable=true`：HTTP legacy target 当前可探测。
- `rollbackTargetReachable=false`：patch 可生成，但 legacy target 当前不可达，不能直接当作已验证回滚路径。
- `rollbackTargetReady=false`：还没有明确回滚目标，需要先补 legacy 参数或修正 donor 发现路径。

## 默认发现规则

如果没有手动传 legacy 参数，当前 CLI 会尝试从：

```text
A:\VCP\VCPToolBox\config.env
```

读取 `PORT`，并推断：

```text
http://127.0.0.1:<PORT>/mcp/codex-memory
```

也可以显式指定 HTTP 目标：

```powershell
npm run rollback:mainline:plan -- --json --legacy-url "http://127.0.0.1:6005/mcp/codex-memory"
```

或显式指定 stdio 目标：

```powershell
npm run rollback:mainline:plan -- --json --legacy-command "C:\Program Files\nodejs\node.exe" --legacy-args-json "[\"A:\\legacy-memory\\src\\index.js\"]" --legacy-cwd "A:\legacy-memory"
```

## 真正回滚前的停点

生成 `rollbackPatch` 不是授权应用 patch。

真正修改下面这个文件前必须单独确认：

```text
C:\Users\617\.codex\config.toml
```

真实回滚动作至少包括：

1. 备份 `config.toml`
2. 替换 `[mcp_servers.vcp_codex_memory]` 配置块
3. 重启 Codex
4. 验证 MCP `initialize`
5. 验证 `tools/list`
6. 运行回滚后观察和 suite 验证

## 回滚后验证

真正回滚到 legacy target 后，优先验证 Codex 当前配置指向的 MCP target：

- MCP `initialize`
- MCP `tools/list`
- 工具列表至少仍包含 `record_memory` / `search_memory` / `memory_overview`

如果还要确认本仓库默认 HTTP 主链自身是否仍健康，再运行：

```powershell
npm run observe:http -- --json
```

注意：`observe:http` 默认观察的是本仓库 `127.0.0.1:7605` HTTP MCP 运行态；它不会自动证明 Codex 已经切到 legacy target。

再保留 donor 兼容 suite 现场材料：

```powershell
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

如果要回到当前默认主链，也要走同样步骤：

1. 备份当前配置
2. 恢复默认 HTTP MCP 配置
3. 重启 Codex
4. 运行 `npm run gate:mainline`

## 不要做什么

- 不要把 `rollbackPatch` 自动写进 `config.toml`
- 不要跳过备份
- 不要把 donor target 可推断等同于 donor target 可用
- 不要在没有 `tools/list` 验证的情况下声称回滚链路完整可用
- 不要用 `git reset`、清理数据或 profile rebuild 解决配置回滚问题

## 当前 CLI 覆盖

`npm run rollback:mainline:plan` 当前会汇总：

- 当前 Codex config path 是否存在
- 当前 `vcp_codex_memory` 是 HTTP / stdio / missing
- legacy rollback target 来源
- legacy target reachability probe
- 最小 rollback patch
- 建议步骤

对应源码：[src/cli/mainline-rollback.js](/A:/codex-memory/src/cli/mainline-rollback.js)

对应测试：[tests/mainline-rollback-cli.test.js](/A:/codex-memory/tests/mainline-rollback-cli.test.js)

## 验收口径

`P0-3` 的最小验收口径：

- 新人能先跑只读计划，而不是直接改 Codex 配置。
- 能明确区分 rollback target ready 和 reachable。
- 能知道真正修改 `config.toml` 前必须停下确认。
- 能知道回滚后至少要验证运行态、MCP 工具列表和 rollback suite。

## 一句话结论

默认主链回滚先跑 `npm run rollback:mainline:plan -- --json`；只读计划通过后，真正修改 `config.toml` 前停下确认，回滚后再用 `observe:http`、MCP 握手和 rollback suite 验证。
