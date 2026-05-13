# Memory Lifecycle Read Policy Runtime Implementation Plan

更新时间：2026-05-13

本文是 `P11.6-lifecycle-read-policy-runtime-flag-implementation-planning` 的规划事实源，用来设计 lifecycle read-policy runtime flag 的未来实现方案。

本阶段只规划 runtime flag implementation，不实现 runtime：

- 不修改 `src/`。
- 不修改 `tests/`。
- 不修改 `package.json`。
- 不改变 `search_memory` runtime 行为。
- 不新增 MCP public tools。
- 不做 SQLite migration。
- 不迁移真实数据。
- 不调用 provider。
- 不 push / tag / release / deploy。

## Purpose

P11.6 的目标是先规划 `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` 的 runtime implementation 边界，避免后续直接在 read path 上动刀时扩大风险。

未来目标是让 `search_memory` 在 feature flag 打开时，按 lifecycle status 过滤普通召回结果：

- `active` / `stale` 可进入普通召回候选。
- `proposal` / `rejected` / `superseded` / `tombstoned` 默认不进入普通召回。
- private visibility 继续受 client scope 约束。
- audit summary 记录 policy 是否生效，但不暴露 raw `workspace_id`。

P11.6 不授权实现这些行为。实现应拆到后续阶段，并先通过 fixture/runtime tests 证明默认关闭行为不变。

P11.7 runtime fixture test 入口：

- Fixture: [tests/fixtures/lifecycle-read-policy-runtime-v1.json](/A:/codex-memory/tests/fixtures/lifecycle-read-policy-runtime-v1.json)
- Test: [tests/lifecycle-read-policy-runtime-fixture.test.js](/A:/codex-memory/tests/lifecycle-read-policy-runtime-fixture.test.js)

## Proposed Flags

| Flag | Default | Runtime meaning |
|---|---:|---|
| `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY` | `false` | Future lifecycle status filter for ordinary `search_memory` recall candidates. |
| `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` | `false` | Existing soft read policy flag; can continue covering client/private visibility and proposal/rejected/tombstoned preflight behavior. |

Default values must remain `false` to avoid breaking current behavior.

Planned relationship:

- Lifecycle read policy can be enabled independently after runtime tests exist.
- Soft read policy can continue covering client/private visibility narrowing.
- If both are enabled, either policy can hide a candidate.
- Neither flag should broaden visibility or status access.

## Runtime Insertion Points

### Candidate SQL Pushdown

Potential insertion point:

- The SQL candidate selection layer can push lifecycle status filtering close to candidate generation when lifecycle columns are available.
- This is useful for performance and avoids ranking hidden records.

Planning questions:

- Can the candidate query reliably read `status` from `memory_records`?
- How does the query behave when lifecycle columns are missing?
- Should missing status be rejected, warned, or treated as unknown when flag is enabled?

Constraint:

- Do not silently treat unknown or missing status as `active` unless migration is complete and tests prove that all existing records have safe lifecycle defaults.

### Post-Filter Fallback

Post-filtering should remain a safety net even if SQL pushdown exists:

- It can filter any candidate that bypasses SQL pushdown.
- It can handle mixed schema or cached candidates.
- It can produce `hiddenByLifecycleCount` for audit summary.

Post-filter should use the same status matrix as fixture tests, not a divergent hardcoded interpretation.

### Audit Context

Read audit context should record whether policy was applied:

- `readPolicyApplied`
- `lifecyclePolicyApplied`
- `lifecycleIncludedStatuses`
- `lifecycleExcludedStatuses`
- `hiddenByLifecycleCount`
- `staleResultCount`
- `lifecycleColumnAvailable`
- `scopeWorkspacePresent`

Audit summary must not include raw `workspace_id`.

### Overview And Observability

`memory_overview`, `dashboard`, and `http-observe` should only show summary-level lifecycle read-policy information if this feature reaches runtime:

- counts
- enabled/disabled flags
- status buckets
- warnings
- `scopeWorkspacePresent`

They must not expose raw `workspace_id` in summaries.

## Status Behavior

When `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=true` and lifecycle columns are available:

| Status | Runtime behavior |
|---|---|
| `active` | include |
| `stale` | include, but mark stale |
| `proposal` | exclude |
| `rejected` | exclude |
| `superseded` | exclude unless explicit future `include_superseded` mode |
| `tombstoned` | exclude always except future admin/audit mode |

Future modes:

- `include_superseded` is a future review/admin mode, not a default ordinary recall behavior.
- `tombstoned` visibility must remain audit/admin only.
- Admin/audit mode is explicitly out of scope for P11.6.

## Missing-Column Behavior

If SQLite does not yet have lifecycle columns:

| Runtime flag | Expected behavior |
|---|---|
| `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` | No impact; keep current behavior. |
| `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=true` | Fail-safe or warn fallback; do not silently broaden recall. |

Required rule:

- Do not misclassify unknown status as `active`.
- Do not infer lifecycle status from unrelated fields.
- Do not run migration automatically.
- Do not backfill status at runtime.
- Do not hide the missing-column condition from audit/observability.

Suggested summary field:

- `lifecycleColumnAvailable=false`

Future implementation must decide whether enabled-with-missing-column is a hard fail or a warning with current behavior preserved. That decision belongs in P11.7/P11.8 tests before runtime code changes.

## Audit Summary Shape

Future runtime audit summary should be compatible with P11.5 fixture expectations and extend them with column availability:

```json
{
  "readPolicyApplied": true,
  "lifecyclePolicyApplied": true,
  "lifecycleIncludedStatuses": [
    "active",
    "stale"
  ],
  "lifecycleExcludedStatuses": [
    "proposal",
    "rejected",
    "superseded",
    "tombstoned"
  ],
  "hiddenByLifecycleCount": 0,
  "staleResultCount": 0,
  "lifecycleColumnAvailable": true,
  "scopeWorkspacePresent": true
}
```

Rules:

- `scopeWorkspacePresent` is allowed.
- raw `workspace_id` is not allowed.
- Secret-like values are not allowed.
- `hiddenByLifecycleCount` should count records hidden due to lifecycle status.
- `staleResultCount` should count stale records that remain visible in final or candidate results, depending on the future test contract.

## Future Implementation Sequence

### P11.7 Lifecycle Read-Policy Runtime Fixture Tests

Goal:

- Add runtime-oriented fixture tests before changing runtime.
- Cover default-off behavior.
- Cover enabled status filtering.
- Cover missing-column behavior.
- Cover audit summary shape.
- Cover MCP public tools unchanged.

Validation:

```powershell
node --test tests\lifecycle-read-policy-runtime-fixture.test.js
```

### P11.8 Optional Runtime Flag Implementation

Goal:

- Implement `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` default-off behavior.
- Add candidate SQL pushdown only if lifecycle columns are available.
- Add post-filter fallback.
- Add audit summary fields.
- Preserve current `search_memory` behavior when flag is false.

Required validation should include targeted runtime tests, `npm test`, and `gate:mainline:strict`.

### P11.9 Gate-CI Lifecycle Policy Summary

Goal:

- Add fixture-only lifecycle policy summary to `gate:ci`.
- Do not depend on real HTTP MCP.
- Do not call provider.
- Do not write real memory.
- Do not read `.env`.

### P12 Controlled Mutation Tools

Goal:

- Evaluate controlled mutation tools only after read policy, lifecycle schema, and dry-run migration paths are stable.
- Any MCP public tool expansion requires explicit approval.

## Non-Goals

- 本阶段不实现 runtime。
- 本阶段不改 `search_memory`。
- 本阶段不新增 MCP tools。
- 本阶段不迁移 SQLite。
- 本阶段不提供 admin/audit mode。
- 本阶段不改 `.env` / secrets。
- 本阶段不新增依赖。
- 本阶段不做真实数据迁移。
- 本阶段不 push / tag / release / deploy。
