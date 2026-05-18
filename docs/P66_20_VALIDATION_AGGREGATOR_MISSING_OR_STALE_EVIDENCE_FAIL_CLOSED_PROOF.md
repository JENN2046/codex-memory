# P66.20 ValidationAggregator Missing Or Stale Evidence Fail-Closed Proof

Phase: `P66.20-validation-aggregator-missing-or-stale-evidence-fail-closed-proof`

Mode: `A4.8 docs/fixture/test only`

Risk: `A1-A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Define the local acceptance contract for `missing_or_stale_evidence_fail_closed_proof`.

This phase proves only that missing, stale, duplicate, or unknown required evidence remains blocked and fail-closed in fixture/test space. It does not implement a runtime evidence collector, read evidence files, implicitly refresh stale evidence, execute commands, run gates or runners, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, call providers, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Fixture Contract

The fixture is:

```text
tests/fixtures/p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-v1.json
```

The fixture locks:

- schema, policy, and manifest versions
- `validation_aggregator_full_implementation_incomplete` remains open
- public MCP tools remain `record_memory`, `search_memory`, and `memory_overview`
- `validate_memory` remains internal-only
- the eight required evidence groups from P66.4 remain exact and ordered
- missing required evidence fails closed without inference
- stale required evidence fails closed without implicit refresh
- duplicate required evidence fails closed
- unknown evidence groups fail closed
- low-risk summaries exclude raw workspace IDs, secrets, paths, service URLs, real memory content, durable store paths, and raw evidence payloads
- readiness claims remain forbidden

## Fail-Closed Cases

The local acceptance contract requires fail-closed behavior for:

```text
missing_required_evidence_group
stale_evidence_group
duplicate_evidence_group
unknown_evidence_group
unsupported_source_type
unsupported_source_class
readiness_claim_without_authority
runtime_execution_claim
service_start_claim
provider_call_claim
real_memory_scan_claim
durable_write_claim
public_mcp_expansion_claim
a5_action_without_approval
```

Missing, stale, duplicate, or unknown evidence must not be inferred into readiness.

## Boundaries

Still false:

- `validationAggregatorFullImplementation`
- `runtimeReady`
- `finalRcMatrixReady`
- `v1RcReady`
- `rcReady`

Still blocked:

- runtime evidence collector
- implicit evidence refresh
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

Required validation for this phase:

```text
node --check tests\p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-fixture.test.js
node --test tests\p66-validation-aggregator-missing-stale-evidence-fail-closed-proof-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `P66_20_MISSING_OR_STALE_EVIDENCE_FAIL_CLOSED_PROOF_ACCEPTANCE_DEFINED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.21-validation-aggregator-missing-or-stale-evidence-fail-closed-helper
```

Chinese explanation: P66.21 should add a pure explicit-input helper for caller-provided missing/stale evidence metadata. It must not read files, execute commands, start services, call providers, scan real memory/runtime stores, write durable state, expand public MCP tools, or claim readiness.
