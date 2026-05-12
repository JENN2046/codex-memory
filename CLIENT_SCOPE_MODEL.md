# Codex / Claude Client Scope Model

更新时间：2026-05-08

## 目的

当前 `codex-memory` 只有一个 writer（Codex）和共享 reader（Codex + Claude）。memory store 不区分哪个 client 写了什么、属于哪个 workspace、关联哪个 conversation。

这份文档定义 client scope 模型 — memory 如何按 client、workspace、project、conversation 进行区分。这是 Phase I / M-013 的模型设计成果，只定义模型不改 MCP contract。

## 1. 为什么需要 Scope

没有 scope 的 memory system 面对两个问题：

1. **检索噪音**：Codex session 的 task checkpoint 混入 Claude session 的搜索结果
2. **治理盲区**：无法回答"这条 memory 是谁写的、属于哪个 workspace、关联哪个 conversation"

Scope 不是权限系统。它是 memory 的组织维度，让检索更精准、审计更清晰。

## 2. 当前状态

| 维度 | 当前实现 | 不足 |
|------|---------|------|
| writer identity | 硬编码 Codex-only | 未记录到 memory 字段 |
| reader identity | 未区分 | Codex/Claude 共享所有 records |
| workspace | 无 | 无法区分不同工作区 |
| project | 无 | 无法跨 project 隔离 |
| task | 无 | checkpoint 不带 task 标识 |
| conversation | 无 | handoff 不带 session 标识 |

## 3. Scope 维度定义

### 3.1 `client_id`

标识写入 client。

```text
client_id: "codex" | "claude" | "omc" | "manual"
```

规则：
- 自动从 MCP session 或 tool call context 推断
- 不依赖 client 自行声明（防止误标）
- `manual` 保留给用户直接写入

### 3.2 `workspace_id`

标识工作区（IDE workspace、terminal session、project root）。

```text
workspace_id: "<stable workspace identifier>"
```

规则：
- 一个 workspace 可以有多个 project
- workspace 是物理边界（一台机器上的一个工作目录），project 是逻辑边界
- workspace 变更应记录但不强制阻断

### 3.3 `project_id`

标识项目。

```text
project_id: "codex-memory" | "VCPToolBox" | ...
```

规则：
- 默认从当前 git repo 或 working directory 推断
- 跨 project memory 需要显式标记
- project 是检索的默认 scope

### 3.4 `task_id`

标识任务或 issue。

```text
task_id: "M-001" | "CM-0031" | ...
```

规则：
- 可选维度，不强制所有 memory 带 task
- checkpoint / handoff memory 应带 task_id
- 用于 grouped review 和 batch staleness

### 3.5 `conversation_id`

标识对话 session。

```text
conversation_id: "<session uuid>"
```

规则：
- 自动生成或从 MCP session 继承
- 同一个 task 可以有多个 conversation
- 用于 session-scoped retrieval

### 3.6 `visibility`

控制 memory 对其他 client 的可见性。

```text
visibility: "private" | "workspace" | "project" | "shared"
```

规则：

| visibility | 含义 |
|------------|------|
| `private` | 仅当前 client 可见 |
| `workspace` | 同一 workspace 内所有 client 可见 |
| `project` | 同一 project 内所有 client 可见（默认） |
| `shared` | 所有 client 可见 |

- 默认 `project`
- user preference 通常是 `workspace` 或 `private`
- checkpoint 通常是 `project`
- Codex 写入的 technical fact 通常是 `shared`

### 3.7 `retention_policy`

控制 memory 的保留周期。

```text
retention_policy: "permanent" | "session" | "task" | "project" | "ttl:<duration>"
```

规则：

| retention | 含义 |
|-----------|------|
| `permanent` | 不自动删除（默认） |
| `session` | conversation 结束时 stale |
| `task` | task 完成时 stale |
| `project` | project 归档时 stale |
| `ttl:30d` | 30 天后 stale |

- checkpoint memory 默认 `task`
- user preference 默认 `permanent`
- 临时 observation 默认 `session` 或 `ttl:7d`

## 4. Scope 继承

Scope 维度有层级关系。子级从父级继承，但可以覆盖：

```
conversation  (最细)
  └─ task
       └─ project
            └─ workspace
                 └─ client
```

默认继承规则：

| 如果写了 | 则继承自 |
|---------|---------|
| `task_id` 未指定 | 从当前 task context 推断 |
| `project_id` 未指定 | 从 workspace 的 git remote 推断 |
| `workspace_id` 未指定 | 从 `process.cwd()` 推断 |
| `client_id` 未指定 | 从 MCP session 推断 |

继承不是强制。用户可以显式写 `project_id: "other-project"` 来创建跨 project memory。

## 5. Scope 对检索的影响

### 5.1 默认检索

```text
search_memory(query, {})
  → 默认 scope: { project_id: current_project }
  → 返回 project scope + shared scope 的 records
```

### 5.2 Scope Filter

```text
search_memory(query, {
  scope: {
    project_id: "codex-memory",
    visibility: ["project", "shared"],
    client_id: undefined  // 不限制
  }
})
```

### 5.3 跨 Scope 检索

用户明确请求时才扩大 scope。默认不跨 project 检索。

```text
// 用户说 "search all projects for similar patterns"
search_memory(query, { scope: { project_id: undefined } })
```

### 5.4 Visibility Filter

- Claude 默认不能看到 `visibility: private` 且 `client_id: codex` 的 records
- Codex 默认不能看到 `visibility: private` 且 `client_id: claude` 的 records
- `visibility: shared` 对所有 client 可见
- 用户（Commander）可以看所有 records

## 6. 当前 schema 兼容

当前 `memory` diary 格式不包含 scope 字段。加入 scope 意味着：

1. 所有现有 memory 需要回填默认 scope
2. 新 memory 写入时必须带 scope
3. `search_memory` 需要支持 scope filter

这不是 Phase I 的范围。Phase I 只做模型设计。实现细节属于后续 runtime 任务。

## 7. Scope 迁移策略

如果后续实现 scope，建议分步：

| Step | 内容 | 风险 |
|------|------|------|
| I-001 | 模型设计（本文件） | A0 |
| I-002a | 设计 scope schema extension | A0 |
| I-002b | 回填现有 memory 的默认 scope（dry-run） | A1 |
| I-002c | 实施 scope schema + 回填 | A2 |
| I-003 | `search_memory` scope filter | A1 |
| I-004 | visibility enforcement | A2 |

不回填就直接加 scope filter 会导致所有现有 memory 不可见。

## 8. 治理模型关联

Client scope 模型是 [MEMORY_GOVERNANCE_MODEL.md](/A:/codex-memory/MEMORY_GOVERNANCE_MODEL.md) 的补充：

- Governance model 定义"谁可以做什么"
- Client scope model 定义"memory 属于哪个域"
- 两者结合：Codex 写入的 project-scoped memory 默认对所有 client 可见，但 private 的不对 Claude 可见

## 9. 当前不做

- `client_id` 字段加入 `record_memory` schema
- `visibility` enforcement
- `retention_policy` 自动过期
- `conversation_id` 自动关联
- scope-based 检索过滤
- 跨 client 权限系统

这些都是后续 runtime 任务，需要 Commander 授权和完整的 test plan。

当前交付：一份足够清晰的 scope 模型文档，让后续实现决策有据可依。
