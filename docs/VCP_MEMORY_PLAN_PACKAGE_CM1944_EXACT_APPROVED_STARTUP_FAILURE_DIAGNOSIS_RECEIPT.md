# CM-1944 Exact-Approved Startup Failure Diagnosis Receipt

Status: `COMPLETED_VALIDATED_EXACT_APPROVED_STARTUP_FAILURE_DIAGNOSIS_LISTENER_REACHABLE_NO_BODY_NO_WRITE_NO_RAW_OUTPUT`

Date: 2026-07-05

## Scope

CM-1944 executed exactly one Jenn-approved startup failure diagnosis under the
CM-1942 / CM-1943 boundary. The approval text is not reproduced here.

The approved attempt was constrained to:

- safe target reference only
- CM-1941 `VcpNativeStartupFailureDiagnosisContract` as the pre-live boundary
- max process-state inspections `1`
- max service-start attempts `1`
- max service-stop attempts `0`
- max service-restart attempts `0`
- max listener recheck attempts `1`
- max network calls `1`
- max runtime calls `1`
- request body generation false
- response body byte budget `0`
- raw error payload budget `0`
- log read budget `0`
- stdout/stderr read false
- config/env read false
- secret read false
- memory read false
- memory write false
- durable write false
- endpoint disclosure false
- locator value disclosure false
- command-line disclosure false
- process identifier disclosure false
- provider/API call false
- public MCP expansion false
- config/startup/watchdog change false
- dependency change false
- readiness claim false

## Pre-Live Contract

CM-1944 first checked that the CM-1941 startup failure diagnosis contract was
available and accepted a low-disclosure pre-live boundary input:

```yaml
pre_live_contract:
  contract: VcpNativeStartupFailureDiagnosisContract
  accepted: true
  startup_failure_diagnosis_contract_locked: true
  lowDisclosure: true
```

This contract check did not execute runtime, call VCPToolBox, inspect process
state, generate request bodies, read response bodies, read logs, or write
memory.

## Low-Disclosure Receipt

```yaml
receipt:
  targetReferenceName: operator-vcp-toolbox-service-ref
  purpose: runtime_startup_failure_diagnosis
  statusCategory: listener_reachable_after_start_attempt
  startupInvocationShapeCategory: source_only_wrapper_plan_category
  startupProcessLifecycleCategory: running_bucket_only
  processCountBucket: multiple
  serviceStartupAttemptCategory: attempted
  startupResultCategory: unknown
  listenerAfterStartStatusCategory: reachable
  targetSafeReferenceBindingCategory: reference_name_only
  transportWrapperShapeCategory: no_body_no_request_listener_transport
  operatorManualEvidenceCategory: not_provided
  statusClass: tcp_connect_success
  durationBucket: lt_5s
  zeroWriteCounters: true
```

## Boundary Consumption

The single approved startup failure diagnosis execution is consumed. Retry is
not authorized under CM-1944.

## Interpretation

CM-1944 proves only these facts:

- the exact-approved startup failure diagnosis attempt was consumed
- the pre-live CM-1941 contract accepted the boundary
- one service-start attempt was issued under the approved boundary
- a process-state bucket was captured without process identifiers or command
  lines
- one no-body/no-request listener recheck returned reachable
- no retry is authorized

CM-1944 does not prove:

- exact startup root cause
- whether the listener was already reachable before the service-start attempt
- concrete process identity
- command line
- endpoint or locator value
- config/env correctness
- component/action reachability
- response shape
- read-shape support
- VCP native bridge readiness
- production readiness
- release readiness
- cutover readiness
- complete V8
- full bridge completion

## Explicit Non-Actions

CM-1944 did not:

- retry after the approved attempt was consumed
- proceed to component/action probe
- perform read-shape proof
- generate or submit a request body
- read or persist response bodies
- read or persist raw error payloads
- read logs, stdout, or stderr
- read config/env
- read secrets, tokens, credentials, keys, or auth material
- disclose endpoint or locator values
- output process identifiers or command lines
- stop or restart runtime
- read raw memory, raw stores, or raw audit rows
- call MCP memory tools
- call providers/APIs
- write memory
- perform durable writes
- change config, startup, watchdog, dependencies, runtime binding, or public MCP
  schema
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, production readiness, release readiness, cutover
  readiness, complete V8, or full bridge completion

## Decision

```yaml
decision:
  cm1944_receipt_valid: true
  exact_approved_attempt_consumed: true
  retry_allowed: false
  listener_after_start_reachable: true
  startup_result_known: false
  process_identity_known: false
  command_line_known: false
  endpoint_disclosed: false
  locator_value_disclosed: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1945_startup_failure_diagnosis_closeout_route_decision
```

## Validation Boundary

CM-1944 validation is low-disclosure receipt/status/governance only after the
single approved live attempt:

```text
one exact-approved startup failure diagnosis attempt
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```

## Next Route

Next route is CM-1945 startup failure diagnosis closeout / route decision.

CM-1945 must stay docs/status/governance only. It must not retry CM-1944,
perform another service start, inspect process state, recheck listener
reachability, probe component/action, enter read-shape proof, generate request
bodies or approval lines, read raw output, write memory, or claim readiness.
