# Native Read Response Shape Compatibility Report

Task: CM-2036

## Scope

CM-2036 adds a local-only native read response shape compatibility contract for
the default read-only native memory bridge tools:

- `search_memory`
- `memory_overview`
- `audit_memory`

The contract accepts only category-level response shape metadata that is already
low-disclosure:

- response shape category;
- top-level kind category;
- item-count bucket;
- byte-count bucket;
- projection kind.

It does not consume a native response body, inspect field names, read memory
content, bind endpoint or locator values, call VCPToolBox, start services, read
real/private memory, or perform native read execution.

## Implementation

Added:

- `src/core/NativeReadResponseShapeCompatibilityContract.js`
- `tests/native-read-response-shape-compatibility-contract.test.js`

Integrated:

- `nativeReadResponseShapeCompatibilityPassed` is now required Phase 2
  completion-audit evidence.
- The evidence trace matrix treats
  `nativeReadResponseShapeCompatibilityPassed` as `local_contract` evidence
  from this report.

## Accepted Local Contract

The accepted local contract proves only:

- all required read-only tool shapes are represented;
- each shape is scoped to the default read-only surface;
- each shape uses bounded/category-only projection metadata;
- field names, memory content, endpoint values, locator values, request bodies,
  response bodies, raw output, secrets, approval-line material, and readiness
  claims are rejected by path only;
- runtime, live VCPToolBox, native read, shape inspection, real-memory read,
  raw-private read, provider/API, native write, durable mutation, public MCP
  expansion, release/deploy/cutover, and readiness counters must all remain
  zero.

## Non-Claims

CM-2036 does not prove:

- native target binding;
- native read proof;
- fallback distinction;
- low-disclosure native receipt;
- audit receipt;
- WSL/Linux proof;
- Windows/WSL smoke proof;
- Phase 2 completion;
- live runtime behavior;
- production, release, deploy, cutover, RC, or full plan-pack readiness.

The exact-authorized Phase 2 receipt-backed fields remain separate and cannot
be satisfied by this local contract.

## Validation

Focused validation:

```text
node --check src/core/NativeReadResponseShapeCompatibilityContract.js
node --check tests/native-read-response-shape-compatibility-contract.test.js
node --check src/core/NearModelMemoryPlanPackCompletionAudit.js
node --test tests/native-read-response-shape-compatibility-contract.test.js tests/near-model-memory-plan-pack-completion-audit.test.js tests/near-model-memory-plan-pack-evidence-trace-matrix.test.js
```

The focused test set passed `29/29`.

## Next Gate

Continue Phase 2 with separate exact-authorized low-disclosure native target
binding, native read proof, fallback/audit/scope visibility, WSL/Linux, and
Windows/WSL smoke evidence before any receipt application, completion-audit
patch, Phase 2 completion, or readiness claim.
