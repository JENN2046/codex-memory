# CM-1928 Startup Locator Diagnosis Receipt-Capture Hardening Contract

## Purpose

CM-1928 hardens the receipt-capture boundary after CM-1926 ended with
`receipt_capture_error_after_single_approved_attempt`.

The goal is not to retry CM-1926 and not to establish live runtime facts. The
goal is to make the receipt projection deterministic before any future
startup / locator live diagnostic is requested again.

## Inputs

CM-1928 accepts only a local injected outcome object for:

- `targetReferenceName`
- `purpose`
- `outcomeCategory`
- `durationBucket`
- `processCountBucket`
- `transportWrapperShapeCategory`
- zero-read / zero-write flags
- zero side-effect counters

Allowed outcome categories:

```text
connect_success
transport_error
timeout
receipt_capture_error
```

The input is local contract material only. It is not a runtime execution
receipt, not an approval request, and not a request body.

## Low-Disclosure Receipt Projection

The contract projects only:

- `targetReferenceName`
- `purpose`
- `statusCategory`
- `runtimeStartupStateCategory`
- `targetLocatorBindingCategory`
- `serviceListenerStatusCategory`
- `statusClass`
- `processCountBucket`
- `transportWrapperShapeCategory`
- `durationBucket`
- `zeroWriteCounters`
- explicit false read/write/disclosure flags

It deliberately keeps these facts unproven:

- runtime startup state
- live process count
- target locator binding success
- service listener reachability
- component/action status probe
- read-shape route support

Even an injected `connect_success` category remains local contract material; it
does not create a live runtime fact.

## Forbidden Material

CM-1928 rejects forbidden receipt-capture material without echoing unsafe
values, including:

- endpoint or URL values
- raw locator values
- config/env values or paths
- tokens, credentials, keys, or secrets
- request bodies or provider payloads
- response bodies or raw error payloads
- stdout/stderr/log content
- raw memory text, memory ids, raw stores, or raw audit rows
- approval line material
- process ids or command lines

## Side Effects

CM-1928 performs no live side effects:

```yaml
runtimeExecuted: false
liveVcpToolBoxCalled: false
networkCalled: false
liveProcessInspected: false
requestBodyGenerated: false
approvalLineGenerated: false
responseBodyRead: false
rawErrorPayloadRead: false
logRead: false
stdoutStderrRead: false
configEnvRead: false
secretRead: false
endpointDisclosed: false
locatorValueDisclosed: false
memoryReadPerformed: false
memoryWritten: false
durableWritePerformed: false
providerApiCalled: false
runtimeBindingChanged: false
publicMcpExpanded: false
readinessClaimed: false
```

## Implementation

CM-1928 adds:

- `src/core/VcpNativeStartupLocatorDiagnosisReceiptCaptureContract.js`
- `tests/vcp-native-startup-locator-diagnosis-receipt-capture-contract.test.js`

The tests verify:

- deterministic receipt capture for `receipt_capture_error`
- deterministic category mapping for `connect_success`, `transport_error`,
  and `timeout`
- no live/runtime/network/process side-effect flags
- rejection of forbidden raw material without echo
- rejection of policy drift toward raw body/log/endpoint/locator/write claims
- rejection of unknown fields and nonzero counters
- unchanged public MCP tool surface

## Route Decision

CM-1928 supports only this next route:

```text
CM-1929 receipt-capture hardening closeout / future live request route decision
```

CM-1928 does not authorize CM-1929 to execute runtime and does not authorize a
new live attempt. Any future live startup / locator diagnostic still requires a
new Jenn exact approval packet and current explicit approval.

## Non-Goals

CM-1928 does not:

- retry CM-1926
- perform a live call
- call VCPToolBox
- inspect process state
- resolve or disclose endpoint / locator values
- read config, env, secrets, logs, stdout, stderr, response bodies, raw error
  payloads, raw memory, raw stores, or raw audit rows
- generate request bodies
- generate, expose, submit, or store approval lines
- write memory or durable state
- change config/startup/watchdog/dependencies/runtime binding
- expand public MCP tools
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, complete V8, or full bridge completion
