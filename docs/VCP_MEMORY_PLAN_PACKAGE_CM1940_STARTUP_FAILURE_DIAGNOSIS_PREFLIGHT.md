# CM-1940 Startup Failure Diagnosis Preflight

Status: `COMPLETED_VALIDATED_STARTUP_FAILURE_DIAGNOSIS_PREFLIGHT_NO_LIVE_NO_MUTATION`

Date: 2026-07-05

## Scope

CM-1940 defines the next startup failure diagnosis lanes after CM-1939.

CM-1940 is source-only/docs-status-governance. It does not perform a live call,
retry CM-1938, start, stop, or restart runtime, inspect process state, recheck
listener reachability, read logs, stdout, stderr, config, env, secrets,
response bodies, raw error payloads, raw memory, raw stores, or raw audit rows,
disclose endpoint or locator values, generate request bodies, generate approval
lines, probe component/action routing, enter read-shape proof, write memory, or
claim readiness.

## Inputs

CM-1940 consumes the CM-1939 route decision:

```yaml
input:
  cm1938_receipt_valid: true
  cm1938_approved_attempt_consumed: true
  service_start_attempt_consumed: true
  listener_recheck_consumed: true
  retry_allowed: false
  recovery_success: false
  listener_reachable_after_recovery: false
  runtime_startup_state_known: false
  process_count_known: false
  service_startup_result_known: false
  target_locator_binding_success_known: false
  service_listener_root_cause_known: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
```

CM-1940 does not add new runtime facts.

## Diagnosis Lanes

```yaml
diagnosis_lanes:
  startup_invocation_shape:
    question: is the future startup attempt using the expected local invocation shape?
    current_status: unknown
    live_required_now: false
    allowed_future_evidence:
      - source_only_wrapper_plan_category
      - invocation_shape_category
    forbidden:
      - command line value
      - endpoint URL
      - locator value
      - config path or value
      - env value

  startup_process_lifecycle:
    question: does the runtime process survive long enough to be observable?
    current_status: unknown
    live_required_now: true
    requires_future_exact_approval: true
    allowed_future_evidence:
      - process_count_bucket
      - lifecycle_category
    forbidden:
      - pid
      - command line
      - env
      - stdout
      - stderr
      - logs

  startup_result_capture:
    question: can a future bounded startup attempt record success/failure without raw output?
    current_status: unknown
    live_required_now: true
    requires_future_exact_approval: true
    allowed_future_evidence:
      - startup_result_category
      - duration_bucket
      - zero_write_counters
    forbidden:
      - raw error payload
      - stdout
      - stderr
      - logs
      - config/env
      - token

  listener_after_start:
    question: is a listener reachable after a future bounded startup attempt?
    current_status: unknown
    live_required_now: true
    requires_future_exact_approval: true
    allowed_future_evidence:
      - listener_status_category
      - status_class
      - duration_bucket
    forbidden:
      - endpoint URL
      - locator value
      - response body
      - raw error payload

  target_safe_reference_binding:
    question: is the safe target reference enough to select a future diagnostic target?
    current_status: reference_name_only
    live_required_now: false
    allowed_future_evidence:
      - target_reference_name
      - binding_category
      - locator_value_disclosed_false
    forbidden:
      - endpoint URL
      - locator value
      - config path or value
      - env value

  operator_mediated_manual_evidence:
    question: can Jenn provide low-disclosure manual startup evidence instead of another automated live attempt?
    current_status: optional
    live_required_now: false
    allowed_future_evidence:
      - manual_observation_category
      - no_raw_output_confirmation
      - no_secret_confirmation
    forbidden:
      - raw logs
      - stdout/stderr text
      - endpoint URL
      - config/env
      - token
```

## Preflight Decision

```yaml
decision:
  startup_failure_diagnosis_needed: true
  cm1938_retry_allowed: false
  live_execution_allowed_now: false
  process_state_inspection_allowed_now: false
  service_start_allowed_now: false
  listener_recheck_allowed_now: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1941_low_disclosure_startup_failure_diagnosis_contract
```

## CM-1941 Contract Direction

CM-1941 should turn this preflight into a local low-disclosure contract. The
contract should accept only category, bucket, boolean, and zero-counter evidence
for startup failure diagnosis lanes.

The CM-1941 contract should reject:

- endpoint or locator values
- command line values
- process identifiers
- config paths or values
- env values
- secrets, tokens, credentials, keys, or auth material
- raw response bodies
- raw error payloads
- stdout, stderr, or log text
- raw memory, raw stores, or raw audit rows
- request bodies
- approval-line material
- provider payloads
- nonzero write counters
- component/action probe claims
- read-shape proof claims
- readiness, release, deploy, cutover, complete V8, or full bridge completion
  claims

## Stop Conditions

CM-1940 stops before:

- live/network calls
- service start/stop/restart
- process-state inspection
- listener reachability recheck
- endpoint or locator disclosure
- config/env/secret/log/stdout/stderr/body/raw-output reads
- request body generation
- approval-line generation
- component/action probe
- read-shape proof
- memory or durable writes
- runtime/config/startup/watchdog/dependency/runtime binding/public MCP changes
- push, tag, release, deploy, cutover, or readiness claim

## Validation Boundary

CM-1940 validation is docs/status/governance only:

```text
docs/status review
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```
