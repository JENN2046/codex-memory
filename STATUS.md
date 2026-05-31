# codex-memory Status

更新时间：2026-05-31

## 当前结论

`codex-memory` 的目标是成为 Codex / Claude 可用的本地优先 VCP memory mainline：可审计、可回滚、provider-flexible、VCP-compatible，并保留稳定 MCP 工具契约。

当前控制状态保持：

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```

原因：文档面正在瘦身；A5 / P66 runtime gaps 尚未逐项关闭；personal RC dogfood 尚未开始。不得把 docs-only、fixture-only、本地 proof、历史 gate 或历史 HTTP evidence 解释为 runtime readiness、RC readiness、write reliability 或 recall reliability。

## 当前路线

正式后续路线见 [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)：

1. 先执行文档面瘦身。
2. 再逐个做 A5 / P66 runtime gap closure。
3. 最后做 personal RC dogfood。

当前最新已验证 A5 单元是 `CM-1208 A5-GAP-5_STRICT_GATE_PREFLIGHT`：用户精确授权在 `main@d3b9bf9fb8cc92cc7b2f2112d6006940a68b3d9d` 运行 `npm run gate:mainline:strict`，且无 remote write。该 strict gate 已通过：health ok，contract `29/29`，test `2754/2754`，compare `43/43`，rollback `43/43`。

这是 target-bound strict-gate evidence，不是 runtime readiness、RC readiness、cutover readiness、write reliability 或 recall reliability。`CM-1210 A5-GAP-4_HTTP_EVIDENCE_REFRESH` 已在 `main@db5a4d66cf472d35e80b12d512816cda5de09220` 执行 endpoint-bound refresh：`/health` 和 `observe:http` 为 `ok`，HTTP log error `0`，watchdog recovery `0`，governance status `ok`，`noProvider=true`，`mutated=false`，`migrationApplied=false`。Authenticated MCP `initialize` / `tools/list` 未完成，因为无 bearer token 请求返回 Unauthorized；本次 approval 未授权读取或使用 token material。

当前下一步是决定是否单独授权 authenticated MCP initialize/tools-list evidence。不得把 CM-1210 的 partial evidence 解释为 runtime readiness、RC readiness、production readiness、cutover readiness、write reliability、recall reliability 或 `RC_READY`。

## 当前权威入口

恢复上下文优先读：

1. [README.md](/A:/codex-memory/README.md)
2. [STATUS.md](/A:/codex-memory/STATUS.md)
3. [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
4. [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
5. [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)

导航规则见 [PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md)。文档职责边界见 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)。

## Git 事实使用规则

本文件不再把 post-commit / post-push `HEAD` 或 `origin/main` 当作长期权威事实写死。提交和推送会改变这些值；当前 Git 事实必须以 fresh command output 为准。

CM-1204 / CM-1205 本地验证时的历史快照是：

- 分支：`main`
- 本地 `HEAD = abb1a266b4a74915d7242b701782a5ef90511e32`
- `origin/main = 13922dac462a6d9709160b27f9be6fb5dd4506dc`
- 验证时 branch state：`main...origin/main [ahead 1]`
- 验证时 tracked worktree 有 docs/board 瘦身改动。

该快照只用于解释 CM-1204 / CM-1205 的验证上下文，不代表读取本文件时的当前分支状态。

仍保持未跟踪且未处理：

- `CLAUDE.md`
- `docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md`

任何 merge、push、release、runtime gap closure、dogfood、approval packet 或 readiness 判断前，必须重新运行：

```powershell
git status --short --branch
git log --oneline --decorate -n 10
```

## 最近验证锚点

`13922da chore: salvage branch review artifacts` 已推送到 `origin/main`。该提交把已审查旧分支中的仍有价值内容移植到主线：

- `tests/governance-schema.test.js`
- `docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md`
- `docs/personal-production-readiness.md`

已验证：

- `node --test tests\governance-schema.test.js` passed `5/5`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs` passed
- `git diff --check` passed
- `npm test` passed `2754/2754`

历史 hardening 证据也曾通过：`npm run test:hardening` hardening `73/73` + override evidence `6/6`；fixture-only `gate:ci` PASS。它们不构成 runtime readiness。

CM-1202 through CM-1207 是 docs-only 状态面瘦身 / runtime-scope preflight：

- 不改 source/runtime/test/package/lock/config/env/secret/watchdog/startup。
- 不执行 provider/API。
- 不调用真实 `record_memory` / `search_memory` / `memory_overview`。
- 不关闭 runtime gaps。
- 不把 push / PR / tag / release / deploy 当作 docs 证据或 readiness 证据；remote sync 只在用户明确授权下执行。
- 不声明 readiness 或 reliability。
- CM-1207 只推荐下一步 A5 approval scope；不运行 `gate:mainline:strict`、HTTP observe、provider、real memory scan 或 durable write。

## 当前分支清理事实

已完成：

- `main` 已推送到 `origin/main`。
- 远端旧分支 `origin/p0-reliability-fixes` 已删除。
- 远端旧分支 `origin/codex/p1-vcp-memory-core-100-roadmap` 已删除。

本地仍可能存在未 ancestry-merged 的 `salvage/review-*` 标记分支。安全删除曾被 Git 拒绝；不要用强制删除绕过项目规则。

## Runtime 状态

Public MCP tools 仍冻结为：

```text
record_memory
search_memory
memory_overview
```

当前 runtime gap / A5 状态以这些文件为索引入口：

- [docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md)
- [docs/P66_RUNTIME_GAP_TRUTH_TABLE.md](/A:/codex-memory/docs/P66_RUNTIME_GAP_TRUTH_TABLE.md)
- [docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md](/A:/codex-memory/docs/P66_A5_RUNTIME_GAP_CLOSURE_APPROVAL_PACKET.md)
- [docs/CM1207_RUNTIME_GAP_CLOSURE_SCOPE_PREFLIGHT.md](/A:/codex-memory/docs/CM1207_RUNTIME_GAP_CLOSURE_SCOPE_PREFLIGHT.md)

真实 runtime gap closure 仍需要单独 exact approval、fresh Git facts、fresh evidence binding、明确验证和 fail-closed 记录。

## 历史归档

历史 CM/Pxx 流水不再保存在 active status surface 中。查看历史：

- 归档索引：[docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md)
- Backlog 归档索引：[docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1204_MAINTENANCE_BACKLOG_ARCHIVE_INDEX.md)
- Memory 归档索引：[docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1205_MEMORY_ARCHIVE_INDEX.md)
- Git 中的压缩前 active surfaces：

```powershell
git show abb1a26:MEMORY.md
git show abb1a26:MAINTENANCE_BACKLOG.md
git show 13922da:STATUS.md
git show 13922da:.agent_board/HANDOFF.md
git show 13922da:.agent_board/CHECKPOINT.md
git show 13922da:.agent_board/TASK_QUEUE.md
git show 13922da:.agent_board/VALIDATION_LOG.md
git show 13922da:.agent_board/AUTOPILOT_LEDGER.md
```

仓库事实、源码行为和当前命令输出始终高于历史状态面。
