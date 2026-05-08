# Memory Governance Model

更新时间：2026-05-08

## 目的

`MEMORY_POLICY.md` 定义了"什么该做、什么不该做"的规则。这份文档定义治理模型：谁执行、谁审查、规则在哪里落地、生命周期如何流转。

这是 Phase H / M-012 的模型设计成果，只定义模型不改 runtime。

## 1. 治理分层

```
┌─────────────────────────────────────────────────┐
│              用户 / Commander                     │
│    (最终授权：push、delete、migrate、export)       │
├─────────────────────────────────────────────────┤
│              Policy Layer                         │
│    MEMORY_POLICY.md → 规则定义                     │
│    MEMORY_GOVERNANCE_MODEL.md → 架构定义           │
├─────────────────────────────────────────────────┤
│              Enforcement Layer                    │
│    MCP tools → 入口校验                           │
│    adapter layer → 字段校验、敏感扫描               │
│    storage layer → schema 约束                     │
├─────────────────────────────────────────────────┤
│              Audit Layer                          │
│    audit events → 可追溯                          │
│    recall audit → 召回可解释                       │
│    bridge audit → 索引可观测                       │
├─────────────────────────────────────────────────┤
│              Storage Layer                        │
│    diary → primary source of truth               │
│    SQLite shadow → indexed retrieval              │
│    vector index → semantic search                 │
└─────────────────────────────────────────────────┘
```

治理不集中在单一组件，而是分层落地：policy 定义规则、enforcement 执行校验、audit 留证据、storage 保数据。

## 2. 治理角色

| 角色 | 谁 | 权限 | 限制 |
|------|-----|------|------|
| **Commander** | 用户 | 最终授权所有高风险操作 | 通过对话或 config 表达意图 |
| **Writer** | Codex（当前唯一 writer） | `record_memory` 写入 | 仅 Codex 可写，Claude 不可写 |
| **Reader** | Codex / Claude | `search_memory` / `memory_overview` | 只读，不可直接修改 durable memory |
| **Policy Enforcer** | `record_memory` tool handler | 写入前校验 | 检查 caller、扫描敏感内容、执行去重 |
| **Auditor** | recall audit / bridge audit | 记录所有变更 | 只记录不阻止 |

### 2.1 Writer 独占

当前 `record_memory` 只接受 Codex 来源写入。这不是权限歧视，而是防止双写竞争：

- Codex 是当前唯一理解 VCP memory semantics 的 client
- Claude 通过 `search_memory` 读取并提案，但不直接写
- 未来如果 Claude 成为 writer，需要先解决 proposal→approval 流程

### 2.2 Reader 共享

Codex 和 Claude 共享同一份 memory store。读取时不区分 client identity。如果未来需要按 client 隔离可见性，那属于 Phase I（client scope）的范围。

## 3. 治理执行点

### 3.1 MCP Tool 入口

| Tool | 治理检查 |
|------|---------|
| `record_memory` | caller 校验 → 敏感扫描 → policy check → 去重 → audit event → 写入 diary |
| `search_memory` | 查询构造 → 召回 → rerank → audit（recall audit） |
| `memory_overview` | 只读汇总 → 暴露 health / status / counts |

当前所有治理校验在 `record_memory` tool handler 内完成。没有独立的 policy engine 进程或 sidecar。

### 3.2 写入前必检项

```text
1. caller identity  → 仅允许 Codex
2. sensitivity scan → 检测 token/key/secret 模式
3. scope check      → 确保有 scope
4. type check       → 确保 memory type 有效
5. duplicate check  → 搜索相似记录
6. compactness      → 拒绝过长无结构内容
7. audit            → 记录变更事件
```

### 3.3 只读路径

`search_memory` 和 `memory_overview` 不修改 durable memory，不需要 caller 校验。但如果未来加入 `propose_memory`（写 proposal），则需要在 proposal 路径上做相同的校验。

## 4. Memory Lifecycle

```
                    ┌──────────┐
                    │ Proposal │  (candidate, not durable)
                    └────┬─────┘
                         │ approved
                    ┌────▼─────┐
                    │  Active  │  (current, retrievable)
                    └────┬─────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
        stale       superseded    compacted
            │            │            │
            ▼            ▼            ▼
       ┌───────┐   ┌──────────┐  ┌──────────┐
       │ Stale │   │Superseded│  │ Archived │
       └───┬───┘   └────┬─────┘  └──────────┘
           │            │
           └──────┬─────┘
                  │
          ┌───────▼───────┐
          │  Tombstoned   │  (retained for audit)
          └───────┬───────┘
                  │ hard delete (rare, needs approval)
          ┌───────▼───────┐
          │   (deleted)   │
          └───────────────┘
```

### 4.1 状态转换规则

| 从 | 到 | 触发条件 | 需要的授权 |
|----|-----|---------|-----------|
| — | Proposal | Codex/Claude 观察或推断 | 自动 |
| Proposal | Active | Policy scan 通过 | 自动 |
| Active | Stale | 时间过期或源变更 | 自动或手动 |
| Active | Superseded | 新记录替换旧记录 | 自动（写新记录时） |
| Active | Archived | compaction 合并 | 自动 |
| Active | Tombstoned | 用户请求删除 | Commander |
| Stale | Tombstoned | 用户请求删除 | Commander |
| Superseded | Tombstoned | 用户请求删除 | Commander |
| Tombstoned | (deleted) | hard delete | Commander，需明确确认 |

### 4.2 Staleness 判断

当前项目没有自动 staleness cron。staleness 由以下信号判断：

- 检索时对比 memory 时间戳与当前 repo 状态
- `memory_overview` 暴露 age distribution
- 用户主动 review 时标记 stale

未来如果实现 `review_memory` tool，可以加入周期性 staleness scan。

## 5. Scope Model

### 5.1 Scope 维度

```
scope = <scope_type>:<scope_value>

scope_type:
  user      用户级 memory（偏好、习惯）
  project   项目级 memory（架构决策、验证命令）
  repo      仓库级 memory（结构约定、路径规则）
  task      任务级 memory（checkpoint、handoff）
  domain    领域级 memory（VCP 概念、API 行为）
  ecosystem 生态级 memory（跨项目模式）
```

### 5.2 Scope 层次

```
ecosystem:VCP           ← 整个 VCP 生态共享
  └─ domain:memory       ← memory 领域知识
  └─ user:JENN2046       ← 用户个人偏好
       └─ project:codex-memory  ← 本项目
            └─ task:M-001        ← 具体任务 checkpoint
            └─ repo:codex-memory ← 本仓库约定
```

### 5.3 Scope 查询规则

- 默认检索当前 project scope
- 用户明确跨 scope 查询时可以扩大
- 敏感 scope 不向无关 client 暴露

精确的 scope filter 实现属于后续 runtime 任务。当前 scope 以 `memory` 的 `scope` 字段存储，`search_memory` 支持 scope 过滤。

## 6. Client Identity Model

### 6.1 当前状态

| 属性 | 当前实现 |
|------|---------|
| writer identity | 硬编码：仅 Codex |
| reader identity | 未区分：Codex 和 Claude 共享 |
| session identity | MCP session，不持久化到 memory |
| workspace identity | 无（未来 Phase I） |

### 6.2 未来方向（Phase I 候选）

```text
client_id:     "codex" | "claude"
workspace_id:  当前工作区标识
project_id:    项目标识
conversation_id: 会话标识
visibility:    "private" | "project" | "shared"
```

当前不做是因为：先让治理模型稳定，再扩大 client 身份维度。现在就引入 `client_id` 会要求所有现有 memory 做 migration。

## 7. Proposal Model

### 7.1 何时创建 Proposal

- 来源不确定（推断、关联）
- 置信度低于 0.6
- 可能重复现有 memory
- Claude 生成的 memory 候选（Claude 不能直接写 durable）
- 背景关联（dream/association）输出

### 7.2 Proposal 生命周期

```text
Proposal 创建
  → policy scan
  → dedup check
  → 等待 review
    → approved → Active
    → rejected → Rejected (audit only)
    → duplicate → merge or skip
```

### 7.3 当前实现

当前 `record_memory` 直接写 durable。没有独立的 proposal 存储或 `propose_memory` MCP tool。

Proposal 是模型概念。实现 `propose_memory` / `review_memory` / `approve_memory` 属于后续 runtime 任务。

## 8. Conflict Resolution

### 8.1 冲突类型

| 类型 | 示例 | 处理 |
|------|------|------|
| 重复记录 | 同一事实两个 Active record | 去重、合并或 supersede |
| 矛盾记录 | Active 说"使用 JSONL"，repo 实际用 SQLite | 标记 stale，当前 repo 状态优先 |
| 范围冲突 | project scope 的 memory 与 user scope 的矛盾 | 更窄 scope 优先（但在当前 repo 验证） |
| 置信度冲突 | 高置信 vs 低置信同主题 records | 高置信优先，低置信可 stale |

### 8.2 解决原则

1. Current repository state > any memory
2. Narrower scope > broader scope
3. Higher confidence > lower confidence
4. Newer verified > older unverified
5. User instruction > any automated inference

## 9. Enforcement Map

当前项目的 enforcement 落点：

| 规则 | 当前落点 | 状态 |
|------|---------|------|
| 仅 Codex 写入 | `record_memory` handler | ✅ 已实现 |
| 敏感内容扫描 | `record_memory` handler | ✅ 已实现 |
| Scope 必填 | `memory` schema | ⚠️ 字段存在，但未强制非空 |
| 去重 | 未实现 | ❌ 待实现 |
| Proposal 模式 | 未实现 | ❌ 设计阶段 |
| Staleness 检测 | 未实现 | ❌ 设计阶段 |
| Audit 事件 | `record_memory` → diary | ✅ 已实现 |
| 删除需审批 | 无 soft delete | ❌ 待实现 |

"未实现"项不是当前阻断项。它们是治理模型的下一批 runtime 候选，只应在模型验证后、有明确测试方案时推进。

## 10. 与 MCP Contract 的关系

当前 MCP tools 保持不变：

- `record_memory` — 写（Codex only）
- `search_memory` — 读
- `memory_overview` — 观测

治理模型不要求新增 MCP tool。以下候选 tool 只作为未来方向提及，不承诺实现：

- `propose_memory` — 创建 proposal（非 durable）
- `review_memory` — 审查 proposal / stale records
- `approve_memory` — 批准 proposal → durable
- `reject_memory` — 拒绝 proposal
- `supersede_memory` — 显式 supersede
- `forget_memory` — tombstone + request delete

## 11. 下一步

| Step | 内容 | 类型 |
|------|------|------|
| H-001 | 本文件 — governance model 设计 | docs |
| H-002a | proposal / tombstone / supersession schema 设计 | docs |
| H-002b | migration dry-run / fixture 计划 | docs + dry-run |
| H-002c | SQLite schema change | runtime（A2，需单独验证和授权） |

H-002a 和 H-002b 可以继续作为 docs-only 任务推进。H-002c 需要 Commander 授权。

当前目标：让 governance model 文档足够清晰，使后续实现决策有据可依。
