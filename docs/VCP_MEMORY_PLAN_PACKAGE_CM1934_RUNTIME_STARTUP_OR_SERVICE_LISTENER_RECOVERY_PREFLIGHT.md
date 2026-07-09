# CM-1934 Runtime Startup Or Service Listener Recovery Preflight

Status: `COMPLETED_VALIDATED_RUNTIME_STARTUP_OR_SERVICE_LISTENER_RECOVERY_PREFLIGHT_NO_LIVE_NO_MUTATION`

Date: 2026-07-05

## Scope

CM-1934 defines the next safe diagnostic lane after CM-1933 closed CM-1932 as a
valid consumed `transport_error` attempt.

This is a docs/status/governance preflight only. It does not start, stop, or
restart runtime, inspect process state, perform live/network calls, retry
CM-1932, call VCPToolBox, resolve endpoint or locator values, read config/env,
read secrets, read logs, read stdout/stderr, read response bodies, read raw
memory, generate request bodies, generate approval lines, write memory, change
runtime/config/startup/watchdog state, expand public MCP, push, release,
deploy, cut over, or claim readiness.

## Preflight Decision

```yaml
decision:
  cm1933_route_consumed: true
  cm1932_transport_error_accepted: true
  recovery_preflight_defined: true
  runtime_startup_state_known: false
  process_count_known: false
  target_locator_binding_success_known: false
  service_listener_root_cause_known: false
  service_start_allowed_now: false
  listener_recheck_allowed_now: false
  live_execution_allowed_now: false
  retry_allowed_now: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1935_low_disclosure_startup_listener_recovery_contract
```

CM-1934 does not diagnose the root cause. It defines what must be separated
before any future recovery or recheck can be approved.

## Diagnostic Lanes

### Runtime Process-State Bucket

Question: is the target runtime process absent, present, or ambiguous?

Current status: unknown.

Allowed future evidence, only with separate exact approval:

- process count bucket only
- running category only
- no process identifiers
- no command lines
- no env
- no config paths or values
- no logs

### Service Startup / Listener Recovery

Question: should a future task attempt a bounded service start or listener
recovery before rechecking transport?

Current status: not authorized.

Allowed future evidence, only with separate exact approval:

- start attempt category
- start result category
- duration bucket
- post-start listener status category
- zero write counters outside the approved runtime process attempt

Forbidden future evidence unless a later approval narrows it further:

- command line disclosure
- config/env disclosure
- log/stdout/stderr disclosure
- endpoint or locator value disclosure
- startup/watchdog installation or persistence
- package/dependency changes

### Target Safe-Reference Binding

Question: does the safe reference remain the intended target alias for a future
diagnosis?

Current status: safe reference name known; locator value undisclosed and not
verified.

Allowed future evidence:

- safe reference present
- binding category only
- locator value not disclosed
- endpoint not disclosed

### Service Listener Recheck

Question: after a future approved recovery lane, does a no-body/no-request
listener check still return a transport error?

Current status: not authorized now.

Allowed future evidence, only with separate exact approval:

- one no-body/no-request listener check
- status category only
- duration bucket
- response body read false
- raw error payload read false
- endpoint and locator value disclosed false

### Transport Wrapper Shape

Question: is the wrapper still constrained to no-body/no-request listener-level
transport?

Current status: source-side intended shape only; live behavior not re-proven.

Allowed future evidence:

- wrapper shape category only
- request body generated false
- response body read false
- raw error payload read false

## Required Contract Boundary For CM-1935

CM-1935 should turn this preflight into a machine-verifiable low-disclosure
contract. The contract should accept only category and bucket evidence for:

- runtime process-state bucket
- service startup / listener recovery boundary
- target safe-reference binding category
- listener recheck category
- transport wrapper no-body/no-request shape
- zero read/write/config/log/body counters
- next exact approval required

The contract must reject:

- endpoint URLs
- locator values
- config/env paths or values
- secrets, tokens, credentials, or keys
- logs
- stdout or stderr
- process identifiers
- command lines
- request bodies
- response bodies
- raw error payloads
- raw memory
- raw stores
- raw audit rows
- provider payloads
- approval lines
- live execution claims
- readiness claims
- write or durable-write counters

## Future Approval Direction

Any future task after CM-1935 that observes process state, starts runtime, or
rechecks the listener must request a new exact approval. That approval must
state:

- purpose
- safe target reference
- whether process-state inspection is allowed
- whether service start is allowed
- max process-state inspections
- max service-start attempts
- max listener recheck attempts
- max network/runtime calls
- zero response-body and raw-error-payload budgets
- zero log/stdout/stderr/config/env/secret/raw memory read budgets
- no endpoint or locator value disclosure
- no request body generation
- no memory read or write
- no durable write
- no provider/API call
- no public MCP expansion
- low-disclosure receipt projection only
- stop conditions

## Explicit Non-Actions

CM-1934 did not:

- perform a live call
- retry CM-1932
- call VCPToolBox
- inspect process state
- start, stop, or restart runtime
- resolve or disclose endpoint/locator values
- read response body, raw error payload, logs, stdout, stderr, config/env,
  secrets, raw memory, raw stores, or raw audit rows
- generate or submit request bodies
- generate, expose, store, or submit approval lines
- call MCP memory tools
- perform component/action probing
- perform read-shape proof
- write memory or durable runtime/audit state
- call providers/APIs
- change runtime binding, config, startup, watchdog, dependencies, or public MCP
  schema
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, production readiness, release readiness, cutover
  readiness, complete V8, or full bridge completion

## Validation Boundary

CM-1934 validation is docs/status/governance only:

```text
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```
