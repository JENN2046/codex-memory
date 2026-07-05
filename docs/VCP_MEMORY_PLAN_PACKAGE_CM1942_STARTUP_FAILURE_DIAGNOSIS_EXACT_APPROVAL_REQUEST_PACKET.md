# CM-1942 Startup Failure Diagnosis Exact Approval Request Packet

Status: `COMPLETED_VALIDATED_STARTUP_FAILURE_DIAGNOSIS_EXACT_APPROVAL_REQUEST_PACKET_NON_AUTHORIZING_NO_APPROVAL_LINE`

Date: 2026-07-05

## Scope

CM-1942 prepares a non-authorizing exact approval request packet for one future
startup failure diagnosis after CM-1941 locked the local low-disclosure startup
failure diagnosis contract.

This packet is not authorization. It does not grant approval, generate an
approval line, generate a request body, execute runtime, call VCPToolBox,
inspect process state, start runtime, stop runtime, restart runtime, recheck
listener reachability, resolve or disclose an endpoint or locator value, read
config/env, read secrets, read logs, read stdout/stderr, read response bodies,
read raw error payloads, read raw memory, write memory, change configuration,
change startup/watchdog state, expand public MCP, push, release, deploy, cut
over, or claim readiness.

## Approval Request Boundary

Jenn exact approval is required before any future startup failure diagnosis
live execution.

```yaml
approval_request:
  purpose: runtime_startup_failure_diagnosis
  target_reference_name: operator-vcp-toolbox-service-ref
  diagnostic_lanes:
    - startup_invocation_shape
    - startup_process_lifecycle
    - startup_result_capture
    - listener_after_start
    - target_safe_reference_binding
    - operator_mediated_manual_evidence
    - startup_failure_diagnosis_contract
  required_pre_live_contract:
    task: CM-1941
    contract: VcpNativeStartupFailureDiagnosisContract
    startup_failure_diagnosis_contract_locked: true
  max_process_state_inspections: 1
  max_service_start_attempts: 1
  max_service_stop_attempts: 0
  max_service_restart_attempts: 0
  max_listener_recheck_attempts: 1
  max_network_calls: 1
  max_runtime_calls: 1
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
  command_line_disclosure: false
  process_identifier_disclosure: false
  provider_api_call: false
  public_mcp_expansion: false
  config_startup_watchdog_change: false
  dependency_change: false
  release_deploy_cutover_push: false
  readiness_claim: false
  output_projection:
    - targetReferenceName
    - purpose
    - statusCategory
    - startupInvocationShapeCategory
    - startupProcessLifecycleCategory
    - processCountBucket
    - serviceStartupAttemptCategory
    - startupResultCategory
    - listenerAfterStartStatusCategory
    - targetSafeReferenceBindingCategory
    - transportWrapperShapeCategory
    - operatorManualEvidenceCategory
    - statusClass
    - durationBucket
    - zeroWriteCounters
```

The target remains a safe reference name only. CM-1942 does not resolve the
reference to a locator, disclose endpoint URL, read config/env, or prove the
target is reachable.

## Required Jenn Exact Approval Fields

A future approval must explicitly cover:

- `purpose=runtime_startup_failure_diagnosis`
- target reference name
- diagnostic lanes
- CM-1941 startup failure diagnosis contract as a required pre-live boundary
- max process-state inspection count
- max service-start attempt count
- max service-stop attempt count
- max service-restart attempt count
- max listener recheck attempt count
- max network call count
- max runtime call count
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
- no command-line disclosure
- no process identifier disclosure
- no provider/API call
- no public MCP expansion
- no config/startup/watchdog mutation
- no dependency change
- allowed output projection
- stop conditions

Jenn approval must be current, exact, and narrower than or equal to this
packet. A broad approval, stale approval, inferred approval, or approval that
adds read/write/runtime expansion is not valid for the future live attempt.

## Forbidden Under This Packet

This request packet does not permit:

- component/action read proof
- read-shape proof
- request body generation or submission
- response body read or persistence
- raw error payload read or persistence
- endpoint URL disclosure
- locator value disclosure
- config/env path or value read
- secret, token, credential, key, or auth material read
- runtime logs, stdout, stderr, or process output read
- process identifier, command, or command-line disclosure
- raw memory, private memory content, raw store, or raw audit row read
- approval line generation, exposure, storage, or submission
- memory read
- memory write
- durable write
- provider/API call
- public MCP expansion
- runtime binding mutation
- config, startup, or watchdog persistence
- package or dependency change
- service stop or restart
- release, deploy, cutover, push, or readiness claim

## Allowed Future Receipt Projection

If Jenn later approves a future startup failure diagnosis, the execution receipt
may record only:

```yaml
future_receipt_allowed:
  - targetReferenceName
  - purpose
  - statusCategory
  - startupInvocationShapeCategory
  - startupProcessLifecycleCategory
  - processCountBucket
  - serviceStartupAttemptCategory
  - startupResultCategory
  - listenerAfterStartStatusCategory
  - targetSafeReferenceBindingCategory
  - transportWrapperShapeCategory
  - operatorManualEvidenceCategory
  - statusClass
  - durationBucket
  - zeroWriteCounters
  - requestBodyGenerated=false
  - responseBodyRead=false
  - rawErrorPayloadRead=false
  - logRead=false
  - stdoutStderrRead=false
  - configEnvRead=false
  - secretRead=false
  - endpointDisclosed=false
  - locatorValueDisclosed=false
  - commandLineDisclosed=false
  - processIdentifiersDisclosed=false
  - memoryRead=false
  - memoryWritten=false
  - readinessClaimed=false
```

Allowed bucket vocabulary:

```yaml
processCountBucket:
  - not_checked
  - zero
  - one
  - multiple
  - unknown
startupInvocationShapeCategory:
  - source_only_wrapper_plan_category
  - category_only
  - invalid_shape_category
  - unknown
startupProcessLifecycleCategory:
  - not_checked
  - not_running
  - maybe_running
  - running_bucket_only
  - unknown
serviceStartupAttemptCategory:
  - not_attempted
  - attempted
startupResultCategory:
  - not_attempted
  - started
  - already_running
  - failed
  - timeout
  - unknown
listenerAfterStartStatusCategory:
  - not_checked
  - reachable
  - not_reachable
  - timeout
  - unknown
targetSafeReferenceBindingCategory:
  - reference_name_only
  - reference_present_category_only
  - unknown
transportWrapperShapeCategory:
  - no_body_no_request_startup_transport
  - no_body_no_request_listener_transport
  - source_only_wrapper_plan_category
  - unknown
operatorManualEvidenceCategory:
  - not_provided
  - low_disclosure_summary_only
  - not_accepted
```

The receipt must not include process identifiers, command lines, endpoint URLs,
locator values, config paths or values, env values, logs, stdout, stderr,
response bodies, raw error payloads, provider payloads, tokens, secrets, raw
memory, raw stores, or raw audit rows.

## Stop Conditions

The future live attempt must stop before any live action if:

- Jenn exact approval is missing, stale, broader than this packet, or ambiguous
- requested target reference differs from this packet
- requested diagnostic purpose differs from this packet
- CM-1941 startup failure diagnosis contract is not available as a pre-live
  boundary
- max process-state inspections exceed `1`
- max service-start attempts exceed `1`
- any service-stop or service-restart attempt is requested
- max listener recheck attempts exceed `1`
- max network calls exceed `1`
- max runtime calls exceed `1`
- response body byte budget is not `0`
- raw error payload budget is not `0`
- log read budget is not `0`
- request body generation is requested
- endpoint disclosure is requested
- locator value disclosure is requested
- command-line or process identifier disclosure is requested
- config/env, secret, log, stdout, stderr, raw output, raw memory, memory read,
  or memory write is requested
- component/action probing or read-shape proof is requested
- output projection exceeds the allowed low-disclosure categories and buckets
- readiness, release, deploy, cutover, push, public MCP expansion, dependency
  change, config persistence, startup persistence, or watchdog persistence is
  requested

## Explicit Non-Actions

CM-1942 did not:

- perform a live call
- retry CM-1938
- call VCPToolBox
- call MCP memory tools
- inspect process state
- start, stop, or restart runtime
- recheck listener reachability
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

## Decision

```yaml
decision:
  cm1941_contract_available: true
  request_packet_prepared: true
  packet_authorizes_execution: false
  approval_granted: false
  approval_line_generated: false
  request_body_generated: false
  live_execution_allowed: false
  process_state_inspection_allowed_now: false
  service_start_allowed_now: false
  listener_recheck_allowed_now: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1943_exact_approval_request_readiness_review_jenn_boundary_display
```

CM-1942 only prepares the request packet. It does not make runtime, process,
listener, locator, component/action, read-shape, bridge-readiness, or
production-readiness claims.

## Validation Boundary

CM-1942 validation is docs/status/governance only:

```text
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```

## Next Route

Next route is CM-1943 exact approval request readiness review / Jenn boundary
display. CM-1943 remains non-authorizing and no-live unless Jenn separately
provides current exact approval matching the CM-1942 boundary.
