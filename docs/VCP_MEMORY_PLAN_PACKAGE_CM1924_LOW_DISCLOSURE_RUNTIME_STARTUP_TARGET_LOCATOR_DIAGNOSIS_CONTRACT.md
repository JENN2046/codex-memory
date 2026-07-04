# CM-1924 Low-Disclosure Runtime Startup Target Locator Diagnosis Contract

Status: `COMPLETED_VALIDATED_LOW_DISCLOSURE_RUNTIME_STARTUP_TARGET_LOCATOR_DIAGNOSIS_CONTRACT_NO_LIVE_CALL`

Date: 2026-07-04

## Scope

CM-1924 turns the CM-1923 runtime startup / target locator diagnosis preflight into a pure local code contract.

Added:

- `src/core/VcpNativeRuntimeStartupTargetLocatorDiagnosisContract.js`
- `tests/vcp-native-runtime-startup-target-locator-diagnosis-contract.test.js`

CM-1924 does not execute runtime, retry CM-1921, call VCPToolBox, inspect process state, disclose endpoint or locator values, read config/env, read secrets, read logs, read response bodies, read raw memory, write memory, mutate runtime binding, generate request bodies, generate approval lines, or claim readiness.

## Contract Input

The contract accepts a source-only diagnosis object with these low-disclosure lanes:

```yaml
required_lanes:
  - runtimeStartupState
  - targetLocatorBinding
  - transportWrapperShape
  - serviceListenerMismatch
  - approvalPacketGap
```

Accepted state remains intentionally non-live:

```yaml
accepted_state:
  runtimeStartupState:
    currentStatus: unknown
    processCountBucket: unknown
    runningOrNotRunningKnown: false
    requiresExactApproval: true
  targetLocatorBinding:
    currentStatus: unknown
    targetReferenceName: safe_reference_only
    locatorPresenceCategory: category_only
    locatorValueDisclosed: false
    endpointDisclosed: false
    requiresExactApproval: true
  transportWrapperShape:
    currentStatus: source_reviewed_live_unproven
    sourceOnlyWrapperPlanReview: true
    wrapperTypeCategory: vcp_native_no_write_no_body_leak_runtime_call_wrapper
    requestBodyGenerated: false
    responseBodyRead: false
  serviceListenerMismatch:
    currentStatus: unknown
    reachableKnown: false
    statusClassKnown: false
    endpointDisclosed: false
    requiresExactApproval: true
  approvalPacketGap:
    currentStatus: likely
    exactApprovalPacketNeeded: true
    exactApprovalRequiredBeforeNextLiveCall: true
    approvalLineGenerated: false
    requestBodyGenerated: false
    componentActionProbeIncluded: false
    readShapeIncluded: false
```

## Contract Output

Accepted output:

```yaml
diagnosis_result:
  accepted: true
  runtimeStartupStateKnown: false
  processCountBucketDisclosed: false
  targetLocatorBindingKnown: false
  locatorValueDisclosed: false
  endpointDisclosed: false
  transportWrapperShapeReviewed: true
  transportWrapperLiveProofKnown: false
  serviceListenerMismatchKnown: false
  approvalPacketGapKnown: true
  componentActionStatusProbeUnlocked: false
  readShapeUnlocked: false
  nextLiveDiagnosticRequiresExactApproval: true
nextAction: cm1925_prepare_exact_approval_request_for_startup_locator_diagnosis_after_cm1924
```

## Rejection Rules

The contract rejects without echoing submitted sensitive values when input contains:

- endpoint URL or endpoint-like field
- locator value
- config/env path or value
- token, secret, credential, key, or auth material
- PID, process identifier, command, or command line
- log, stdout, stderr, response body, request body, raw error payload, raw memory, raw store, or provider payload
- approval line or approval request body
- live reachability, process-state, listener-status, write, public MCP expansion, runtime binding mutation, or readiness drift
- nonzero or unknown side-effect counters

## Validation

Targeted tests cover:

- accepted low-disclosure contract shape
- category-only locator presence
- forbidden endpoint/locator/config/log/body/request/approval/process fields without echo
- live/process/listener/readiness drift rejection
- nonzero and unknown counter rejection
- unsafe target reference rejection without echo
- missing required lane field rejection
- unchanged public MCP surface

## Next Route

```text
next_task=CM-1925_exact_approval_request_for_startup_locator_diagnosis
live_required_for_cm1925=false
new_exact_approval_required_before_next_live_call=true
```

CM-1925 should prepare a non-authorizing exact approval request packet for one future startup/locator diagnosis. It must not execute runtime, call VCPToolBox, inspect process state, disclose endpoint/locator values, generate request bodies or approval lines, read logs/config/secrets/raw memory, write memory, or claim readiness.

## Explicit Non-Actions

CM-1924 did not:

- perform a new live call
- retry CM-1921
- call VCPToolBox
- inspect process state
- disclose endpoint URL or locator value
- read response body, raw error payload, logs, stdout, stderr, config/env, secrets, raw memory, raw stores, or raw audit rows
- generate or submit request bodies
- generate, expose, store, or submit approval lines
- write memory or durable runtime/audit state
- change config, startup, watchdog, dependencies, runtime binding, or public MCP schema
- push, tag, release, deploy, cut over, or claim readiness
