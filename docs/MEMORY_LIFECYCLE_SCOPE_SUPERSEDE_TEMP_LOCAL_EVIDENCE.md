# Memory Lifecycle Scope Supersede Temp-Local Evidence

Status: `MEMORY_LIFECYCLE_SCOPE_SUPERSEDE_TEMP_LOCAL_EVIDENCE_COMPLETED_NOT_READY`
Date: 2026-05-24
Task: `CM-0885`

## Purpose

CM-0884 added the smallest internal supersede mutation service.

This slice adds the next smallest runtime-adjacent proof above that service:

- still isolated
- still synthetic
- still temp-local
- but now using the real local `SqliteShadowStore` and `AuditLogStore` classes

## What Changed

Added:

- [supersede-memory-temp-local-evidence.test.js](/A:/codex-memory/tests/supersede-memory-temp-local-evidence.test.js)

This evidence now proves two bounded local paths:

1. one accepted pair mutation path
2. one rejected private cross-client path

Both run on isolated temp-local state and clean up after themselves.

## Accepted Path

The accepted path seeds:

- one synthetic old record in `active`
- one synthetic new record in `proposal`

Then `SupersedeMemoryService.supersede(...)` is executed with:

- exact old/new ids
- exact bidirectional links
- matching scope tuple
- same-client actor

What is verified:

- old record becomes `superseded`
- new record becomes `active`
- old row gets `superseded_by_memory_id`
- new row gets `supersedes_memory_id`
- lifecycle metadata is written
- audit log records `pending -> superseded`
- temp-local root is removed afterward

## Rejected Path

The rejected path seeds:

- one synthetic old record in `active`
- one synthetic new record in `proposal`
- both records as `private`
- both records belonging to another client

Then `SupersedeMemoryService.supersede(...)` is executed as `codex`.

What is verified:

- the mutation is rejected before audit append
- old/new lifecycle states stay unchanged
- old/new supersede links stay empty
- no audit entries are written
- temp-local root is removed afterward

## Why This Matters

Before CM-0885, the supersede chain had:

- pair contracts
- pair helpers
- runtime-prep helper
- seam candidate helper
- transactional shadow seam candidate
- internal mutation service

But it still lacked one runtime-adjacent proof that the new service could actually drive real local store classes without widening into app wiring or public MCP.

After CM-0885, that proof now exists.

## Validation

Validated:

- `node --check tests\supersede-memory-temp-local-evidence.test.js`
- `node --test tests\supersede-memory-temp-local-evidence.test.js`
- `git diff --check`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs`

Targeted temp-local validation passed `2/2`.

## Boundaries Preserved

CM-0885 does not:

- wire supersede into `src/app.js`
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

After CM-0885, the most aligned next small step is:

1. a bounded app-surface review for whether supersede should remain service-only; or
2. only after that, a bounded internal runtime-entry review for whether supersede should ever approach shared-gate adoption.

Public MCP expansion should remain deferred.

## Verdict

`MEMORY_LIFECYCLE_SCOPE_SUPERSEDE_TEMP_LOCAL_EVIDENCE_COMPLETED_NOT_READY`

The supersede-first governance path now has bounded temp-local evidence on real local stores, but it remains internal-only evidence rather than readiness or public durable governance apply.
