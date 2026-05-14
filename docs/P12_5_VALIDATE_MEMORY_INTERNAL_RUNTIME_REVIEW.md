# P12.5 Validate Memory Internal Runtime Review

Updated: 2026-05-14

## Review Result

Result: PASS

The internal `validate_memory` runtime implementation matches the approved narrow runtime scope, the runtime fixture intent, the P12.5 approval gate, the implementation plan, and the targeted runtime tests.

No runtime bug was found in this review.

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
| Audit event written only after lifecycle update succeeds | PASS |
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
- Rejected requests write no audit.
- Confirmed mutation builds a `memory_validate` audit event.
- Audit append happens only after `updateLifecycleStatus` reports a successful lifecycle update.
- The audit event includes `previous_snapshot_ref`.
- Targeted tests verify the audit payload does not include raw `workspace_id`.
- Secret-like evidence is rejected before mutation and no audit entry is written.

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
- runtime test: `9/9`
- MCP contract test: `7/7`
- full suite: `300/300`
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
