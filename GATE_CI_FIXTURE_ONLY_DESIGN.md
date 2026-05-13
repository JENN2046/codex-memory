# gate:ci Fixture-Only Design

更新时间：2026-05-08

## 目的

这份文档定义未来 `gate:ci` 的 CI-safe 边界。

当前状态：

- `gate:ci` 已实现：`npm run gate:ci`（`src/cli/gate-ci.js`）
- compare 43/43 + rollback 43/43 + query assertions 8/8 + CI-safe tests 171/171 + docs check
- fixture-only，不依赖 HTTP MCP / provider / real config
- 不修改 `.github/workflows`
- 不替代 `gate:mainline`

本设计只回答：如果后续要实现 `gate:ci`，它必须怎样保持 fixture-only、可重复、无本机依赖。

## 背景

当前 `gate:mainline` 是真实本地主线门禁，会检查：

- HTTP MCP health
- active-memory compare suite
- rollback readiness suite

它适合本地维护和推送后确认，但不适合直接作为 CI 唯一入口，因为 CI 不应该依赖：

- 本机 `127.0.0.1:7605`
- 本地已启动的 HTTP MCP 服务
- 真实 provider
- 真实 `.codex` / Claude 配置
- 本地 `data/` durable state
- profile confirm / cleanup apply

因此未来需要一个 `gate:ci`，只运行 fixture、测试和可重复的只读检查。

## 设计原则

`gate:ci` 必须满足：

- fixture-only
- no network
- no provider calls
- no local daemon dependency
- no user/global config writes
- no `.env` dependency
- no durable data migration
- deterministic output
- JSON-friendly summary
- failure points are named and actionable

## 与 gate:mainline 的分工

| Gate | 用途 | 允许依赖 | 禁止依赖 |
|---|---|---|---|
| `gate:mainline` | 本地真实主线健康确认 | 本地 HTTP MCP、当前 compare/rollback suite | provider write、profile confirm、cleanup apply |
| `gate:ci` | CI / fixture-only 回归 | repo fixtures、tests、dry-run sandbox | HTTP MCP daemon、provider、真实 data、真实配置 |

`gate:ci` 不能证明真实 HTTP mainline 正在运行；它只能证明仓库内可重复行为没有回归。

`gate:mainline` 不能替代 CI fixture gate；它带有本机运行态假设。

## 第一版候选检查

第一版 `gate:ci` 可以考虑包含：

| Check | 条件 | 备注 |
|---|---|---|
| unit tests | `npm test` 等价 | 当前已有 `npm test` |
| MCP contract fixture tests | fixture-only | 不启动真实 HTTP daemon |
| active-memory compare suite | standard suite fixture | 使用仓库内 suite，不访问外部服务 |
| active-memory rollback suite | standard suite fixture | 只读 readiness |
| query assertion suite | `benchmarks/real-query-suite/v1.json` | 检查 `caseCount/assertedCount/failedCount`，只读 fixture assertion |
| docs command reference check | package script existence scan | 只检查已声明为当前命令的脚本 |

暂不纳入默认第一版：

| Check | 原因 | 进入条件 |
|---|---|---|
| `rebuild-profile --dry-run` | 可能受本地 profile/data 状态影响 | 必须先有 fixture profile sandbox |
| `profile-gate` | baseline missing 可能导致 CI 语义不稳定 | 必须先定义 fixture baseline |
| `v8-diagnose` | 需要固定 fixture query 和 fixture data | 必须先固定输入与期望输出 |
| HTTP health | 依赖 daemon | 留给 `gate:mainline` |
| provider smoke / benchmark | 可能访问外部 provider | 只能显式授权后本地运行 |

## 当前命令形态

当前已实现：

```powershell
npm run gate:ci
npm run gate:ci -- --json
```

注意：仍不得把它和 `.github/workflows` 修改混在同一批变更中。

## 输出草案

未来 JSON 输出建议：

```json
{
  "summary": {
    "ok": true,
    "mode": "ci",
    "fixtureOnly": true,
    "failedChecks": []
  },
  "checks": [
    {
      "name": "test",
      "status": "ok"
    },
    {
      "name": "active-memory-compare",
      "status": "ok",
      "matched": 39,
      "total": 39
    },
    {
      "name": "active-memory-rollback",
      "status": "ok",
      "ready": 39,
      "total": 39
    },
    {
      "name": "queries",
      "status": "ok",
      "caseCount": 8,
      "assertedCount": 8,
      "failedCount": 0
    }
  ]
}
```

## 实现前置条件

实现 `gate:ci` 前必须先确认：

- 哪些 tests 是 fixture-only
- compare / rollback CLI 在 CI 中不会访问真实 provider
- standard suite fixture 路径固定
- JSON 输出 schema 固定
- failure exit code 明确
- README / VALIDATION 说明 `gate:ci` 和 `gate:mainline` 的区别
- query assertion runner 必须继续保持 fixture-only，不生成伪 `hitRate` / `qualityScore`

## 禁止事项

第一版实现不得：

- 修改 `.github/workflows` 作为同一批变更
- 调用真实 `http://127.0.0.1:7605`
- 启动或停止 HTTP MCP daemon
- 读写 `.env`
- 读写 `C:\Users\617\.codex\config.toml`
- 读写 Claude 真实配置
- 调用真实 provider
- 改 dependency manifest / lockfile
- 运行 `rebuild-profile --confirm`
- 运行 cleanup apply / confirm
- 迁移真实 memory/data

## 验收标准

设计文档完成时：

- 不改 `package.json`
- 不改 `.github/workflows`
- 不改 `src/`
- 不改 `tests/`
- 文档明确 `gate:ci` 当前未实现
- 文档明确第一版 fixture-only 边界
- 文档明确 `gate:ci` 不能替代 `gate:mainline`

当前实现完成时：

- `npm run gate:ci` 本地可运行
- `npm run gate:ci -- --json` 输出稳定 JSON
- JSON 输出包含 `checks.queries.detail.caseCount/assertedCount/failedCount`
- CI 可运行且不依赖 HTTP daemon
- README / VALIDATION 已写清 gate 分工
- `npm run gate:mainline` 仍作为真实本地主线 gate 保留
