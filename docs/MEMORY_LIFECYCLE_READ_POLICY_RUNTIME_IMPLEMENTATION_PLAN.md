# Memory Lifecycle Read Policy Runtime Implementation Plan

更新时间：2026-05-14

本文最初是 `P11.6-lifecycle-read-policy-runtime-flag-implementation-planning` 的规划事实源。
`P11.8-lifecycle-read-policy-runtime-flag-implementation` 已按该边界落地默认关闭的
lifecycle read-policy runtime flag。

P11.8 实现边界：

- 新增 `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY`，默认 `false`。
- 支持 `createConfig({ enableLifecycleReadPolicy })` override。
- `CODEX_MEMORY_ENABLE_SOFT_READ_POLICY` 默认行为不变。
- flag 关闭时不改变 `search_memory` 默认召回行为。
- flag 开启时只过滤普通 `search_memory` 结果，不新增 admin/audit mode。
- 不新增 MCP public tools。
- 不做 SQLite migration，不自动 `ALTER TABLE`，不迁移真实数据。
- 不调用 provider。
- 不 push / tag / release / deploy。

## Purpose

目标是让 `search_memory` 在 feature flag 打开时，按 lifecycle status 过滤普通召回结果：

- `active` / `stale` 可进入普通召回候选。
- `proposal` / `rejected` / `superseded` / `tombstoned` 默认不进入普通召回。
- private visibility 继续受 client scope 约束。
- audit summary 记录 policy 是否生效，但不暴露 raw `workspace_id`。

P11.8 已实现这些行为，并通过 runtime tests 验证默认关闭行为不变。

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

## Implemented Runtime Behavior

当前 P11.8 实现采用 post-filter fallback，而不是 SQL pushdown：

- `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` 或未设置时，`search_memory` 结果保持既有行为，`proposal` / `rejected` / `superseded` / `tombstoned` 不会被 lifecycle policy 过滤。
- `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=true` 时，普通 `search_memory` 只保留 `active` / `stale`。
- `stale` 仍可见，并计入 `staleResultCount`。
- `proposal` / `rejected` / `superseded` / `tombstoned` 从普通召回结果中过滤，并计入 `hiddenByLifecycleCount`。
- 本阶段没有 `include_superseded`、admin mode 或 audit mode。
- MCP public tools 仍为 `record_memory` / `search_memory` / `memory_overview`。

缺 lifecycle status column 时：

- flag 关闭：无影响。
- flag 开启：fail-safe 隐藏候选结果，记录 `lifecycleColumnAvailable=false`，不得把未知或缺失 status 静默当作 `active`。

Audit summary 通过 read-policy summary entry 记录低风险字段：

- `readPolicyApplied`
- `lifecyclePolicyApplied`
- `lifecycleIncludedStatuses`
- `lifecycleExcludedStatuses`
- `hiddenByLifecycleCount`
- `staleResultCount`
- `lifecycleColumnAvailable`
- `scopeWorkspacePresent`

该 summary 不记录 raw `workspace_id`，也不记录 secret-like content。

## Runtime Insertion Points

### Candidate SQL Pushdown

Deferred insertion point:

- The SQL candidate selection layer can push lifecycle status filtering close to candidate generation when lifecycle columns are available.
- This is useful for performance and avoids ranking hidden records.

Open questions before any future SQL pushdown:

- Can the candidate query reliably read `status` from `memory_records`?
- How does the query behave when lifecycle columns are missing?
- Should missing status be rejected, warned, or treated as unknown when flag is enabled?

Constraint:

- Do not silently treat unknown or missing status as `active` unless migration is complete and tests prove that all existing records have safe lifecycle defaults.

### Post-Filter Fallback

P11.8 implemented post-filtering as the runtime safety net:

- It can filter any candidate that bypasses SQL pushdown.
- It can handle mixed schema or cached candidates.
- It can produce `hiddenByLifecycleCount` for audit summary.

The post-filter uses the same status matrix as fixture tests, not a divergent interpretation.

### Audit Context

Read audit context records whether policy was applied:

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

Future `memory_overview`, `dashboard`, and `http-observe` work should only show summary-level lifecycle read-policy information:

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
- Admin/audit mode is explicitly out of scope for P11.8.

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

P11.8 decision: enabled-with-missing-column is fail-safe for ordinary recall candidates and records `lifecycleColumnAvailable=false`.

## Audit Summary Shape

Runtime audit summary is compatible with P11.5 fixture expectations and extends them with column availability:

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

## Implementation Sequence

### P11.7 Lifecycle Read-Policy Runtime Fixture Tests

Status: done.

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

Status: implemented in runtime.

Goal:

- Implement `CODEX_MEMORY_ENABLE_LIFECYCLE_READ_POLICY=false` default-off behavior.
- Add post-filter fallback.
- Add audit summary fields.
- Preserve current `search_memory` behavior when flag is false.

Candidate SQL pushdown remains a future optimization and is not required for P11.8.

### P11.9 Gate-CI Lifecycle Policy Summary

Status: implemented as CI-safe fixture/reporting summary.

Goal:

- Add fixture-only lifecycle policy summary to `gate:ci`.
- Do not depend on real HTTP MCP.
- Do not call provider.
- Do not write real memory.
- Do not read `.env`.
- Do not change `search_memory` runtime behavior.

Current `gate:ci` JSON field:

- `checks.lifecyclePolicy.status`
- `checks.lifecyclePolicy.detail.fixtureOnly`
- `checks.lifecyclePolicy.detail.mutated`
- `checks.lifecyclePolicy.detail.noNetwork / noDaemon / noProvider`
- `checks.lifecyclePolicy.detail.defaultEnabled`
- `checks.lifecyclePolicy.detail.enabledIncludedStatuses`
- `checks.lifecyclePolicy.detail.enabledExcludedStatuses`
- `checks.lifecyclePolicy.detail.hiddenByLifecycleCount`
- `checks.lifecyclePolicy.detail.staleResultCount`
- `checks.lifecyclePolicy.detail.auditSummaryShapePresent`
- `checks.lifecyclePolicy.detail.rawWorkspaceIdExposed`

### P11.10 Observability Lifecycle Read-Policy Summary

Status: implemented as reporting-only observability surface.

Goal:

- Surface lifecycle/read-policy state in `dashboard`, `observe:http`, and `governance:report`.
- Read only config flags and recent recall audit summary fields.
- Show enabled flags, include/exclude status sets, hidden/stale counts, lifecycle column availability, and workspace-scope presence as low-risk booleans/counts.
- Keep `rawWorkspaceIdExposed=false`.
- Do not change `search_memory` runtime behavior.
- Do not add MCP public tools.
- Do not run SQLite migration or `ALTER TABLE`.

Current JSON surfaces:

- `dashboard.readPolicy`
- `dashboard.audits.readPolicy`
- `observe:http.readPolicy`
- `observe:http.summary.readPolicyStatus`
- `governance:report.readPolicy`
- `governance:report.review.readPolicy`

If no recent read-policy audit exists, `status=unavailable` is a reporting state only and does not imply runtime failure.

### P12 Controlled Mutation Tools

Goal:

- Evaluate controlled mutation tools only after read policy, lifecycle schema, and dry-run migration paths are stable.
- Any MCP public tool expansion requires explicit approval.

## Non-Goals

- 本阶段不新增 MCP tools。
- 本阶段不迁移 SQLite。
- 本阶段不自动 `ALTER TABLE`。
- 本阶段不提供 admin/audit mode。
- 本阶段不支持 `include_superseded`。
- 本阶段不改 `.env` / secrets。
- 本阶段不新增依赖。
- 本阶段不做真实数据迁移。
- 本阶段不 push / tag / release / deploy。
