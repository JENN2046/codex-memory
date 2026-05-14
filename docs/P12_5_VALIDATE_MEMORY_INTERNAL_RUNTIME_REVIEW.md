# P12.5 Validate Memory Internal Runtime Review

Updated: 2026-05-14

## Review Result

Result: PASS after two-phase audit safety patch

The internal `validate_memory` runtime implementation now matches the approved narrow runtime scope, the runtime fixture intent, the P12.5 approval gate, the implementation plan, and the targeted runtime tests.

A follow-up safety review found two defects in the earlier runtime:

- confirmed apply performed lifecycle update before proving the audit append path was available
- lifecycle update guarded only by `memory_id` and previous `status`, while the scope decision also depended on `client_id` and `visibility`

Both defects are fixed in the current patch.

A later residual-risk review found that audit preflight alone was still not enough because JSONL audit append and SQLite lifecycle update are not one transaction. The current two-phase audit protocol fixes that residual risk by writing durable pending audit intent before lifecycle mutation, then writing a committed or cancelled follow-up.

## Files Inspected

- [ValidateMemoryService.js](/A:/codex-memory/src/core/ValidateMemoryService.js)
- [ToolArgumentValidator.js](/A:/codex-memory/src/core/ToolArgumentValidator.js)
- [SqliteShadowStore.js](/A:/codex-memory/src/storage/SqliteShadowStore.js)
- [app.js](/A:/codex-memory/src/app.js)
- [validate-memory-runtime.test.js](/A:/codex-memory/tests/validate-memory-runtime.test.js)
- [validate-memory-runtime-v1.json](/A:/codex-memory/tests/fixtures/validate-memory-runtime-v1.json)
- [P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md](/A:/codex-memory/docs/P12_5_RUNTIME_MUTATION_APPROVAL_GATE.md)
- [P12_5_VALIDATE_MEMORY_RUNTIME_IMPLEMENTATION_PLAN.md](/A:/codex-memory/docs/P12_5_VALIDATE_MEMORY_RUNTIME_IMPLEMENTATION_PLAN.md)

## Checklist

| Requirement | Review Result |
|---|---|
| Only `proposal/stale -> active` allowed | PASS |
| `rejected/tombstoned/superseded -> active` rejected | PASS |
| Dry-run defaults to non-mutating | PASS |
| Apply requires `dry_run=false` and `confirm=true` | PASS |
| `reason` and `evidence` required | PASS |
| `reason` and `evidence` pass through `SecretScanner` | PASS |
| Arguments pass through `ToolArgumentValidator` | PASS |
| Cross-client private mutation rejected | PASS |
| Missing lifecycle status column fails safe | PASS |
| Pending audit intent is written before confirmed mutation | PASS |
| Cancelled audit is written when update fails after pending intent | PASS |
| Committed audit is written after successful lifecycle update | PASS |
| Committed audit append failure reports warning and leaves pending intent | PASS |
| Lifecycle update guarded by expected `client_id` | PASS |
| Lifecycle update guarded by expected `visibility` | PASS |
| Audit event avoids raw `workspace_id` and secret-like output | PASS |
| Public MCP tools remain frozen | PASS |
| No SQLite schema change | PASS |
| No hard delete | PASS |

## Drift Review

No blocking drift was found between fixture, plan, runtime, and tests.

Context note: `tests/fixtures/validate-memory-runtime-v1.json` was created as the pre-runtime approval fixture and still records the approval gate language, including `runtimeApprovalRequired` and `noRuntimeMutation`. The current implementation remains consistent with the fixture intent because:

- default behavior is still non-mutating
- public MCP expansion is still forbidden
- apply requires explicit `dry_run=false` and `confirm=true`
- runtime behavior was implemented only after explicit approval
- the implementation plan records the post-approval internal-only state

## Audit Behavior

Audit behavior matches the implementation plan:

- Dry-run returns an audit preview and writes no audit.
- Rejected requests before confirmed apply write no audit.
- Confirmed mutation builds a `memory_validate` audit event.
- Confirmed mutation appends `audit_phase=pending` before `updateLifecycleStatus`.
- If `updateLifecycleStatus` fails, a `audit_phase=cancelled` follow-up is appended when possible.
- If `updateLifecycleStatus` succeeds, a `audit_phase=committed` follow-up is appended.
- If committed append fails after update, the service returns `validated-with-warning` and `auditCommitStatus=failed_after_mutation`.
- The audit event includes `previous_snapshot_ref`.
- Targeted tests verify the audit payload does not include raw `workspace_id`.
- Secret-like evidence is rejected before mutation and no audit entry is written.

JSONL audit and SQLite lifecycle status update are still not one physical transaction. The current guarantee is that no confirmed lifecycle mutation can occur before a durable pending audit intent exists. A true single-transaction audit would require a future SQLite-backed audit table or migration, which remains unapproved.

## Policy Guard Behavior

`SqliteShadowStore.updateLifecycleStatus` now guards confirmed updates by:

- `memory_id`
- previous `status`
- expected `client_id`
- expected `visibility`

If `client_id` or `visibility` changes after policy read but before the update, the update returns `updated=false` and `ValidateMemoryService` rejects with `mutated=false`.

## Public MCP Boundary

Public MCP tools remain:

- `record_memory`
- `search_memory`
- `memory_overview`

No public `validate_memory` MCP tool is exposed.

## SQLite / Data Boundary

No SQLite migration is present in the implementation.

`SqliteShadowStore` uses existing lifecycle columns only. If the lifecycle `status` column is unavailable, `validate_memory` rejects fail-safe instead of creating or altering schema.

No hard delete path is present.

## Validation

```powershell
node --test tests\validate-memory-runtime-fixture.test.js
node --test tests\validate-memory-runtime.test.js
node --test tests\mcp-contract.test.js
npm test
npm run gate:ci
npm run gate:mainline:strict
npm run lifecycle:sqlite:dry-run -- --json
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Observed results:

- fixture test: `11/11`
- runtime test: `15/15`
- CLI test: `12/12`
- MCP contract test: `7/7`
- full suite: `415/415`
- `gate:ci`: PASS
- `gate:mainline:strict`: PASS
- lifecycle SQLite dry-run: `mutated=false`
- `git diff --check`: PASS
- docs validation: PASS

## Recommendation

Safe to proceed to the next decision gate.

Reasonable next phases:

- keep `validate_memory` internal-only
- add an internal CLI wrapper
- start a public MCP proposal review for `validate_memory`

Public MCP expansion remains a separate approval gate.
