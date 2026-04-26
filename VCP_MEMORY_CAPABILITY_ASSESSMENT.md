# 浪潮 VCP 记忆能力评估

更新时间：2026-04-26

## 结论

如果只看 VCP 记忆系统主链，当前 `codex-memory` 已经达到约 `7.5 - 8 / 10` 的能力层级。

如果看完整 VCP 生态，当前更接近 `4 - 5 / 10`。原因是本仓库重点复现的是记忆写入、检索、召回增强、审计、迁移和运维门禁，不是完整复刻 `VCPToolBox` 的插件生态、UI、角色系统、工具编排和全部运行时能力。

更准确的定位是：

> `codex-memory` 已经不是玩具版，而是 VCP 记忆核心的独立主链实现雏形。

它现在最强的是工程化安全边界、profile 隔离、被动召回和 donor 兼容主链；还需要真实 baseline、长期使用数据和更多 donor 边界复刻，才能继续向九层记忆主链推进。

## 分层评分

| 能力层 | 当前判断 | 依据 | 主要缺口 |
| --- | ---: | --- | --- |
| MCP 入口与主链接入 | `8 / 10` | 已有 stdio MCP 与 HTTP MCP，Codex Desktop 推荐走本地 HTTP MCP；默认主链切换、灰度、回滚文档已形成 | 还缺更长周期、多机器、多会话的运行观察 |
| 底座存储 | `8.5 / 10` | diary 兼容写入、SQLite shadow store、chunk、vector index、candidate cache、recall/write audit 已具备 | 多 profile 长期共存与备份策略还可以再制度化 |
| 被动记忆召回 | `8 / 10` | `search_memory`、LightMemo 目录策略、TagMemo、Time/Group/Rerank、去重、候选缓存、recall audit 已成体系 | 需要更多真实 query 的质量评估，不只看能否返回结果 |
| DeepMemo / TopicMemo 兼容 | `7 - 7.5 / 10` | donor 风格 CLI、错误语义、active memory、chat history index、compare/rollback suite 已覆盖大量边界 | payload drift、排序手感、错误扩展字段还需要继续精修 |
| V8 高级召回 | `6.5 - 7 / 10` | terrain、EPA、ResidualPyramid、geodesic rerank、MetaThinking、`v8-diagnose` 已有结构化输出 | 还需要真实效果评估与更多 domain query 锁定 |
| Embedding profile 迁移安全 | `8.5 - 9 / 10` | fingerprint、`rebuild-profile`、`cleanup-legacy-chunks`、`profile-health`、`profile-gate`、CI smoke 和 runbook 已补齐 | 硬门禁依赖真实 previous profile baseline |
| CI / 运维 / 文档化 | `8 / 10` | CI 绿，profile CLI smoke 固化，Node 24 action runtime 已升级，runbook 和阶段文档较完整 | 文档入口较多，后续可继续压薄导航层 |
| 完整 VCPToolBox 生态复刻 | `4 - 5 / 10` | 记忆主链已独立，但不是完整工具箱生态 | 插件调度、UI、角色系统、全工具编排、完整运行时闭环未复刻 |

## 当前已具备的核心能力

- 独立 `vcp_codex_memory` MCP 服务名与 `record_memory` / `search_memory` / `memory_overview` 工具契约。
- diary 兼容写入，同时维护 SQLite、chunk、向量索引、审计日志和缓存。
- 默认本地 embedding profile fingerprint：`bge-m3-local__1024__v1`。
- 当前 profile 隔离已经落地，legacy chunks 已清理到 `0`。
- `profile-health` 当前状态为 `ready`。
- `profile-gate` 可运行固定 suite；在没有 baseline profile 时会返回 `warn / baseline-missing`，这是清理后预期行为，不代表当前 profile 失败。
- CI 已覆盖 `npm test` 和 profile 相关 CLI smoke。
- `actions/checkout` 与 `actions/setup-node` 已升级到 Node 24 runtime 版本，避免 GitHub Actions Node.js 20 deprecation 风险。

## 不应过度宣称的部分

当前不能说已经完整复刻 VCP。

不能过度宣称的边界包括：

- 没有完整复刻 `VCPToolBox` 的全部插件生态。
- 没有完整复刻 VCPChat / VCPToolBox 的 UI 与工具编排体验。
- 没有长期、多用户、多机器环境下的生产级稳定性数据。
- `profile-gate` 当前没有真实旧 fingerprint baseline，因此只能证明当前 profile 可运行，不能证明迁移前后召回质量完全等价。
- V8 terrain / MetaThinking 已有工程骨架和诊断输出，但还需要更多真实任务证明它稳定提升召回质量。

## 下一阶段升级路线

### P0：把 baseline 门禁做成真硬门槛

目标：

- 在切换 embedding profile 前保留真实 previous fingerprint。
- 用 `profile-gate --baseline-fingerprint "<old-profile>" --require-pass` 做真实迁移门禁。
- 把 `baseline-missing` 从“可接受提醒”升级为“迁移发布前必须解决的问题”。

验收：

```powershell
npm run profile-health
npm run profile-gate -- --baseline-fingerprint "<old-profile>" --summary-only --require-pass
npm test
```

### P1：继续收 donor 兼容手感

目标：

- 继续降低 `DeepMemo / TopicMemo` payload drift。
- 继续补排序手感、错误语义、边界输入的标准 suite。
- 把用户能感知到的差异优先收口，而不是追求无意义的字段零差异。

验收：

```powershell
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json
```

### P2：让 V8 从结构可用走向效果可证

目标：

- 给 terrain、geodesic rerank、MetaThinking 准备更多真实 domain query。
- 将 `v8-diagnose` 从诊断工具推进为质量评估入口。
- 记录哪些 query 因 V8 信号获得更好结果，哪些 query 需要降权或回退。

验收：

```powershell
npm run v8-diagnose -- --query "[[checkpoint vector schema migration]] ::TagMemo+1.5"
npm run shadow-compare -- --query "your domain query" --json
```

## 判断口径

这份评分不是数学指标，而是工程成熟度判断。它综合了四类证据：

- 代码里已经存在的能力。
- 已固化到测试、suite、CI 和 runbook 的验证路径。
- 已经真实跑过并收口的迁移与清理流程。
- 仍然缺少的 baseline、长期观察和完整 VCP 生态边界。

因此当前最稳妥的结论是：

> 浪潮现在已经具备 VCP 记忆核心七八层功力，但还不是完整 VCP 生态。下一步的关键不是继续堆功能，而是用真实 baseline、真实 query 和长期观察，把“像 VCP”推进成“稳定承担 VCP 记忆主链”。
