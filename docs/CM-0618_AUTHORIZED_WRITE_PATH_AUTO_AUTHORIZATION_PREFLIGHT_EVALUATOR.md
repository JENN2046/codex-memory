# CM-0618 Authorized Write-Path Auto-Authorization Preflight Evaluator

Status: COMPLETED_VALIDATED
Decision: GOVERNANCE_ONLY_AUTO_AUTHORIZATION_EVALUATOR_ADDED_NOT_ADOPTED
Date: 2026-05-20
Controlling state: RC_NOT_READY_BLOCKED
Target baseline: 017eda4930c5add4b824c162c46868f75c91ea0f

## Purpose

Turn the current docs-defined automatic-authorization chain into a small executable, explicit-input, fail-closed evaluator without executing any runtime action.

This slice does not:

- issue approval by itself
- execute `CM-0601`
- authorize `CM-0595`
- authorize `record_memory`
- check real token presence
- start HTTP
- bind token material

Its scope is narrower:

- evaluate the `CM-0608` checklist as machine-readable input
- map the result into the `CM-0605` governance outputs
- keep the chain fail-closed if scope drifts, assertions are weak, or the outcome class is unsupported

## Added Local Artifacts

- `src/core/AuthorizedWritePathAutoAuthorizationPreflight.js`
- `src/cli/authorized-write-path-auto-authorization.js`
- `tests/fixtures/authorized-write-path-auto-authorization-preflight-v1.json`
- `tests/authorized-write-path-auto-authorization-preflight.test.js`
- `tests/authorized-write-path-auto-authorization-cli.test.js`

## Evaluator Contract

The helper consumes explicit input only and produces only these governance outputs:

1. `NO_AUTO_APPROVAL_ISSUED`
2. `AUTO_REUSE_CM0601_LINE_ONLY`
3. `ESCALATE_FOR_FUTURE_WIDENING_REVIEW`

It never outputs automatic authorization for:

- `CM-0595`
- `record_memory`
- `search_memory`
- provider calls
- config mutation
- startup persistence
- public MCP expansion
- durable write
- readiness claim

## Current Built-In Fixture Reading

The default fixture reflects the current real chain posture:

- controlling map = `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- controlling state = `RC_NOT_READY_BLOCKED`
- target baseline = `017eda4930c5add4b824c162c46868f75c91ea0f`
- same-baseline endpoint/startup evidence = present through `CM-0592`
- latest rebound evidence = `CM-0603`
- latest rebound outcome class = `token_missing`
- external assertion = not accepted

So the current default evaluator output remains:

```text
NO_AUTO_APPROVAL_ISSUED
RC_NOT_READY_BLOCKED
```

because `C6` still fails.

## CLI Boundary

The direct-node CLI is:

```text
node .\src\cli\authorized-write-path-auto-authorization.js --json
```

It evaluates fixture-backed explicit input only.

It rejects runtime- or widening-like flags such as:

- `--execute`
- `--record-memory`
- `--search-memory`
- `--provider`
- `--start-service`
- `--write`
- `--apply`
- `--cm0595`

## Validation

- `node --check .\src\core\AuthorizedWritePathAutoAuthorizationPreflight.js`
- `node --check .\src\cli\authorized-write-path-auto-authorization.js`
- `node --test .\tests\authorized-write-path-auto-authorization-preflight.test.js`
- `node --test .\tests\authorized-write-path-auto-authorization-cli.test.js`
- `npm test`

## Safety Posture

The helper remains governance-only:

- no file reads in the helper
- no command execution in the helper
- no service start
- no provider call
- no real memory read
- no runtime-store scan
- no durable write
- no public MCP expansion
- no readiness claim

## Conclusion

`CM-0618` moves this chain from prose-only governance toward executable governance, but only at the preflight layer.

The runtime fact does not change:

- `CM-0603` is still the latest controlling rebound evidence
- token material is still not proven present in the current session
- the chain remains `RC_NOT_READY_BLOCKED`
- `CM-0595` remains outside automatic authorization
