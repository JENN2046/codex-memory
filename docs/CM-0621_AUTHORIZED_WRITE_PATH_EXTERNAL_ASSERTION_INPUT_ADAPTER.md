# CM-0621 Authorized Write-Path External Assertion Input Adapter

Status: COMPLETED_VALIDATED_NOT_READY
Decision: RC_NOT_READY_BLOCKED
Date: 2026-05-20

## Purpose

Turn the current governance-only helper path from fixture-only evaluation into explicit assertion-record evaluation for the external token-material layer.

This slice does not:

- prove token presence
- issue approval
- execute `CM-0601`
- authorize `CM-0595`
- call `record_memory`
- call `search_memory`
- bind token material
- start HTTP
- probe `/health`
- read `.jsonl`

Its scope is narrower:

- accept a `CM-0611`-style structured assertion record as explicit input
- map that record into the current `CM-0618` evaluator input
- optionally let the caller override the future rebound outcome class in a fail-closed way
- reduce the future operator step from “rewrite prose into fixture” to “supply assertion record”

## Implemented Local Artifacts

- `src/core/ExternalTokenMaterialAssertionRecordAdapter.js`
- `tests/fixtures/external-token-material-assertion-record-v1.json`
- `tests/external-token-material-assertion-record-adapter.test.js`
- updated `src/cli/authorized-write-path-auto-authorization.js`
- updated `tests/authorized-write-path-auto-authorization-cli.test.js`

## CLI Boundary

The direct-node helper CLI now supports:

```text
node .\src\cli\authorized-write-path-auto-authorization.js --json --assertion-record <path>
```

and, still read-only:

```text
node .\src\cli\authorized-write-path-auto-authorization.js --json --assertion-record <path> --latest-rebound-outcome-class token_present
```

Allowed rebound outcome overrides remain limited to:

- `token_missing`
- `stale_for_current_token_state`
- `token_present`

No runtime or widening execution flag is accepted.

## Current Result

Current default fixture-backed result still remains:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
external_token_assertion_not_accepted
```

The new capability is narrower:

- future operators may now supply an explicit `CM-0611`-style assertion record directly
- the helper can then evaluate whether that record is strong enough for `C6`
- if the record is malformed or too weak, the helper fails closed

## Validation

- `node --check .\src\core\ExternalTokenMaterialAssertionRecordAdapter.js`
- `node --check .\src\cli\authorized-write-path-auto-authorization.js`
- `node --test .\tests\external-token-material-assertion-record-adapter.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`

## Result

`CM-0621` moves the chain one step closer to usable automatic authorization without widening authority:

- external assertion input no longer has to be rewritten into the base fixture by hand
- `CM-0611 -> CM-0610 -> CM-0618` can now be exercised through one helper path
- the chain still stays read-only
- the chain still stays fail-closed
- the chain still remains `RC_NOT_READY_BLOCKED`
- `CM-0595` still remains outside automatic authorization
