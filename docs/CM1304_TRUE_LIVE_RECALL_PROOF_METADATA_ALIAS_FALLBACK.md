# CM-1304 True Live Recall Proof Metadata Alias Fallback

Date: 2026-06-01

Status: `COMPLETED_VALIDATED_NOT_READY`

## Scope

Local source/test hardening for true-live recall proof sanitized metadata normalization.

Touched behavior:

- `sanitizeResultForRunner(...)`
- internal proof runner per-query result id hashing
- sanitized `createdAt/created_at` and `updatedAt/updated_at` date-only extraction

This change does not execute true-live recall, read real memory stores, read `.jsonl`, call provider APIs, call MCP tools, write durable memory/audit, change approval profiles, change config/watchdog/startup, expand public MCP tools, perform remote actions, or claim readiness/reliability.

## Problem

The proof metadata path selected result metadata aliases with `||`:

- `memoryId || memory_id || id`
- `createdAt || created_at`
- `updatedAt || updated_at`

Whitespace-only camel-case fields are truthy in JavaScript, so they could stop fallback and hide later valid snake_case metadata. For proof output this could produce a null date-only field or hash a blank id instead of the stable runtime id.

## Change

Added first non-empty normalized string fallback in the executor adapter and proof runner. Blank strings are now ignored before sanitized metadata output and per-query id hashing.

## Validation

Passed:

```powershell
node --check src\core\TrueLiveRecallExecutorAdapter.js
node --check src\core\TrueLiveRecallReadonlyProofRunner.js
node --check tests\true-live-recall-executor-adapter.test.js
node --check tests\true-live-recall-internal-proof-runner.test.js
node --test tests\true-live-recall-executor-adapter.test.js tests\true-live-recall-internal-proof-runner.test.js tests\recall-proof-execution-preflight.test.js tests\recall-proof-execution-preflight-cli.test.js
```

Targeted true-live recall proof result: `31/31` passing.

Closeout validation:

```powershell
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Default suite result: `2827/2827` passing.

## Readiness

No readiness or reliability claim is made.

Project status remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
