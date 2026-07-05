# CM-1958 Component/Action Request/Read-Shape Preparation Preflight

Status: `COMPLETED_VALIDATED_COMPONENT_ACTION_REQUEST_READ_SHAPE_PREPARATION_PREFLIGHT_NO_LIVE_NO_READ_SHAPE`

Date: 2026-07-05

## Purpose

CM-1958 consumes the CM-1957 route decision and defines a local no-live
preflight for the next component/action request and read-shape preparation
boundary.

CM-1958 does not diagnose the `client_error`, generate a concrete request body,
generate an approval line, execute runtime, call VCPToolBox, perform a network
call, inspect process state, start/stop/restart runtime, recheck listeners,
read response bodies, read raw error payloads, inspect response shape, read
memory, write memory, disclose endpoint or locator values, read config/env,
read secrets, read logs/stdout/stderr, read raw memory/raw stores/raw audit
rows, change runtime/config/startup/watchdog/dependency state, expand public
MCP, push, release, deploy, cut over, claim readiness, or enter read-shape
proof.

## Input Facts

CM-1958 accepts only these low-disclosure facts from CM-1957 / CM-1956:

```yaml
inputs:
  source_route: CM-1957
  prior_receipt: CM-1956
  targetReferenceName: operator-vcp-toolbox-service-ref
  component: KnowledgeBaseManager
  action: knowledge_base.search
  requestBodyShapeCategory: minimal_component_action_route_status_payload_category_only
  componentActionRouteProbeCategory: route_status_known
  routeStatusCategory: status_only_known
  statusClass: client_error
  requestBodyGeneratedByPriorProbe: true
  concreteRequestBodyOutput: false
  requestBodyPersisted: false
  responseBodyRead: false
  rawErrorPayloadRead: false
  endpointDisclosed: false
  locatorValueDisclosed: false
  memoryRead: false
  memoryWritten: false
  retryAllowed: false
  readShapeUnlocked: false
  readinessClaimed: false
```

These facts do not prove action success, response shape, memory recall behavior,
or read-shape support.

## Preflight Lanes

```yaml
preflight_lanes:
  client_error_request_diagnosis_boundary:
    question: what category-only information is needed before any future request/action diagnosis?
    current_status: status_only_client_error_known
    diagnosis_performed_now: false
    allowed_now:
      - priorStatusClass
      - priorRouteStatusCategory
      - requestBodyShapeCategory
      - diagnosticQuestionCategories
      - forbiddenMaterialPolicy
    forbidden_now:
      - raw error payload
      - response body
      - concrete request body
      - query text
      - memory content
      - endpoint URL
      - locator value
      - config/env
      - auth material

  action_success_preconditions:
    question: what must be true before action success can be claimed?
    current_status: unproven
    success_claim_allowed_now: false
    future_exact_approval_required: true
    required_future_evidence_categories:
      - exact bounded action purpose
      - safe target reference
      - safe component/action identifiers
      - request-body shape category
      - max runtime/network call count
      - zero write rule
      - low-disclosure result projection
      - abort on raw/private output

  response_shape_boundary:
    question: how can response shape be prepared without exposing raw response or memory content?
    current_status: unknown
    inspect_response_shape_now: false
    future_exact_approval_required: true
    allowed_future_projection_candidates:
      - responseShapeCategory
      - topLevelKindCategory
      - itemCountBucket
      - fieldNameDisclosurePolicy
      - memoryContentDisclosed=false
      - rawResponseBodyPersisted=false
      - rawErrorPayloadPersisted=false
    forbidden_future_projection:
      - raw response body
      - raw error payload
      - private memory text
      - memory IDs
      - endpoint URL
      - locator value
      - config/env
      - tokens or secrets
      - logs/stdout/stderr
      - provider payload
      - approval line

  read_shape_approval_preconditions:
    question: what exact approval fields are needed before read-shape proof?
    current_status: not_authorized
    read_shape_allowed_now: false
    required_future_boundary_fields:
      - purpose
      - target reference name
      - component/action identifiers
      - exact bounded query or exact query category approved by Jenn
      - max result count
      - max runtime/network call count
      - output disclosure limit
      - zero write rule
      - no broad scan rule
      - raw/private output abort rule
      - low-disclosure receipt projection

  zero_write_zero_raw_output_boundary:
    question: what must stay zero across the next route?
    required_zero_now:
      - memory writes
      - durable writes
      - response body reads
      - raw error reads
      - logs/stdout/stderr reads
      - config/env/secret reads
      - raw memory/raw store/raw audit reads
      - endpoint/locator disclosures
      - concrete request body output or persistence
      - approval line generation
      - runtime/config/startup/watchdog/dependency mutation
      - public MCP expansion
      - push/tag/release/deploy/cutover
      - readiness claims
```

## Exact Approval Boundary Direction

CM-1958 does not request or generate approval. It only records that any future
read-shape proof must be separate exact-approved work. A future packet must be
current, narrower than this preflight, and explicit about:

- exact purpose
- safe target reference
- component/action identifiers
- query boundary
- max result count
- max runtime/network calls
- whether any response-shape metadata may be read
- exact low-disclosure output projection
- zero write and zero durable state rule
- no endpoint/locator/config/env/secret/log/raw memory disclosure
- abort conditions for raw/private output
- confirmation that readiness, release, deploy, cutover, and `RC_READY` are not
  being claimed

## Decision

```yaml
decision:
  cm1957_route_consumed: true
  cm1956_status_only_client_error_accepted: true
  client_error_request_diagnosis_boundary_defined: true
  action_success_preconditions_defined: true
  response_shape_boundary_defined: true
  read_shape_approval_preconditions_defined: true
  concrete_request_body_generated: false
  concrete_request_body_output: false
  approval_line_generated: false
  live_execution_allowed_now: false
  response_body_read_allowed_now: false
  raw_error_payload_read_allowed_now: false
  memory_read_allowed_now: false
  memory_write_allowed_now: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1959_low_disclosure_component_action_request_read_shape_preparation_contract
```

## CM-1959 Expected Contract

CM-1959 should turn this preflight into a local source/test/docs contract. The
contract should accept only category-level request/read-shape preparation
objects and reject raw/private/live/write/readiness drift without echoing
submitted unsafe values.

Expected contract boundaries:

- safe target/component/action identifiers only
- prior status-only `client_error` accepted as a category, not as success
- response shape unknown unless separately exact-approved later
- read-shape locked
- zero write, zero raw output, zero runtime action, zero approval line, and zero
  readiness counters
- public MCP surface unchanged

## Explicit Non-Claims

CM-1958 does not claim:

- `knowledge_base.search` succeeded
- the `client_error` root cause is known
- concrete request body safety beyond the prior category boundary
- response body availability
- response shape
- memory read or recall behavior
- read-shape support
- trusted-full-read workflow readiness
- VCP native bridge readiness
- production readiness
- release readiness
- deploy readiness
- cutover readiness
- `RC_READY`
- complete V8
- full bridge completion

## Stop Conditions

Stop before any future action that would:

- retry CM-1956
- perform live/network/runtime calls
- call VCPToolBox
- inspect process state
- start, stop, or restart runtime
- recheck listener reachability
- diagnose `client_error` through runtime
- output, persist, or submit concrete request bodies
- generate, expose, store, or submit approval lines
- read response bodies, raw error payloads, logs, stdout, stderr, config/env,
  secrets, raw memory, raw stores, or raw audit rows
- disclose endpoint or locator values
- call MCP memory tools
- read or write memory
- write durable runtime/audit state
- change runtime binding, config, startup, watchdog, dependencies, or public MCP
  schema
- push, tag, release, deploy, or cut over
- claim readiness, `RC_READY`, production readiness, release readiness, cutover
  readiness, complete V8, or full bridge completion
- enter read-shape proof without separate exact approval

## Validation Boundary

CM-1958 validation is docs/status/governance only:

```text
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```
