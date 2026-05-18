# P66.21 ValidationAggregator Missing Or Stale Evidence Fail-Closed Helper

Phase: `P66.21-validation-aggregator-missing-or-stale-evidence-fail-closed-helper`

Mode: `A4.8 pure explicit-input helper`

Risk: `A2`

Decision: `NOT_READY_BLOCKED`

## Purpose

Add a pure explicit-input helper for `missing_or_stale_evidence_fail_closed_proof`.

The helper accepts caller-provided metadata only. It evaluates required evidence group exactness, missing groups, stale groups, duplicate groups, unknown groups, low-risk summary safety, no-touch safety flags, public MCP freeze, and readiness overclaims.

It does not read evidence files, scan directories, execute commands, run gates or runners, start live HTTP MCP, scan real memory or runtime stores, write durable memory or audit records, call providers, mutate config, apply migration/import-export, expand public MCP tools, push, tag, release, deploy, cut over, or claim `RC_READY`.

## Helper

The helper is:

```text
src/core/ValidationAggregatorMissingStaleEvidenceFailClosedProofContract.js
```

It exports:

```text
EXPECTED_SCHEMA_VERSION
EXPECTED_POLICY_VERSION
EXPECTED_MANIFEST_VERSION
PUBLIC_MCP_TOOLS
REQUIRED_EVIDENCE_GROUPS
REQUIRED_FAIL_CLOSED_REASONS
normalizeValidationAggregatorMissingStaleEvidenceFailClosedProofInput()
evaluateValidationAggregatorMissingStaleEvidenceFailClosedProof()
```

## Covered Fail-Closed Reasons

The helper fails closed for:

```text
malformed_input
schema_version_mismatch
policy_version_mismatch
manifest_version_mismatch
public_mcp_tools_drift
missing_required_evidence_group
stale_evidence_group
duplicate_evidence_group
unknown_evidence_group
unsafe_low_risk_summary
unsafe_safety_flag
sensitive_fragment_rejected
readiness_overclaim
```

## Boundaries

Still false:

- `validationAggregatorFullImplementationReady`
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
node --check src\core\ValidationAggregatorMissingStaleEvidenceFailClosedProofContract.js
node --check tests\validation-aggregator-missing-stale-evidence-fail-closed-proof-contract-helper.test.js
node --test tests\validation-aggregator-missing-stale-evidence-fail-closed-proof-contract-helper.test.js
node --test tests\no-touch-boundary-regression.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `P66_21_MISSING_OR_STALE_EVIDENCE_FAIL_CLOSED_HELPER_ADDED_RUNTIME_STILL_BLOCKED`

Decision: `NOT_READY_BLOCKED`

Next recommended phase:

```text
P66.22-validation-aggregator-missing-or-stale-evidence-fail-closed-static-bridge
```

Chinese explanation: P66.22 should expose this helper capability as static, non-authoritative ValidationAggregator report evidence only. ValidationAggregator must not import or execute the helper, read files, execute commands, start services, call providers, write durable state, expand public MCP tools, or claim readiness.
