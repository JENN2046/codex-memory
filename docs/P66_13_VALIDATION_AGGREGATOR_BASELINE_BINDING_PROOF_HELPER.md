# P66.13 ValidationAggregator Baseline Binding Proof Helper

Phase: `P66.13-validation-aggregator-baseline-binding-proof-helper`

Mode: `A4.8 pure helper + tests`

Risk: `A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Add a pure explicit-input helper for the P66.12 baseline binding proof contract.

The helper evaluates caller-provided baseline binding objects only. It does not run Git checkout/reset/detach, perform remote baseline lookup, read evidence files, execute commands, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Added Helper

File:

```text
src/core/ValidationAggregatorBaselineBindingProofContract.js
```

Exports:

- `evaluateValidationAggregatorBaselineBindingProof()`
- `normalizeValidationAggregatorBaselineBindingProofInput()`
- schema/policy/manifest constants
- public MCP freeze constants
- baseline kind constants
- required baseline binding field constants

## Helper Rules

The helper accepts only explicit caller-provided input.

It requires:

- exact schema / policy / manifest versions
- public MCP tools exactly `record_memory`, `search_memory`, `memory_overview`
- explicit expected target commit
- at least one baseline binding
- required baseline binding fields
- target commit equal to evidence subject commit
- target commit equal to expected target commit
- supported baseline kind
- UTC ISO-8601 binding timestamp
- `binding_status=bound`
- safe low-risk summary flags
- no-touch Git and runtime safety flags
- no readiness overclaims

It fails closed for:

- malformed input
- version drift
- public MCP drift
- missing expected target commit
- missing baseline bindings
- missing required fields
- duplicate binding ids
- missing or malformed commit hashes
- target/evidence/expected commit mismatch
- approval request commit used as target by default
- current main head used as target by default
- temporary gate checkout missing execution checkout commit
- temporary gate checkout commit mismatch
- ambiguous baseline roles
- unknown baseline kind
- non-UTC binding timestamp
- non-bound binding status
- unsafe summary claims
- unsafe Git/runtime side-effect claims
- readiness overclaims

## Validation

Expected local validation:

```text
node --check src\core\ValidationAggregatorBaselineBindingProofContract.js
node --check tests\validation-aggregator-baseline-binding-proof-contract-helper.test.js
node --test tests\validation-aggregator-baseline-binding-proof-contract-helper.test.js
node --test tests\no-touch-boundary-regression.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Boundary Confirmation

P66.13 does not close the full ValidationAggregator implementation gap.

Still false:

- `validationAggregatorFullImplementationReady`
- `runtimeReady`
- `finalRcMatrixReady`
- `v1RcReady`
- `rcReady`

Still blocked:

- runtime baseline collector
- Git checkout/reset/detach
- remote baseline lookup
- evidence file reads
- command/gate/runner execution
- live HTTP operation
- provider calls
- real memory/runtime-store scans
- durable memory/audit writes
- migration/import-export/backup/restore apply
- public MCP expansion
- push/tag/release/deploy
- config/startup/watchdog mutation
- `RC_READY`

## Result

Result: `P66_13_BASELINE_BINDING_PROOF_HELPER_ADDED_RUNTIME_STILL_BLOCKED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.14-validation-aggregator-baseline-binding-static-bridge
```

Chinese explanation: P66.14 can expose the helper capability as static non-authoritative ValidationAggregator report evidence. It must not import or execute the helper, checkout/reset/detach, run remote lookup, read files, execute commands, start services, call providers, scan real memory, write durable state, or claim readiness.
