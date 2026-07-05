# CM-1930 Startup Locator Diagnosis Exact Approval Request Packet Refresh

Status: `COMPLETED_VALIDATED_STARTUP_LOCATOR_DIAGNOSIS_EXACT_APPROVAL_REQUEST_PACKET_REFRESH_NON_EXECUTING_NO_APPROVAL_LINE`

Date: 2026-07-05

## Scope

CM-1930 refreshes the non-authorizing exact approval request packet for one
future startup / locator diagnosis attempt after CM-1928 hardened receipt
capture and CM-1929 closed that hardening slice.

This packet is not authorization. It does not grant approval, generate an
approval line, generate a request body, execute runtime, call VCPToolBox,
inspect process state, resolve or disclose an endpoint or locator value, read
config/env, read secrets, read logs, read response bodies, read raw memory,
write memory, change configuration, or claim readiness.

## Approval Request Boundary

Jenn exact approval is required before any future startup / locator diagnosis
live execution.

```yaml
approval_request:
  purpose: runtime_startup_or_target_locator_diagnosis
  target_reference_name: operator-vcp-toolbox-service-ref
  diagnostic_lanes:
    - runtime_startup_state
    - target_locator_binding
    - transport_wrapper_shape
    - service_listener_mismatch
    - receipt_capture_contract
  required_pre_live_contract:
    task: CM-1928
    contract: VcpNativeStartupLocatorDiagnosisReceiptCaptureContract
    receipt_capture_deterministic_for_injected_outcomes: true
  max_network_calls: 1
  max_runtime_calls: 1
  max_process_state_inspections: 1
  request_body_generation: false
  response_body_byte_budget: 0
  raw_error_payload_budget: 0
  log_read_budget: 0
  stdout_stderr_read: false
  config_env_read: false
  secret_read: false
  memory_read: false
  memory_write: false
  durable_write: false
  endpoint_disclosure: false
  locator_value_disclosure: false
  provider_api_call: false
  public_mcp_expansion: false
  release_deploy_cutover_push: false
  readiness_claim: false
  output_projection:
    - targetReferenceName
    - purpose
    - statusCategory
    - runtimeStartupStateCategory
    - processCountBucket
    - targetLocatorBindingCategory
    - transportWrapperShapeCategory
    - serviceListenerStatusCategory
    - statusClass
    - durationBucket
    - zeroWriteCounters
    - receiptCaptureStatus
```

The target remains a safe reference name only. CM-1930 does not resolve the
reference to a locator, disclose endpoint URL, read config/env, or prove the
target is reachable.

## Required Jenn Exact Approval Fields

A future approval must explicitly cover:

- `purpose=runtime_startup_or_target_locator_diagnosis`
- target reference name
- diagnostic lanes
- CM-1928 receipt-capture contract as a required pre-live boundary
- max network call count
- max runtime call count
- max process-state inspection count
- zero response-body budget
- zero raw-error-payload budget
- zero log-read budget
- no stdout/stderr read
- no request-body generation
- no config/env read
- no secret read
- no memory read
- no memory write
- no durable write
- no endpoint disclosure
- no locator value disclosure
- no provider/API call
- allowed output projection
- stop conditions

Jenn approval must be current, exact, and narrower than or equal to this
packet. A broad approval, stale approval, inferred approval, or approval that
adds read/write/runtime expansion is not valid for the future live attempt.

## Forbidden Under This Packet

This request packet does not permit:

- component/action read proof
- read-shape proof
- response body read or persistence
- raw error payload read or persistence
- endpoint URL disclosure
- locator value disclosure
- config/env path or value read
- secret, token, credential, key, or auth material read
- runtime logs, stdout, stderr, or process output read
- PID, process identifier, command, or command-line disclosure
- raw memory, private memory content, raw store, or raw audit row read
- request body generation or submission
- approval line generation, exposure, storage, or submission
- memory write
- durable write
- provider/API call
- public MCP expansion
- runtime binding mutation
- config, startup, or watchdog mutation
- release, deploy, cutover, push, or readiness claim

## Allowed Future Receipt Projection

If Jenn later approves a future startup / locator diagnosis, the execution
receipt may record only:

```yaml
future_receipt_allowed:
  - targetReferenceName
  - purpose
  - statusCategory
  - runtimeStartupStateCategory
  - processCountBucket
  - targetLocatorBindingCategory
  - transportWrapperShapeCategory
  - serviceListenerStatusCategory
  - statusClass
  - durationBucket
  - receiptCaptureStatus
  - zeroWriteCounters
  - responseBodyRead=false
  - rawErrorPayloadRead=false
  - logRead=false
  - stdoutStderrRead=false
  - configEnvRead=false
  - secretRead=false
  - endpointDisclosed=false
  - locatorValueDisclosed=false
  - memoryRead=false
  - memoryWritten=false
```

Allowed bucket vocabulary:

```yaml
processCountBucket:
  - not_checked
  - zero
  - one
  - multiple
  - unknown
runtimeStartupStateCategory:
  - not_running
  - maybe_running
  - running_bucket_only
  - unknown
targetLocatorBindingCategory:
  - safe_reference_known
  - safe_reference_unbound
  - binding_category_only
  - unknown
serviceListenerStatusCategory:
  - not_checked
  - reachable
  - not_reachable
  - timeout
  - unknown
receiptCaptureStatus:
  - deterministic_capture_applied
  - receipt_capture_error_after_single_approved_attempt
```

The receipt must not include process IDs, command lines, endpoint URLs, locator
values, config paths or values, env values, logs, stdout, stderr, response
bodies, raw error payloads, provider payloads, tokens, secrets, raw memory, raw
stores, or raw audit rows.

## Stop Conditions

The future live attempt must stop before any live action if:

- Jenn exact approval is missing, stale, broader than this packet, or ambiguous
- requested target reference differs from this packet
- requested diagnostic purpose differs from this packet
- CM-1928 receipt-capture contract is not available as a pre-live boundary
- max network calls exceed `1`
- max runtime calls exceed `1`
- max process-state inspections exceed `1`
- response body byte budget is not `0`
- raw error payload budget is not `0`
- log read budget is not `0`
- request body generation is requested
- endpoint disclosure is requested
- locator value disclosure is requested
- config/env, secret, log, stdout, stderr, raw output, raw memory, or memory
  write is requested
- component/action probing or read-shape proof is requested
- output projection exceeds the allowed low-disclosure categories and buckets
- readiness, release, deploy, cutover, push, or public MCP expansion is
  requested

## Explicit Non-Actions

CM-1930 did not:

- perform a new live call
- retry CM-1926
- call VCPToolBox
- call MCP memory tools
- inspect process state
- resolve or disclose endpoint/locator values
- read response body, raw error payload, logs, stdout, stderr, config/env,
  secrets, raw memory, raw stores, or raw audit rows
- generate or submit request bodies
- generate, expose, store, or submit approval lines
- write memory or durable runtime/audit state
- change config, startup, watchdog, dependencies, runtime binding, or public MCP
  schema
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, production readiness, release readiness, cutover
  readiness, complete V8, or full bridge completion

## Validation Boundary

CM-1930 validation is docs/status/governance only:

```text
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/secret/raw-output/readiness scan over changed files
changed-scope re-review
```

## Next Route

Next route is CM-1931 exact approval request readiness review / Jenn exact
approval boundary display.

CM-1931 must not execute runtime. Any future live execution remains blocked
until Jenn provides current explicit exact approval matching this refreshed
CM-1930 packet.
