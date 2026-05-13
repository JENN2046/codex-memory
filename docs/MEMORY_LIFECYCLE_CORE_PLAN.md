# Memory Lifecycle Core Plan

更新时间：2026-05-13

本文是 P11-memory-lifecycle-core-planning 的设计事实源，用来定义 `codex-memory` 后续 lifecycle core 的状态、迁移规则、audit event shape、read policy 关系和未来验收边界。

本阶段是 docs/tests-design only：

- 不新增 MCP public tools。
- 不改变 runtime 行为。
- 不修改 `src/`、`tests/`、`package.json`。
- 不做 SQLite migration。
- 不迁移真实数据。
- 不调用 provider。
- 不 push / tag / release / deploy。

长期路线图仍以 [VCP_MEMORY_PARITY_ROADMAP.md](/A:/codex-memory/docs/VCP_MEMORY_PARITY_ROADMAP.md) 为准。P10 runtime gate 边界见 [runtime-policy-gates.md](/A:/codex-memory/docs/runtime-policy-gates.md)。

## Direction

P11 的目标不是立刻开放写操作，而是先把 memory lifecycle 的核心语义定清楚，让后续 fixture schema tests、dry-run migration、optional read policy runtime 和 P12 controlled mutation tools 有同一份合同。

生命周期状态应该回答四个问题：

- 这条 memory 当前是否可作为默认召回候选。
- 这条 memory 是否仍可被治理操作处理。
- 状态变化是否必须留下 audit。
- 未来恢复或删除是否可逆。

## Lifecycle Statuses

| Status | Meaning | Default `search_memory` candidate | Governance operations | Audit retention |
|---|---|---:|---|---|
| `active` | 已接受、当前可信、可参与默认召回的记忆。 | yes | 可 stale、supersede、tombstone；未来可 update。 | must retain |
| `stale` | 仍保留但需要复核或可能过期的记忆；可作为低置信默认候选。 | yes | 可 reactivate、supersede、tombstone；未来可 update。 | must retain |
| `proposal` | 候选记忆或待审核写入，尚未成为可信默认记忆。 | no | 可 accept、reject、tombstone。 | must retain |
| `rejected` | 已被审核拒绝的候选记忆；用于解释为什么没有进入可信记忆。 | no | 可 tombstone；默认不允许重新变 active，除非未来显式 recovery/reopen flow。 | must retain |
| `superseded` | 已被更新记忆替代的旧记忆；保留用于追溯和差异解释。 | no | 可 tombstone；默认不参与 update。 | must retain |
| `tombstoned` | 已被遗忘/删除语义覆盖的记忆；内容是否物理保留取决于未来 compaction 策略。 | no | 默认不可恢复；未来仅允许手动 recovery flow。 | must retain minimal audit |

## Status Semantics

### `active`

`active` 是默认可信状态。它表示 memory 已被接受，可用于 `search_memory` 默认召回和普通 recall pipeline。

- 默认可召回：yes。
- 可处理操作：future `update`、`supersede`、`forget/tombstone`、`mark-stale`。
- audit：所有状态迁移必须保留 audit。
- 风险：错误 active 会污染召回，因此进入 `active` 的路径必须有 actor、reason 和 evidence。

### `stale`

`stale` 表示 memory 仍有历史价值，但可能过期、置信下降或需要人工复核。

- 默认可召回：yes，但未来可被 ranking/read policy 降权。
- 可处理操作：`reactivate`、`supersede`、`forget/tombstone`。
- audit：必须保留进入 stale 和离开 stale 的原因。
- 风险：stale 不是删除；不能把 stale 误当作 tombstone。

### `proposal`

`proposal` 是候选状态，通常来自未来的 proposal/controlled write flow。

- 默认可召回：no。
- 可处理操作：`accept -> active`、`reject -> rejected`、`tombstone`。
- audit：必须保留 proposal 的来源、reason 和 evidence。
- 风险：proposal 默认隐藏，避免未审核内容污染默认召回。

### `rejected`

`rejected` 表示 proposal 已被明确拒绝。

- 默认可召回：no。
- 可处理操作：`tombstone`；未来可设计 manual reopen/recovery，但默认不允许直接变 active。
- audit：必须保留拒绝原因和 actor。
- 风险：rejected 仍是治理证据，不应被静默删除。

### `superseded`

`superseded` 表示已有新的 memory 替代旧 memory。旧 memory 默认隐藏，但保留审计和追溯价值。

- 默认可召回：no。
- 可处理操作：`tombstone`；未来可用于 supersession chain review。
- audit：必须保留 supersede reason、actor、evidence 和新旧 memory 关系。
- 风险：superseded 不是 rejected；它曾经可信，只是被更新替代。

### `tombstoned`

`tombstoned` 表示 memory 进入遗忘/删除语义。默认不恢复，不参与召回。

- 默认可召回：no。
- 可处理操作：默认 none；未来只有显式 manual recovery flow 才能恢复。
- audit：至少保留 tombstone event 和 minimal metadata，避免无法解释删除历史。
- 风险：tombstone 不等于物理清除；未来 compaction 必须另行设计并单独授权。

## Allowed Transitions

默认允许的状态迁移：

| From | To | Event type | Notes |
|---|---|---|---|
| `proposal` | `active` | `accepted` | 审核通过，成为默认可信记忆。 |
| `proposal` | `rejected` | `rejected` | 审核拒绝，默认隐藏。 |
| `proposal` | `tombstoned` | `tombstoned` | 直接移除候选，保留 minimal audit。 |
| `active` | `stale` | `marked_stale` | 记忆仍可召回，但需要复核或降权。 |
| `active` | `superseded` | `superseded` | 新 memory 替代旧 memory。 |
| `active` | `tombstoned` | `tombstoned` | 默认隐藏并进入遗忘语义。 |
| `stale` | `active` | `reactivated` | 复核后恢复可信默认召回。 |
| `stale` | `superseded` | `superseded` | 用新 memory 替代 stale memory。 |
| `stale` | `tombstoned` | `tombstoned` | stale memory 被遗忘。 |
| `superseded` | `tombstoned` | `tombstoned` | 清理旧链路，但保留 minimal audit。 |
| `rejected` | `tombstoned` | `tombstoned` | 清理 rejected proposal。 |

默认不允许：

- `tombstoned -> active`
- `tombstoned -> stale`
- `tombstoned -> proposal`
- `rejected -> active`
- `superseded -> active`

如果未来确实需要恢复，必须设计单独的 manual recovery flow，且 audit event 的 `reversible`、`reason`、`actor_client_id` 和 `evidence` 必须完整。

## Audit Event Shape

未来 lifecycle audit event 的最小 shape：

```json
{
  "event_id": "lifecycle_evt_...",
  "memory_id": "mem_...",
  "event_type": "accepted",
  "from_status": "proposal",
  "to_status": "active",
  "reason": "human-reviewed proposal accepted",
  "actor_client_id": "codex",
  "request_source": "codex-memory.lifecycle.fixture",
  "evidence": {
    "summary": "reviewed sanitized fixture",
    "references": []
  },
  "created_at": "2026-05-13T00:00:00.000Z",
  "reversible": false
}
```

Field notes:

- `event_id`：稳定唯一 id，便于 audit chain 去重与追溯。
- `memory_id`：被改变状态的 memory id。
- `event_type`：语义事件名，例如 `accepted`、`rejected`、`marked_stale`、`reactivated`、`superseded`、`tombstoned`。
- `from_status`：迁移前状态；创建 proposal 时未来可为 `null`。
- `to_status`：迁移后状态。
- `reason`：人类可读的迁移原因，禁止放 secret。
- `actor_client_id`：发起者客户端，例如 `codex`、`claude`、`system`。
- `request_source`：调用来源，用于区分 CLI、MCP、fixture、manual review。
- `evidence`：低风险证据摘要或引用；不得包含 raw secret、token、cookie、private key。
- `created_at`：ISO timestamp。
- `reversible`：当前事件是否可通过普通 flow 逆转；tombstone 默认 `false`。

## Read Policy Relationship

P11 lifecycle 与 P10 soft read policy 的关系：

- `active` / `stale` 可作为默认 `search_memory` 召回候选。
- `proposal` / `rejected` / `superseded` / `tombstoned` 默认隐藏。
- `visibility=private` 继续受 `client_id` 限制；cross-client private 不应进入默认候选。
- 该策略未来可由 `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` 或后续 lifecycle policy flag 控制。
- 默认行为切换必须单独 staged，不能由本文档自动授权。

当前 P10 状态：

- `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY=false` 默认关闭。
- `gate:ci` 的 `checks.policyPreflight` 只是 fixture-only summary。
- P11 planning 不改变当前 runtime 召回行为。

## Future Implementation Phases

### P11.1 Fixture Schema Tests

目标：

- 用 fixture 锁住 lifecycle status enum。
- 用 fixture 锁住 allowed transitions。
- 用 fixture 锁住 audit event shape。
- 用 fixture 锁住 read policy expected visibility。

建议验收：

- 无 runtime 接入。
- 无 DB migration。
- 无真实 memory 写入。
- 可用 `node --test` 运行纯 fixture/schema tests。

当前入口：

- Fixture: [tests/fixtures/lifecycle-policy-v1.json](/A:/codex-memory/tests/fixtures/lifecycle-policy-v1.json)
- Test: [tests/lifecycle-schema.test.js](/A:/codex-memory/tests/lifecycle-schema.test.js)

验证命令：

```powershell
node --test tests\lifecycle-schema.test.js
```

该测试只固化 P11 lifecycle v1 契约，不接入 runtime，不新增 MCP tool，不做 SQLite migration，不读写真实 memory。

### P11.2 SQLite Lifecycle Columns Dry-Run

Plan source: [MEMORY_LIFECYCLE_SQLITE_DRY_RUN_PLAN.md](/A:/codex-memory/docs/MEMORY_LIFECYCLE_SQLITE_DRY_RUN_PLAN.md)

目标：

- 设计 lifecycle columns / indexes 的 dry-run migration plan。
- 只报告需要新增或回填的字段，不修改真实 DB。
- 输出 `mutated=false`。

建议验收：

- dry-run fixture DB。
- 真实 DB 只读检查可选，但不得写入。
- 不运行真实 migration。

### P11.3 Optional Read-Policy Runtime

目标：

- 在 feature flag 下把 lifecycle read policy 接入 runtime。
- 默认行为保持关闭或兼容。
- 与 P10 soft read policy 关系明确，避免双 flag 冲突。

建议验收：

- targeted read-policy tests。
- MCP contract 不扩展。
- 默认 flag off regression。
- `gate:mainline:strict` 仅在 runtime 实现阶段运行。

### P12 Controlled Mutation Tools

目标：

- 讨论 controlled mutation tool surface。
- 只有在 P11 schema、dry-run、read policy 都稳定后，才评估是否新增工具。

候选能力：

- proposal accept / reject。
- supersede。
- tombstone / forget。
- lifecycle overview / audit review。

边界：

- P12 才讨论 MCP public tool 扩展。
- P11 不新增 public MCP tools。

## Future Test Acceptance

P11.1 fixture tests 应覆盖：

- 所有 lifecycle statuses 都在 enum 内。
- 未知 status 被拒绝或标记 invalid。
- allowed transitions 表中的迁移全部通过。
- 未列出的迁移全部失败。
- audit event shape 必须包含 `event_id`、`memory_id`、`event_type`、`from_status`、`to_status`、`reason`、`actor_client_id`、`request_source`、`evidence`、`created_at`、`reversible`。
- audit event 不允许包含 raw secret-like 值。
- read policy fixture 中 `active/stale` 默认可见。
- read policy fixture 中 `proposal/rejected/superseded/tombstoned` 默认隐藏。
- cross-client private 默认隐藏。

P11.2 dry-run tests 应覆盖：

- dry-run 输出 `mutated=false`。
- fixture DB 可以报告所需 lifecycle columns。
- 真实 DB 不被修改。

P11.3 runtime tests 应覆盖：

- feature flag 默认关闭时行为不变。
- feature flag 开启时 lifecycle read policy 生效。
- MCP public tools 不变，仍为 `record_memory` / `search_memory` / `memory_overview`，除非进入 P12 并获得明确批准。

## Non-Goals

- 本阶段不新增 MCP tools。
- 本阶段不改 runtime。
- 本阶段不迁移真实数据。
- 本阶段不做 SQLite migration。
- 本阶段不改变 `search_memory` 默认行为。
- 本阶段不实现 controlled mutation tools。
- 本阶段不做 compaction、physical delete、broad export/import。
- 本阶段不调用 provider smoke / benchmark。
- 本阶段不修改 `.env` / secrets。
- 本阶段不 push / tag / release / deploy。
