# CM-1268 Proof Memory Payload Marker Precedence

Date: 2026-06-01

## Purpose

Preserve explicit proof-memory payload markers when `record_memory` also receives an ordinary execution-context-derived visibility or retention policy.

## Change

- Updated `ProofMemoryPolicy.isExplicitProofMemoryPayload(...)` to evaluate payload proof markers and normalized/effective scope signals independently.
- Added direct proof-policy coverage proving payload `visibility=internal_proof` still applies when normalized visibility is `project`.
- Added write-service integration coverage proving a context-derived ordinary scope does not mask explicit payload proof memory.

## Boundary

- Local source/test/docs/status hardening only.
- No public MCP tool expansion.
- No provider call.
- No MCP external call.
- No real-memory scan.
- No durable memory/audit write outside test fixtures.
- No config, watchdog, or startup change.
- No push, PR, tag, release, deploy, cutover, readiness, write reliability, or recall reliability claim.

## Validation

Validated with:

```powershell
node --check src\core\ProofMemoryPolicy.js
node --check tests\proof-memory-policy.test.js
node --check tests\memory-write-preflight-runtime-integration.test.js
node --test tests\proof-memory-policy.test.js
node --test tests\memory-write-preflight-runtime-integration.test.js
npm test
git diff --check
node .\scripts\validate_autopilot_ledger_consistency.js
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

`npm test` passed `2790/2790`.

## Status

`COMPLETED_VALIDATED_NOT_READY`. This closes a local proof-memory write-governance edge without changing the project posture: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.
