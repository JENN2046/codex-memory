# 05｜阶段任务书

## Phase 0 任务书｜目标冻结

### P0-T1：新增最终目标文档

文件：

```text
docs/CODEX_MEMORY_FINAL_GOAL.md
```

必须包含：

```text
near-model-memory external runtime
governed VCP native access
not model-internal memory
not default full write
```

### P0-T2：新增能力分层文档

文件：

```text
docs/CAPABILITY_LAYER_MODEL.md
```

必须定义：

```text
L0 default MCP read-only
L1 native realtime read
L2 memory context package
L3 task-start automatic recall
L4 memory delta proposal
L5 operator-only full surface
L6 native write production
L7 default runtime expansion
```

### P0-T3：新增禁止声明文档

文件：

```text
docs/NON_CLAIMS.md
```

---

## Phase 1 任务书｜Blocker 修复

### P1-T1：hardened explicit tools bypass

问题：

```text
config.mcpPublicToolNames 会优先返回 explicit tools，可能绕过 hardened read-only。
```

修改要求：

```text
securityProfile === hardened 时，public tool set 必须强制 read-only。
```

新增测试：

```text
hardened + mcpPublicToolSurface=full
hardened + exposeWriteMcpTools=true
hardened + mcpPublicToolNames=record_memory
hardened + CODEX_MEMORY_MCP_PUBLIC_TOOLS=record_memory
```

### P1-T2：AtomicFileWriter stale lock TOCTOU

问题：

```text
stale 判断后直接 unlink lockPath，可能误删后来 owner 的新 lock。
```

修改要求：

```text
stale 删除必须 compare observed metadata before unlink。
```

新增测试：

```text
old stale lock -> contender replaces lock -> cleaner must not delete contender lock。
```

### P1-T3：运行验证

```bash
npm run test:all
npm run gate:ci -- --json
git diff --check
```

---

## Phase 2 任务书｜Read-only Native Proof

### P2-T1：default surface proof

证明：

```text
tools/list == search_memory / memory_overview / audit_memory
hidden tools direct call == mcp_tool_not_exposed
```

### P2-T2：native read proof

证明：

```text
native read attempted
native read succeeded
native receipt exists
audit receipt exists
low-disclosure holds
```

### P2-T3：fallback proof

证明：

```text
fallback_used true 时，result_can_be_mistaken_for_native 必须 false。
```

---

## Phase 3 任务书｜prepare_memory_context

### P3-T1：新增工具定义

工具名：

```text
prepare_memory_context
```

性质：

```text
default exposed
read-only
no durable mutation
```

### P3-T2：实现 context package builder

实现要求：

```text
不要从零重写召回。
复用 KnowledgeBaseRecallPipeline、CandidateGenerator、TagMemoEngine、
scope/lifecycle filters、SQLite shadow、vector index、AuditLogStore、
MemoryOverviewService。
```

输入：

```text
task title / request / project / workspace / client / visibility
```

输出：

```text
must_know / decisions / state / blockers / risks / forbidden assumptions / next step / audit
```

核心转换：

```text
bounded search results -> task-oriented memory context package
```

### P3-T3：测试

必须覆盖：

```text
native success
fallback
empty result
conflict
stale
private isolation
oversized compression
low-disclosure
```

---

## Phase 4 任务书｜Codex Workflow

### P4-T1：AGENTS.md 规则

新增：

```text
项目任务开始前必须调用 prepare_memory_context。
失败时标记 memory_unavailable。
不得凭空声称记得当前状态。
```

### P4-T2：Codex task wrapper

流程：

```text
derive context fields
call prepare_memory_context
inject package
start task
```

---

## Phase 5 任务书｜Recall Quality Gate

### P5-T1：构建 query suite

覆盖：

```text
项目事实
历史决策
当前 blocker
用户偏好
过期事实
冲突事实
private 隔离
workspace 隔离
```

### P5-T2：生成质量报告

输出：

```text
recall_quality_report.json
recall_quality_report.md
```

---

## Phase 6 任务书｜Memory Delta

### P6-T1：新增 propose_memory_delta

默认 proposal-only。

### P6-T2：新增 commit_memory_delta 设计稿

不默认实现生产写入。先冻结 contract。

---

## Phase 7 任务书｜Operator-only Full Surface

### P7-T1：full surface operator proof

显式 env only。

### P7-T2：hardened 回归

hardened 必须继续 read-only。

---

## Phase 8 任务书｜Native Write Proof

### P8-T1：prepare_write / commit_write / verify_write contract

### P8-T2：real-root write proof

### P8-T3：rollback drill

### P8-T4：failure recovery proof

---

## Phase 9 任务书｜默认策略评估

### P9-T1：30 天观察窗口

### P9-T2：默认权限建议报告

### P9-T3：外部审查

---

## Phase 10 任务书｜Release Readiness

### P10-T1：milestone 命名审查

### P10-T2：release note non-claims 审查

### P10-T3：tag approval packet
