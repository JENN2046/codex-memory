# CM-1919 Runtime Target Diagnosis Contract

Status: `COMPLETED_VALIDATED_RUNTIME_TARGET_DIAGNOSIS_CONTRACT_NO_RUNTIME_NO_LIVE_CALL_NO_RAW_OUTPUT`

Date: 2026-07-04

## Scope

CM-1919 turns the CM-1918 runtime target diagnosis matrix into a machine-verifiable local contract.

CM-1919 does not perform live calls, retry CM-1916, call VCPToolBox, inspect live process state, read endpoint URLs, read locator values, read config/env, read secrets, read logs, read response bodies, read raw memory, write memory, generate request bodies, generate approval lines, or claim readiness.

## Contract

Source:

```text
src/core/VcpNativeRuntimeTargetDiagnosisContract.js
```

Tests:

```text
tests/vcp-native-runtime-target-diagnosis-contract.test.js
```

The contract accepts a low-disclosure diagnosis object and returns:

```text
diagnosis_result.accepted=true
diagnosis_result.targetReferenceKnown=true
diagnosis_result.locatorValueDisclosed=false
diagnosis_result.endpointDisclosed=false
diagnosis_result.transportReachabilityKnown=false
diagnosis_result.runtimeProcessStateKnown=false
diagnosis_result.componentActionMappingKnown=true_or_false
diagnosis_result.nextLiveDiagnosticRequiresExactApproval=true
```

## Allowed Evidence

CM-1919 allows only source-only, low-disclosure evidence categories:

- `targetReferenceName`
- `referencePresent`
- `locatorHashPresent`
- `locatorValueDisclosed=false`
- `endpointDisclosed=false`
- `transportReachabilityKnown=false`
- `runtimeProcessStateKnown=false`
- `componentKnown`
- `actionKnown`
- source or manifest alias mapping category
- harness plan validity
- zero no-write, body, and response-body budgets
- zero side-effect counters

## Forbidden Material

CM-1919 rejects and does not echo:

- endpoint URLs
- raw locator values
- config/env paths or values
- secrets, tokens, credentials, keys, or auth material
- stdout, stderr, logs, raw logs, or process output
- command lines
- request bodies or provider payloads
- response bodies, raw payloads, or raw error payloads
- raw plugin config
- private memory content, raw memory text, or memory IDs
- approval lines or approval request bodies
- live runtime, network, or process-inspection claims
- write, durable write, public MCP expansion, readiness, release, deploy, or cutover claims

## Acceptance Boundary

Accepted CM-1919 output means only:

```text
source_only_diagnosis_contract_locked=true
next_live_diagnostic_requires_exact_approval=true
```

It does not mean:

```text
transport_reachable=not_proven
runtime_process_running=not_proven
component_action_reachable=not_proven
read_shape_known=false
memory_recall_works=not_proven
release_ready=false
```

## Next Route

If CM-1919 validates, continue to CM-1920:

```text
CM-1920 exact approval packet for one transport diagnosis
```

CM-1920 should prepare a non-executing request packet only. Any actual transport diagnosis requires fresh Jenn exact approval because CM-1916 consumed the previous live/network budget.
