# Memory Lifecycle SQLite Dry-Run Plan

更新时间：2026-05-13

本文是 `P11.2-sqlite-lifecycle-columns-dry-run-planning` 的设计记录，用来规划 lifecycle 字段未来如何进入 SQLite shadow store。当前阶段只做 docs/tests-design planning，不改 runtime，不新增 CLI，不执行 SQLite migration，不迁移真实数据。

## Scope

P11.2 的目标是先定义 dry-run 能报告什么，以及未来 confirm migration 必须满足哪些安全条件。

本阶段明确不做：

- 不修改 `src/`。
- 不修改 `tests/`。
- 不修改 `package.json`。
- 不新增依赖。
- 不新增 MCP public tools。
- 不执行 SQLite migration。
- 不写真实 memory / shadow store / audit store。
- 不运行 provider smoke / benchmark。
- 不运行 `rebuild-profile --confirm`。
- 不 push / tag / release / deploy。

## Proposed `memory_records` Lifecycle Columns

未来如果获得真实 migration 明确授权，`memory_records` 可考虑增加以下 lifecycle columns：

| Column | Type | Default | Purpose |
|---|---|---|---|
| `status` | `TEXT` | explicit migration only | Lifecycle status, aligned with `active/stale/proposal/rejected/superseded/tombstoned`. |
| `status_reason` | `TEXT` | `NULL` | Human-readable reason for the current status. Must not contain secrets. |
| `supersedes_memory_id` | `TEXT` | `NULL` | Optional pointer to the older memory this record replaces. |
| `superseded_by_memory_id` | `TEXT` | `NULL` | Optional pointer to the newer memory that replaced this record. |
| `tombstone_reason` | `TEXT` | `NULL` | Human-readable tombstone reason. Must not contain secrets. |
| `lifecycle_updated_at` | `TEXT` | `NULL` | ISO timestamp for the most recent lifecycle change. |
| `lifecycle_actor_client_id` | `TEXT` | `NULL` | Client id responsible for the lifecycle change, such as `codex`, `claude`, or `system`. |

`status` should eventually be constrained by runtime validation and fixture tests, but this document does not authorize adding database constraints or indexes yet.

## Proposed Lifecycle Audit Shape

Lifecycle audit can be implemented as a dedicated SQLite table or append-only JSONL stream. P11.2 does not choose the storage implementation; it only requires that any future design preserve this event shape:

```json
{
  "event_id": "lifecycle_evt_...",
  "memory_id": "mem_...",
  "event_type": "lifecycle_transition",
  "from_status": "proposal",
  "to_status": "active",
  "reason": "human-reviewed proposal accepted",
  "actor_client_id": "codex",
  "request_source": "codex-memory.lifecycle.dry-run",
  "evidence": {
    "summary": "sanitized review reference",
    "references": []
  },
  "created_at": "2026-05-13T00:00:00.000Z",
  "reversible": false
}
```

Required fields:

- `event_id`
- `memory_id`
- `event_type`
- `from_status`
- `to_status`
- `reason`
- `actor_client_id`
- `request_source`
- `evidence`
- `created_at`
- `reversible`

Audit evidence must remain sanitized. It must not contain raw tokens, passwords, API keys, private keys, cookies, authorization headers, or `.env` values.

## Default Values

Defaulting is intentionally conservative:

- Existing rows default to `status=active` only after explicit migration approval.
- `tombstone_reason`, `supersedes_memory_id`, and `superseded_by_memory_id` default to `NULL`.
- `status_reason`, `lifecycle_updated_at`, and `lifecycle_actor_client_id` default to `NULL` unless a future approved migration has safe fixture-backed values.
- There is no automatic inference of supersession.
- There is no automatic inference of tombstone state.
- There is no automatic inference from stale, governance, audit, or recall metadata.

The dry-run may report that existing records would be backfilled to `active`, but it must not perform that write in P11.2.

## Dry-Run Report Shape

Future dry-run output should be fixture-testable and JSON-safe:

```json
{
  "summary": {
    "status": "ok",
    "mutated": false
  },
  "lifecycle": {
    "totalRecords": 0,
    "missingLifecycleColumns": [
      "status",
      "status_reason",
      "supersedes_memory_id",
      "superseded_by_memory_id",
      "tombstone_reason",
      "lifecycle_updated_at",
      "lifecycle_actor_client_id"
    ],
    "existingLifecycleColumns": [],
    "wouldAddColumns": [
      "status",
      "status_reason",
      "supersedes_memory_id",
      "superseded_by_memory_id",
      "tombstone_reason",
      "lifecycle_updated_at",
      "lifecycle_actor_client_id"
    ],
    "wouldBackfillStatus": true,
    "defaultStatus": "active",
    "mutationRequired": true,
    "riskLevel": "A2",
    "rollbackRequirement": "sqlite-backup-required",
    "mutated": false
  }
}
```

Required fields:

- `totalRecords`
- `missingLifecycleColumns`
- `existingLifecycleColumns`
- `wouldAddColumns`
- `wouldBackfillStatus`
- `defaultStatus`
- `mutationRequired`
- `riskLevel`
- `rollbackRequirement`
- `mutated=false`

The report may inspect schema metadata in a fixture DB during future tests. If it ever inspects a real DB, it must remain read-only and emit `mutated=false`.

## Migration Safety Rules

Future lifecycle SQLite work must follow these safety rules:

- Dry-run first.
- Backup is required before any confirm migration.
- There is no confirm mode in P11.2.
- Real migration is deferred to a later P11.x stage.
- Rollback requires a SQLite backup, not `git revert`.
- Any real migration must report the target DB path without exposing secrets.
- Any real migration must be explicitly authorized by the user.
- Any real migration must stop if the backup cannot be created or verified.
- Any real migration must stop if unexpected lifecycle columns or incompatible existing values are found.

`git revert` can undo source code or docs, but it cannot reliably restore SQLite data. Treat database rollback as a data-operation rollback, not a repository rollback.

## Future Implementation Phases

### P11.3 Lifecycle SQLite Dry-Run CLI Fixture Tests

目标：

- Add fixture-backed tests for the dry-run report shape.
- Use only fixture DBs or mocked schema metadata.
- Require `mutated=false`.
- Verify no real SQLite migration happens.

### P11.4 Lifecycle Read-Policy Runtime Flag

目标：

- Add an optional runtime flag for lifecycle-aware read policy.
- Keep default behavior compatible until explicitly changed.
- Preserve MCP public tools unless a later P12 task explicitly authorizes expansion.

### P12 Controlled Mutation Tools

目标：

- Evaluate controlled lifecycle mutation tools only after schema, dry-run, and optional read-policy foundations are stable.
- Candidate operations may include accept, reject, supersede, tombstone, and lifecycle audit review.
- Any MCP public tool expansion requires explicit approval.

## Validation

P11.2 validation remains docs-only:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

No runtime, test, provider, SQLite, or migration command is required for this planning stage.
