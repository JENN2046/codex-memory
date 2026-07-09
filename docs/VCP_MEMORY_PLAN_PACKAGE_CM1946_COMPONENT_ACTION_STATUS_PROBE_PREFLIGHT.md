# CM-1946 Component Action Status Probe Preflight

Status: `COMPLETED_VALIDATED_COMPONENT_ACTION_STATUS_PROBE_PREFLIGHT_NO_LIVE_NO_REQUEST_BODY_NO_READ_SHAPE`

Date: 2026-07-05

## Scope

CM-1946 defines the no-live preflight for a future component/action status
probe after CM-1945 accepted CM-1944 as listener-level progress.

CM-1946 is docs/status/governance only. It does not perform a live call, retry
CM-1944, call VCPToolBox, start, stop, or restart runtime, inspect process
state, recheck listener reachability, read logs, stdout, stderr, config, env,
secrets, response bodies, raw error payloads, raw memory, raw stores, or raw
audit rows, disclose endpoint or locator values, generate request bodies,
generate approval lines, probe component/action routing, enter read-shape
proof, write memory, or claim readiness.

## Inputs

CM-1946 consumes the CM-1945 route decision:

```yaml
input:
  cm1944_receipt_valid: true
  cm1944_approved_attempt_consumed: true
  listener_after_start_reachable: true
  target_safe_reference_listener_reachable: true
  retry_allowed: false
  component_action_status_probe_preflight_unlocked: true
  component_action_status_probe_execution_unlocked: false
  read_shape_unlocked: false
  readiness_claimed: false
```

CM-1946 also carries forward the safe component/action identifiers from the
CM-1916 observe-lite attempt:

```yaml
safe_identifiers:
  targetReferenceName: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
```

These are safe identifiers only. CM-1946 does not resolve endpoint values,
locator values, plugin config, auth material, runtime payloads, or memory
content.

## Probe Preflight Lanes

```yaml
preflight_lanes:
  target_safe_reference_binding:
    question: can a future component/action status probe target the same safe reference?
    current_status: listener_level_reachable_by_cm1944
    live_required_now: false
    allowed_future_evidence:
      - target_reference_name
      - safe_reference_binding_category
      - locator_value_disclosed_false
      - endpoint_disclosed_false
    forbidden:
      - endpoint URL
      - locator value
      - config path or value
      - env value
      - token

  component_action_identifier_binding:
    question: are the selected component/action identifiers stable enough to contract?
    current_status: safe_identifiers_known
    live_required_now: false
    allowed_future_evidence:
      - component_name
      - action_name
      - identifier_binding_category
      - source_or_manifest_alias_category
    forbidden:
      - raw plugin config
      - private memory content
      - request body
      - provider payload

  status_probe_shape:
    question: can a future probe prove route status without generating a request body?
    current_status: unknown
    live_required_now: false
    requires_local_contract_before_live: true
    allowed_future_evidence:
      - probe_shape_category
      - request_body_generated_false
      - response_body_budget_zero
      - route_status_projection_only
    forbidden:
      - request body value
      - response body
      - raw error payload
      - logs
      - config/env
      - secrets

  route_outcome_receipt:
    question: what may a future status probe record?
    current_status: not_defined
    live_required_now: false
    allowed_future_categories:
      - routed_status_known
      - not_routed
      - boundary_blocked
      - request_body_required_boundary_blocked
      - transport_error
      - unknown
    forbidden:
      - raw response payload
      - raw error payload
      - endpoint URL
      - locator value
      - memory IDs
      - raw memory text
      - approval line
      - stdout/stderr/log text

  read_shape_separation:
    question: does component/action status probing unlock read-shape proof?
    current_status: no
    live_required_now: false
    rule:
      - status probe may only classify routing/status category
      - status probe may not inspect response shape
      - status probe may not read memory content
      - read-shape remains a later separately approved route
```

## Preflight Decision

```yaml
decision:
  cm1945_route_consumed: true
  listener_level_reachability_accepted: true
  target_safe_reference_known: true
  selected_component_action_safe_identifiers_known: true
  component_action_status_probe_preflight_defined: true
  component_action_status_probe_execution_allowed_now: false
  request_body_generation_allowed_now: false
  response_body_read_allowed_now: false
  raw_error_payload_read_allowed_now: false
  endpoint_locator_disclosure_allowed_now: false
  exact_approval_required_before_live_probe: true
  local_contract_required_before_exact_approval_request: true
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1947_low_disclosure_component_action_status_probe_contract
```

## CM-1947 Contract Direction

CM-1947 should turn this preflight into a local low-disclosure contract:

```text
src/core/VcpNativeComponentActionStatusProbeContract.js
tests/vcp-native-component-action-status-probe-contract.test.js
docs/VCP_MEMORY_PLAN_PACKAGE_CM1947_LOW_DISCLOSURE_COMPONENT_ACTION_STATUS_PROBE_CONTRACT.md
```

The contract should accept only safe identifiers, categories, booleans, buckets,
and zero counters. It should reject or fail closed on:

- endpoint or locator values
- raw plugin config
- config paths or values
- env values
- secrets, tokens, credentials, keys, or auth material
- request bodies
- response bodies
- raw error payloads
- stdout, stderr, or log text
- raw memory, raw stores, or raw audit rows
- memory IDs
- approval-line material
- provider payloads
- nonzero or unknown write counters
- runtime execution claims
- read-shape proof claims
- memory read/write claims
- readiness, release, deploy, cutover, complete V8, or full bridge completion
  claims

CM-1947 must remain local source/test/docs only. It must not perform a live
component/action probe, generate a request body, generate an approval line, or
claim readiness.

## Stop Conditions

CM-1946 stops before:

- live/network calls
- VCPToolBox calls
- service start/stop/restart
- process-state inspection
- listener reachability recheck
- endpoint or locator disclosure
- config/env/secret/log/stdout/stderr/body/raw-output reads
- request body generation
- approval-line generation
- component/action probe execution
- read-shape proof
- memory or durable writes
- runtime/config/startup/watchdog/dependency/runtime binding/public MCP changes
- push, tag, release, deploy, cutover, or readiness claim

## Validation Boundary

CM-1946 validation is docs/status/governance only:

```text
docs/status review
git diff --check
bash scripts/validate-local.sh docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS JSON OK')"
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```
