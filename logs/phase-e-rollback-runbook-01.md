# Phase E Rollback Runbook 01

时间：2026-05-05 12:32:12 +08:00

## 目的

这份记录用于验收 [PHASE_E_ROLLBACK_RUNBOOK.md](/A:/codex-memory/PHASE_E_ROLLBACK_RUNBOOK.md) 落地后的只读回滚计划路径。

## 执行命令

```powershell
npm run rollback:mainline:plan -- --json
node --test tests\mainline-rollback-cli.test.js
npm run gate:mainline
```

## rollback:mainline:plan 结果

summary：

- `status: warn`
- `currentMode: http`
- `rollbackTargetReady: true`
- `rollbackTargetReachable: false`
- message：rollback patch 已可生成，但 legacy target 当前不可达

当前主链：

- HTTP MCP：`http://127.0.0.1:7605/mcp/codex-memory`

legacy target：

- 自动发现来源：`A:\VCP\VCPToolBox\config.env`
- 推断目标：`http://127.0.0.1:6005/mcp/codex-memory`
- probe：`fetch failed`

运行判断：

- 当前默认主链仍是 HTTP mode。
- 回滚目标可推断，但当前不可达。
- 因此本次结果只支持“回滚计划可生成”，不支持“现在可以直接真实回滚”。
- 没有修改 `C:\Users\617\.codex\config.toml`。

## 测试结果

`node --test tests\mainline-rollback-cli.test.js`：

- `3/3` 通过

覆盖：

- 生成 HTTP rollback patch
- 从 VCPToolBox `config.env` 自动发现 legacy target
- 无 rollback target 时返回 warn

## gate:mainline 结果

- `status: ok`
- `mode: daily`
- health：`200`
- compare：`34/34 matched`
- rollback：`34/34 rollback-ready`

## 未执行

- 没有应用 rollback patch
- 没有修改 Codex config
- 没有重启 Codex
- 没有对 legacy target 做 MCP `initialize` / `tools/list`，因为当前 probe 不可达
- 没有运行 `gate:mainline:strict`

## 结论

`Phase E / P0-3` 的只读回滚入口已完成一次实跑验收：CLI 能生成计划并正确阻止“target 不可达却误判为可回滚”的风险；当前默认主链本身仍然通过 `gate:mainline`。

## 下一步

如果未来需要真实回滚，先启动或修复 legacy target，使 `rollbackTargetReachable=true`，再单独确认是否修改 `C:\Users\617\.codex\config.toml`。
