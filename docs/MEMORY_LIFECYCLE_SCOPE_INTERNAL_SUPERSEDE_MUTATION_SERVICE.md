# Memory Lifecycle Scope Internal Supersede Mutation Service

Status: `MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_MUTATION_SERVICE_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0884`

## Purpose

CM-0883 closed the exact transactional two-record shadow seam candidate.

This slice adds the smallest internal supersede mutation service above that seam without widening into app wiring, shared gate adoption, public MCP exposure, or broader runtime durable governance apply.

## What Changed

Added:

- [SupersedeMemoryService.js](/A:/codex-memory/src/core/SupersedeMemoryService.js)
- [supersede-memory-runtime.test.js](/A:/codex-memory/tests/supersede-memory-runtime.test.js)

`SupersedeMemoryService` intentionally stays internal-only.

It follows the existing `ValidateMemoryService` / `TombstoneMemoryService` execution pattern:

- exact schema validation
- secret-like content rejection
- exact old/new id requirement
- exact bidirectional link requirement
- lifecycle eligibility check for both records
- cross-client private-scope guard
- exact pair-scope match guard
- default `dry_run=true`
- `confirm=true` required when `dry_run=false`
- pending audit intent before pair mutation
- guarded pair-shaped `applySupersedePair(...)`
- committed / cancelled audit follow-up

Current accepted lifecycle transition set is intentionally narrow:

- old record: `active -> superseded`
- old record: `stale -> superseded`
- new record: `proposal -> active`
- new record: `stale -> active`
- new record: `active -> active`

## Why This Matters

Before CM-0884, the supersede-first governance path had:

- pair-outcome contract
- pair-outcome helper
- runtime-prep helper
- seam-candidate helper
- transactional shadow-store seam candidate

But it still lacked the smallest real runtime mutation service that could connect:

- validated internal input
- pair lifecycle eligibility
- pair scope/policy guards
- append-only audit intent
- guarded two-record lifecycle/link mutation
- committed / cancelled audit follow-up

After CM-0884, that service shape now exists locally as a bounded internal runtime slice.

This is still not app wiring, shared-gate adoption, or public/runtime durable governance apply.

## Validation

Validated:

- `node --check src\core\SupersedeMemoryService.js`
- `node --check tests\supersede-memory-runtime.test.js`
- `node --test tests\supersede-memory-runtime.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Targeted runtime coverage passed `10/10`, including:

- dry-run default no-mutation behavior
- pending audit before pair mutation
- committed and cancelled audit follow-up
- exact pair scope mismatch rejection
- private cross-client guard
- exact pair id and link rejection
- public MCP contract freeze

## Boundaries Preserved

CM-0884 does not:

- wire the service into `src/app.js`
- adopt the shared internal runtime-entry gate
- expose `supersede_memory` as a public MCP tool
- widen public `callTool()`
- execute true live `record_memory` or `search_memory`
- read raw real memory content or direct real `.jsonl`
- call providers
- claim runtime durable governance apply is ready
- claim `memory write reliable`
- claim `memory recall reliable`
- claim `RC_READY`
- claim production readiness

## Next Safe Step

After CM-0884, the most aligned next small step is:

1. a bounded temp-local/runtime-adjacent supersede proof that consumes the new service without widening into app wiring or public MCP; or
2. only after that, an app-surface wiring review for whether supersede should remain service-only.

Shared-gate adoption should still remain deferred.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_INTERNAL_SUPERSEDE_MUTATION_SERVICE_COMPLETED_NOT_READY`

The supersede-first governance path now has a bounded internal mutation service with schema/secret/lifecycle/scope/audit/update guards, but it remains internal-only evidence rather than readiness or public durable governance apply.
