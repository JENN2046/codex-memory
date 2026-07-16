# Native Read Receipt Schema Compatibility Report

Task: CM-2037

## Scope

CM-2037 adds a local-only Phase 2 native read receipt schema compatibility
contract. It maps the existing low-disclosure
`VcpNativeReadOnlyExecutionReceipt` schema against the Phase 2 receipt-bundle
categories without consuming runtime receipt instances or native response
bodies.

The contract accepts only schema-level facts:

- the existing readonly execution receipt contract name and mode;
- the locked receipt output-field allowlist;
- the zero-write counter field list;
- exclusion flags for raw bodies, response bodies, memory content, endpoint /
  locator values, and approval-line material;
- category-compatibility markers that distinguish schema-compatible receipt
  candidates from separate exact receipt requirements.

## Implementation

Added:

- `src/core/Phase2NativeReadProofReceiptSchemaCompatibilityContract.js`
- `tests/phase2-native-read-proof-receipt-schema-compatibility-contract.test.js`

Integrated:

- `nativeReadReceiptSchemaCompatibilityPassed` is now required Phase 2
  completion-audit evidence.
- The evidence trace matrix treats
  `nativeReadReceiptSchemaCompatibilityPassed` as `local_contract` evidence
  from this report.

## Accepted Local Contract

The accepted local contract proves only that the existing readonly execution
receipt schema is compatible with future exact-authorized evidence for:

- native read attempt receipt;
- native read success receipt;
- low-disclosure receipt.

It also proves that the following Phase 2 receipt categories still require
separate exact-authorized receipts:

- native target binding receipt;
- audit receipt;
- fallback distinction receipt;
- WSL/Linux receipt;
- Windows/WSL smoke receipt.

The compatibility status is
`partial_compatible_requires_separate_exact_receipts`.

## Non-Claims

CM-2037 does not:

- collect or apply actual receipts;
- accept approval;
- generate, store, disclose, or submit approval-line material;
- call VCPToolBox or runtime surfaces;
- execute native reads;
- read real or private memory;
- inspect native response bodies;
- apply a completion-audit patch;
- mark Phase 2 complete;
- claim production, release, deploy, cutover, RC, or full plan-pack readiness.

The exact-authorized Phase 2 receipt-backed fields remain separate and cannot
be satisfied by this local schema compatibility contract.

## Validation

Focused validation:

```text
node --check src/core/Phase2NativeReadProofReceiptSchemaCompatibilityContract.js
node --check tests/phase2-native-read-proof-receipt-schema-compatibility-contract.test.js
node --check src/core/NearModelMemoryPlanPackCompletionAudit.js
node --check src/core/NearModelMemoryPlanPackEvidenceTraceMatrix.js
node --check tests/near-model-memory-plan-pack-completion-audit.test.js
node --check tests/near-model-memory-plan-pack-evidence-trace-matrix.test.js
node --test tests/phase2-native-read-proof-receipt-schema-compatibility-contract.test.js tests/near-model-memory-plan-pack-completion-audit.test.js tests/near-model-memory-plan-pack-evidence-trace-matrix.test.js
node --test tests/vcp-native-readonly-execution-receipt.test.js tests/vcp-native-readonly-proof-execution-harness.test.js tests/vcp-native-readonly-proof-path-gate.test.js tests/phase2-native-read-proof-receipt-bundle-contract.test.js tests/phase2-native-read-proof-receipt-audit-intake-contract.test.js tests/phase2-native-read-proof-receipt-application-patch-preflight-contract.test.js tests/phase2-native-read-proof-receipt-schema-compatibility-contract.test.js tests/native-read-response-shape-compatibility-contract.test.js tests/near-model-memory-plan-pack-completion-audit.test.js tests/near-model-memory-plan-pack-evidence-trace-matrix.test.js
```

The focused receipt-schema-compatibility/completion/trace test set passed
`31/31`. The adjacent Phase 2 / readonly receipt / completion / trace test set
passed `85/85`.

## Next Gate

Continue Phase 2 with separate exact-authorized low-disclosure native target
binding, native read proof, fallback/audit/scope visibility, WSL/Linux, and
Windows/WSL smoke evidence before any receipt application, completion-audit
patch, Phase 2 completion, or readiness claim.
