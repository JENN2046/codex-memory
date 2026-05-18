# P66.25 ValidationAggregator Unsupported Source Fail-Closed Helper

Phase: `P66.25-validation-aggregator-unsupported-source-fail-closed-helper`

Mode: `A4.8 implementation + tests`

Risk: `A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Add a pure explicit-input helper for the P66.24 unsupported source fail-closed proof.

The helper evaluates caller-provided unsupported source metadata only. It does not read fixture files, read evidence files, execute commands, run gates or runners, start live HTTP MCP, call providers, scan real memory or runtime stores, write durable memory or audit records, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Helper

The helper is:

```text
src/core/ValidationAggregatorUnsupportedSourceFailClosedProofContract.js
```

It exports:

- `EXPECTED_SCHEMA_VERSION`
- `EXPECTED_POLICY_VERSION`
- `EXPECTED_MANIFEST_VERSION`
- `PUBLIC_MCP_TOOLS`
- `SUPPORTED_SOURCE_TYPES`
- `SUPPORTED_SOURCE_CLASSES`
- `REQUIRED_FAIL_CLOSED_CASES`
- `REQUIRED_FAIL_CLOSED_REASONS`
- `normalizeValidationAggregatorUnsupportedSourceFailClosedProofInput()`
- `evaluateValidationAggregatorUnsupportedSourceFailClosedProof()`

## Contract

The helper requires:

- exact schema, policy, and manifest versions
- exact public MCP tools: `record_memory`, `search_memory`, `memory_overview`
- exact supported source types:
  - `committed_fixture`
  - `committed_doc`
  - `local_validation_summary`
  - `static_report_shape`
- exact supported source classes:
  - `committed_evidence`
  - `local_validation`
- exact required fail-closed cases for unsupported type/class, unknown source kind, A5-gated runtime source claims, readiness overclaims, and unapproved A5 action claims
- low-risk summaries with no raw workspace IDs, secrets, or source payloads
- all no-touch safety flags false
- all runtime/final-RC/v1-RC/RC readiness claims false

## Fail-Closed Behavior

The helper fails closed for:

- malformed input
- schema/policy/manifest version drift
- public MCP tool drift
- supported source type/class drift
- missing, duplicate, or unknown fail-closed cases
- unsupported source accepted as valid
- unsupported source downgraded to static evidence
- A5-gated runtime source not blocked
- unsafe low-risk summaries
- unsafe no-touch safety flags
- sensitive fragments
- runtime/final-RC/v1-RC/RC readiness overclaims

## Boundaries

Still false:

- `validationAggregatorFullImplementationReady`
- `runtimeReady`
- `finalRcMatrixReady`
- `v1RcReady`
- `rcReady`

Still blocked:

- runtime evidence collector
- unsupported source acceptance or downgrade
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

## Validation

Required validation:

```text
node --check src\core\ValidationAggregatorUnsupportedSourceFailClosedProofContract.js
node --check tests\validation-aggregator-unsupported-source-fail-closed-proof-contract-helper.test.js
node --test tests\validation-aggregator-unsupported-source-fail-closed-proof-contract-helper.test.js
node --test tests\no-touch-boundary-regression.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `P66_25_UNSUPPORTED_SOURCE_FAIL_CLOSED_HELPER_ADDED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.26-validation-aggregator-unsupported-source-fail-closed-static-bridge
```

Chinese explanation: P66.26 should expose the P66.25 helper capability as static non-authoritative ValidationAggregator report evidence only. The aggregator must not import or execute the helper, read files, execute gates or runners, start services, call providers, write durable state, expand public MCP tools, or claim readiness.
