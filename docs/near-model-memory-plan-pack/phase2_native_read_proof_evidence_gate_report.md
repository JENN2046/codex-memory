# Phase 2 Native Read Proof Evidence Gate Report

Task id: `CM-2019`
Validation id: `CMV-2120`
Date: `2026-07-10`

## Result

`CM-2019` adds a local Phase 2 evidence gate for read-only realtime native
memory proof.

The gate accepts receipt-only, low-disclosure evidence for:

- default read-only surface;
- hidden tools hard reject;
- native target binding;
- native read proof;
- fallback distinction;
- low-disclosure proof;
- audit receipt;
- scope / visibility isolation;
- WSL/Linux proof;
- Windows/WSL smoke.

This is not a live native read proof. It does not start services, call
VCPToolBox, inspect process state, read real memory, read raw private state,
call providers, mutate durable state, expand public MCP, or claim readiness.

## Added Contract

Source:

```text
src/core/Phase2NativeReadProofEvidenceGate.js
```

Test:

```text
tests/phase2-native-read-proof-evidence-gate.test.js
```

## Default Surface Boundary

The evidence gate requires the read-only bridge tools:

```text
search_memory
memory_overview
audit_memory
```

It allows the later safe default context/proposal tools to coexist:

```text
prepare_memory_context
propose_memory_delta
```

It stops L4 if default public surface evidence includes mutation, destructive,
or commit tools:

```text
record_memory
validate_memory
tombstone_memory
supersede_memory
commit_memory_delta
```

## Current Evidence Status

Current local source/test evidence proves only that the Phase 2 evidence gate is
implemented and fail-closed.

The following Phase 2 completion evidence remains missing at the current route
boundary:

```text
nativeTargetBindingPassed
nativeReadProofPassed
wslLinuxProofPassed
windowsWslSmokePassed
```

Those gaps require a separate exact-authorized low-disclosure native read proof
receipt. CM-2019 does not run `governed-vcp-native-live-read-proof`, does not
run `run-vcp-native-prod-proof-wsl-newapi.sh`, and does not call a live native
runtime.

## Stop Boundary

The gate stops L4 if input requests or claims:

- live read execution by this evidence gate;
- native runtime or VCPToolBox runtime calls;
- service start/stop;
- process-state inspection;
- real memory scans;
- raw private memory reads;
- provider/API calls;
- runtime/native write execution;
- durable mutation;
- public MCP expansion;
- tag/release/deploy/cutover;
- readiness.

It also rejects raw, secret, credential, endpoint, locator, request-body,
response-body, approval-line, provider-payload, runtime-payload, memory-content,
and query-text shaped fields by path only, without echoing values.

## Validation

Targeted validation completed:

```text
node --check src/core/Phase2NativeReadProofEvidenceGate.js
node --test tests/phase2-native-read-proof-evidence-gate.test.js
```

Covered paths:

- accepts complete receipt-only Phase 2 evidence with the current safe default
  read/context/proposal tool surface;
- reports current missing live proof evidence without claiming Phase 2
  completion;
- requires the read-only bridge tools even when later safe context tools exist;
- stops L4 when mutation or commit tools appear in default surface evidence;
- stops L4 for requests to run live runtime proof inside the evidence gate;
- rejects raw/private/locator-shaped evidence by path only without value echo.

## Next Gate

Collect a separate exact-authorized, low-disclosure native read receipt before
marking Phase 2 complete in the full plan-pack completion audit. The next receipt
must still avoid raw private memory, endpoint/locator disclosure, provider
payload disclosure, and readiness claims.
