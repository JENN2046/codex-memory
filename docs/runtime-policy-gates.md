# Runtime Policy Gates

更新时间：2026-05-14

本页记录 runtime policy gate 的安全开关、默认行为、验证入口和 CI-safe policy summary 边界。

长期路线图事实源仍是 [VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)。本页只描述当前 runtime policy gate 的操作边界，不替代路线图。

## 当前边界

- 不新增 MCP public tools；公开工具仍为 `record_memory` / `search_memory` / `memory_overview`。
- 不读取 `.env` 或 secret 值。
- 不调用 provider smoke / benchmark。
- 不写真实 durable memory 做验证。
- 不做 profile confirm、cleanup apply、真实 migration、release 或 deploy。

## Secret Scanner

写入路径会在 `MemoryWriteService` 写 diary 前扫描 `title`、`content`、`evidence`、`tags`。

高风险命中会拒绝写入，包括但不限于：

- token / bearer token / authorization header
- password / passwd / pwd
- api key / secret key
- private key block
- cookie / session cookie

拒绝结果只记录安全类别和原因，不把原始 secret-like 字符串写入 audit、summary 或 error detail。

这不是完整 DLP 分类器；它是写入前的高风险拦截层。误报或漏报需要通过 fixture tests 和人工复核继续收敛。

## Runtime Schema Validation

MCP `tools/call` 入口会对参数做运行时校验。

- unknown field 返回 JSON-RPC `-32602`。
- enum mismatch 返回 JSON-RPC `-32602`。
- invalid scope / visibility / sensitivity 等受保护字段返回 JSON-RPC `-32602`。
- `TOOL_DEFINITIONS` schema 不放宽。
- public MCP tools 不扩展。

这层校验只收紧入口参数边界，不改变工具名称或成功路径的业务语义。

## HTTP Auth Hardening

HTTP MCP 启动时会区分 loopback 与 non-loopback host：

- non-loopback host + empty token：fail-fast，避免无 token 暴露到非本机地址。
- loopback host + empty token：仍允许本地开发，但 health/log 会给出显式 warning。
- 配置 token 后：调用方应使用对应 bearer token。

默认开发路径仍可在本机无 token 启动；生产化或跨主机暴露不应依赖这个默认行为。

## Soft Read Policy Flag

`CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false` 是默认行为。

默认关闭时，当前读取行为保持 P9/P10 兼容，不自动过滤 proposal / rejected / tombstoned / cross-client private 记录。

显式开启后，读取路径会过滤：

- `status=proposal`
- `status=rejected`
- `status=tombstoned`
- cross-client `visibility=private`

这仍是 soft read policy，不是完整 lifecycle enforcement。P11 前不要把它当作 approve / reject / tombstone 的生命周期状态机。

## Query Fixture Dry-Run

`real-query-suite` 与 `query:quality` 支持 fixture recall dry-run。

边界：

- fixture-only。
- 不触碰真实 durable memory。
- 不调用 provider。
- `mutated=false`。
- 用于验证 query fixture recall 与 assertion runner，不代表线上召回质量分数。

常用命令：

```powershell
npm run real-query-suite -- --json --fixture-recall-dry-run
npm run query:quality -- --json --dry-run --fixture-recall-dry-run
```

## CI-Safe Query Fixture Recall Standing Gate

`gate:ci` now includes the same fixture recall dry-run summary under `checks.queries.detail.fixtureRecallDryRun`.

Boundary:

- fixture-only.
- no daemon.
- no provider.
- no durable memory write.
- `mutated=false`.
- no synthetic `hitRate` or `qualityScore`.

Current standing gate:

- `caseCount=14`
- `passedCount=14`
- `failedCount=0`
- `providerCalls=0`
- `durableMemoryTouched=false`

The text output includes `fixture recall 14/14`, and JSON output exposes the exact `fixtureRecallDryRun` shape locked by the P15.3 report-shape tests.

## CI-Safe Policy Preflight

`gate:ci` 现在输出 `checks.policyPreflight`，用固定 fixture 模拟 soft read policy 会保留和过滤多少记录。

边界：

- fixture-only。
- 不依赖真实 HTTP MCP daemon。
- 不调用 provider。
- 不写真实 memory。
- 不读 `.env`。
- 不改变 `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` 默认值。

当前 fixture summary：

- `inputCount=7`
- `keptCount=3`
- `filteredCount=4`
- `lifecycleFilteredCount=3`
- `crossClientPrivateFilteredCount=1`
- `defaultPolicyEnabled=false`
- `mutated=false`

示例：

```powershell
npm run gate:ci
npm run gate:ci -- --json
```

JSON 重点字段：

- `summary.fixtureOnly / noNetwork / noDaemon / noProvider`
- `checks.policyPreflight.detail.fixtureOnly`
- `checks.policyPreflight.detail.defaultPolicyEnabled`
- `checks.policyPreflight.detail.mutated`
- `checks.policyPreflight.detail.inputCount / keptCount / filteredCount`
- `checks.policyPreflight.detail.lifecycleFilteredCount`
- `checks.policyPreflight.detail.crossClientPrivateFilteredCount`

## CI-Safe Lifecycle Policy Summary

`gate:ci` 现在输出 `checks.lifecyclePolicy`，用
[lifecycle-read-policy-runtime-v1.json](/A:/codex-memory/tests/fixtures/lifecycle-read-policy-runtime-v1.json)
生成 lifecycle read-policy runtime flag 的 fixture-only summary。

边界：

- fixture-only。
- 不依赖真实 HTTP MCP daemon。
- 不调用 provider。
- 不写真实 memory。
- 不读 `.env`。
- `mutated=false`。
- 不改变 `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` 默认值。
- 不改变 `search_memory` runtime 行为。

当前 fixture summary：

- `defaultEnabled=false`
- `enabledIncludedStatuses=["active","stale"]`
- `enabledExcludedStatuses=["proposal","rejected","superseded","tombstoned"]`
- `missingColumnBehavior=warn-or-fail-safe`
- `hiddenByLifecycleCount=4`
- `staleResultCount=1`
- `auditSummaryShapePresent=true`
- `rawWorkspaceIdExposed=false`

JSON 重点字段：

- `checks.lifecyclePolicy.status`
- `checks.lifecyclePolicy.detail.fixtureOnly`
- `checks.lifecyclePolicy.detail.noNetwork / noDaemon / noProvider`
- `checks.lifecyclePolicy.detail.mutated`
- `checks.lifecyclePolicy.detail.defaultEnabled`
- `checks.lifecyclePolicy.detail.enabledIncludedStatuses`
- `checks.lifecyclePolicy.detail.enabledExcludedStatuses`
- `checks.lifecyclePolicy.detail.hiddenByLifecycleCount`
- `checks.lifecyclePolicy.detail.staleResultCount`
- `checks.lifecyclePolicy.detail.auditSummaryShapePresent`
- `checks.lifecyclePolicy.detail.rawWorkspaceIdExposed`

## Observability Lifecycle Read-Policy Summary

`dashboard`、`observe:http` 和 `governance:report` 现在也会输出 lifecycle/read-policy 低风险 summary。

这些 observability surfaces 只读取 config flag 和 recent recall audit summary，不改变召回行为，不写 memory，不调用 provider，不执行 SQLite migration。

当前 summary 字段：

- `lifecyclePolicyEnabled`
- `softReadPolicyEnabled`
- `lifecycleIncludedStatuses=["active","stale"]`
- `lifecycleExcludedStatuses=["proposal","rejected","superseded","tombstoned"]`
- `recentHiddenByLifecycleCount`
- `recentStaleResultCount`
- `lifecycleColumnAvailable`
- `scopeWorkspacePresent`
- `rawWorkspaceIdExposed=false`
- `noProvider=true`
- `mutated=false`
- `migrationApplied=false`

边界：

- `status=unavailable` 只表示最近 recall audit 中没有 read-policy summary，不触发 runtime fallback 或写入。
- 输出不包含 raw `workspace_id`。
- `scopeWorkspacePresent` 只表示是否出现 workspace scope signal，不暴露实际 workspace id。
- `governance:report` 将该 summary 放在 `readPolicy` 与 `review.readPolicy`；`dashboard` / `observe:http` 会在 JSON 和 text 输出中显示。

## Recommended Validation

runtime policy gate 文档与 CI-safe summary 变更建议验证：

```powershell
node --test tests\gate-ci-cli.test.js
node --test tests\lifecycle-read-policy-runtime-fixture.test.js
node --test tests\dashboard-cli.test.js
node --test tests\http-observe-cli.test.js
node --test tests\governance-report-cli.test.js
npm run gate:ci
npm run gate:ci -- --json
npm run dashboard -- --json
npm run observe:http -- --json
npm run governance:report -- --json
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

如果改动触及 MCP contract 或 HTTP runtime，再追加 P10 runtime gate 对应测试和 `npm run gate:mainline:strict`。P10.1 当前目标不需要触碰这些 runtime 面。
