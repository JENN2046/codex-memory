# codex-memory 使用说明书

[English summary](README.md)

`codex-memory` 是 Codex 与 Claude 访问 VCPToolBox 原生记忆的受治理 MCP 桥。

它的核心不是重做一套记忆智能，而是把 Codex / Claude 对原生记忆的访问放进治理边界里：

- 谁在访问：`client_id`
- 访问什么范围：`scope` / `visibility`
- 访问哪个运行时：runtime target
- 用什么调用方式：invocation profile
- 是否允许读写：read/write authority
- 输出最多能披露多少：output disclosure budget
- 如何留下证据：audit receipt
- 出错如何回滚：rollback posture

VCPToolBox 仍然是 native memory behavior 的 owner。本仓库默认不修改 VCPToolBox 原生源码。

长期目标和边界文档：

- [Codex Memory Final Goal](docs/CODEX_MEMORY_FINAL_GOAL.md)
- [Capability Layer Model](docs/CAPABILITY_LAYER_MODEL.md)
- [Non-Claims](docs/NON_CLAIMS.md)
- [ChatGPT Web R4 架构冻结](docs/CHATGPT_WEB_R4_ARCHITECTURE_FREEZE.md)
- [ChatGPT Web R4 威胁模型](docs/CHATGPT_WEB_R4_THREAT_MODEL.md)
- [ChatGPT Web R4 实施任务书](docs/CHATGPT_WEB_R4_IMPLEMENTATION_TASKBOOK.md)
- [ChatGPT Web R4-B 契约与合成验证](docs/CHATGPT_WEB_R4B_CONTRACTS_SYNTHETIC.md)
- [ChatGPT Web R5-I 模型行为与错误语义](docs/CHATGPT_WEB_R5I_MODEL_BEHAVIOR_ERROR_SEMANTICS.md)
- [ChatGPT Web R5-K 范围澄清、回执展示与终止闭环](docs/CHATGPT_WEB_R5K_SCOPE_RECEIPT_TERMINAL_CLOSURE.md)
- [ChatGPT Web R5-M alias、结果语义与 Widget 回执投影](docs/CHATGPT_WEB_R5M_ALIAS_RECEIPT_SEMANTICS.md)
- [Near-Model Memory Plan Pack](docs/near-model-memory-plan-pack/00_README.md)
- [Memory Access Contract](docs/MEMORY_ACCESS_CONTRACT.md)

R5-M 允许模型直接采用用户明确标注为 `project_alias` 的值，即使它恰好
与 App、connector 或仓库名相同；没有明确标注时仍禁止猜测。active lease
的 alias、principal 或 visibility 不匹配现在返回 receipt-bound `denied`，
生命周期或服务状态继续使用 `unavailable`。没有有效数值 score 的候选不再
被伪造为 relevance `0.5`，Widget 也能解包 ChatGPT canonical result
envelope，并在真正结果到达前显示等待状态。公共六工具和 schema 未改变；
本阶段没有启动 runtime、调用 provider 或读写 memory。

R5-K 已将缺失项目别名或 visibility 的行为收紧为先澄清且不调用工具，
把 `render_memory_scope` 限定为 App 组件调用，并分别展示受治理结果回执
与 context 是否签发。任何 read 结果或 transport failure 都是终止结果。
正式私有 runtime preparation 只接受已观测的 loopback、write-disabled
隔离 shim target，并重算 Governance binding digest。公共六工具名称和
schema 均未改变，本阶段没有启动服务、调用 provider 或读写 memory。

R4 将目标结构冻结为稳定 HTTPS ChatGPT Edge、本地主动出站 Recall
Relay、UDS 治理内核和显式多项目上下文。旧 R3/M5 Secure MCP Tunnel
路线不再是核心路径。该冻结不表示 Edge/Relay 已实现，不改变当前五工具
默认面，也不执行真实 memory、provider、service、OAuth、deploy、release
或 cutover 动作。

R4-B 已实现不激活的共享契约、candidate tool descriptors、Widget DTO、
Edge/Relay/Governance 注入边界和零记忆 synthetic harness。它不包含服务
listener、OAuth 配置、公共工具注册、provider/VCP 调用或真实 memory read；
下一阶段是临时 loopback/UDS 的 R4-C 合成集成。

## 当前受治理候选路径

当前候选路径是 `7625` 上的 governed MCP 服务。它仍需要 fresh live proof，
不应据此宣称 production、release 或正式 cutover ready：

```text
Codex 或 Claude
  -> 127.0.0.1:7625/mcp/codex-memory
  -> codex-memory governed bridge
  -> 127.0.0.1:7615/mcp/vcp-native
  -> VCPToolBox native memory
  -> NewAPI embedding/provider
```

在当前 WSL 部署里，NewAPI 是 WSL-local 服务，默认地址是：

```text
http://127.0.0.1:3000
```

已完成的真实路径：

- production-provider live read proof 此前已观察通过；本修复提交不宣称已经重跑 fresh live proof，release 审查前需要重新生成带日期的 live-proof artifact
- Codex client dogfood 已调用 `search_memory`
- Codex client dogfood 已调用 `memory_overview`
- Codex client dogfood 已调用 `audit_memory`
- `7625` 已作为新 runtime target 进入真实使用观察期

当前 runtime 状态：

- Codex client surface：read-only
- server exposed MCP tools：默认 read-only + proposal-only，列出 `search_memory` / `memory_overview` / `audit_memory` / `prepare_memory_context` / `propose_memory_delta`
- adapter-level `tools/call`：默认拒绝未暴露工具，即使 core 内部仍保留对应 handler
- controlled mutation tools：默认隐藏；只有 operator 显式配置后才暴露
- native write proof：不属于默认 runtime
- 旧 `7605`：rollback only
- 新 `7625`：观察中；fresh gates 通过前不宣称正式替换完成

仍然保留的回滚路径：

- 旧 `7605` 服务暂时保留
- `7625` 稳定观察后，再决定是否正式替换旧服务和清理旧配置

## 支持的操作系统形态

这个项目可以在不同系统里使用，但生产 proof 脚本当前优先覆盖 WSL/Linux 路径。

| 使用形态 | 推荐程度 | 说明 |
| --- | --- | --- |
| WSL2 Ubuntu + WSL-local NewAPI | 推荐 | 当前 live proof 和 managed service 的默认路径 |
| Linux | 可用 | 脚本是 bash/node，路径和 NewAPI 位置需要按本机调整 |
| macOS | 可用 | 需要 bash/node；没有 WSL helper，按手动环境变量启动 |
| Windows PowerShell | 部分可用 | 旧 HTTP/watchdog 脚本支持 PowerShell；VCP native WSL-NewAPI helper 不直接适用 |
| Windows + WSL 混合 | 可用但要小心 | Windows 和 WSL 的 `127.0.0.1`、文件路径、Docker 数据目录不是同一个语境 |

跨系统时最容易出错的是三件事：

- `127.0.0.1` 指向哪个系统里的服务
- token 文件在哪个系统里
- Codex 进程从哪里启动，是否继承了 `CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN`

## 前置条件

通用要求：

- Node.js `>=22`
- npm
- 能运行 Codex CLI
- 能访问本仓库
- 有可用的 VCPToolBox runtime

WSL-local NewAPI 推荐路径还需要：

- WSL2 Ubuntu 或等价 Linux 环境
- Docker 可用
- NewAPI 运行在 `http://127.0.0.1:3000`
- VCPToolBox 默认位于 `/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox`
- NewAPI 数据库已按运行手册准备好

安装依赖：

```bash
npm install
```

## WSL-local 受治理路径（operator 操作）

启动 governed MCP 服务和 native shim：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:start
```

查看状态：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
```

停止服务：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:stop
```

这个 managed service 默认会启动或检查：

- VCP native shim：`http://127.0.0.1:7615/mcp/vcp-native`
- Codex MCP：`http://127.0.0.1:7625/mcp/codex-memory`
- WSL-local NewAPI：`http://127.0.0.1:3000`

运行态目录默认是：

```text
/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp
```

里面包含 pid、日志、数据目录和 HTTP bearer token 文件。不要打印、提交或复制 token 内容到日志里。

## 常用环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `CODEX_MEMORY_VCP_NATIVE_SERVICE_DIR` | `/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp` | managed service 运行态目录 |
| `CODEX_MEMORY_HTTP_HOST` | `127.0.0.1` | Codex MCP 监听 host |
| `CODEX_MEMORY_HTTP_PORT` | `7625` | Codex MCP 监听 port |
| `SHIM_HOST` | `127.0.0.1` | native shim 监听 host |
| `SHIM_PORT` | `7615` | native shim 监听 port |
| `NEWAPI_WSL_DIR` | `/home/jenn/new-api-wsl` | WSL-local NewAPI docker compose 目录 |
| `WSL_NEWAPI_HOST` | `127.0.0.1` | proof/helper 访问 NewAPI 的 host |
| `VCP_ROOT` | `/home/jenn/AGENTS_OS_Workspace/runtime/VCPToolBox` | VCPToolBox runtime root |
| `KB_ROOT` | `$VCP_ROOT/dailynote` | real-root write proof 的知识库根目录 |
| `KB_STORE` | `/tmp/...` | proof 使用的隔离派生 store |
| `EVIDENCE_OUTPUT` | `/tmp/...json` | proof evidence 输出路径 |
| `QUERY` | 内置 proof query | proof 查询文本 |

如果修改了 `SHIM_HOST` 或 `SHIM_PORT`，managed service 会把正确的 shim endpoint 写入 `CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT`，Codex MCP 进程会使用这个配置键。

## Codex 客户端配置

Codex 使用 `~/.codex/config.toml` 里的 MCP 配置。当前推荐配置：

```toml
[mcp_servers.vcp_codex_memory]
url = "http://127.0.0.1:7625/mcp/codex-memory"
startup_timeout_sec = 15
tool_timeout_sec = 90
required = true
enabled = true
bearer_token_env_var = "CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN"
enabled_tools = ["search_memory", "memory_overview", "audit_memory", "prepare_memory_context", "propose_memory_delta"]
default_tools_approval_mode = "prompt"

[mcp_servers.vcp_codex_memory.tools.search_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.memory_overview]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.audit_memory]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.prepare_memory_context]
approval_mode = "approve"

[mcp_servers.vcp_codex_memory.tools.propose_memory_delta]
approval_mode = "approve"
```

Codex 进程必须能读到 `CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN`。在当前部署里，token 来自：

```text
/home/jenn/AGENTS_OS_Workspace/runtime/codex-memory-vcp-native-mcp/http-token
```

推荐做法是在 shell 启动文件或 Codex wrapper 里读取 token 文件并导出环境变量。

当前本机已经采用 wrapper 形态：

```text
~/.local/bin/codex
```

它会在启动 Codex 前读取 token 文件并导出：

```text
CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN
```

注意：

- 已经运行中的 Codex 进程不会自动继承新 token
- 改完 wrapper、shell profile 或 token 文件后，需要重启 Codex
- 直接执行 `/usr/local/bin/codex` 可能绕过 wrapper
- 从桌面图标、IDE、Windows Terminal、WSL shell 启动 Codex，继承的环境变量可能不同

最小验证：

```bash
command -v codex
codex --version
```

如果要验证 wrapper 在空环境里也能启动：

```bash
env -i HOME="$HOME" PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin" \
  bash -c 'command -v codex && codex --version'
```

不要用 `echo $CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN` 打印 token。只验证变量是否存在即可：

```bash
test -n "${CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN:-}" && echo token_present
```

## Codex 里怎么使用记忆

当前默认开放给 Codex / Claude 的五工具面是：

- `memory_overview`
- `search_memory`
- `audit_memory`
- `prepare_memory_context`：任务开始时构建低披露上下文包
- `propose_memory_delta`：任务结束时只生成 proposal，不执行持久化写入

典型使用流程：

1. 启动 managed service。
2. 从能继承 token 的入口启动新的 Codex。
3. 任务开始先调用 `prepare_memory_context`；它优先复用受治理 native
   `search_memory` 路径，native 不可用且策略允许时才进入本地 fallback。
4. 按需调用 `memory_overview`、`search_memory` 或 `audit_memory`。
5. 任务结束如需沉淀候选，只调用 `propose_memory_delta`；proposal 不等于写入。

上下文包必须明确标记：

- `source_runtime: vcp_native`
- `source_runtime: vcp_native_unavailable`（native rejection；返回
  `PREPARE_MEMORY_CONTEXT_RECALL_REJECTED` 和 MCP `isError: true`）
- `source_runtime: local_fallback`
- `source_runtime: local_compatibility`

native rejection 不得标记为成功的 `vcp_native`，也不得包装成 accepted
空上下文包；本地结果同样不得伪装为 native。当前合同覆盖 Codex 与 Claude，但历史真实
dogfood 证据仍是 Codex-only；Claude live runtime 完成度不在此处宣称。

实时召回大致发生过程：

```text
Codex 发起 MCP tool call
  -> codex-memory HTTP MCP 校验 bearer token
  -> 读取调用里的治理 metadata
  -> 检查 client_id / scope / visibility / runtime target / read authority
  -> 检查 output disclosure budget
  -> 把允许的 read 委托到 VCP native shim
  -> VCPToolBox native memory 使用 provider / embedding 检索
  -> native receipt 返回给 bridge
  -> bridge 校验 receipt 没有写入副作用
  -> bridge 截断或拒绝超预算输出
  -> bridge 记录 audit receipt
  -> Codex 收到低披露结果
```

agent 不能因为“访问自己的记忆”就读取完整记忆。它仍然必须经过治理：

- 只能访问允许的 scope / visibility
- 只能使用允许的 runtime target
- 只能读或写被授权的能力
- 输出受 disclosure budget 限制
- 所有关键访问都要留下 audit receipt

## 当前能力边界

| 能力 | 当前状态 | 说明 |
| --- | --- | --- |
| native read delegation | 已实现；历史 proof 待 fresh rerun | 默认路径可走 VCPToolBox native memory |
| `search_memory` | 默认开放 | 真实召回入口 |
| `memory_overview` | 默认开放 | authenticated 时可走受治理概览；no-token 只返回 selected projection |
| `audit_memory` | 默认开放 | 返回受限审计投影 |
| `prepare_memory_context` | 默认开放 | native-first 任务开始上下文；fallback 显式标记 |
| `propose_memory_delta` | 默认开放 | proposal-only；不执行持久化写入 |
| local fallback | 已实现 | 只作为 fallback、audit、fixture、compatibility、offline continuity |
| output disclosure budget | 已实现 | `maxItems: 0` 等零预算场景 fail closed 或返回空投影 |
| native read receipt write-side-effect guard | 已实现 | read 返回的 receipt 如果报告 native write，会拒绝 |
| `record_memory` | 默认不暴露于 MCP server surface | core 内部仍可用；MCP adapter 默认 hard reject |
| `validate_memory` / `tombstone_memory` / `supersede_memory` | 默认不暴露于 MCP server surface | operator 显式配置后才可作为受控 mutation preflight 暴露 |
| native write delegation | 已实现但默认不开放 | 需要 explicit operator approval、rollback posture 和 operator surface |
| tombstone / supersede | 受控 mutation | 必须显式 `dry_run === false` 且 `confirm === true` 才能委托真实写 |
| 旧 `7605` | 保留观察 | rollback target，不是当前推荐新默认 |

可选 operator surface：

- `CODEX_MEMORY_EXPOSE_CONTROLLED_MUTATION_TOOLS=1`：额外暴露 `validate_memory` / `tombstone_memory` / `supersede_memory`
- `CODEX_MEMORY_EXPOSE_WRITE_TOOLS=1`：额外暴露 `record_memory`
- `CODEX_MEMORY_MCP_PUBLIC_TOOL_SURFACE=full`：用于 operator/full-surface 测试，不是默认生产设置
- `CODEX_MEMORY_SECURITY_PROFILE=hardened`：强制回到 read-only surface

## Production-provider proof

运行 read proof：

```bash
npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

期望信号包括：

- `accepted=true`
- `productionProviderLiveProofCovered=true`
- `readProofCovered=true`
- `endpointDisclosed=false`
- `tokenMaterialDisclosed=false`
- `readinessClaimed=false`

运行 operator-approved real-root write proof 前必须明确审批：

```bash
APPROVE_OPERATOR_REAL_ROOT_WRITE_PROOF=1 \
  npm run --silent vcp-native:prod-proof:wsl-newapi -- real-root-write
```

没有 `APPROVE_OPERATOR_REAL_ROOT_WRITE_PROOF=1` 时，helper 会拒绝运行 real-root write proof。

## 手动 native proof

启动 native shim：

```bash
npm run vcp-native:shim -- --vcp-root /path/to/VCPToolBox --kb-store /tmp/codex-memory-vcp-derived-store
```

运行 acceptance：

```bash
npm run vcp-native:acceptance -- \
  --endpoint http://127.0.0.1:7615/mcp/vcp-native \
  --target-ref operator-vcp-toolbox-service-ref \
  --include-read-suite \
  --evidence-output /tmp/codex-memory-vcp-native-evidence.json
```

离线复验 evidence：

```bash
npm run vcp-native:acceptance -- \
  --json \
  --verify-evidence /tmp/codex-memory-vcp-native-evidence.json
```

重要：`--include-read-suite` 只有在 native target 暴露 shape-compatible 工具时，才能证明对应 public response shape。

included shim 默认暴露 read suite 所需的三个 shape-compatible 工具：

- `knowledge_base.search` -> `search_memory`
- `memory_overview` -> `memory_overview`
- `audit_memory` -> `audit_memory`

不再把 overview/audit 硬塞进 `knowledge_base.search` 里当作已证明。

write proof 需要显式 `--enable-write`。accepted evidence 应包含：

- `accepted=true`
- `native memory performed`
- `governanceEvidenceMatrix`
- `localMemoryAuxiliaryEvidence`
- `writeRollbackEvidence`

evidence 可通过 `validateGovernedVcpNativeAcceptanceEvidenceArtifact` 离线复验。

低披露要求：

- 不写 endpoint
- 不写 token
- 不写 raw request/response
- 不写 raw memory
- 不写 raw audit
- 不写 output path
- 不返回 rollback plan reference
- 不返回 raw rollback plan

## Windows / WSL 混合部署注意事项

如果 NewAPI 在 Windows 侧，Codex MCP 在 WSL 侧，先确认 WSL 能访问 Windows NewAPI。

常见选项：

- 把 NewAPI 也部署到 WSL，使用 `http://127.0.0.1:3000`
- Windows NewAPI 监听 `0.0.0.0` 或可被 WSL 访问的 host
- 在 WSL 里设置 `WSL_NEWAPI_HOST` 或 `API_URL`

例子：

```bash
WSL_NEWAPI_HOST=172.20.64.1 \
  npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

如果变量没有 scheme，helper 会展开成：

```text
http://<host>:3000
```

如果使用完整 URL：

```bash
API_URL=http://172.20.64.1:3000 \
  npm run --silent vcp-native:prod-proof:wsl-newapi -- read
```

Windows 路径不能直接写成 WSL 路径。需要使用 `/mnt/c/...` 或把数据复制到 WSL 内部路径。

## 常见故障排查

### `PUBLIC_REQUEST_BLOCKED`

含义：当前请求没有被认证为可访问私有工具的请求。

检查：

- Codex 是不是从 wrapper 启动
- 当前 Codex 进程是否继承 `CODEX_MEMORY_VCP_NATIVE_HTTP_TOKEN`
- `~/.codex/config.toml` 是否配置 `bearer_token_env_var`
- managed service token 文件是否存在
- 是否重启了 Codex

### `ECONNREFUSED 127.0.0.1:3000`

含义：VCPToolBox provider 路径访问不到 NewAPI。

检查：

```bash
npm run --silent vcp-native:codex-mcp:wsl-newapi:status
```

然后确认：

- NewAPI 是否启动
- Docker compose 是否正常
- WSL 里的 `127.0.0.1:3000` 是否真的是 NewAPI
- 如果 NewAPI 在 Windows 侧，是否需要改 `WSL_NEWAPI_HOST` 或 `API_URL`

### `Invalid URL`

通常是 provider URL 或 `API_URL` 配置不完整。

检查：

- 是否漏了 `http://`
- 是否只写了 host 但没有 port
- 是否把 Windows 路径误写进 URL

推荐直接设置完整 URL：

```bash
API_URL=http://127.0.0.1:3000
```

### `native_mcp_required_tool_missing`

含义：acceptance 或 proof 要求的 native tool 没有在 target 上暴露。

常见原因：

- `--include-read-suite` 要求 overview/audit，但 native target 只有 search-shaped tool
- `mcpToolName` 或 `mcpToolNameByAction` 配置不匹配
- shim endpoint 指向了错误端口

处理：

- 只证明当前 target 真正支持的工具
- 给 overview/audit 配 shape-compatible native tool
- 检查 `CODEX_MEMORY_VCP_NATIVE_HTTP_MCP_ENDPOINT`

### read 调用报告 native write side effect

如果 native read receipt 报告：

- `memoryWritePerformed=true`
- `primaryMemoryStoreWritePerformed=true`

bridge 会拒绝这次 read delegation。read_allowed 不能产生 native write 副作用。

### no-token `memory_overview` 没走 native

这是预期行为。no-token overview 只返回 selected no-token projection，不触发 native bridge/provider 工作。

## 回滚和观察窗口

当前建议：

1. 默认使用新 `7625` runtime。
2. 保留旧 `7605` 一段观察窗口。
3. 观察真实 Codex 使用里的 read 成功率、fallback、audit receipt 和 provider 稳定性。
4. 通过后再正式替换旧服务配置。
5. 再决定是否删除旧分支或旧服务配置。

回滚原则：

- 不删除旧 `7605`，直到 `7625` 真实使用稳定
- 不把 fixture proof 当 production proof
- 不把 read proof 当 write proof
- 不在没有 operator approval 的情况下打开 native write

## 开发和测试

运行默认测试：

```bash
npm test
```

运行 governed native bridge 聚焦测试：

```bash
node --test \
  tests/security-profile-config.test.js \
  tests/governed-mcp-vcp-native-bridge-app-integration.test.js
```

运行 acceptance CLI 聚焦测试：

```bash
node --test tests/governed-vcp-native-acceptance-cli.test.js
```

## 安全规则

- 不提交 token
- 不在日志或文档里打印 token
- 不通过 MCP result 披露 raw memory
- 不通过 MCP result 披露 raw audit
- 不通过 MCP result 披露 raw provider response
- 不修改 VCPToolBox 原生源码作为默认方案
- 写路径必须有 exact operator approval
- tombstone/supersede 没有显式 confirm 时保持 dry-run 或 fail closed

## 相关文档

- 运行态台账：[docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md](docs/GOVERNED_NATIVE_BRIDGE_RUNTIME_LEDGER.md)
- WSL-local NewAPI proof runbook：[docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md](docs/VCP_NATIVE_PROD_PROOF_WSL_NEWAPI_RUNBOOK.md)
- 历史 Codex/Claude integration runbook：[docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md](docs/CODEX_CLAUDE_CLIENT_INTEGRATION_RUNBOOK.md)
