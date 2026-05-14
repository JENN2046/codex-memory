# P12.5 Runtime Mutation Approval Gate

Updated: 2026-05-14

## Purpose

P12.5 began as an approval gate for the first controlled runtime mutation tool. It now records both the explicit approval boundary and the narrow internal implementation result.

The recommended first candidate is `validate_memory`, because it has the narrowest mutation shape: promote an existing `proposal` or `stale` memory to `active` only when evidence is present.

## Current State

Completed prerequisites:

- P12 controlled write planning
- P12.1 controlled write fixture schemas
- P12.2 mutation audit shape tests
- P12.3 controlled write dry-run CLI prototypes
- P12.4 MCP tool proposal review
- A4.8 Safe Project Operator Rail

Current fixture/test gate:

- Fixture: [validate-memory-runtime-v1.json](/A:/codex-memory/tests/fixtures/validate-memory-runtime-v1.json)
- Test: [validate-memory-runtime-fixture.test.js](/A:/codex-memory/tests/validate-memory-runtime-fixture.test.js)

This fixture/test phase still does not approve runtime mutation. It locks input requirements, allowed and forbidden lifecycle transitions, audit shape, dry-run behavior, redaction boundary, SecretScanner / ToolArgumentValidator boundaries, and scope/lifecycle policy requirements before any runtime patch.

Current internal runtime implementation:

- Service: [ValidateMemoryService.js](/A:/codex-memory/src/core/ValidateMemoryService.js)
- Targeted test: [validate-memory-runtime.test.js](/A:/codex-memory/tests/validate-memory-runtime.test.js)
- Implementation plan and rollback story: [P12_5_VALIDATE_MEMORY_RUNTIME_IMPLEMENTATION_PLAN.md](/A:/codex-memory/docs/P12_5_VALIDATE_MEMORY_RUNTIME_IMPLEMENTATION_PLAN.md)

This is an internal service implementation only. It does not add a public MCP tool, does not change MCP schema, does not add a package script, and does not run SQLite migration. The public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`.

Still blocked:

- MCP public tool expansion
- MCP schema change
- SQLite migration
- runtime implementation for update/supersede/forget/checkpoint/handoff
- broad or automatic real DB/memory writes outside the explicitly approved internal `validate_memory` service path

Those remain A5 hard stops until explicit approval names the target and allowed write surface.

## Candidate Scope

Candidate: `validate_memory`

Allowed transition after approval:

- `proposal -> active` with evidence
- `stale -> active` with evidence

Forbidden by default:

- `rejected -> active`
- `tombstoned -> active`
- validation without evidence
- validation without reason
- silent lifecycle change
- hard delete
- mutation from `search_memory`
- mutation from `memory_overview`
- automatic mutation from dashboard, observe, governance report, DreamWorker, or reflection proposal

## Approval Packet Required Before Runtime Work

Explicit approval must state:

- target tool candidate
- whether it is internal-only CLI/runtime or public MCP
- allowed files
- forbidden files
- permitted lifecycle transitions
- audit event shape
- rollback expectation
- validation commands
- safe-push behavior

Without that packet, A4.8 may only update docs, fixtures, tests, dry-run CLIs, or board state.

## Runtime Implementation Preconditions

Before any runtime mutation patch, the implementation plan must prove:

- `mutated=false` dry-run path already exists
- `tests/fixtures/validate-memory-runtime-v1.json` is satisfied
- audit event will include reason and evidence
- SecretScanner boundary remains before any durable write
- ToolArgumentValidator boundary is not weakened
- lifecycle policy is applied
- scope policy is applied
- no raw secret can enter audit output
- no raw `workspace_id` appears in low-risk summaries
- previous state is recoverable or the mutation is explicitly reversible
- failure before durable write leaves no partial mutation

## Validation After Approval

Minimum validation after an approved runtime mutation patch:

```powershell
node --test <targeted-runtime-mutation-test>
node --test tests\controlled-write-tools-fixture.test.js
node --test tests\mutation-audit-shape.test.js
node --test tests\controlled-write-proposal-review.test.js
npm test
npm run gate:ci
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

If public MCP surface is approved, also run:

```powershell
node --test tests\mcp-contract.test.js
npm run gate:mainline:strict
```

If SQLite schema or real data migration is approved, use a separate migration phase with backup, restore, dry-run evidence, and explicit approval.

## A4.8 Stop Point

A4.8 may prepare this approval gate and future test design.

A4.8 must stop before:

- adding runtime mutation code
- adding or exposing a public MCP tool
- changing MCP schema
- writing durable memory
- writing SQLite
- running SQLite migration
- changing dependencies
- editing secrets or `.env`
- running provider calls

## Next Decision

The next decision is whether to explicitly approve a public MCP proposal for `validate_memory`, keep it internal-only, or add an internal CLI wrapper.

Public MCP expansion remains a separate approval gate.
