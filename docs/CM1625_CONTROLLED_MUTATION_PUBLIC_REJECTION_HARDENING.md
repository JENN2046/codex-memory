# CM-1625 Controlled Mutation Public Rejection Hardening

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_CONTROLLED_MUTATION_PUBLIC_REJECTION_HARDENING_NO_MUTATION`

## Scope

This slice continues the 2026-06-11 full-repository audit follow-up for controlled mutation public wrappers.

It adds local regression coverage for the remaining P2-1 public rejection cases:

- authenticated public `validate_memory` with `dry_run=false`
- authenticated public `validate_memory` with `confirm=true`
- authenticated public `tombstone_memory` with `dry_run=false`
- authenticated public `tombstone_memory` with `confirm=true`
- authenticated public `supersede_memory` with `dry_run=false`
- authenticated public `supersede_memory` with `confirm=true`

The goal is to prove the public wrapper rejects confirmed-mutation-shaped requests before service mutation, while keeping the existing internal mutation path separately gated.

## Evidence

Updated tests:

- `tests/validate-memory-runtime-entry.test.js`
- `tests/tombstone-memory-runtime-entry.test.js`
- `tests/supersede-memory-runtime-entry.test.js`

Validation:

```text
node --test tests\validate-memory-runtime-entry.test.js tests\tombstone-memory-runtime-entry.test.js tests\supersede-memory-runtime-entry.test.js
```

Result:

```text
21/21 passed
```

The added public rejection tests assert:

- public decision remains `rejected`
- public projection remains low-disclosure
- returned `dryRun` stays `true`
- returned `mutated` stays `false`
- `confirmGate.confirmedMutationAllowed` stays `false`
- `dry_run=false` is visible only as `confirmGate.dryRunRequested=false`
- `confirm=true` is visible only as `confirmGate.confirmRequested=true`
- lifecycle rows remain unchanged
- mutation audit entries remain empty

Existing tests in the same files continue to cover:

- internal runtime entry is disabled by default
- enabled internal mutation rejects missing approved execution context
- enabled and approved internal mutation can mutate temp SQLite fixtures
- public MCP registration remains bounded to the seven expected tools

## Non-Claims

This slice did not run live MCP traffic, HTTP runtime, provider/API calls, bearer-token flows, real memory reads or writes, raw audit/store scans, broad memory scans, confirmed public mutation, dependency changes, public MCP expansion, release/tag/deploy, production readiness, release readiness, cutover readiness, or complete V8.

The passing tests use temp-local SQLite fixtures only. They do not prove production mutation authorization, production write reliability, or public confirmed mutation readiness.
