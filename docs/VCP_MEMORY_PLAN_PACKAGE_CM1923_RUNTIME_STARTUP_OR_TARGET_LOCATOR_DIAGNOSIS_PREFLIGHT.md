# CM-1923 Runtime Startup Or Target Locator Diagnosis Preflight

Status: `COMPLETED_VALIDATED_RUNTIME_STARTUP_OR_TARGET_LOCATOR_DIAGNOSIS_PREFLIGHT_SOURCE_ONLY_NO_LIVE_CALL`

Date: 2026-07-04

## Scope

CM-1923 prepares a source-only, non-live preflight for the next diagnostic route after CM-1921 and CM-1922.

It answers which diagnosis lanes should exist before asking for any new exact approval. It does not confirm live runtime facts, retry the transport diagnosis, call VCPToolBox, inspect process state, disclose endpoint or locator values, read config/env, read secrets, read logs, read response bodies, read raw memory, write memory, mutate runtime binding, or claim readiness.

## Current Facts

```text
cm1921_receipt_valid=true
cm1921_statusCategory=transport_error
cm1921_transportReachable=false
cm1921_approved_network_calls_consumed=1
cm1921_approved_runtime_calls_consumed=1
cm1921_budget_remaining=0
cm1921_retry_allowed=false
component_action_status_probe_unlocked=false
read_shape_unlocked=false
cm1922_next_route=runtime_startup_or_target_locator_diagnosis
```

## Source-Only Context

Source-only inspection confirms the local bridge contracts still separate target references, locator disclosure, wrapper shape, runtime execution, and low-disclosure result projection:

- `src/core/VcpNativeInvocationAdapterSkeleton.js` keeps locator value inclusion false while allowing only safe target references.
- `src/core/VcpNativeReadOnlyProofPathGate.js` validates the no-write/no-body-leak wrapper shape before runtime.
- `src/core/VcpNativeRuntimeAdapterDryRunContract.js` keeps the adapter in dry-run/no-call mode unless a later exact approval path is opened.
- `src/core/VcpNativeRuntimeTargetDiagnosisContract.js` keeps transport reachability and runtime process state unknown without a new exact approval.

This source-only review does not prove runtime reachability, process state, locator binding, listener state, or component/action routing.

## Diagnostic Lanes

```yaml
diagnostic_lanes:
  runtime_startup_state:
    question: is the VCPToolBox runtime/service actually running?
    current_status: unknown
    live_required: yes
    allowed_future_evidence:
      - process_count_bucket_only
    forbidden_now:
      - pid
      - command_line
      - env
      - logs

  target_locator_binding:
    question: does operator-vcp-toolbox-service-ref resolve to a reachable approved locator?
    current_status: unknown
    live_required: maybe
    allowed_now:
      - safe_reference_name_only
      - locator_presence_category_only
    forbidden_now:
      - endpoint_url
      - locator_value
      - config_path
      - env_value
      - token

  transport_wrapper_shape:
    question: did the wrapper attempt the correct transport class?
    current_status: unknown
    live_required: no_for_source_review_yes_for_actual_proof
    allowed_now:
      - source_only_wrapper_plan_review
      - wrapper_type_category
      - no_write_no_body_budget_shape
    forbidden_now:
      - actual_request_body
      - response_body
      - raw_error_payload

  service_listener_mismatch:
    question: is there a listener or route mismatch?
    current_status: unknown
    live_required: yes
    allowed_future_evidence:
      - reachable_true_false
      - status_class_only
      - duration_bucket
    forbidden_now:
      - endpoint_url
      - route_payload
      - logs

  approval_packet_gap:
    question: does the next diagnosis need a different exact approval shape?
    current_status: likely
    live_required: no
    allowed_now:
      - diagnosis_lane_list
      - approval_field_categories
      - stop_condition_categories
    forbidden_now:
      - approval_line_generation
      - request_body_generation
```

## Low-Disclosure Evidence Needs

Future diagnosis should keep evidence limited to these categories unless Jenn explicitly approves otherwise:

```yaml
future_evidence_categories:
  process_state:
    allowed:
      - running_or_not_running
      - process_count_bucket
    forbidden:
      - pid
      - command_line
      - env
      - stdout
      - stderr
      - logs

  locator_binding:
    allowed:
      - reference_present
      - binding_present_category
      - locator_hash_present
    forbidden:
      - endpoint_url
      - locator_value
      - config_path
      - env_value
      - token

  transport_attempt:
    allowed:
      - reachable_true_false
      - status_class_only
      - duration_bucket
    forbidden:
      - request_body
      - response_body
      - raw_error_payload
      - provider_payload
```

## Approval Requirements

CM-1924 can implement a local low-disclosure diagnosis contract without live calls.

Any later live startup or locator diagnosis requires a new exact approval because CM-1921 consumed its full live/network budget. The next exact approval request should be separate from read-shape proof and should not include component/action probing unless a later route explicitly unlocks it.

## Next Route

```text
next_task=CM-1924_low_disclosure_runtime_startup_target_locator_diagnosis_contract
live_required_for_cm1924=false
new_exact_approval_required_before_next_live_call=true
```

CM-1924 should turn these lanes into a machine-checkable contract. It must not execute runtime, call VCPToolBox, inspect process state, disclose endpoint/locator values, generate request bodies or approval lines, read logs/config/secrets/raw memory, write memory, or claim readiness.

## Explicit Non-Actions

CM-1923 did not:

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
