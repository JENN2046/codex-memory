# Controlled Write Tools Plan

更新时间：2026-05-14

## Purpose

P12 的目标是让 memory 未来可以被受控修改、替代、遗忘和审计。

本阶段只做 planning，不实现 runtime mutation，不写真实 memory，不修改 SQLite schema，也不扩展 MCP public tools。P12 不等于立刻增加 `update_memory` / `supersede_memory` / `forget_memory` 等 MCP tools。

当前基线来自 P10 / P11：

- SecretScanner 已在写入前保护 diary path。
- ToolArgumentValidator 已保护 MCP `tools/call` 参数。
- lifecycle model 已定义 `proposal` / `active` / `stale` / `rejected` / `superseded` / `tombstoned`。
- lifecycle SQLite dry-run 只读存在，且 `mutated=false`。
- lifecycle read-policy runtime flag 默认关闭。
- `gate:ci`、dashboard、`observe:http`、`governance:report` 已能展示 lifecycle/read-policy 低风险摘要。

P12 必须在这些边界上继续推进，不能绕过它们。

## Proposed Tool Candidates

以下只作为候选工具 surface，不在本阶段实现：

- `update_memory`
- `supersede_memory`
- `forget_memory`
- `audit_memory`
- `validate_memory`
- `checkpoint_memory`
- `handoff_memory`

候选不代表 public MCP contract 已批准。Public MCP tools 仍保持：

- `record_memory`
- `search_memory`
- `memory_overview`

## Recommended Implementation Sequence

1. `P12.1-controlled-write-fixture-schemas`
2. `P12.2-mutation-audit-shape-tests`
3. `P12.3-controlled-write-dry-run-cli-prototypes`
4. `P12.4-MCP-tool-proposal-review`
5. `P12.5-first-runtime-mutation-tool-behind-explicit-approval`

## First-Batch Boundary

第一批不要全开。

推荐第一批只做：

- fixture schemas
- audit event shape
- dry-run CLI
- no durable mutation
- no MCP public tool expansion

第一批不应做：

- runtime durable write
- public MCP tool expansion
- SQLite migration
- hard delete
- automatic approval flow
- DreamWorker / reflection proposal mutation

## Mutation Rules

### update_memory

- 不允许 silent overwrite。
- 必须保留 previous snapshot 或 diff summary。
- 必须写 audit event。
- 默认不直接改 active memory，先进入 dry-run / proposal。

### supersede_memory

- new memory 指向 old memory。
- old memory status -> `superseded`。
- old memory 写 `superseded_by`。
- new memory 写 `supersedes`。
- 必须有 `reason` / `evidence`。

### forget_memory

- 默认 tombstone，不 hard delete。
- `tombstone_reason` 必填。
- hard delete 只属于未来 admin phase。
- `tombstoned` 默认不进入普通召回。

### audit_memory

- 只读。
- 可按 `memory_id` 查询 mutation / lifecycle / read-policy 事件。
- 不输出 raw secret。
- 不输出 raw `workspace_id`。

### validate_memory

- 用于 `proposal` / `stale` -> `active` 的未来流程。
- 必须有 `evidence`。
- 不允许无证据自动提升。

### checkpoint_memory / handoff_memory

- 只能作为受控便捷写入候选。
- 不应绕过 SecretScanner。
- 不应绕过 ToolArgumentValidator。
- 不应绕过 lifecycle policy。

## Lifecycle Transition Mapping

P12 必须复用 P11 lifecycle 模型：

| From | Allowed To |
|---|---|
| `proposal` | `active` / `rejected` / `tombstoned` |
| `active` | `stale` / `superseded` / `tombstoned` |
| `stale` | `active` / `superseded` / `tombstoned` |
| `superseded` | `tombstoned` |
| `rejected` | `tombstoned` |
| `tombstoned` | no default recovery |

`tombstoned` recovery belongs to a future explicit admin path and must not be default behavior.

## Audit Event Shape

Every mutation event must include at least:

- `event_id`
- `memory_id`
- `event_type`
- `tool_name`
- `actor_client_id`
- `request_source`
- `from_status`
- `to_status`
- `reason`
- `evidence`
- `created_at`
- `reversible`
- `diff_summary`
- `previous_snapshot_ref`
- `redaction_applied`
- `lifecycle_policy_applied`
- `scope_policy_applied`

Audit payload rules:

- no raw secret
- no raw provider token
- no raw Authorization header
- no raw cookie
- no raw `workspace_id` in low-risk summaries
- evidence must be present for validation / promotion / supersession
- `redaction_applied` must be explicit

## Permission / Policy Boundaries

- Public MCP tools remain frozen until explicit approval.
- No mutation from `search_memory`.
- No mutation from `memory_overview`.
- No mutation from dashboard / observe / governance report.
- No automatic mutation from DreamWorker / reflection proposal.
- Private memory mutation requires same `client_id` or future explicit admin path.
- Cross-project mutation is forbidden by default.
- No raw secret in audit.
- No raw `workspace_id` in low-risk summaries.
- Mutation tools must not weaken SecretScanner.
- Mutation tools must not weaken ToolArgumentValidator.
- Mutation tools must not bypass lifecycle read-policy signals.

## Rollback Model

- Code revert is not data rollback.
- Mutation rollback requires audit event and previous snapshot.
- Tombstone recovery is future admin mode, not default behavior.
- Supersession reversal requires explicit event.
- Any future DB migration requires backup and separate approval.
- A failed runtime deploy must not be treated as sufficient to undo data changes.
- Every durable mutation must have enough audit evidence to explain what changed, why, who requested it, and whether it is reversible.

## Dry-Run-First Rule

Every future write operation must first have:

- dry-run CLI
- fixture test
- audit shape test
- no mutation proof
- explicit `mutated=false` report

No operation should jump directly from design to durable mutation.

## Future Validation Matrix

| Phase | Validation |
|---|---|
| P12.1 | controlled write fixture schema tests |
| P12.2 | mutation audit shape tests |
| P12.3 | dry-run CLI tests |
| P12.4 | MCP schema proposal review only |
| P12.5 | first runtime tool only after explicit approval |

Additional future gates before any durable mutation:

- targeted mutation tests
- MCP contract tests if a public tool is proposed
- `npm test`
- `npm run gate:ci`
- `npm run gate:mainline:strict`
- no secret scan findings
- no raw `workspace_id` in low-risk summaries
- explicit migration/backfill approval if schema changes are needed

## Non-Goals

- 本阶段不新增 MCP tools。
- 本阶段不改 runtime。
- 本阶段不写真实 DB。
- 本阶段不做 SQLite migration。
- 本阶段不做 hard delete。
- 本阶段不实现 DreamWorker。
- 本阶段不进入 P16 / P17 / V8 / UI。
- 本阶段不做 release candidate。
- 本阶段不改 `src/`。
- 本阶段不改 `tests/`。
- 本阶段不改 `package.json` 或 lockfile。
- 本阶段不新增依赖。
- 本阶段不 push / tag / release / deploy。
