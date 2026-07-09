# CM-1959 Low-Disclosure Component/Action Request/Read-Shape Preparation Contract

Status: `COMPLETED_VALIDATED_LOW_DISCLOSURE_COMPONENT_ACTION_REQUEST_READ_SHAPE_PREPARATION_CONTRACT_NO_LIVE_NO_READ_SHAPE`

Date: 2026-07-05

## Purpose

CM-1959 turns the CM-1958 component/action request/read-shape preparation
preflight into a local source/test/docs contract.

The contract is local only. It performs no diagnosis, no live call, no network
call, no runtime call, no VCPToolBox call, no process-state inspection, no
service start/stop/restart, no listener recheck, no request body generation or
output, no approval line generation, no response body read, no raw error read,
no response-shape inspection, no memory read, no memory write, no endpoint or
locator disclosure, no config/env read, no secret read, no log/stdout/stderr
read, no raw memory/raw store/raw audit read, no public MCP expansion, no
release/deploy/cutover/push, no readiness claim, and no read-shape proof.

## Source And Tests

CM-1959 adds:

- `src/core/VcpNativeComponentActionRequestReadShapePreparationContract.js`
- `tests/vcp-native-component-action-request-read-shape-preparation-contract.test.js`

The module exports:

- `buildVcpNativeComponentActionRequestReadShapePreparationContract`
- `ZERO_COUNTERS`
- contract metadata constants

## Accepted Contract Shape

The accepted input is category-only and low-disclosure:

```yaml
accepted_shape:
  schemaVersion: 1
  taskId: CM-1959
  targetReferenceName: operator-vcp-toolbox-service-ref
  priorStatusEvidence:
    sourceRouteTaskId: CM-1957
    priorReceiptTaskId: CM-1956
    componentActionRouteProbeCategory: route_status_known
    routeStatusCategory: status_only_known
    statusClass: client_error
    requestBodyShapeCategory: minimal_component_action_route_status_payload_category_only
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
  componentActionBinding:
    component: KnowledgeBaseManager
    action: knowledge_base.search
    currentStatus: safe_identifiers_known
  clientErrorRequestDiagnosisBoundary:
    currentStatus: status_only_client_error_known
    diagnosisPerformedNow: false
  actionSuccessPreconditions:
    currentStatus: unproven
    successClaimAllowedNow: false
    futureExactApprovalRequired: true
  responseShapeBoundary:
    currentStatus: unknown
    inspectResponseShapeNow: false
    futureExactApprovalRequired: true
  readShapeApprovalPreconditions:
    currentStatus: not_authorized
    readShapeAllowedNow: false
    futureExactApprovalRequired: true
  zeroWriteRawOutputBoundary:
    all_counts: 0
  approvalBoundary:
    nextExactApprovalRequired: true
    currentExactApprovalPresent: false
    approvalLineGenerated: false
    liveExecutionAllowedNow: false
    readShapeProofAllowedNow: false
    readinessClaim: false
```

## Rejection Boundaries

The contract rejects without echoing unsafe submitted values:

- endpoint URLs or locator values
- config/env paths or values
- tokens, secrets, credentials, private keys, and passwords
- concrete request bodies, serialized payloads, query text, or memory content
- response bodies, raw error payloads, raw output, shape keys, memory IDs, and
  raw memory text
- logs, stdout, stderr, raw plugin config, provider payloads, runtime payloads,
  process identifiers, command lines, and startup commands
- approval lines or approval request bodies
- unknown fields
- nonzero or unknown counters
- action-success, response-shape, read-shape, live execution, write, public MCP
  expansion, or readiness drift

## Accepted Result

Accepted output records only:

```yaml
result:
  accepted: true
  requestReadShapePreparationContractLocked: true
  lowDisclosure: true
  lowDisclosureProjection:
    taskId: CM-1959
    targetReferenceName: operator-vcp-toolbox-service-ref
    component: KnowledgeBaseManager
    action: knowledge_base.search
    statusClass: client_error
    routeStatusCategory: status_only_known
  request_read_shape_preparation_result:
    priorStatusOnlyClientErrorAccepted: true
    componentActionIdentifiersKnown: true
    clientErrorRequestDiagnosisBoundaryDefined: true
    actionSuccessPreconditionsDefined: true
    responseShapeBoundaryDefined: true
    readShapeApprovalPreconditionsDefined: true
    zeroWriteRawOutputBoundaryLocked: true
    actionSuccessProven: false
    responseShapeKnown: false
    readShapeUnlocked: false
    nextExactApprovalRequired: true
```

All side-effect flags remain false, including runtime execution, VCPToolBox
calls, network calls, request-body generation/output, response body read, raw
error read, response-shape inspection, memory read/write, approval-line
generation, read-shape proof, and readiness claim.

## Validation

CM-1959 validation includes:

```text
node --check src/core/VcpNativeComponentActionRequestReadShapePreparationContract.js
node --check tests/vcp-native-component-action-request-read-shape-preparation-contract.test.js
node --test tests/vcp-native-component-action-request-read-shape-preparation-contract.test.js
npm test -- --summary
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```

Observed local results:

- Targeted CM-1959 tests: `7/7` passed.
- Default test suite: `4032/4032` passed.

## Decision

```yaml
decision:
  cm1958_preflight_consumed: true
  local_contract_added: true
  targeted_contract_tests_added: true
  prior_status_only_client_error_accepted_as_category_only: true
  client_error_diagnosed: false
  action_success_proven: false
  response_shape_known: false
  read_shape_unlocked: false
  concrete_request_body_generated: false
  approval_line_generated: false
  live_execution_allowed_now: false
  memory_read_allowed_now: false
  memory_write_allowed_now: false
  readiness_claimed: false
  public_mcp_surface_unchanged: true
  next_route: cm1960_component_action_request_read_shape_exact_approval_packet_non_authorizing
```

## Explicit Non-Claims

CM-1959 does not claim:

- `knowledge_base.search` succeeded
- the `client_error` root cause is known
- concrete request body safety beyond the category boundary
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

## Next Route

Next route is CM-1960 component/action request/read-shape exact approval packet,
non-authorizing and no-live.

CM-1960 should prepare only a future exact approval packet. It must not generate
approval lines, execute runtime, generate/output/persist concrete request
bodies, read response bodies, inspect response shape, read memory, write
memory, or claim readiness.
