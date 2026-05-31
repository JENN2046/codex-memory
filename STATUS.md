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

当前任务是 `CM-1203 DOCUMENTATION_SURFACE_HISTORY_COMPRESSION`：压缩最大状态面，保留当前摘要，把历史流水改为索引 / Git 归档可查。

## 当前权威入口

恢复上下文优先读：

1. [README.md](/A:/codex-memory/README.md)
2. [STATUS.md](/A:/codex-memory/STATUS.md)
3. [CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
4. [.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
5. [.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)

导航规则见 [PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md)。文档职责边界见 [DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)。

## 当前 Git 事实

最近实测事实：

- 分支：`main`
- `HEAD == origin/main == 13922dac462a6d9709160b27f9be6fb5dd4506dc`
- 最近提交：`13922da chore: salvage branch review artifacts`
- 当前本地 tracked worktree 有 docs/board 瘦身改动。
- 未跟踪且未处理：`CLAUDE.md`、`docs/CURRENT_FACTS_SINGLE_SOURCE_PLAN.md`

这些事实会过期。任何 merge、push、release、runtime gap closure、dogfood、approval packet 或 readiness 判断前，必须重新运行：

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

CM-1202 / CM-1203 是 docs-only 状态面瘦身：

- 不改 source/runtime/test/package/lock/config/env/secret/watchdog/startup。
- 不执行 provider/API。
- 不调用真实 `record_memory` / `search_memory` / `memory_overview`。
- 不关闭 runtime gaps。
- 不 push / PR / tag / release / deploy。
- 不声明 readiness 或 reliability。

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

真实 runtime gap closure 仍需要单独 exact approval、fresh Git facts、fresh evidence binding、明确验证和 fail-closed 记录。

## 历史归档

历史 CM/Pxx 流水不再保存在 active status surface 中。查看历史：

- 归档索引：[docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md](/A:/codex-memory/docs/archive/CM1203_STATUS_SURFACE_ARCHIVE_INDEX.md)
- Git 中的压缩前 active surfaces：

```powershell
git show 13922da:STATUS.md
git show 13922da:.agent_board/HANDOFF.md
git show 13922da:.agent_board/CHECKPOINT.md
git show 13922da:.agent_board/TASK_QUEUE.md
git show 13922da:.agent_board/VALIDATION_LOG.md
git show 13922da:.agent_board/AUTOPILOT_LEDGER.md
```

仓库事实、源码行为和当前命令输出始终高于历史状态面。
