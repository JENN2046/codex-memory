# Governed Native Bridge Runtime Ledger

This document is the historical runtime ledger for `codex-memory`: governance
details, proof notes, runbooks, compatibility notes, and old integration
records that used to live in the project README.

`codex-memory` 当前正在从独立 `vcp_codex_memory` 实现路线，转入
VCPToolBox-native-first governed memory bridge 路线。

当前目标是让 Codex 通过 `codex-memory` 治理桥，完整、受控、可审计地
使用 VCPToolBox native memory runtime。
VCPToolBox 保持 native memory behavior owner；`codex-memory` 负责 profile
selection、approval boundary、low-disclosure projection、audit receipt、rollback
posture、client scope governance 和 fallback/test substrate。

现有本地 `vcp_codex_memory` runtime 仍是需要保护的兼容层和 fallback/test
substrate。当前 live read path 已通过 WSL-local NewAPI + VCPToolBox native
shim 证明，并已切到 Codex 客户端只读 dogfood；这不是 release、readiness
或正式替换旧服务的声明。write path 仍需要 operator-approved real-root
write proof 和 exact approval。

当前实现遵循这几个原则：

- 保留 `vcp_codex_memory` 的 MCP 服务名与 `record_memory` / `search_memory` / `memory_overview` 工具契约
- 保留 diary 兼容写入，同时并行写入 SQLite / 向量索引 / 审计日志
- 以源码行为为准，文档只做补充，不覆盖真实实现
- 默认推荐 HTTP MCP 入口，优先保证 Codex Desktop 启动稳定性

## 当前运行态事实

当前主线不是重做 memory intelligence，而是把 Codex 到 VCPToolBox native
memory 的访问变成受治理、可审计、可回滚的 MCP bridge。

- active Codex client target: `http://127.0.0.1:7625/mcp/codex-memory`
- rollback / legacy target: `http://127.0.0.1:7605/mcp/codex-memory`
- VCP native shim: `http://127.0.0.1:7615/mcp/vcp-native`
- WSL-local NewAPI provider: `http://127.0.0.1:3000`
- NewAPI WSL deployment: `/home/jenn/new-api-wsl`
- managed service runtime: `/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp`

当前 Codex 客户端配置把 `vcp_codex_memory` 指到 `7625`，并通过
`CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN` 读取 bearer token。Codex 侧只暴露
只读工具：

- `search_memory`
- `memory_overview`
- `audit_memory`

write tools 没有暴露给 Codex 客户端；native write delegation 仍需要明确
operator approval 和 bounded rollback posture。

当前 WSL-local NewAPI 使用从 Windows NewAPI desktop app 复制过来的数据库。
VCPToolBox 的 `config.env` 只作为 provider env 来源，当前设置指向
`API_URL=http://127.0.0.1:3000`；本路径不修改 VCPToolBox 原生代码。

托管服务命令：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:start
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
npm run --silent vcp-native:codex-mcp:wsl-newapi:stop
```

production provider read proof：

```bash
npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

当前已通过的实证：

- production provider read proof accepted
- native provider API was called through WSL-local NewAPI
- `search_memory` / `memory_overview` / `audit_memory` 已通过真实 `codex exec`
  客户端调用
- runtime 为 VCPToolBox native memory，local fallback 未使用
- raw memory content 未披露
- 相关 governed bridge/security profile tests 为 `97/97` passed

正式替换 `7605` 前的观察条件：

- 真实 Codex 会话继续走 `7625`
- native read 不 fallback
- MCP tool call 不再出现 approval cancellation
- shim / Codex MCP supervisor 无 restart loop
- token env 加载稳定
- 结果继续保持 low-disclosure projection

当前 governed VCPToolBox native bridge 入口：

- 业务参数仍走各工具 `arguments`，并保持 `additionalProperties:false`
- 治理上下文走 JSON-RPC `tools/call.params._meta.codexMemoryGovernance`
- operator 可用 `npm run vcp-native:shim -- --vcp-root /path/to/VCPToolBox --kb-store /tmp/codex-memory-vcp-derived-store` 启动 `codex-memory` 侧 native MCP shim；该 shim 默认暴露 `knowledge_base.search`，并按治理 metadata 绑定 `search_memory` / `memory_overview` / `audit_memory`；`--kb-store` 用于把 VCPToolBox native 初始化产生的 SQLite / index 派生写入隔离目录，不修改 VCPToolBox 原生代码；显式加 `--enable-write` 后才允许 `record_memory` -> `knowledge_base.record`、`tombstone_memory` -> `knowledge_base.tombstone`、`supersede_memory` -> `knowledge_base.supersede` 的 native write / mutation marker 路径
- operator 可用 `npm run vcp-native:acceptance -- --endpoint http://127.0.0.1:7615/mcp/vcp-native --target-ref operator-vcp-toolbox-service-ref --include-read-suite --evidence-output /tmp/codex-memory-vcp-native-evidence.json` 跑 `search_memory` / `memory_overview` / `audit_memory` 只读 governed live proof；加 `--include-write` 会证明 `record_memory` native write；加 `--include-write-suite` 会证明 `record_memory` / `tombstone_memory` / `supersede_memory` 三类 governed native write / mutation marker；任何 write proof 前都必须确认 bounded write approval 和 rollback plan
- operator 可用 `npm run vcp-native:live-read-proof -- --vcp-root /path/to/VCPToolBox --kb-store /tmp/codex-memory-vcp-derived-store --evidence-output /tmp/codex-memory-vcp-native-evidence.json` 一键启动 shim、运行 read acceptance、低披露复验 acceptance evidence artifact、停止 shim；输出不披露 endpoint、VCPToolBox root、kb-store path、evidence path、stdout/stderr 或 token material；read proof 中只允许 `durableWriteScope=isolated_derived_index` 的隔离派生索引写，非隔离 durable write 或 primary memory store write 会 fail-closed
- live proof 加 `--include-write` 会启用 shim write tools 并运行 `record_memory` bounded write proof；加 `--include-write-suite` 会同时证明 `record_memory` / `tombstone_memory` / `supersede_memory` 三类 governed native write / mutation marker；未显式传 `--kb-root` 时会自动创建临时 isolated knowledge-base root，避免把 write proof 写进真实 VCPToolBox dailynote，且只标记 `temporaryIsolatedKnowledgeBaseRootCreated=true`；显式传 `--kb-root` 时只标记 `operatorProvidedKnowledgeBaseRootConfigured=true`，不披露 root path；只有同时显式传 `--approve-real-root-write-proof` 时才标记 `operatorApprovedRealRootWriteProof=true`，路径参数本身不能清掉 real-root write proof 缺口；write acceptance 必须证明 exact approval、native memory write performed、`rollbackPosture=bounded_rollback_plan`、rollback plan bound、rollback not required / not auto-applied、raw rollback plan not disclosed
- operator-approved real-root write proof 应显式加 `--require-operator-approved-real-root-write-proof`；该模式要求同时满足 `--include-write-suite`、`--kb-root`、`--approve-real-root-write-proof`，否则在读取 provider config、启动 fixture provider、诊断 native runtime、启动 shim 或运行 acceptance 之前 fail-fast；结果通过 `operatorApprovedRealRootWriteProofGate` 输出低披露 blockers，并保持 `bridgeMayAutoApproveRealRootWriteProof=false`、`bridgeMayInferApprovalFromPath=false`、`bridgeMayUseTemporaryRootForRealRootProof=false`、`bridgeMayModifyVcpToolBoxNativeCode=false`
- live proof 会输出低披露 `productGoalProgress` 距离矩阵：按当前 product goal 汇总 primary runtime/value/client、九个 governed dimensions、local memory 辅助角色、read/write proof、acceptance artifact verification、fixture/prod provider 区分、operator-provided real-root write proof 和剩余工作；该矩阵始终 `goalCompletionClaimed=false`，fixture-backed accepted proof 或临时 isolated root write proof 也会保留 `production_provider_live_proof_missing` / `operator_approved_real_root_write_proof_not_run` 等 remaining work，不把 validation fixture 误报成最终完成或 readiness
- live proof 还会输出低披露 `productGoalCompletionProofPacket`：把 `remainingWork` 转成需要补齐的具体 proof gate，例如 production provider live proof、operator-approved real-root write proof、acceptance artifact verification、governed write suite proof；该 packet 只给出 command category、required signals、missing provider key 名和禁止自动行为，不披露 endpoint/token/path/raw artifact，也不授权 bridge 自动改 VCPToolBox 原生代码、自动写 config.env、自动批准真实 root 写入或声明 readiness
- production provider live proof 应显式加 `--require-production-provider`；该模式禁止 `--fixture-embedding-provider` 混入，且在 provider env、native module load、isolated store 前置条件不满足时 fail-fast，不启动 shim、不运行 acceptance、不调用 provider；结果通过 `productionProviderProofGate` 输出低披露 blockers / missing provider key 名，并保持 `bridgeMayAutoWriteProviderConfig=false`、`bridgeMayModifyVcpToolBoxNativeCode=false`、`bridgeMayUseFixtureProvider=false`
- live read proof 默认不读取 VCPToolBox `config.env`；显式加 `--use-vcp-config-env` 时，只把 `API_URL`、`API_Key`、`WhitelistEmbeddingModel`、`VECTORDB_DIMENSION` 四个白名单 key 注入 shim 子进程环境，并在 `configEnvIntake` 中只输出 presence / parsed / blockers 布尔证据，不披露值、路径或 raw config；这仍然不修改 VCPToolBox 原生代码
- operator 也可用 `--provider-env-file /path/to/provider.env` 给 live proof 单独提供 provider 配置；该文件同样只读取 `API_URL`、`API_Key`、`WhitelistEmbeddingModel`、`VECTORDB_DIMENSION` 四个白名单 key，只注入 shim 子进程，并在 `providerEnvFileIntake` 中输出低披露布尔证据，不披露文件路径、endpoint、token 或 raw env；这提供了不改 VCPToolBox `config.env` 的复验路径
- `--fixture-embedding-provider` 会在 `codex-memory` 侧临时启动 OpenAI-compatible `/v1/embeddings` fixture provider，并注入 shim 子进程；`fixtureEmbeddingProvider` evidence 只输出 started/stopped/providerApiCalled/requestCountBucket 等低披露布尔/桶值，不披露 endpoint、token、raw request/response 或 embedding vector；该路径只用于 validation fixture / offline continuity，不构成真实 provider、召回质量或 production readiness 证明
- live read proof 会输出低披露 `nativePreconditionDiagnosis`：只报告 VCPToolBox root 是否可访问、`KnowledgeBaseManager.js` / `EmbeddingUtils.js` / `rust-vexus-lite` 是否存在、dailynote 是否可读、隔离 store 是否可写、provider env 是否配置、native module load probe 是否成功；不会读取 raw memory、调用 provider 诊断、披露 locator/token/raw stderr，也不会声明 readiness
- live read proof 失败时会输出低披露 `runtimePreconditionOperatorPacket`：把 provider env、native module、isolated store 或 native runtime call failure 汇总成 operator action category、缺失 provider key 名、允许修复方式和 fresh proof 复验证据类别；该 packet 明确 `bridgeMayAutoModifyVcpToolBoxNativeCode=false`、`bridgeMayAutoWriteConfigEnv=false`、`bridgeMayCallProviderForDiagnosis=false`、`rollbackPosture=no_runtime_write_to_rollback`
- acceptance evidence 是低披露材料：不写 endpoint、token、raw request/response、raw memory、raw audit 或 output path；`accepted=true` 需要对应 read/write 的 native memory performed 证据、governance metadata binding、local audit receipt 和 rollback posture 同时成立；summary 会用 `governanceEvidenceMatrix` 逐项覆盖 client_id、scope、visibility、runtime target、invocation profile、read/write authority、output disclosure budget、audit receipt 和 rollback posture
- acceptance summary 会用 `localMemoryAuxiliaryEvidence` 证明本地 memory 不是 primary runtime，live proof 中只承担低披露 audit receipt 角色；fallback、validation fixture、compatibility 和 offline continuity 只是允许的辅助角色，不能被误认为 VCPToolBox native result
- acceptance artifact 可由 live proof 的 `acceptanceEvidenceArtifactVerification`、`npm run vcp-native:acceptance -- --json --verify-evidence /tmp/codex-memory-vcp-native-evidence.json` 或 `validateGovernedVcpNativeAcceptanceEvidenceArtifact` 离线复验低披露、目标治理维度 coverage、本地 memory 辅助角色和 readiness 非声明；这属于 validation fixture / offline continuity，不触发 native runtime
- `--include-write` 的 acceptance summary 会单独输出低披露 `writeRollbackEvidence`：只记录 rollback posture、plan 是否 bound、是否需要 governed follow-up、是否尝试/允许 auto-apply、raw rollback plan 是否披露/持久化；不会返回 rollback plan reference 或 raw rollback plan
- `initialize` 和 `tools/list` 的 `_meta.codexMemoryGovernedBridge` 会公开低披露治理契约：product goal、native bridge eligible tools、trusted execution context 必选、adapter 二次复验布尔位、按 read/write 工具方向区分的 audit evidence fields、delegation status/reason、native invocation receipt binding、native governance metadata binding、write-only exact approval safety booleans、write post-commit rollback reason codes/disposition/policy；不会公开 endpoint、token、locator 或 raw scope 值
- 公开 MCP metadata 层会再次按 safe reference / allowed enum 投影 runtime target；即使内部 config 被误传为 `accepted=true`，unsafe target reference、target kind 或 source authority 也不会进入 `initialize` / `tools/list` 输出
- 公开 MCP metadata 和 HTTP health 中的 governed native bridge config warnings 只按 warning code/effect 白名单投影；未知字符串会变成固定 `unknown_governed_native_bridge_warning` / `null`
- 可携带的治理字段只包括 `exactApprovalResult`、`rollbackPosture`、`auditReceipt`、`trustedExecutionContext`、`outputDisclosureBudget`
- `_meta.codexMemoryGovernance` 顶层字段按白名单 fail-closed：`runtimeTarget`、`scope`、`clientId`、`invocationProfile`、`readWriteAuthority`、`accessPath` 或未知字段不会被静默忽略，也不会回显原始 key/value
- `_meta.codexMemoryGovernance` 中的 runtime target reference、rollback plan reference、audit receipt reference、approval scope identity 和 trusted execution identity 必须是 safe reference，visibility 必须是允许枚举；unsafe governance metadata 会在 MCP metadata parser 层 fail-closed，不会被静默丢弃后继续调用
- native bridge governance metadata 的 visibility 只接受 `private/project/workspace`，不会把本地兼容层的 `shared` visibility 作为 VCPToolBox native bridge scope 放行
- MCP metadata parser 只要发现任一 unsafe/malformed governance field，就返回 `accepted=false` 且不返回 partial request context，避免后续调用方误用被清洗过的半套治理上下文
- MCP metadata parser 中的 approval action、runtime target kind/runtime、rollback posture mode、approval id 和 approval timestamp 也必须匹配白名单或 safe reference；这些治理字段不会按自由字符串透传
- MCP metadata parser 会拒绝 exact approval、rollback posture、audit receipt、output disclosure budget 和 trusted execution context 中的 endpoint、URL、path、authorization/header、token、credential、secret 等 locator/secret key 变体；不会静默剥离后继续构造 partial request context
- bridge gate 对内部直连的 `exactApprovalResult` 也执行同等约束：approval scope references、runtime target reference/kind/runtime 和 rollback plan reference 必须是 safe reference 或白名单枚举，且 exact approval 任意嵌套中不能夹带 locator/secret key 变体；不能依赖 MCP metadata parser 作为唯一安全边界
- MCP server 和 native bridge request projection 会把 `_meta.trustedExecutionContext` / supplied `trustedExecutionContext` 与 transport/env/baseRequestContext 已知的 execution context 做低披露一致性检查或绑定；服务器已知字段不匹配时 fail-closed，缺失时会由受信 context 补入，客户端 `_meta` 不能覆盖或省略服务器 scope/identity 约束；unsafe supplied trusted context 不会原样进入 bridge gate input
- native bridge request projection 从 transport/config 补入 scope、trusted execution context 和 runtime target 时也只投影 safe reference / allowed visibility / allowed target kind/source authority；unsafe default config 不会进入 bridge gate input
- native bridge request projection 对 `client_id` 做 canonical Codex 绑定；unsafe 或漂移的 transport/config client id 不会进入 bridge gate input，只会变成安全的 fail-closed sentinel
- native bridge request projection 对 `invocation_profile.tool_name` 做 public native bridge tool 白名单投影；unsafe toolName 不会进入 bridge gate input、audit receipt id 或 disclosure budget tool binding
- native bridge request projection 对内部直连的 `outputDisclosureBudget`、`auditReceipt`、`rollbackPosture`、`exactApprovalResult` 和 `trustedExecutionContext` 也先做白名单投影；locator/secret key 变体或 unsafe direct governance context 不会进入 bridge gate input，只会变成低披露 fail-closed 形状
- write exact approval 必须显式绑定同一个 `VCPToolBox native memory` primary runtime；省略 primary runtime 不能通过 runtime target approval，也不能进入 native write
- invocation profile 必须和 MCP tool direction 一致：read tools 只接受 `governed_read_only`，write tools 只接受 `governed_bounded_write`；delegation adapter 会在 gate 之后再次 fail-closed 校验，并要求 gate 绑定的 `mcp_tool_name` 等于实际调用 tool
- bridge gate 会把 scope/visibility 绑定到 trusted execution context 或 bridge default context；工具 `arguments` 里的 `scope`、`project_id`、`workspace_id`、`client_id`、`visibility` 不参与 native bridge 授权，即使这些 identifier 本身是 safe reference 也一样
- read/write delegation adapter 会二次复验 `trusted_execution_context_supplied/accepted/scope_matched`，并只把这些低披露布尔值传入 native `governed_bridge` 和 bridge audit receipt；native delegation 不能只靠工具 payload scope 进入运行时
- bridge gate 和 delegation adapter 都会复验 `client_id=Codex`、scope/visibility、`runtime_target=VCPToolBox native memory`、`access_path=governed MCP tools`、runtime target kind/source/configured 状态和 forbidden locator/secret field count；delegated `governed_bridge.runtime_target` 只在 count 为 0 时携带 safe target reference；runtime target 中 endpoint、URL、path、authorization/header、token、credential、secret 等 key 的大小写/分隔符/组合名变体也会 fail-closed
- delegation adapter 会二次复验 read/write authority 权限位：read delegation 必须是 `read_allowed=true/write_allowed=false`，write delegation 必须是 `read_allowed=false/write_allowed=true/write_policy=exact_approval`；forged accepted gateResult 不能把读写权限方向互换后调用 native MCP
- bridge gate 本身也要求 read/write authority 严格互斥；即使 exact approval 完整，`read=true/write=true` 的混合权限也不能通过 gate
- delegation adapter 会二次复验 gate-normalized scope identifier（`project_id/workspace_id/scope_id`）必须是 safe reference，并且 delegated `scope` / `governed_bridge.scope` 只投影 safe identifier；伪造的 URL/path/secret 形态 scope 不会进入 native MCP
- delegated `scope` / `governed_bridge.scope` 对 `client_id` 和 `visibility` 也做白名单投影；非 `Codex` client 或非 `private/project/workspace` visibility 不会进入 native MCP arguments，即使 helper 被单独调用也一样
- delegated `governed_bridge` envelope 中的 client、visibility、runtime target kind/source、invocation profile、disclosure level、write policy 和 rollback posture 也只按治理白名单投影；伪造字符串不会进入 native MCP arguments
- delegation adapter 的 rejection `lowDisclosureProjection` 也按 tool/profile/disclosure/rollback 白名单投影；内部伪造的 invocation profile、disclosure level 或 rollback posture 字符串不会原样返回给 Codex
- output disclosure budget 会在 delegation adapter 层复验 level 枚举和 `max_items/max_bytes` 上限；非法预算不会被静默 clamp 后继续调用 native runtime
- audit receipt 在 delegation adapter 层也会复验 `required=true`、`low_disclosure=true` 和 safe reference；缺失或 unsafe 时不会调用 native runtime
- `endpoint`、token、locator、raw native response、raw memory payload 不会从 `_meta` 投影到工具结果
- `governedMcpVcpNativeReadDelegationMode=primary` 时，read 工具通过受治理 native MCP delegation 返回低披露结果
- native read/write delegation 会把 gate 归一化后的 canonical scope 传给 VCPToolBox native MCP，不信任工具 payload 自带的替代 scope；write delegation 会剥离原始写入参数中的 governance scope/client/visibility 键，只保留 canonical scope
- native read delegation 会在 adapter 层二次复验 `search_memory.query/context_text` 的 MCP schema 长度边界；内部直连绕过 public MCP 参数校验时不会把超长 query/context 送进 native runtime
- native read/write delegation 会随调用发送低披露 `governed_bridge` envelope，包含 client、scope、visibility、runtime target safe reference、invocation profile、read/write authority、disclosure budget、audit receipt 和 rollback posture；runtime target 不包含 locator、endpoint 或 token material
- `codex-memory` 侧 VCPToolBox native MCP shim 会以 `_meta.codexMemoryGovernance` 重建 canonical `scope` / `governed_bridge`，覆盖 tool arguments 中伪造的治理字段；业务参数继续透传，但 arguments 不能改写 client、scope、visibility、runtime target、invocation profile、read/write authority、disclosure、audit 或 rollback posture
- `governedMcpVcpNativeReadDelegationMode=primary_with_local_fallback` 时，native read 失败且 bridge audit receipt 已写入后，才会返回显式标记的本地 fallback projection
- 本地 read fallback projection 会标记 `localMemorySourceRuntime=codex_memory_local_fallback`、`vcpNativeResult=false`、`resultCanBeMistakenForVcpNative=false`，并记录 fallback 发生在 audit receipt appended 之后
- 本地 read fallback 实际使用前必须先追加低披露 `governed_mcp_vcp_native_read_fallback_receipt`，且 receipt 必须回传 `localMemoryFallbackAuthorized=true`；只记录 fallback reason、native 状态桶和本地 fallback 角色，不持久化 fallback memory content；如果该 receipt 无法写入或写入但未授权，bridge 会返回低披露 fallback rejection，不执行本地 fallback read，也不返回本地 fallback projection/content
- 本地 read fallback 执行时也使用 gate-normalized 参数投影：`limit/window/auditWindow` 不超过 `disclosure_max_items`，`include_content/include_raw=false`，scope 使用 bridge gate canonical scope，不能复用原始工具参数扩大本地读取范围
- 本地 read fallback 返回 projection 会在 bridge 出口再次强制低披露：即使本地 service 返回 raw memory/output/audit、paths、recent files、memory links、endpoint、locator、token material，或在嵌套 results/items 中夹带 content、title、snippet、memory id/path/token/API key/authorization/credential/url 等字段及其大小写/分隔符/组合名变体，也会按归一化 key 递归剥离，相关 access flags 会被压成 false
- 本地 read fallback 的 scope 投影和 native delegation 一样执行 safe reference / `Codex` / visibility 白名单；即使内部 observer 或 helper 层篡改 gate scope，unsafe project/scope/client/visibility 也不会进入本地 fallback read
- read fallback audit receipt 的 tool name 只按 governed bridge tool 白名单记录，并区分 `bridgeAuditReceiptAppended` 与 `fallbackReceiptLowDisclosure`
- read fallback audit receipt 的 fallback reason、bridge audit status、native status、response shape、top-level kind、item/byte bucket 也只按低披露白名单投影；native status/shape/item/byte bucket 只有在 reason/status 匹配 native read transport/client/server failure 且 `nativeMemoryReadPerformed=false` 时才会记录；未知值或不匹配的 safe-looking bucket 不会作为 native 证据落审计
- read fallback audit receipt 只有在 reason/status 匹配 native read transport/client/server failure 且 `nativeMemoryReadPerformed=false` 时才会证明 local fallback authorized；伪造 native success 或已读成功证据不会把本地 fallback 标记为可执行
- bridge audit receipt 中的 `localMemoryFallbackEligible` 只从有效 read transport/client/server failure 推导；`localMemoryFallbackUsed` 不由 delegation result 证明，pre-read fallback audit receipt 也只证明 `localMemoryFallbackAuthorized`，不提前证明 read performed/returned
- delegation result 上附加的 bridge audit status 只有在 audit receipt result 同时满足 `accepted=true` 和 `appended=true` 时才会标记 `appended`；半套或伪造的 receipt result 不能把本地审计状态抬成已写入
- 本地 read fallback audit receipt status 也必须同时满足 `accepted=true` 和 `appended=true` 才会标记 `appended`；半套 fallback receipt result 不会触发本地 fallback read 成功证据
- read fallback audit receipt 的 `localMemoryFallbackAuthorized` 还要求 bridge audit receipt status 已确认 `appended`，并满足 native read failure 匹配；fallback context 不能单独伪造已安全 fallback 的审计证据
- native delegation receipt 会区分 invocation attempted 和 confirmed memory read/write；transport/client/server 失败时可记录 `runtimeCalled/mcpToolCalled=true` 与 `memoryReadPerformed/memoryWritePerformed=false`，fallback audit 继承该低披露证据，但不泄露 raw error、endpoint 或 token
- native delegation 抛错路径的 `statusClass` 只接受 `transport_error/client_error/server_error`；未知或伪造状态会降为 `transport_error`，不会拼进 `reasonCode` 返回给 Codex
- read-only probe / read-shape probe 的 rejection projection 和 thrown error receipt 也按 invocation/disclosure/status 白名单投影，并会二次复验 gate-normalized runtime target forbidden field count；导出的 probe input builder 也只投影 safe target reference，probe 路径不能回显 forged governance profile、disclosure level、runtime locator field path 或 runtime error status
- 返回给 Codex 的 read/write delegation receipt 中，native invocation 的 transport、request id、status、HTTP status、response shape 和 top-level kind 也只按低披露白名单投影；native invoker 返回的未知字符串不会透传给客户端
- governed HTTP MCP tool caller 只允许 public native bridge tool 白名单；safe 但未授权的 MCP tool name 会在网络发送前 fail-closed，且不会进入 low-disclosure receipt
- delegation adapter 返回给 Codex 的 native invocation receipt bucket 必须同时匹配本次实际 delegated tool 和 runtime target；tool/target drift 时 transport/status/shape bucket 也归零，不作为可归属执行证据
- governed HTTP MCP invoker 会把每次 tool call 的 payload target reference 绑定到初始化时配置的 target reference；payload target drift 会在网络发送前 fail-closed，receipt 不回显 drift target
- governed HTTP MCP invoker 只重抛自身创建的低披露 status error；外部 `fetch`/transport 抛出的 `statusClass` 或 message 会被包装成固定 `transport_error`，不会把 raw status/message 传给 Codex
- governed HTTP MCP invoker 会校验 JSON-RPC response `id` 必须匹配本次生成的 bridge request id；receipt 只记录 `generated_bridge_request_id` 类别和 `jsonRpcResponseIdMatched` 布尔值，不公开 id value，mismatch 会 fail-closed
- `governedMcpVcpNativeWriteDelegationMode=primary` 时，write 工具必须带 exact approval，并且 approval 要同时绑定 action、scope、runtime target 和 rollback plan；native 写失败不会 fallback 到本地写
- write delegation adapter 会按实际 tool 复验 exact approval action，例如 `record_memory` 只能使用 `live_bridge_record_memory_proof`，不能复用到 tombstone/supersede
- write delegation 的 delegated `governed_bridge.exact_approval_action` 也会按实际 mutation tool 重新绑定；`record_memory` / `tombstone_memory` / `supersede_memory` 不能在 native envelope 中互相携带 approval action
- write delegation adapter 会在 native 调用前二次复验 `record_memory` / `tombstone_memory` / `supersede_memory` 的 public MCP schema 必填字段、类型和字段边界；内部直连绕过 public MCP 参数校验时不会把缺字段或超长 durable write payload 送进 native runtime
- write delegation adapter 会递归剥离写入参数中的 endpoint、URL、locator、runtime target、token、API key、credential、private key、raw request/response body 等 key 的大小写/分隔符/组合名变体；业务写 payload 会保留，但不能夹带运行时定位或凭证材料给 native MCP
- write delegation adapter 也会二次复验 gate-normalized exact approval 的 scope/runtime/rollback safe-reference、whitelist 布尔位和 exact approval locator/secret forbidden field count；内部误传的 accepted gate result 不能绕过这些检查后调用 native，delegated `governed_bridge` 只在 count 为 0 时携带低披露 `exact_approval_forbidden_field_count=0`
- bridge gate 会对 invocation profile、read/write authority、output disclosure budget、audit receipt、rollback posture 递归检查 locator/secret key 变体，只暴露 forbidden field count；read/write delegation adapter 会二次拒绝 count 非 0 的 forged accepted gate result，不能把 endpoint、URL、token、credential material 混进治理对象
- bridge audit receipt 会记录 `clientId`、`visibility`、scope 字段名、scope fingerprint、access path、gate MCP tool binding、runtime target kind/source/configured 状态、forbidden field count、范围内 disclosure budget 和 safe audit receipt reference，不持久化 raw project/workspace scope id，也不回显 forged access/tool 字符串；runtime target forbidden count 非 0 时不会把 safe-looking target reference/kind/source/configured 状态当作可信 native invocation 绑定
- bridge audit receipt 会记录 invocation profile / read-write authority 的 locator/secret forbidden field count；count 非 0 时不会把 gate MCP tool、invocation profile、read/write authority 或 write policy 当作可信绑定证据
- bridge audit receipt 会记录 disclosure/audit receipt/rollback posture 的 locator/secret forbidden field count；count 非 0 时不会把 audit receipt reference 或 rollback plan 当作 safe/bound 证据
- bridge audit receipt 会记录 exact approval 的 action/scope/runtime/rollback 匹配结果、approval scope/runtime target/rollback plan 的 safe-reference / whitelist 布尔判定，以及 exact approval locator/secret forbidden field count；count 非 0 时不会把 action 或任何 exact approval match/safe 布尔当作可信证据；不会持久化 raw approval scope、runtime locator、rollback URL 或 token material
- bridge audit receipt 会区分请求/委托层的 `auditReceiptLowDisclosure` 和本地 receipt 自身的 `bridgeReceiptLowDisclosure`，不会把失败的请求证据改写成 true
- bridge audit receipt 会记录 audit receipt / rollback plan reference 的 safe 判定，但 unsafe reference value 不会进入 receipt
- bridge audit receipt 的治理字段只信任 gate-normalized request；native/delegation receipt 只能补充执行结果和 shape/status bucket，不能把 gate 中的 false、missing 或 unsafe reference 升级成 accepted governance evidence
- bridge audit receipt 的 runtime/native/memory 执行布尔证据必须同时匹配 delegation adapter contract、gate MCP tool、actual tool、receipt tool/target/runtime 和 direction/status/reason；伪造或半套 delegation result 不能把 `runtimeCalled`、`memoryWritePerformed`、`nativeInvocationAttempted` 抬成 true
- bridge audit receipt 中的 native invocation transport/status/shape bucket 以及 native response shape/item/byte/output-budget bucket 都必须绑定已验证的 `nativeInvocationAttempted/nativeMcpToolInvocationAttempted` 证据；伪造或半套 delegation result 不能单独写入 native invocation/response bucket
- bridge audit receipt 会显式记录底层 native invocation receipt 是否绑定本次 delegated tool/target；即使 delegation contract 与执行证据成立，漂移的 native receipt tool/target 也只能留下 `bindingMatched=false`，不能回填 native tool/status bucket
- bridge audit receipt 的 rollback evidence 只由已验证的 write direction、post-commit status、`memoryWritePerformed`、gate-normalized write rollback posture 和 rollback plan 共同推导；delegation receipt 不能单独伪造 `rollbackRequired`、rollback reason 或 follow-up policy
- bridge audit receipt 中的 client、visibility、runtime target kind/source、invocation profile、write policy、exact approval action、disclosure level、rollback posture、tool binding 和 native tool name 都按白名单投影；actual tool binding 只来自实际调用入口，不由 delegation receipt 回填
- bridge audit receipt 中的 delegation/native `reasonCode`、`statusClass`、transport、HTTP status、response shape、top-level kind、item/byte count bucket 和 rollback reason 也只按低披露白名单投影；未知值不会作为字符串落审计
- audit receipt reference 必须是 safe reference；URL、endpoint、token、secret 或路径形态会在 bridge gate fail-closed
- read-only rollback posture 不接受 rollback plan reference；write rollback posture 的 `rollbackPosture.rollback_plan_ref` 只接受 safe reference；endpoint、token、locator 形式的 rollback material 不会从 `_meta` 投影到 request context
- write rollback posture 支持 `bounded_rollback_plan` 和 `mutation_cleanup_plan`，两者都必须绑定 safe rollback plan reference 才能进入 native delegation
- write delegation 会把 safe rollback plan reference 传入低披露 `governed_bridge` 并写入 bridge audit receipt；post-commit failure 会记录 `rollbackRequired`、`rollbackDisposition=rollback_required_not_applied`、`rollbackApplyPolicy=manual_governed_followup_required`、`rollbackApplyAttempted=false`，不自动执行 rollback apply
- 任一 native delegation mode 非 `off` 时，`governedMcpVcpNativeBridgeGateMode` 不能为 `off`；否则对应工具会 fail-closed，不会静默回落成本地 memory 读写

最小写入治理 metadata 示例：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "record_memory",
    "arguments": {
      "target": "knowledge",
      "title": "Governed native write",
      "content": "bounded write payload",
      "evidence": "operator-approved evidence",
      "validated": true,
      "reusable": true,
      "sensitivity": "none",
      "project_id": "codex-memory",
      "workspace_id": "workspace-alpha",
      "client_id": "codex",
      "visibility": "private"
    },
    "_meta": {
      "codexMemoryGovernance": {
        "exactApprovalResult": {
          "accepted": true,
          "allowedAction": "live_bridge_record_memory_proof",
          "allowedScope": {
            "project_id": "codex-memory",
            "workspace_id": "workspace-alpha",
            "client_id": "Codex",
            "visibility": "private"
          },
          "runtimeTarget": {
            "targetReferenceName": "operator-vcp-toolbox-service-ref",
            "targetKind": "mcp_server",
            "primaryRuntime": "VCPToolBox native memory"
          },
          "rollbackPlanRef": "cm-governed-write-rollback-plan"
        },
        "rollbackPosture": {
          "mode": "bounded_rollback_plan",
          "rollback_plan_ref": "cm-governed-write-rollback-plan"
        },
        "auditReceipt": {
          "receipt_id": "cm-governed-write-receipt"
        },
        "outputDisclosureBudget": {
          "level": "metadata",
          "lowDisclosure": true,
          "rawOutput": false,
          "maxItems": 5,
          "maxBytes": 4096
        }
      }
    }
  }
}
```

## Smart Standing Authorization v3

当前项目已接入 Smart Standing Authorization v3 本地治理面。默认目标分解链路为 `goal -> route_plan -> task_queue -> Green / Amber / Red -> validation -> receipt/ledger -> checkpoint`。

当前本地 autopilot closed-loop 观测链路为 `goal -> route_plan -> task_queue -> lane decision -> execution boundary -> validation -> repair-once -> receipt/ledger -> checkpoint -> next_safe_task`。它通过 read-only dry-run 和 dashboard `autopilotLoop` summary 暴露，不执行 provider/API/MCP、真实 memory 访问、依赖/config 改动、push/release/deploy 或 readiness claim。

当前 structured state store 仍是 append-only draft：通过 schema/example/read-only helper/dashboard `autopilotStateStore` summary 暴露 goals、route plans、task queue snapshots、attempts、lane decisions、preflights、budget debits、receipts、validation runs、repair attempts、checkpoints、approval packets、Red gate events、stop reasons 和 resume tokens。它不创建数据库、不迁移 `.agent_board`、不写 durable state，也不构成 runtime readiness。

当前 action adapter 仍是 fixture-only contract：通过 schema/example/read-only helper/dashboard `autopilotAdapters` summary 暴露 file edit、validation command、provider、MCP、memory read/write、dependency、runtime probe、git remote 和 approval packet adapter 的 preflight/budget/receipt/rollback/Red gate 边界。它不执行 adapter、不调用 provider/API/MCP、不读写真实 memory、不改依赖/config/runtime、不 push，也不构成 readiness。

当前 validation planner / repair-once 仍是 fixture-only contract：通过 schema/example/read-only helper/dashboard `autopilotValidation` summary 暴露按 task area、changed path class、risk、lane、adapter type 选择最小 validation 的规则，以及一次明显、局部、可逆修复的 stop 条件。它不运行 validation、不应用 repair，也不构成 readiness。

当前 checkpoint / resume / replay harness 仍是 fixture-only / read-only contract：通过 schema/example/read-only helper/dashboard `autopilotReplay` summary 暴露 cycle checkpoint、no-op attempt replay、receipt reconciliation、dirty worktree protection、partial attempt recovery、stale board detection、resume token 和 stop reason replay。它不回放真实动作、不写 state、不调用 provider/API/MCP、不读写真实 memory、不改依赖/config/runtime，也不构成 readiness。

当前 operator console / eval matrix 仍是 fixture-only / read-only contract：通过 schema/example/read-only helper/dashboard `autopilotOperator` summary 汇总 controller、state store draft、adapter contract、validation planner、resume/replay、hard-stop inbox、next safe action 和 coverage gaps，并覆盖 golden trace、failure injection、budget exhaustion、hard-stop bypass rejection、missing evidence、unknown cost、secret access、broad memory scan、push attempt 和 readiness overclaim rejection。它不运行 eval、不写 state、不执行真实动作，也不构成 readiness。

当前 controlled Green executor entry packet 仍是 prepared-not-activated / read-only contract：通过 schema/example/read-only helper/dashboard `autopilotGreenEntry` summary 暴露进入受控 Green executor 前必须满足的 admission conditions、Green-only scope、preflight required fields 和 fail-closed stop reasons。它不激活 executor、不执行任务、不写 state、不调用 provider/API/MCP、不读写真实 memory、不改依赖/config/runtime，也不构成 readiness。

当前 fixture-backed Green executor skeleton 仍是 fixture-only / read-only / no-op contract：通过 schema/example/read-only helper/dashboard `autopilotGreenExecutor` summary 暴露 Green-only synthetic task kinds、no-op adapter kinds、no-op execution plans 和 fail-closed fixtures。它不执行任务、不写文件、不运行 validators、不写 receipt/checkpoint、不调用 provider/API/MCP、不读写真实 memory、不改依赖/config/runtime，也不构成 readiness。

当前 Green file-write executor boundary 仍是 design-boundary / fixture-only / read-only contract：通过 schema/example/read-only helper/dashboard `autopilotGreenFileBoundary` summary 记录真实 Green file-write executor 可以进入设计，但 implementation、activation、真实写文件、执行任务和 readiness claim 仍保持 blocked。它只定义设计 gate、允许/禁止 path class 和 hard-stop reasons，不实现真实 executor。

当前 real Green file-write executor contract 仍是 design-contract / fixture-only / read-only contract：通过 schema/example/read-only helper/dashboard `autopilotGreenFileExecutorContract` summary 定义未来真实 Green 写文件执行器的 execution cycle、required task fields、allowed write operations、preflight gates、post-write gates 和 fail-closed rejection cases。它不实现执行器、不写文件、不运行 validators、不写 receipt/checkpoint，也不构成 readiness。

当前 Green file-write executor code-level preflight tests 仍是 no-write contract hardening：`evaluateAutopilotGreenFileWritePreflight` 只评估 synthetic task input，返回 `PREFLIGHT_ACCEPTED_NO_WRITE` 或 `REJECTED_FAIL_CLOSED`，并锁定 `writes_files=false`、`executes_tasks=false`、`validators_run_by_executor=false`、`receipts_written_by_executor=false`、`checkpoints_written_by_executor=false`、`readiness_claim_allowed=false`。它不实现执行器、不激活执行器、不执行真实写入。

入口：

- 项目 profile：[docs/AUTOPILOT_PROJECT_PROFILE.md](/A:/codex-memory/docs/AUTOPILOT_PROJECT_PROFILE.md)
- 目标分解 runtime：[docs/AUTOPILOT_GOAL_DECOMPOSITION_RUNTIME.md](/A:/codex-memory/docs/AUTOPILOT_GOAL_DECOMPOSITION_RUNTIME.md)
- 闭环状态机：[docs/AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md](/A:/codex-memory/docs/AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md)
- checkpoint/resume/replay harness：[docs/AUTOPILOT_CHECKPOINT_RESUME_REPLAY_HARNESS.md](/A:/codex-memory/docs/AUTOPILOT_CHECKPOINT_RESUME_REPLAY_HARNESS.md)
- operator console / eval matrix：[docs/AUTOPILOT_OPERATOR_CONSOLE_EVAL_MATRIX.md](/A:/codex-memory/docs/AUTOPILOT_OPERATOR_CONSOLE_EVAL_MATRIX.md)
- controlled Green executor entry packet：[docs/AUTOPILOT_CONTROLLED_GREEN_EXECUTOR_ENTRY_PACKET.md](/A:/codex-memory/docs/AUTOPILOT_CONTROLLED_GREEN_EXECUTOR_ENTRY_PACKET.md)
- fixture-backed Green executor skeleton：[docs/AUTOPILOT_FIXTURE_BACKED_GREEN_EXECUTOR_SKELETON.md](/A:/codex-memory/docs/AUTOPILOT_FIXTURE_BACKED_GREEN_EXECUTOR_SKELETON.md)
- Green file-write executor boundary：[docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_BOUNDARY.md](/A:/codex-memory/docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_BOUNDARY.md)
- real Green file-write executor contract：[docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md](/A:/codex-memory/docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md)
- 只读控制器：[docs/AUTOPILOT_CONTROLLER_V0_READONLY.md](/A:/codex-memory/docs/AUTOPILOT_CONTROLLER_V0_READONLY.md)
- 结构化状态存储草案：[docs/AUTOPILOT_STRUCTURED_STATE_STORE_DRAFT.md](/A:/codex-memory/docs/AUTOPILOT_STRUCTURED_STATE_STORE_DRAFT.md)
- 动作适配器合同：[docs/AUTOPILOT_ACTION_ADAPTER_CONTRACT.md](/A:/codex-memory/docs/AUTOPILOT_ACTION_ADAPTER_CONTRACT.md)
- 验证规划与一次修复合同：[docs/AUTOPILOT_VALIDATION_PLANNER_REPAIR_ONCE.md](/A:/codex-memory/docs/AUTOPILOT_VALIDATION_PLANNER_REPAIR_ONCE.md)
- 失败恢复矩阵：[docs/AUTOPILOT_FAILURE_RECOVERY_MATRIX.md](/A:/codex-memory/docs/AUTOPILOT_FAILURE_RECOVERY_MATRIX.md)
- 本地 ledger：[.agent_board/AUTOPILOT_LEDGER.md](/A:/codex-memory/.agent_board/AUTOPILOT_LEDGER.md)
- 验证命令：`powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`
- ledger 一致性防线：docs validation 会运行 `scripts\validate_autopilot_ledger_consistency.js`，确认最新 done task、最新 validation scope 和最新 ledger receipt 指向同一个 `CM-*`，避免恢复/交接时漏记最新本地切片。

Red Lane 仍硬停止：push、PR、tag、release、deploy、secret、destructive action、broad real memory scan/export、public MCP expansion、config/watchdog/startup change、unscoped dependency change、readiness/cutover claim 都不自动执行。

## 安全加固（CM-HARDEN-2026-05-30）

### HTTP no-token 限制

HTTP MCP 入口默认拒绝无 bearer token 的 `search_memory`、`record_memory` 写/读调用；`memory_overview` 在无 token 时只返回 selected low-disclosure overview projection，在 bearer-token HTTP 路径默认返回 authenticated bounded overview projection。`tools/list`、`initialize`、`ping` 等非记忆操作仍允许无 token loopback 调用。

- 即使 `include_content=false`，`search_memory` 也必须 bearer token
- 无 token `memory_overview` 不返回 full overview，只返回 `access.mode=no_token_selected_overview` / `selectedProjectionVersion=1` 的低披露健康摘要
- bearer-token HTTP `memory_overview` 默认不返回 full overview，只返回 `access.mode=authenticated_bounded_overview` / `selectedProjectionVersion=1` 的低披露健康摘要
- 推荐配置 `CODEX_MEMORY_HTTP_TOKEN`，生产环境不得使用无 token 模式
- 无 token loopback 仅用于本地开发，详见 `.env.example`

### 安全 Profile

通过 `CODEX_MEMORY_SECURITY_PROFILE` 选择安全等级：

| 值 | 说明 |
|---|---|
| `local`（默认） | 保守默认，不自动开启额外策略 |
| `hardened` | 自动开启 soft read policy、lifecycle read policy、write preflight，并默认禁止 external provider |

显式设置对应的 `CODEX_MEMORY_*` 环境变量会覆盖 profile 默认值。

### 外部 Provider 总闸

`CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER` 控制已配置的 embedding/rerank endpoint 是否允许参与索引和 fetch。

**默认行为一律 fail-closed：**

| Profile | 无 endpoint | 已配置 endpoint |
|---|---|---|
| `local`（默认） | `false` | `false` |
| `hardened` | `false` | `false` |

- 只配置 endpoint URL 不会授权 provider fetch
- 只有 `CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER=true` 或 `allowExternalProvider: true` 才允许已配置 endpoint 参与索引和 fetch
- `CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER=false` 强制使用 local-hash 指纹和空 endpoint 列表
- `securityProfile=hardened` 时即使已配置 endpoint 也默认拒绝；需显式 `=true` 才允许
- `ExternalEmbeddingAdapter.isConfigured()` 和 `ExternalRerankAdapter.isConfigured()` 始终受此控制

### 输入验证

工具参数已增加字符串长度和数组数量限制：

| 字段 | 限制 |
|---|---|
| `record_memory.title` | 1–200 字符 |
| `record_memory.content` | 1–20000 字符 |
| `record_memory.evidence` | 1–8000 字符 |
| `record_memory.sensitivity` | ≤80 字符 |
| `record_memory.tags` 单项 | ≤80 字符 |
| `record_memory.tags` 数组 | ≤30 项 |
| `search_memory.query` | 1–1000 字符 |
| `search_memory.context_text` | ≤8000 字符 |
| scope 字段 | ≤200 字符 |

### stdio 消息大小限制

stdio transport 限制单条消息 1MB（Content-Length），累计 buffer 2MB。超出返回 Transport error 且不包含原始 payload。

### JSON-RPC 错误脱敏

内部错误（非 validation error）的响应体仅包含 `requestId`（`cm-xxxxxxxx`），不返回本地路径、provider URL、token 类字符串或完整 stack trace。详细错误写入本地日志。错误码为 `jsonRpcCode` 的结构化错误会保留原有字段但过滤敏感字符串。

## 测试契约（CM-PROVIDER-TEST-CONTRACT-01）

`npm test` 使用 `src/cli/run-default-tests.js` 运行默认安全测试，遵循以下分类：

| 契约 | 脚本 | 条件 |
|---|---|---|
| **默认安全测试** | `npm test` | 无 provider / 无网络 / 无 daemon，必须 exit 0 |
| **Hardening 回归** | `npm run test:hardening` | 60/60 P0/P1/P2 安全回归测试 |
| **Provider 测试** | `npm run test:provider` | 需 `CODEX_MEMORY_RUN_PROVIDER_TESTS=true` + `CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER=true` |
| **全量测试** | `npm run test:all` | `npm test` + `npm run test:hardening` |

默认安全测试必须覆盖 current product goal contract、MCP governed bridge metadata contract、native bridge gate、read/write delegation adapters、HTTP MCP client invoker、audit receipt recorder 和 app-level governed bridge integration。`mcp-http.test.js` 仍是 daemon-dependent，需作为 HTTP MCP 端到端回归单独运行。

### 排除清单

管理位置：`src/cli/run-default-tests.js`

| 类别 | 文件数 | 说明 |
|---|---|---|
| provider-dependent | 4 | 需要真实 embedding/rerank endpoint |
| daemon-dependent | 1 | 需要 live HTTP daemon |
| self-referential | 4 | 会触发 gate-ci/dashboard 自身 |
| fixture-drift | 0 | 当前没有主动排除的 fixture drift |

Provider 测试默认 skip（exit 0，文案 `skipped, not passed`），不会跳过假装通过。

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

当前权威入口：

- 当前状态/验证快照：[.agent_board/CURRENT_FACTS.json](/A:/codex-memory/.agent_board/CURRENT_FACTS.json)
- 当前项目状态：[STATUS.md](/A:/codex-memory/STATUS.md)
- 后续路线：[CODEX_MEMORY_NEXT_PHASE_PLAN.md](/A:/codex-memory/CODEX_MEMORY_NEXT_PHASE_PLAN.md)
- 文档治理规则：[DOCS_GOVERNANCE.md](/A:/codex-memory/DOCS_GOVERNANCE.md)
- 当前任务队列：[.agent_board/TASK_QUEUE.md](/A:/codex-memory/.agent_board/TASK_QUEUE.md)
- 当前验证 ledger：[.agent_board/VALIDATION_LOG.md](/A:/codex-memory/.agent_board/VALIDATION_LOG.md)

`.agent_board/CURRENT_FACTS.json` 是提交到仓库的状态/验证快照，不提交 live `HEAD` / `origin/main`。当前 branch、HEAD、origin 和 ahead/behind 事实必须在 branch-sensitive、runtime-sensitive 或 remote action 前用 fresh Git 命令重新采集；Markdown 状态面只保留 active block 摘要和历史归档入口，不重复完整当前 commit hash。

导航和历史参考：

- 阶段导航：[PHASE_NAVIGATION.md](/A:/codex-memory/PHASE_NAVIGATION.md)
- 项目正式收官说明：[PROJECT_CLOSURE.md](/A:/codex-memory/PROJECT_CLOSURE.md)
- Single-Window 4-Agent Compact Autopilot 能力说明：[docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md](/A:/codex-memory/docs/SINGLE_WINDOW_4_AGENT_COMPACT_AUTOPILOT.md)
- VCP memory parity roadmap：[docs/VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md)
- VCPToolBox 记忆能力愿景计划：[docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md](/A:/codex-memory/docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md)
- Runtime policy gates：[docs/runtime-policy-gates.md](/A:/codex-memory/docs/runtime-policy-gates.md)
- Memory lifecycle core plan：[docs/MEMORY_LIFECYCLE_CORE_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_CORE_PLAN.md)
- `gate:ci` fixture-only 设计：[GATE_CI_FIXTURE_ONLY_DESIGN.md](/A:/codex-memory/GATE_CI_FIXTURE_ONLY_DESIGN.md)
- P25 schema/version runtime enforcement plan：[docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md](/A:/codex-memory/docs/P25_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_PLAN.md)
- P29 schema/version runtime enforcement closeout：[docs/P29_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_CLOSEOUT_REVIEW.md](/A:/codex-memory/docs/P29_SCHEMA_VERSION_RUNTIME_ENFORCEMENT_CLOSEOUT_REVIEW.md)
- P30 final RC validation matrix runner safe scope：[docs/P30_FINAL_RC_VALIDATION_MATRIX_RUNNER_SAFE_SCOPE_INVENTORY.md](/A:/codex-memory/docs/P30_FINAL_RC_VALIDATION_MATRIX_RUNNER_SAFE_SCOPE_INVENTORY.md)
- 历史阶段记忆索引：[MEMORY.md](/A:/codex-memory/MEMORY.md)
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

## Legacy Claude 接入记录（非当前 product goal）

Claude MCP 接入记录先看：[CLAUDE_MCP_ACCEPTANCE.md](/A:/codex-memory/CLAUDE_MCP_ACCEPTANCE.md)。

当前结论：Claude Code 本地 HTTP MCP 接入有历史验收记录，但 connected 状态、模型侧 `memory_overview` 成功和 `/mcp` 面板状态都是运行态事实，必须按 [CLAUDE_MCP_ACCEPTANCE.md](/A:/codex-memory/CLAUDE_MCP_ACCEPTANCE.md) 用 fresh 命令重新验证后才能用于 personal RC dogfood 或 cutover 判断。该历史记录不构成当前 readiness、RC readiness、write reliability 或 recall reliability。

## Codex 接入

### 当前方式：governed native HTTP MCP

对 Codex 来说，当前 dogfood 入口是 WSL-local managed service：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:start
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
```

该服务会保持三段运行时：

- NewAPI provider on `127.0.0.1:3000`
- VCPToolBox native shim on `127.0.0.1:7615`
- Codex-facing governed MCP on `127.0.0.1:7625`

当前 `~/.codex/config.toml` 的 `vcp_codex_memory` 应指向 `7625`：

```toml
[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7625/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
bearer_token_env_var = "CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN"
enabled_tools = ["search_memory", "memory_overview", "audit_memory"]
default_tools_approval_mode = "prompt"

[mcp_servers.vcp_codex_memory.tools.search_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.memory_overview]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.audit_memory]
approval_mode = "approve"
```

`CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN` 应从
`/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp/http-token`
读取，不要打印 token 值。

旧 `7605` HTTP MCP 仍保留为 rollback / legacy target；在完成观察前，不把
`7605` 正式替换为新 native bridge。

### 旧方式：local HTTP MCP rollback

旧本地 HTTP MCP 仍可按历史方式检查：

```powershell
cd A:\codex-memory
npm run start:http:ensure
Invoke-RestMethod -Uri 'http://127.0.0.1:7605/health'
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
- `checks.policyPreflight.detail.inputCount / keptCount / filteredCount / lifecycleFilteredCount / crossClientPrivateFilteredCount`
- `checks.policyPreflight.detail.fixtureOnly / defaultPolicyEnabled / mutated`
- `checks.tests.detail.total / passed / failed / skipped`
- `checks.docs.detail.scriptCount / missingCount`

当前 query assertion baseline 为 `8/8`：`checks.queries.detail.caseCount=8`、`assertedCount=8`、`failedCount=0`。
当前 policy preflight 是 CI-safe fixture summary，不依赖 HTTP daemon、不调用 provider、不读 `.env`、不写真实 memory；它只说明 soft read policy 开启后会如何过滤 fixture，默认运行时行为仍保持 `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false`。

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

### Dashboard / Observe Schema Contract

`dashboard --json` 与 `observe:http -- --json` 是只读观测契约；对应 key-set snapshot 由 `tests/dashboard-cli.test.js` 和 `tests/http-observe-cli.test.js` 锁住。字段边界如下：

- `summary`：只放状态、消息和 count rollup，用于快速判断报告是否可用；不承载原始 memory 内容。
- `governance`：只放 `status`、`reviewLevel`、counts 和 hints 等人工复核线索；不批准 proposal、不写 tombstone、不推进 supersession。
- `audits.write`：只汇总最近 bridge audit 的数量、decision breakdown 和低风险条目 metadata；不重放写入，也不修改 audit log。
- `audits.recall`：只汇总最近 recall audit、`recallType`、scoped recall counts 和 scope breakdown；不输出 raw `workspace_id`。
- `scope`：只表示 recall/report 里的 project/client/visibility/scope-mode 观测维度；不能被当作 backfill、migration 或写入授权。
- `logs.http` / `logs.watchdog`：只展示日志文件状态、tail、error/recovery counters 和 listening/ensure 线索；不得输出 secret、token 或 credential 值。

如果这些字段新增、重命名或语义收窄，应同步更新 README / VALIDATION 和 schema snapshot tests。文档说明的是观测边界，不是 MCP tool contract 扩展。

## Governance 只读汇总

`governance:report` 提供独立的只读治理快照；`dashboard` / `observe:http` 则复用这份快照做轻量 summary。

基础用法：

```powershell
cd A:\codex-memory
npm run governance:report -- --json
```

输出重点：

- `review.status`
- `review.reviewLevel`
- `review.counts.proposalCount / tombstonedCount / supersededCount / supersessionInitiated`
- `review.counts.stale30d / stale90d`
- `review.hints`
- `summary.proposalCount`
- `summary.tombstonedCount`
- `summary.supersededCount`
- `summary.stale30d`
- `summary.stale90d`

当前 `governance:report` / observability surface 只显示低风险 count / hint，不做写路径操作，也不暴露 raw `workspace_id`。`review` 是给常态门禁/人工复核使用的只读审查面，不代表自动 approve / reject / tombstone / supersede。

最小输出样例：

```json
{
  "summary": {
    "status": "ok",
    "proposalCount": 0,
    "tombstonedCount": 0,
    "supersededCount": 0,
    "stale30d": 0,
    "stale90d": 0
  },
  "review": {
    "status": "ok",
    "reviewLevel": "nominal",
    "counts": {
      "proposalCount": 0,
      "tombstonedCount": 0,
      "supersededCount": 0,
      "supersessionInitiated": 0,
      "stale30d": 0,
      "stale90d": 0
    },
    "hints": ["治理快照未见待处理信号。"]
  }
}
```

排障提示：

- `reviewLevel=unavailable`：先确认 `paths.dbPath` 是否存在、SQLite 是否有 `memory_records` 表。
- `proposalCount > 0`：只做人工 review；不要由报告自动 approve / reject。
- `stale90d > 0`：优先安排治理复核，不要由报告自动改状态。
- `tombstonedCount / supersededCount > 0`：这是审计/追溯信号，不代表需要立即删除或 compact。

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
- `memory_overview`：HTTP bearer-token 路径默认返回 authenticated bounded overview projection；HTTP no-token 路径仅返回 selected low-disclosure overview projection；内部诊断路径仍可使用 full overview

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
# Provider endpoints stay inert unless this is explicitly enabled:
# $env:CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER="true"
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
