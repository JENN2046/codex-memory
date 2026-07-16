# 04｜阶段总计划

## Phase 0｜目标与合约冻结

目标：

```text
冻结最终目标、能力分层、非目标、禁止声明。
```

输出：

- `docs/CODEX_MEMORY_FINAL_GOAL.md`
- `docs/CAPABILITY_LAYER_MODEL.md`
- `docs/NON_CLAIMS.md`

验收：

```text
目标表达不再误导为无限完整记忆。
```

---

## Phase 1｜Blocker 修复

目标：

```text
修复当前安全与一致性 blocker。
```

任务：

1. 修复 hardened explicit public tools bypass。
2. 修复 AtomicFileWriter stale lock cleanup TOCTOU。
3. 补 regression tests。
4. 跑 `npm run test:all`。
5. 跑 `npm run gate:ci -- --json`。

验收：

```text
hardened 无法被 mcpPublicToolNames 绕过。
stale cleanup 不会误删新 owner lock。
```

---

## Phase 2｜Read-only Realtime Native Memory

目标：

```text
证明 Codex 默认可受治理实时读取 VCP native memory。
```

工具：

- `search_memory`
- `memory_overview`
- `audit_memory`

证明：

- native target binding
- fallback distinction
- low-disclosure
- audit receipt
- scope / visibility
- WSL/Linux proof
- Windows/WSL smoke

---

## Phase 3｜Memory Context Package MVP

目标：

```text
新增 prepare_memory_context，让 Codex 任务前自动获得当前应记得的上下文包。
```

实现原则：

```text
不从零实现召回。
优先复用受治理 VCP native `search_memory` 路径；native 不可用且策略允许时，
才复用现有 KnowledgeBaseRecallPipeline、CandidateGenerator、TagMemoEngine、
scope/lifecycle filters、SQLite shadow、vector index、AuditLogStore、
MemoryOverviewService 作为显式 local fallback / compatibility，把 bounded
search results 转换成 task-oriented memory context package。

输出必须标记 `vcp_native`、`local_fallback` 或 `local_compatibility`，本地结果
不得伪装为 native。
```

新增工具：

- `prepare_memory_context`

默认：

```text
read-only
default exposed
no durable mutation
```

---

## Phase 4｜Codex Workflow 接入

目标：

```text
让 Codex 在任务开始前自动调用 prepare_memory_context。
```

实现方式：

- Codex task wrapper
- AGENTS.md 规则
- taskbook 前置规则

---

## Phase 5｜Recall Quality Gate

目标：

```text
证明不是“能查”，而是“查得准、隔离正确、能服务任务”。
```

测试：

- project fact recall
- decision recall
- blocker recall
- user preference recall
- stale filtering
- conflict surfacing
- private isolation
- fallback distinction

---

## Phase 6｜Memory Delta Pipeline

目标：

```text
任务结束后生成建议沉淀内容，但不默认写入生产。
```

实现原则：

```text
复用现有本地 write pipeline / write governance 做 proposal、staging、
validation、audit receipt 和 rollback posture metadata。
本阶段不是默认 production write。
```

新增工具：

- `propose_memory_delta`
- `commit_memory_delta`，operator-only

---

## Phase 7｜Operator-only Full Surface

目标：

```text
允许 operator 显式开启 full surface。
```

工具：

- `record_memory`
- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

前提：

- explicit env
- exact approval
- audit receipt
- rollback posture
- local/operator-only

---

## Phase 8｜Native Write Production Proof

目标：

```text
证明真实 VCPToolBox root / real provider / real write 可受治理执行。
```

必须证明：

- exact approval enforcement
- native side-effect receipt
- rollback drill
- failure recovery
- output disclosure budget

---

## Phase 9｜Codex Default Runtime Policy

目标：

```text
决定 Codex 默认 runtime 是否扩大权限。
```

推荐默认：

```text
read + context + proposal
```

不推荐默认：

```text
tombstone
supersede
unapproved record
commit_memory_delta
```

---

## Phase 10｜Tag / Release Readiness

目标：

```text
根据 milestone 选择 release，不把 read-only/context tag 叫 full capability。
```

允许：

```text
v0.2.0-readonly-context-rc
```

禁止：

```text
full-vcp-memory
production-write
complete-realtime-memory
```
