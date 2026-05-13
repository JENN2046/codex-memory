# codex-memory

`codex-memory` 是独立的 `vcp_codex_memory` 仓库实现，目标是让 Codex 的记忆写入、检索、审计和召回增强不再依赖 `VCPToolBox` 运行时。

当前实现遵循这几个原则：

- 保留 `vcp_codex_memory` 的 MCP 服务名与 `record_memory` / `search_memory` / `memory_overview` 工具契约
- 保留 diary 兼容写入，同时并行写入 SQLite / 向量索引 / 审计日志
- 以源码行为为准，文档只做补充，不覆盖真实实现
- 默认推荐 HTTP MCP 入口，优先保证 Codex Desktop 启动稳定性

## 当前能力

- 独立 `stdio MCP` 与 `HTTP MCP` 双入口
- `record_memory` / `search_memory` / `memory_overview`
- diary 兼容写入
- SQLite shadow store
- chunk 索引与候选缓存
- recall audit / write audit
- `Time` / `Group` / `Rerank` / `TagMemo` / 去重 / 重排
- `LightMemo` 目录策略：`maid/folder` 候选阶段硬过滤、默认排除目录、目录别名映射
- embedding provider adapter
- embedding 回退链：`bge-m3-local -> NVIDIA baai/bge-m3 -> local-hash`
- rerank provider adapter
- `Phase C` 主动记忆：chat history index store、`DeepMemo/TopicMemo` 兼容入口、增量重建/回填、donor 风格错误语义与高级查询边界

## 项目跟踪

- 当前项目状态：[STATUS.md](/A:/codex-memory/STATUS.md)
- 阶段导航：[PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md)
- 项目正式收官说明：[PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md)
- 文档治理规则：[DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
- Single-Window 4-Agent Compact Autopilot 能力说明：[docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md](/A:/codex-memory/docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md)
- 下一阶段薄版计划：[CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
- `gate:ci` fixture-only 设计：[GATE_CI_FIXTURE_ONLY_DESIGN.md](/A:/codex-memory/GATE_CI_FIXTURE_ONLY_DESIGN.md)
- 当前阶段记忆：[MEMORY.md](/A:/codex-memory/MEMORY.md)
- 浪潮 VCP 记忆能力评估：[VCP_MEMORY_CAPABILITY_ASSESSMENT.md](/A:/codex-memory/VCP_MEMORY_CAPABILITY_ASSESSMENT.md)
- Phase D 迁移验收清单：[PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md](/A:/codex-memory/PHASE_D_MIGRATION_ACCEPTANCE_CHECKLIST.md)
- Embedding profile 迁移 runbook：[EMBEDDING_PROFILE_MIGRATION_RUNBOOK.md](/A:/codex-memory/EMBEDDING_PROFILE_MIGRATION_RUNBOOK.md)
- Phase D 灰度切主链 playbook：[PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_PLAYBOOK.md)
- Phase D 灰度执行记录模板：[PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md](/A:/codex-memory/PHASE_D_GRAY_ROLLOUT_LOG_TEMPLATE.md)
- Phase D 灰度执行记录：完整清单见 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)（Gray-01 至 Gray-05 等全量记录）
- Phase E / 运行记录索引（全量）：[PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)
- Phase E / 标准 suite 扩容记录：完整清单见 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)（01~09 等全量记录）
- Phase E / P1-2 排序 tie-breaker 收口记录：完整清单见 [PHASE_E_CHECKPOINT_INDEX.md](/A:/codex-memory/PHASE_E_CHECKPOINT_INDEX.md)（tie-breaker 01~06 等全量记录）

## 架构分层

仓库按四层组织：

- `src/core/`：统一记忆领域服务与流程
- `src/storage/`：diary、SQLite、向量索引、聊天索引、审计、缓存
- `src/recall/`：候选生成、TagMemo、EPA、ResidualPyramid、rerank、audit 等召回主链
- `src/adapters/`：Codex MCP、VCP passive memory、VCP active memory 兼容适配层

主要入口文件：

- `src/app.js`：应用装配入口
- `src/index.js`：`stdio MCP` 入口
- `src/http-index.js`：`HTTP MCP` 入口
- `src/cli/rebuild-shadow.js`：全量 shadow 重建
- `src/cli/active-memory.js`：active memory 的 `health / rebuild / sync` CLI
- `src/cli/deepmemo.js`：donor 风格 `DeepMemo` 独立 CLI
- `src/cli/topicmemo.js`：donor 风格 `TopicMemo` 独立 CLI
- `src/cli/compare-vcp-active-memory.js`：新旧 active-memory 只读对照 harness
- `src/cli/rollback-active-memory.js`：只读 rollback readiness 报告 CLI
- `src/cli/mainline-gate.js`：默认主链持续门禁 CLI
- `src/cli/http-observe.js`：HTTP MCP 运行态诊断 CLI
- `src/cli/governance-report.js`：memory governance 只读汇总 CLI
- `src/cli/mainline-rollback.js`：默认主链回滚预案 CLI
- `src/cli/provider-smoke.js`：真实 provider 连通性检查
- `src/cli/provider-benchmark.js`：真实 provider 召回基准对比
- `src/cli/rebuild-profile.js`：embedding profile 安全清理预检 / 确认执行
- `src/cli/cleanup-legacy-chunks.js`：只清理旧版无 fingerprint shadow chunks
- `src/cli/profile-health.js`：当前 embedding profile 健康面板
- `src/cli/shadow-compare.js`：当前 profile 与 baseline profile 的只读召回对照
- `src/cli/profile-gate.js`：固定 query suite 的 profile 迁移质量门禁
- `src/cli/v8-diagnose.js`：只读 V8 terrain / TagMemo / MetaThinking 诊断

## 快速开始

```powershell
cd A:\codex-memory
npm ci
npm test
npm run start:http
```

常用命令：

```powershell
cd A:\codex-memory
npm test
npm run active-memory -- health --json
npm run deepmemo
npm run topicmemo
npm run compare-active-memory -- --tool deepmemo --json
npm run rollback-active-memory -- --tool deepmemo --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run gate:ci -- --json
npm run gate:mainline
npm run gate:mainline:strict
npm run dashboard -- --json
npm run observe:http -- --json
npm run governance:report -- --json
npm run rollback:mainline:plan -- --json
npm run provider-smoke -- --json
npm run provider-benchmark -- --json
npm run rebuild-profile -- --dry-run --json
npm run cleanup-legacy-chunks -- --dry-run --json
npm run profile-health
npm run shadow-compare -- --query "embedding profile migration"
npm run profile-gate -- --json --summary-only
npm run v8-diagnose -- --query "[[checkpoint migration]] ::TagMemo+1.5"
npm run start:http:ensure
npm run start:http:watchdog:once
```

维护命令需要单独确认：`npm run rebuild-shadow` 会按当前配置重建本地 shadow/index；`npm run rebuild-profile -- --confirm --json` 会清理当前 profile 生成物；`cleanup-legacy-chunks -- --confirm` 和 `start:http:*:install` 也会写本地状态。日常排查优先使用 dry-run、fixture tests、`profile-health`、`shadow-compare`、`profile-gate` 和 `observe:http`。

环境变量模板：

- 最小可启动模板：[.env.example](/A:/codex-memory/.env.example)
- 完整高级模板：[.env.advanced.example](/A:/codex-memory/.env.advanced.example)
- provider smoke 示例：[examples/provider-smoke.env.example](/A:/codex-memory/examples/provider-smoke.env.example)
- provider benchmark 示例：[examples/provider-benchmark.env.example](/A:/codex-memory/examples/provider-benchmark.env.example)
- RAG 多 profile 参数示例：[examples/rag-params.profiles.example.json](/A:/codex-memory/examples/rag-params.profiles.example.json)

CI 在 `.github/workflows/ci.yml` 中运行 `npm ci`、`npm test`，并额外 smoke `rebuild-profile`、`profile-health`、`profile-gate`、`v8-diagnose` 四条 profile 相关 CLI。

Embedding profile 会按 `<model>__<dimensions>__<version>` 生成 fingerprint，例如默认本地 BGE-M3 是 `bge-m3-local__1024__v1`。切换模型或维度时，先设置 `CODEX_MEMORY_EMBEDDING_PROFILE_VERSION` 和 `CODEX_MEMORY_RAG_PARAMS_PATH`。

先做只读/轻写预检：

```powershell
npm run rebuild-profile -- --dry-run --json
npm run profile-health
npm run shadow-compare -- --query "your migration query"
npm run profile-gate -- --baseline-fingerprint "<old-profile>" --summary-only --require-pass
```

只有在 dry-run、baseline、备份和迁移窗口都确认无误后，才执行会写本地 profile/shadow/index 状态的步骤：

```powershell
npm run rebuild-profile -- --confirm --json
npm run rebuild-shadow
```

默认 suite 在 [benchmarks/profile-migration-suite.json](/A:/codex-memory/benchmarks/profile-migration-suite.json)。没有 baseline 时门禁会给出 `warn`；需要把它作为硬门禁时，传 `--disallow-no-baseline --require-pass`。日常面板和 CI 建议加 `--summary-only`，避免输出完整 Top-K 明细。

## Codex / Claude 接入

Claude MCP 接入先看：[CLAUDE_MCP_ACCEPTANCE.md](/A:/codex-memory/CLAUDE_MCP_ACCEPTANCE.md)。

当前结论：Claude Code 本地 HTTP MCP 已添加到当前项目 local 配置，`claude mcp get/list` 显示 connected；直接 MCP `memory_overview` 调用成功。按用户最新批准，当前模型侧验收模型切换为 `deepseek-ai/deepseek-v4-flash`，且模型侧 `memory_overview` 调用已成功。非交互 `/mcp` 不可用，需在交互式 Claude Code 中手动补面板验收。

## Codex 接入

### 推荐方式：HTTP MCP

对 Codex Desktop 来说，当前最稳的接入方式是本地 HTTP MCP，而不是让线程恢复直接依赖新的 stdio 进程握手。

启动或确保服务存活：

```powershell
cd A:\codex-memory
npm run start:http:ensure
```

健康检查：

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
```

推荐的 `~/.codex/config.toml` 配置：

```toml
[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7605/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
```

### 可选方式：stdio MCP

如果你明确希望使用 stdio 入口做本地调试，也可以保留 stdio 配置：

```toml
[mcp_servers.vcp_codex_memory]
command = "C:\\Program Files\\nodejs\\node.exe"
args = ["A:\\codex-memory\\src\\index.js"]
cwd = "A:\\codex-memory"
env_vars = [
  "CODEX_MEMORY_BASE_PATH",
  "CODEX_MEMORY_EMBED_DIMS",
  "CODEX_MEMORY_LOCAL_EMBEDDING_PROVIDER",
  "CODEX_MEMORY_LOCAL_EMBEDDING_URL",
  "CODEX_MEMORY_LOCAL_EMBEDDING_MODEL",
  "CODEX_MEMORY_FALLBACK_EMBEDDING_PROVIDER",
  "CODEX_MEMORY_FALLBACK_EMBEDDING_URL",
  "CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY",
  "CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL",
  "CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS",
  "CODEX_MEMORY_ACTIVE_RERANK_SEARCH",
  "CODEX_MEMORY_LIGHTMEMO_EXCLUDED_FOLDERS",
  "CODEX_MEMORY_LIGHTMEMO_DIRECTORY_MAP_JSON"
]
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
```

改完配置后需要重启 Codex，新的 MCP 进程才会带着这组环境变量启动。

## 默认主链持续门禁

`Phase E / P0-1` 现在已经落成仓库内标准入口，用来把默认主链的健康、契约和 compare/rollback 门禁常态化。

日常门禁：

```powershell
cd A:\codex-memory
npm run gate:mainline
```

严格门禁：

```powershell
cd A:\codex-memory
npm run gate:mainline:strict
```

行为说明：

- `gate:mainline`
  - 检查 HTTP MCP `/health`
  - 跑标准 suite 的 compare `--require-match`
  - 跑标准 suite 的 rollback `--require-ready`
- `gate:mainline:strict`
  - 在日常门禁基础上，再跑 `mcp-contract.test.js + mcp-http.test.js`
  - 再跑一次 `npm test`

常用参数：

- `--json`
- `--suite <path>`
- `--health-url <url>`
- `--with-contract`
- `--with-test`

示例：

```powershell
npm run gate:mainline -- --json
npm run gate:mainline -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run gate:mainline:strict -- --json
```

当前建议：

- 日常改动后，至少跑一次 `npm run gate:mainline`
- MCP / 主链 / compare / rollback 相关改动后，优先跑 `npm run gate:mainline:strict`
- gate 失败时，先看 `health -> compare -> rollback`，再决定是否深入单独 CLI 排障

## CI Fixture-Only Gate

`gate:ci` 是不依赖本地 HTTP daemon、不调用 provider、不读写真实 memory DB 的 fixture-only 门禁。它适合做仓库内可重复回归，不替代 `gate:mainline` 的真实本地主线健康检查。

```powershell
cd A:\codex-memory
npm run gate:ci
npm run gate:ci -- --json
```

JSON 输出重点：

- `summary.fixtureOnly / noNetwork / noDaemon / noProvider`
- `checks.compare.detail.totalCaseCount / matchedCaseCount`
- `checks.rollback.detail.totalCaseCount / readyCaseCount`
- `checks.queries.detail.caseCount / assertedCount / passedCount / failedCount`
- `checks.tests.detail.total / passed / failed / skipped`
- `checks.docs.detail.scriptCount / missingCount`

当前 query assertion baseline 为 `8/8`：`checks.queries.detail.caseCount=8`、`assertedCount=8`、`failedCount=0`。

## HTTP MCP 运行态诊断

`Phase E / P0-2` 现在补了一条轻量运行态诊断入口，用来把 `/health`、HTTP 日志、watchdog 日志、bridge audit、recall audit 收成一份报告。

基础用法：

```powershell
cd A:\codex-memory
npm run observe:http
```

JSON 模式：

```powershell
cd A:\codex-memory
npm run observe:http -- --json
```

常用参数：

- `--json`
- `--health-url <url>`
- `--tail <lines>`
- `--audit-tail <entries>`

输出重点：

- `summary.status`
  - `ok`：健康且最近没看到明显异常信号
  - `warn`：健康，但最近日志里出现过恢复或异常线索
  - `error`：`/health` 未通过
- `logs.http`
  - 最近 HTTP MCP 日志
  - 是否出现 `ERROR`
  - 是否能看到 `listening`
- `logs.watchdog`
  - 最近 watchdog 是否恢复过服务
  - 是否出现 `ensure failed`
- `audits.write`
  - 最近 bridge audit 写入数量
  - `accepted/rejected` 分布
- `audits.recall`
  - 最近 recall audit 数量
  - `recallType` 分布
- `governance`
  - proposal / tombstone / supersession / stale 的只读汇总
  - `reviewLevel` 分级（`nominal / observe / needs-review / unavailable`）
  - 只输出低风险 summary，不输出 raw `workspace_id`

推荐排障顺序：

1. 先跑 `npm run observe:http -- --json`
2. 如果 `summary.status=error`，先执行 `npm run start:http:ensure`
3. 如果是 `warn`，先看 `logs.watchdog` 和 `logs.http`
4. 如果服务健康但工具表现异常，再看 `audits.write` / `audits.recall`

现在 `dashboard` 与 `observe:http` 都会顺手带出 governance summary。它们只做只读提示与状态分级，不会修改 proposal / tombstone / supersession 状态，也不会扩展 MCP contract。

## Governance 只读汇总

`governance:report` 提供独立的只读治理快照；`dashboard` / `observe:http` 则复用这份快照做轻量 summary。

基础用法：

```powershell
cd A:\codex-memory
npm run governance:report -- --json
```

输出重点：

- `summary.proposalCount`
- `summary.tombstonedCount`
- `summary.supersededCount`
- `summary.stale30d`
- `summary.stale90d`

当前 observability surface 只显示低风险 count / hint，不做写路径操作，也不暴露 raw `workspace_id`。

## 默认主链回滚预案

`Phase E / P0-3` 现在补了一条只读回滚预案 CLI，用来回答两件事：

- 当前 `vcp_codex_memory` 到底指向哪条主链
- 如果要切回 legacy / donor 参考链，最小配置 patch 是什么

基础用法：

```powershell
cd A:\codex-memory
npm run rollback:mainline:plan -- --json
```

如果你已经知道 legacy 目标，可以直接带进去：

```powershell
npm run rollback:mainline:plan -- --json --legacy-url "http://127.0.0.1:7606/mcp/legacy-memory"
```

或者走 stdio 目标：

```powershell
npm run rollback:mainline:plan -- --json --legacy-command "C:\Program Files\nodejs\node.exe" --legacy-args-json "[\"A:\\legacy-memory\\src\\index.js\"]" --legacy-cwd "A:\legacy-memory"
```

常用参数：

- `--json`
- `--config-path <path>`
- `--server-name <name>`
- `--legacy-url <url>`
- `--legacy-command <command>`
- `--legacy-args-json <json array>`
- `--legacy-cwd <cwd>`

也支持环境变量：

- `CODEX_MEMORY_ROLLBACK_URL`
- `CODEX_MEMORY_ROLLBACK_COMMAND`
- `CODEX_MEMORY_ROLLBACK_ARGS_JSON`
- `CODEX_MEMORY_ROLLBACK_CWD`
- `CODEX_MEMORY_LEGACY_VCPTOOLBOX_PATH`

如果你不手填 legacy 参数，当前实现还会默认尝试从：

- `A:\VCP\VCPToolBox\config.env`

自动发现 donor 旧入口，当前推断规则是：

- 读取 `PORT`
- 拼出 `http://127.0.0.1:<PORT>/mcp/codex-memory`

输出重点：

- `summary.currentMode`
  - 当前是 `http`、`stdio` 还是缺失配置
- `summary.rollbackTargetReady`
  - 是否已经给了可直接套用的回滚目标
- `current`
  - 当前 `config.toml` 里的 `vcp_codex_memory` 主入口
- `rollbackPatch`
  - 可以直接替换到 `config.toml` 的最小配置块
- `steps`
  - 最小回滚动作和回滚后验证顺序

当前这台机器上的最近一次只读计划结果：

- legacy target = `http://127.0.0.1:6005/mcp/codex-memory`
- 来源 = `A:\VCP\VCPToolBox\config.env`
- 当前 probe = `reachable=false`
- `rollbackTargetReady=true`，但 `rollbackTargetReachable=false`

也就是说，当前只能说明“回滚 patch 可生成、回滚目标可推断”，不能说明“现在可以直接真实回滚”。

历史回滚演练曾临时把 `C:\Users\617\.codex\config.toml` 切到 `6005`，完成 `initialize + tools/list` 握手后再切回 `7605`；但 reachability 是运行态事实，后续仍必须以最新 `rollback:mainline:plan` 和 MCP 握手实测为准。

当前建议：

1. 平时先跑 `npm run rollback:mainline:plan -- --json`
2. 真要准备回滚时，先确认 `summary.status=ok` 和 `rollbackTargetReachable=true`
3. 用生成的 `rollbackPatch` 替换 `config.toml` 中的 `[mcp_servers.vcp_codex_memory]`
4. 重启 Codex 后，先验证 MCP `initialize` / `tools/list`
5. 如需确认本仓库默认 HTTP 主链仍健康，再跑 `npm run observe:http -- --json`
6. 留存 rollback suite 现场材料：`npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json`

## 扩展字段 Drift 收口

`Phase E / P1-1` 这次先不改 adapter/service 的 donor 语义，只把 CLI `--full` 和错误输出里 donor 不需要的顶层扩展字段下沉到 `meta`。

这样做之后：

- compare / rollback 的 donor 顶层契约更干净
- 调试字段仍然保留，只是位置改成了 `meta`
- 标准 active-memory suite 的 `extended-only-drift` 已归零

当前最新基线：

- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=36`
  - `extendedMismatchCountTotal=0`
  - `driftReasonBreakdown={}`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount=36`
  - `extendedMismatchCountTotal=0`

## 错误语义标准 Suite 门禁

`Phase E / P1` 这一刀把 `DeepMemo / TopicMemo` 的 donor 风格错误语义，从 CLI 单测推进到了仓库标准 active-memory suite 和 compare / rollback 门禁。

这次收口的重点：

- compare harness 现在只在 `error` case 比较 `query / rawQuery / blockedKeywords / inputSource` 这批错误专属字段，避免 success path 被误计为 `extended-only-drift`
- 标准 suite 新增 `DeepMemo invalid-json` case，把 `inputSource / rawInputPreview` 这批 donor 风格错误诊断推进进 compare / rollback 门禁
- 标准 suite 新增 `TopicMemo invalid-json` case，把 `TopicMemo` 的输入错误 donor 诊断也推进进 compare / rollback 门禁
- 标准 suite 新增 `TopicMemo unknown-command` case，把显式错误指令的 donor 语义也推进进 compare / rollback 门禁
- 标准 suite 新增 `DeepMemo` 多关键词组合 `all-keywords-blocked` case，把 blocked/effective donor 诊断组合边界也推进进 compare / rollback 门禁
- compare harness 现在会在“新旧两侧 success payload 都显式暴露 `meta`”时，额外比对 blocked/effective 这批 success-meta 字段
- 标准 suite 新增 `DeepMemo` 多关键词组合“部分屏蔽但仍成功”case，把 success-path 的 blocked/effective donor 诊断也推进进 compare / rollback 门禁
- 标准 suite 新增 `DeepMemo` 重复关键词去重 success case，把 blocked/effective 的去重与顺序稳定性也推进进 compare / rollback 门禁
- 标准 suite 新增 `DeepMemo` 高级查询语法混用 success case，把 blocked/effective 在短语、可选组和权重项混用时的 donor 语义也推进进 compare / rollback 门禁
- 标准 suite 新增 `DeepMemo` blocked 配置重复值和大小写混用 success case，把 blocked/effective 在 blocked config 归一化下的 donor 语义也推进进 compare / rollback 门禁
- 标准 suite 新增 `TopicMemo history-read-error` fixture 和 case
- 标准 suite 新增 `TopicMemo GetTopicContent agent-not-found` case，把显式内容取回路径上的 donor 错误语义也推进进 compare / rollback 门禁
- 标准 suite 新增 `TopicMemo GetTopicContent agentId/topicId alias` case，把多 agent alias 下的内容取回成功路径也推进进 compare / rollback 门禁
- legacy standard runner 现在会按当前 Node 运行时真实解析 `history.json`，生成同源的 `history-read-error` 错误文案
- ad-hoc compare donor-style error 回归也补齐了 `meta`

当前最新基线：

- `node --test .\tests\vcp-active-memory-cli.test.js`
  - `17/17`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js`
  - `14/14`
- `node --test .\tests\rollback-active-memory-cli.test.js`
  - `11/11`
- `npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match`
  - `matchedCaseCount=36`
  - `extendedMismatchCountTotal=0`
- `npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready`
  - `readyCaseCount=36`
  - `extendedMismatchCountTotal=0`
- `npm test`
  - `123/123`

## 排序 Tie-Breaker

`Phase E / P1-2` 目前已经收了两刀低风险排序边界：

- 同一话题里如果两段 `DeepMemo` 命中分数完全相同，优先更靠后的消息窗口
- 跨 topic 如果 `matchedClauseCount / keywordMatchCount / score` 全相同，优先更新更晚的 topic

现在第三刀也已经补上：

- 仅在跨 topic 的同分结果里，优先更紧凑的命中窗口
- 同一 topic 内仍然保持“更靠后的命中窗口优先”，不让两条 tie-breaker 互相打架

第四刀则把这条优先级顺序继续钉死：

- 当跨 topic 的同分结果里，“紧凑度”和 “freshness” 同时冲突时，当前先保留 `compactness > freshness`
- 这不是新增规则，而是把现有优先级显式锁成回归，避免后续 donor 精修时无意改序

第五刀则把最末级兜底也补齐了：

- 当跨 topic 的同分结果连 `compactness` 和 `freshness` 都完全打平时，当前回退到 `topicId` 词典序
- 这让整条主动记忆排序链从主分数到最终兜底都已有明确回归

这样做的效果是：

- 更贴近 donor 的“新近命中优先”手感
- 不改 query 语义，不改 recall 召回面
- 只在同分 tie-breaker 生效，风险很小

当前新增回归：

- `Phase C should prefer the newer hit window when same-topic DeepMemo scores tie`
- `Phase C should prefer the fresher topic when cross-topic DeepMemo scores tie`
- `Phase C should prefer the more compact hit window when cross-topic DeepMemo scores tie`
- `Phase C should keep compactness ahead of freshness when cross-topic DeepMemo tie-breakers conflict`
- `Phase C should fall back to lexical topicId order when cross-topic DeepMemo tie-breakers fully tie`

当前最新基线：

- `node --test .\tests\phase-c-active-recall.test.js`
  - `21/21`
- `npm test`
  - `123/123`

## MCP 工具

服务名保持为 `vcp_codex_memory`，当前对外工具为：

- `record_memory`
- `search_memory`
- `memory_overview`

工具语义保持兼容：

- `record_memory`：走 Codex bridge 约束，写入 diary、shadow store、向量索引和审计日志
- `search_memory`：兼容 process / knowledge / both 检索，支持 `include_content`
- `memory_overview`：返回写入审计、召回审计、shadow/index 健康与最近活动概览

## Provider Smoke CLI

仓库内置了真实 provider 连通性检查脚本：

```powershell
cd A:\codex-memory
npm run provider-smoke -- --json
```

也可以直接调用入口：

```powershell
node .\src\cli\provider-smoke.js --json
```

可选参数：

- `--embedding-only`
- `--rerank-only`
- `--query "your query"`
- `--documents "doc one || doc two || doc three"`
- `--top-k 3`
- `--json`

默认行为：

- 如果 embedding 和 rerank 都已配置，就一起 smoke
- 如果只配置了一侧，就只检查已配置的一侧
- 如果两侧都没配置，会返回错误退出码
- embedding smoke 会显示完整 endpoint chain 和 fallback 数量

配置样例见：

- [examples/provider-smoke.env.example](./examples/provider-smoke.env.example)

## Provider Benchmark

`provider-benchmark` 用来比较本地 baseline、本地 embedding 服务和远端 fallback provider 的召回差异。

基础用法：

```powershell
cd A:\codex-memory
npm run provider-benchmark -- --json
```

只跑本地与 NVIDIA 对比：

```powershell
cd A:\codex-memory
npm run provider-benchmark -- --providers local,bge-m3-local,nvidia --top-k 5 --json
```

指定数据集：

```powershell
cd A:\codex-memory
npm run provider-benchmark -- --dataset .\benchmarks\default-dataset.json --providers local,bge-m3-local,nvidia --json
```

报告输出位置：

```text
A:\codex-memory\benchmarks\reports\provider-benchmark-*.json
```

当前 benchmark 支持的 provider：

- `local`
- `bge-m3-local`
- `cohere`
- `voyage`
- `jina`
- `nvidia`

说明：

- `local` 是本地 hash baseline，会始终参与对比
- `nvidia` 已作为 benchmark 的一级 provider 支持
- `nvidia` 可以读取 `CODEX_MEMORY_FALLBACK_*`，也兼容 `EMBEDDING_FALLBACK_*`
- 如果本地服务运行时失败，可能出现 `bge-m3-local: error` 同时 `nvidia: ok`

## Embedding 与 Rerank 配置

常用环境变量：

- `CODEX_MEMORY_BASE_PATH`
- `CODEX_MEMORY_DATA_DIR`
- `CODEX_MEMORY_LOGS_DIR`
- `CODEX_MEMORY_EMBED_DIMS`
- `CODEX_MEMORY_LOCAL_EMBEDDING_PROVIDER`
- `CODEX_MEMORY_LOCAL_EMBEDDING_URL`
- `CODEX_MEMORY_LOCAL_EMBEDDING_MODEL`
- `CODEX_MEMORY_FALLBACK_EMBEDDING_PROVIDER`
- `CODEX_MEMORY_FALLBACK_EMBEDDING_URL`
- `CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY`
- `CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL`
- `CODEX_MEMORY_RERANK_PROVIDER`
- `CODEX_MEMORY_RERANK_URL`
- `CODEX_MEMORY_RERANK_API_KEY`
- `CODEX_MEMORY_RERANK_MODEL`
- `CODEX_MEMORY_LIGHTMEMO_EXCLUDED_FOLDERS`
- `CODEX_MEMORY_LIGHTMEMO_DIRECTORY_MAP_JSON`
- `CODEX_MEMORY_ACTIVE_MEMORY_ROOT`
- `CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS`
- `CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS`
- `CODEX_MEMORY_ACTIVE_RERANK_SEARCH`

支持的 provider：

- embedding：`bge-m3-local`、`cohere`、`voyage`、`jina`、`generic`、`nvidia`
- rerank：`cohere`、`voyage`、`jina`、`generic`

当前推荐的 embedding 链路：

1. `bge-m3-local` 作为主 embedding provider
2. `nvidia` 的 `baai/bge-m3` 作为远端 fallback
3. `codex-memory` 内部 `local-hash` 作为最终 baseline fallback

推荐环境变量：

```powershell
$env:CODEX_MEMORY_EMBED_DIMS="1024"
$env:CODEX_MEMORY_LOCAL_EMBEDDING_PROVIDER="bge-m3-local"
$env:CODEX_MEMORY_LOCAL_EMBEDDING_URL="http://127.0.0.1:18081/"
$env:CODEX_MEMORY_LOCAL_EMBEDDING_MODEL="bge-m3-local"
$env:CODEX_MEMORY_FALLBACK_EMBEDDING_PROVIDER="nvidia"
$env:CODEX_MEMORY_FALLBACK_EMBEDDING_URL="https://integrate.api.nvidia.com/"
$env:CODEX_MEMORY_FALLBACK_EMBEDDING_API_KEY="<your-nvidia-key>"
$env:CODEX_MEMORY_FALLBACK_EMBEDDING_MODEL="baai/bge-m3"
```

兼容旧环境变量：

- `EMBEDDING_API_URL`
- `EMBEDDING_API_KEY`
- `EMBEDDING_FALLBACK_API_URL`
- `EMBEDDING_FALLBACK_API_KEY`
- `EMBEDDING_FALLBACK_MODEL`

不要把真实 API key 提交进仓库；只通过本地环境变量、用户 profile 或系统 secret 注入。

## 主动记忆 / Phase C

当前 `Phase C` 已经不再只是“空索引时整库回填”，而是有两条主动记忆链路：

- `force rebuild`：从 donor-style VChat 根目录做全量重建
- `incremental sync`：扫描 donor root，局部更新新增、修改、删除过的 topic / history

当前行为：

- `search / listTopics / getTopicContent` 在 `CODEX_MEMORY_ACTIVE_MEMORY_ROOT` 已配置时，会自动尝试增量追平 donor 变化
- 如果之前做过显式 rebuild，但运行时配置里还没保存 root，系统会回退使用上次 `importedFrom`
- 增量同步默认带一个最小巡检间隔，避免每次查询都重复扫 donor 目录

当前 donor 对齐点：

- `DeepMemo` 兼容 `status/result` 顶层包络，同时保留结构化 `results`
- `TopicMemo` 兼容中文输出、`ListTopics / GetTopicContent` 指令分发和 donor 风格错误文案
- `DeepMemo` 支持 donor 风格高级查询语法：
  - 引号短语
  - `(term:weight)`
  - `{a|b}`
  - `[negative]`
  - 英文逗号和全角逗号分段
- `TopicMemo` 现在能区分：
  - `agent-not-found`
  - `topic-not-found`
  - `empty-history`
  - `missing-history`
  - `history-read-error`
  - `topic_id/topicId` 未显式写 `command` 时，会自动推断为 `GetTopicContent`
- `DeepMemo` 现在支持 blocked keyword 过滤；如果关键词全部被屏蔽，会按 donor 风格拒绝
- `DeepMemo` 现在支持可选 rerank；如果 rerank 失败，会保留主流程成功返回并回退到原始结果

当前相关入口：

- 应用层强制重建：`app.rebuildActiveMemoryFromSource({ rootPath })`
- 应用层增量同步：`app.syncActiveMemoryFromSource({ rootPath, force })`
- active memory 运维 CLI：`npm run active-memory -- <health|rebuild|sync> --json`
- donor 风格 `DeepMemo` CLI：`npm run deepmemo`
- donor 风格 `TopicMemo` CLI：`npm run topicmemo`
- active-memory compare harness：`npm run compare-active-memory -- --tool deepmemo --json`
- 配置项：`CODEX_MEMORY_ACTIVE_MEMORY_ROOT`
- 配置项：`CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS`
- 配置项：`CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS`
- 配置项：`CODEX_MEMORY_ACTIVE_RERANK_SEARCH`

建议配置：

```powershell
$env:CODEX_MEMORY_ACTIVE_MEMORY_ROOT="A:\\path\\to\\vchat-root"
$env:CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS="5000"
$env:CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS="DeepMemo,system plan"
$env:CODEX_MEMORY_ACTIVE_RERANK_SEARCH="false"
```

如果你希望把 `DeepMemo` 的远端 rerank 也一起打开，可以参考这组完整配置：

```powershell
$env:CODEX_MEMORY_ACTIVE_MEMORY_ROOT="A:\\path\\to\\vchat-root"
$env:CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS="5000"
$env:CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS="DeepMemo,system plan"
$env:CODEX_MEMORY_ACTIVE_RERANK_SEARCH="true"
$env:CODEX_MEMORY_RERANK_PROVIDER="jina"
$env:CODEX_MEMORY_RERANK_URL="https://api.jina.ai/"
$env:CODEX_MEMORY_RERANK_API_KEY="<your-rerank-key>"
$env:CODEX_MEMORY_RERANK_MODEL="jina-reranker-v2-base-multilingual"
```

说明：

- 把 `CODEX_MEMORY_ACTIVE_MEMORY_SYNC_MIN_INTERVAL_MS=0` 可用于测试或调试，表示关闭 cooldown
- 当前增量链是“增量解析 + 全树扫描”，会尽量只重读变更过的 `history.json`
- `CODEX_MEMORY_ACTIVE_BLOCKED_KEYWORDS` 兼容 donor 风格 blocked keyword 语义，支持逗号分隔
- `CODEX_MEMORY_ACTIVE_RERANK_SEARCH=true` 时，`DeepMemo` 会尝试远端 rerank；若 rerank 失败，会降级回原始结果而不是中断查询
- 如果没有配置远端 rerank provider，即使打开 `CODEX_MEMORY_ACTIVE_RERANK_SEARCH=true`，`DeepMemo` 也只会跳过 rerank，不会把查询打断

## Active-Memory CLI

当前仓库已经内置 donor 风格 active-memory 兼容 CLI：

- `npm run active-memory`
- `npm run deepmemo`
- `npm run topicmemo`
- `npm run compare-active-memory`
- `npm run rollback-active-memory`

### Active Memory Admin CLI

这个入口是运维/观测型 CLI，不是 donor 插件兼容入口。当前支持：

- `health`
- `rebuild`
- `sync`

查看当前 active-memory 健康状态：

```powershell
npm run active-memory -- health --json
```

从 donor-style VChat 根目录做全量重建：

```powershell
npm run active-memory -- rebuild --json --root "A:\path\to\vchat-root"
```

做一次增量同步：

```powershell
npm run active-memory -- sync --json
```

强制 sync 走重建路径：

```powershell
npm run active-memory -- sync --json --force
```

输出说明：

- `health` 返回当前索引状态、导入来源、最近同步时间和计数
- `rebuild` 返回本次重建结果，同时附带重建后的 health
- `sync` 返回本次增量同步结果，同时附带同步后的 health

### DeepMemo CLI

默认读取 `stdin JSON`，并输出 donor 风格 `status/result` JSON：

```powershell
@'
{"maid":"Keke","keyword":"Phase C recall audit","exclude_latest":false}
'@ | npm run deepmemo
```

如果你需要完整结构化结果，可以加 `--full`：

```powershell
@'
{"maid":"Keke","keyword":"Phase C recall audit","exclude_latest":false}
'@ | npm run deepmemo -- --full
```

错误输出仍保持 donor 风格顶层包络：

- `status = error`
- `error = "[Tool] ..."`
- `result = null`

但现在会把更细的诊断上下文放进 `meta`，例如：

- `invalid-json` 的 `inputSource / rawInputPreview`
- `DeepMemo` 错误的 `command / maid / maidName / keyword / rawKeyword / raw_keyword / query / rawQuery / raw_query / agentId / agent_id`
- `all-keywords-blocked` 的 `blockedKeywords / blockedKeywordCount / blocked_keyword_count / effectiveKeywordCount / effective_keyword_count / effectiveKeywordText / effective_keyword_text`
- `DeepMemo` `agent-not-found` 的 `command / maid / maidName / keyword / rawKeyword / raw_keyword / query / rawQuery / raw_query`
- `TopicMemo` 错误的 `command / maid / topicId`

### TopicMemo CLI

无显式 `command` 且有 `maid` 时，默认按 donor 风格走 `ListTopics`：

```powershell
@'
{"maid":"Keke"}
'@ | npm run topicmemo
```

显式读取某个 topic：

```powershell
@'
{"maid":"Keke","command":"GetTopicContent","topic_id":"topic_alpha"}
'@ | npm run topicmemo
```

### Compare Harness

compare harness 会对同一份输入同时运行：

- 新仓库 CLI
- legacy script 或 donor 默认脚本

并输出只读对照报告：

```powershell
@'
{"maid":"Keke","keyword":"Phase C recall audit","exclude_latest":false}
'@ | npm run compare-active-memory -- --tool deepmemo --json
```

常用参数：

- `--tool deepmemo|topicmemo`
- `--suite <path>`
- `--category <meta.category>[,<meta.category>...]`（支持逗号分隔 OR）
- `--expectation <meta.expectation>[,<meta.expectation>...]`（支持逗号分隔 OR）
- `--fixture <meta.fixture>`
- `--tag <meta.tags item>`
- `--tag-all <meta.tags item list>`
- `--exclude-tag <meta.tags item list>`
- `--exclude-fixture <meta.fixture list>`
- `--legacy-script <path>`
- `--require-match`
- `--require-legacy`
- `--timeout-ms 30000`

说明：

- compare harness 默认是“报告型”工具，不会强制 mismatch 退出
- 加 `--require-match` 后，不一致会返回非零退出码
- 加 `--require-legacy` 后，如果 legacy script 不存在，会返回非零退出码
- compare harness 会忽略 child process `stderr` 中的非 JSON 噪音行，例如 Node warning
- 当前 compare harness 已有：
  - error-path donor 对照回归
  - success-path donor 对照回归
- compare harness 现在会额外输出：
  - `coreDiff`
  - `extendedDiff`
  - suite 级 `aggregateDiff`

其中：

- `coreDiff` 关注 rollback 决策最关键的兼容字段，例如 `status / exitCode / result / error`
- `extendedDiff` 额外展示 `toolName / command / maid / topicId / counts` 等字段差异，便于排查 donor 行为漂移
- `aggregateDiff` 在 suite 模式下统计所有 case 的字段漂移频次，方便先看“最常漂的字段”
- `--category` 可以把 suite 缩到一个或多个 `meta.category`（逗号分隔 OR），便于只盯目标 donor 边界
- `--expectation` 可以把 suite 缩到 `success` 或 `error`，支持多个值（逗号分隔 OR）
- `--fixture` 可以把 suite 缩到某一个 `meta.fixture`
- `--tag` 可以把 suite 缩到带某个 `meta.tags` 的 case
- `--tag-all` 可以要求 case 同时满足列表中所有 `meta.tags`
- `--exclude-tag` 可以把包含任一列表 `meta.tags` 的 case 排除
- `--exclude-fixture` 可以把 `meta.fixture` 命中列表的 case 排除
- `--tool` 在 suite 模式下现在也能作为工具过滤使用
- `--category / --expectation / --fixture / --tag / --tag-all / --exclude-tag / --exclude-fixture` 支持逗号分隔，按 OR 语义匹配

推荐排障流程：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --fixture vchat-fixture-ranking --json
```

建议顺序：

- 第一步先跑不带 `--json` 的 suite 文本输出，先看 `comparison-breakdown`、`drift-reason-breakdown`、`category-aggregate`
- 第二步根据文本里最突出的 `category / fixture / drift reason` 缩范围
- 第三步再切到 `--json`，重点看：
  - `summary.comparisonBreakdown`
  - `summary.driftReasonBreakdown`
  - `categoryAggregate[*].driftReasonBreakdown`
  - `cases[*].comparison.outcome`
  - `cases[*].comparison.driftReasons`
- 如果你只是想判断“能不能继续切流”，最后再加 `--require-match`

### Compare Suite 模式

如果你要一次性比较多条输入，可以给 compare harness 一个 suite 文件：

```json
{
  "tool": "deepmemo",
  "cases": [
    {
      "name": "error-missing-maid",
      "input": { "keyword": "Phase C" },
      "legacyScript": "A:\\temp\\legacy-error.js"
    },
    {
      "name": "success-basic",
      "input": {
        "maid": "Keke",
        "keyword": "Phase C recall audit",
        "exclude_latest": false
      },
      "legacyScript": "A:\\temp\\legacy-success.js"
    }
  ]
}
```

运行：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --expectation error --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --expectation error,success --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tool topicmemo --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --fixture vchat-fixture-multi-agent --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tag window-order --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering,agent-selection --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tag-all alias,multi-agent --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --exclude-tag multi-agent --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --exclude-fixture vchat-fixture-no-settings --json
```

仓库里现在已经内置了一套可复用标准集：

- suite 文件：[standard-suite.json](/A:/codex-memory/benchmarks/active-memory-suite/standard-suite.json)
- 说明文档：[README.md](/A:/codex-memory/benchmarks/active-memory-suite/README.md)
- donor-style fixture 根目录：[vchat-fixture](/A:/codex-memory/benchmarks/active-memory-suite/vchat-fixture)
- 当前标准集规模：`34` 个 mixed-tool case
- 当前覆盖范围：
- `DeepMemo` 无效 JSON 输入
- `TopicMemo` 无效 JSON 输入
- `TopicMemo` 未知指令
- `DeepMemo` 缺 `maid`
- `DeepMemo` 基础成功
- `DeepMemo` 高级查询语法
- `DeepMemo` blocked-keyword 过滤成功
- `DeepMemo` 多关键词组合后部分被屏蔽但仍成功
- `DeepMemo` 重复关键词去重后仍成功
- `DeepMemo` 高级查询语法混用后仍成功
- `DeepMemo` blocked 配置重复值和大小写混用后仍成功
- `DeepMemo` 全关键词被屏蔽
- `DeepMemo` 多关键词组合后全被屏蔽
- `DeepMemo` rerank-failure fallback
- `DeepMemo` 多 topic 排序
- `DeepMemo` 多 agent / 多 fixture 成功检索
- `DeepMemo` 多 agent 默认 `exclude_latest`
- `DeepMemo` 多 agent `current_topic_id` 显式排除
- `DeepMemo` maid alias 命中
- `DeepMemo` 单 topic 多窗口复杂排序
- `DeepMemo` 单 topic 三窗口排序稳定性
- `DeepMemo` 更大的跨多 topic 排序集
- `DeepMemo` `agent-not-found`
- `TopicMemo` `agent-not-found`
- `TopicMemo` 多 agent `ListTopics`
- `TopicMemo` `agentId + maid` 混合过滤
- `TopicMemo` 多 agent `GetTopicContent`
- `TopicMemo` 默认 `ListTopics`
- `TopicMemo` 基础 `GetTopicContent`
- `TopicMemo` `settings.userName` 缺失时回退到 `主人`
- `TopicMemo` 空历史
- `TopicMemo` 缺历史文件
- `TopicMemo` 历史文件读取失败
- `TopicMemo` 缺话题
- suite case 现在支持 `env` 字段，可按 case 注入 donor 边界配置
- suite case 现在也统一带 `meta` 分类元数据：
  - `category`
  - `expectation`
  - `fixture`
  - `tags`
- suite case 的 `env` 会自动把 `_PATH` / `_ROOT` / `_DIR` 结尾键的相对路径解析到 suite 目录，适合切换备用 fixture root
- 当前仓库标准 suite 已经自带各 case 的 root/fixture 上下文，不再依赖父进程预先注入 `CODEX_MEMORY_ACTIVE_MEMORY_ROOT`
- 如果 fixture root 带 `.codex-fixture-manifest.json`，suite 运行时会先复制到临时目录并按 manifest 固定 `mtime`，用来稳住跨多 topic 排序
- 当前仓库内标准 fixture 已覆盖：
  - `vchat-fixture`
  - `vchat-fixture-no-settings`
  - `vchat-fixture-multi-agent`
  - `vchat-fixture-ranking`
  - `vchat-fixture-ranking-extended`
  - `vchat-fixture-multi-topic-large`
- 上述 `6` 个标准 fixture root 现在都已带 manifest，suite 运行时会统一走“临时复制 + 固定 mtime”
- 仓库回归还会强制检查这 `6` 个 fixture root 的 manifest 覆盖；新增 fixture 或新增 `history.json` 但没补 manifest，会直接测试失败
- 标准 suite 里引用的 fixture root 现在也强制要求使用 `vchat-fixture*` 命名，并且必须落在 `benchmarks/active-memory-suite` 目录下

suite 输出会额外包含：

- `summary.totalCaseCount`
- `summary.matchedCaseCount`
- `summary.mismatchedCaseCount`
- `summary.comparisonBreakdown`
- `summary.driftReasonBreakdown`
- `categoryFilter`
- `expectationFilter`
- `toolFilter`
- `fixtureFilter`
- `tagFilter`
- `tagAllFilter`
- `excludeTagFilter`
- `excludeFixtureFilter`
- `summary.coreMismatchCountTotal`
- `summary.extendedMismatchCountTotal`
- `aggregateDiff.core`
- `aggregateDiff.extended`
- `metaVersion`
- `metaSchema`
- `cases[*].meta`
- `cases[*].comparison.outcome`
- `cases[*].comparison.driftReasons`
- `categoryAggregate`
- `fixturePreparation.preparedFixtureCount`
- `fixturePreparation.preparedFixtures`

其中 `categoryAggregate` 现在除了一级分类统计，还会输出按 fixture 的二级分组：

- `fixtureAggregate[*].fixture`
- `fixtureAggregate[*].totalCaseCount`
- `fixtureAggregate[*].matchedCaseCount` / `fixtureAggregate[*].mismatchedCaseCount`
- `fixtureAggregate[*].coreMismatchCountTotal` / `fixtureAggregate[*].extendedMismatchCountTotal`
- `fixtureAggregate[*].caseNames`
- `comparisonBreakdown` 会汇总 case 级比较结果，例如 `matched / mismatched / legacy-unavailable`
- `driftReasonBreakdown` 会汇总高层漂移原因，例如 `status-mismatch / result-mismatch / error-mismatch / core-diff / extended-only-drift`

### Rollback Readiness CLI

`rollback-active-memory` 是只读脚本，不会切换任何运行时链路。它会基于 compare harness 给出：

- 当前输入下，legacy 是否可用
- 新旧结果是否对齐
- rollback 是否 ready
- 如果不 ready，建议先调查哪里

基础用法：

```powershell
@'
{"maid":"Keke","keyword":"Phase C recall audit","exclude_latest":false}
'@ | npm run rollback-active-memory -- --tool deepmemo --json
```

如果你希望“只有 rollback ready 才返回 0”，加上：

```powershell
@'
{"maid":"Keke","keyword":"Phase C recall audit","exclude_latest":false}
'@ | npm run rollback-active-memory -- --tool deepmemo --json --require-ready
```

常见 recommendation：

- `rollback-safe`
- `investigate-before-rollback`
- `legacy-unavailable`
- `legacy-path-broken`
- `new-path-broken`

### Rollback Suite 模式

`rollback-active-memory` 也支持直接读取同一份 suite 文件：

```powershell
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
```

如果你只想看某一类 donor 边界：

```powershell
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category ordering,agent-selection --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --expectation error --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --expectation error,success --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tool topicmemo --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --fixture vchat-fixture-multi-agent --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tag window-order --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --tag-all alias,multi-agent --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --exclude-tag multi-agent --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --exclude-fixture vchat-fixture-no-settings --json
```

如果你要把它当成门禁来用：

```powershell
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

推荐回滚判定流程：

```powershell
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category fallback --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --fixture vchat-fixture-no-settings --json
```

建议顺序：

- 第一步先跑不带 `--json` 的 suite 文本输出，先看 `recommendationBreakdown`、`blockerBreakdown`、`category-aggregate`
- 第二步根据 blocker 最集中的 `category / fixture` 缩小范围
- 第三步切到 `--json`，重点看：
  - `summary.recommendationBreakdown`
  - `summary.blockerBreakdown`
  - `categoryAggregate[*].blockerBreakdown`
  - `cases[*].summary.outcome`
  - `cases[*].summary.blockerReasons`
- 只有当文本和 JSON 都确认没有 blocker 时，再把它接到 `--require-ready` 门禁上

suite 输出会汇总：

- `summary.totalCaseCount`
- `summary.readyCaseCount`
- `summary.notReadyCaseCount`
- `summary.recommendationBreakdown`
- `summary.blockerBreakdown`
- `categoryFilter`
- `expectationFilter`
- `toolFilter`
- `fixtureFilter`
- `tagFilter`
- `tagAllFilter`
- `excludeTagFilter`
- `excludeFixtureFilter`
- `summary.coreMismatchCountTotal`
- `summary.extendedMismatchCountTotal`
- `categoryAggregate`
- `cases[*].summary.outcome`
- `cases[*].summary.blockerReasons`

其中 `categoryAggregate` 同样会按 fixture 再下钻一层：

- `fixtureAggregate[*].fixture`
- `fixtureAggregate[*].readyCaseCount` / `fixtureAggregate[*].notReadyCaseCount`
- `fixtureAggregate[*].coreMismatchCountTotal` / `fixtureAggregate[*].extendedMismatchCountTotal`
- `fixtureAggregate[*].rollbackReady`
- `recommendationBreakdown` 会汇总所有 case 的 rollback recommendation 次数
- `blockerBreakdown` 只汇总 `rollbackReady=false` 的阻断原因，便于快速看是 `legacy-unavailable`、`legacy-path-broken`、`new-path-broken` 还是字段 diff 导致的不 ready

## LightMemo 目录策略

`LightMemo` 现在已经把 donor 风格的目录语义前移到候选阶段，不再依赖结果出来后再按文本做二次筛选。

当前目录策略分三层：

- `maid`：走路径级必含条件
- `folder`：走路径级目录过滤
- `excluded folders`：走全局排除

也就是说，普通模式下现在的目录过滤语义更接近：

```text
maid AND (folder1 OR folder2 OR ...)
```

如果只给 `maid`，就只按 `maid` 路径收窄；如果只给 `folder`，就只按目录过滤。

### search_all_knowledge_bases 语义

当 `search_all_knowledge_bases=true` 时，当前实现会更贴 donor：

- 不再保留 `maid/folder` 的缩圈过滤
- 仍然保留全局 `excluded folders`

也就是“跨知识库全局搜索，但不搜被排除目录”。

### 默认排除目录

可通过环境变量配置 `LightMemo` 默认不参与召回的目录：

```powershell
$env:CODEX_MEMORY_LIGHTMEMO_EXCLUDED_FOLDERS="ArchiveKB,MusicDiary"
```

这项配置会在候选阶段生效，不是结果阶段软过滤。

### 目录别名映射

如果你希望 `folder` 参数使用逻辑名，而不是直接写真实目录名，可以配置目录映射：

```powershell
$env:CODEX_MEMORY_LIGHTMEMO_DIRECTORY_MAP_JSON='{
  "studioalpha": ["TeamShared", "ProjectAlpha"],
  "music": { "all": ["MusicDiary"] },
  "shared": { "any": ["TeamShared", "PublicKB"] }
}'
```

当前支持两种主要写法：

- 数组写法：表示一条目录链，适合“必须同时包含这些路径段”
- 对象写法：
  - `all`：路径必须同时包含这些段
  - `any`：路径命中其中任一项即可

例如：

- `"studioalpha": ["TeamShared", "ProjectAlpha"]`
  - 等价于路径必须同时包含 `TeamShared` 和 `ProjectAlpha`
- `"shared": { "any": ["TeamShared", "PublicKB"] }`
  - 等价于路径命中 `TeamShared` 或 `PublicKB` 任一目录即可

### 推荐示例

```powershell
$env:CODEX_MEMORY_LIGHTMEMO_EXCLUDED_FOLDERS="ArchiveKB,MusicDiary"
$env:CODEX_MEMORY_LIGHTMEMO_DIRECTORY_MAP_JSON='{
  "keke": ["Keke"],
  "studioalpha": ["TeamShared", "ProjectAlpha"],
  "studiobeta": ["TeamShared", "ProjectBeta"],
  "public": { "any": ["PublicKB", "SharedKB"] }
}'
```

这套配置适合：

- 用 `maid` 固定人名目录
- 用 `folder` 指向逻辑项目名
- 把归档目录、音乐目录这类 donor 风格“默认不搜”的知识库排除掉

## Shadow 重建

当你需要从 diary 重新构建 shadow store、向量索引和候选缓存时，可以运行：

这是维护动作，会写本地 shadow/index/cache 状态；实现验证优先用 fixture tests，真实维护前先确认当前配置、备份点和回滚路径。

```powershell
cd A:\codex-memory
npm run rebuild-shadow
```

这会调用 `src/cli/rebuild-shadow.js`，按当前配置对 diary 内容做全量同步。

## HTTP MCP 自愈与自启动

### 服务拉起

直接启动 HTTP MCP：

```powershell
cd A:\codex-memory
npm run start:http
```

只在未健康时拉起：

```powershell
cd A:\codex-memory
npm run start:http:ensure
```

### Watchdog

单次巡检：

```powershell
cd A:\codex-memory
npm run start:http:watchdog:once
```

确保 watchdog 常驻：

```powershell
cd A:\codex-memory
npm run start:http:watchdog:ensure
```

安装 watchdog 开机自启：

这会写入用户态自启动配置；只在明确要安装常驻 watchdog 时执行。

```powershell
cd A:\codex-memory
npm run start:http:watchdog:install
```

watchdog 日志：

```text
A:\codex-memory\logs\codex-memory-http-watchdog.log
```

### 自启动策略

当前推荐的是用户登录时自启动，而不是 system service 风格启动：

- `npm run start:http:install-task` 先尝试创建 per-user logon scheduled task
- 如果计划任务创建失败，会回退到 `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- `npm run start:http:watchdog:install` 使用相同策略

注意：`HKCU Run` fallback 不能通过 `New-Item -Force` 重建 `Run` 键，否则可能清掉已有自启动项。

## 数据与日志

默认数据会落在 `CODEX_MEMORY_BASE_PATH` 下：

- `data/dailynote/`：diary 兼容层
- `data/codex-memory.sqlite`：shadow store
- `data/memory-vectors.json`：向量索引
- `data/chat-history-index.json`：聊天历史索引
- `data/candidate-cache.json`：候选缓存
- `logs/codex-memory-bridge.jsonl`：写入审计
- `logs/codex-memory-recall.jsonl`：召回审计
- `logs/codex-memory-http.log`：HTTP MCP 日志

## 仓库目录

```text
src/
  adapters/
  cli/
  config/
  core/
  recall/
  storage/
scripts/
examples/
tests/
```

## 编码与兼容性

本 README 已保存为 `UTF-8 with BOM`，优先兼容 Windows PowerShell、记事本和部分旧工具链对中文 Markdown 的读取。

如果后续继续维护文档，建议保持：

- 文本文件使用 UTF-8
- 面向 Windows 终端展示的中文 README 优先保留 BOM
- 代码文件继续遵循各自已有编码风格，不做无关批量转换
