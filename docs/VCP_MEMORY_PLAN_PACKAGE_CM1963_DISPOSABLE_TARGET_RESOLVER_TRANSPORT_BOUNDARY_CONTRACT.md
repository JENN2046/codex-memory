# CM-1963 Disposable Target Resolver/Transport Boundary Contract

Status: `COMPLETED_VALIDATED_DISPOSABLE_TARGET_RESOLVER_TRANSPORT_BOUNDARY_CONTRACT_NO_EXECUTION_NO_WRITE_NO_READINESS`

Date: 2026-07-05

## Scope

CM-1963 consumes the CM-1962 pre-execution gate block and Jenn's current
operating preference for disposable/new target work. It adds a local source/test
contract for the next executor/resolver boundary.

CM-1963 does not execute the request/read-shape probe. It prepares the boundary
that lets later disposable-target execution use resolver/transport/runtime assist
without treating every diagnostic read as a separate approval request.

## Files

Added:

- `src/core/VcpNativeDisposableTargetResolverTransportBoundaryContract.js`
- `tests/vcp-native-disposable-target-resolver-transport-boundary-contract.test.js`

## Boundary Accepted By The Contract

The contract accepts only a disposable target declaration:

```yaml
disposableTargetDeclaration:
  newOrDisposableTarget: true
  targetScopeOnly: true
  containsJennPrivateInformation: false
  containsProductionSecrets: false
  containsCustomerData: false
  containsRealPrivateMemory: false
  nonTargetWorkspaceAccessAllowed: false
```

It prepares resolver/transport authority for:

```yaml
targetReferenceName: operator-vcp-toolbox-service-ref
component: KnowledgeBaseManager
action: knowledge_base.search
requestBodyShapeCategory: minimal_component_action_route_status_payload_category_only
queryBoundaryCategory: neutral_minimal_route_read_shape_probe_non_private_max_1_no_broad_scan
maxResultCount: 1
```

## Runtime Window Prepared

The prepared window allows a later disposable-target execution step to:

- inspect existing repository source, docs, scripts, checked-in configs, and
  target runtime files needed to identify the resolver/transport path
- inspect target `.env` values, target logs, stdout/stderr, endpoint/locator,
  request, response, and error details if needed for the disposable target
- inspect disposable target raw memory/store/audit material if needed to
  classify response/read-shape behavior
- resolve endpoint/locator values in memory
- generate a minimal request body in memory
- submit a bounded component/action request/read-shape probe
- consume a response body in memory for shape projection
- perform bounded process/listener checks and one start/ensure attempt
- perform one narrow local harness/adapter repair, limited to three local files,
  if a wrapper bug blocks the approved probe

This prepared window is not execution evidence.

## Budgets Locked

```yaml
maxResolverAttempts: 3
maxComponentActionRequestReadShapeAttempts: 2
maxNetworkCalls: 3
maxRuntimeCalls: 3
maxProcessStateInspections: 3
maxListenerRecheckAttempts: 3
maxServiceStartOrEnsureAttempts: 1
maxServiceStopAttempts: 1
maxServiceRestartAttempts: 0
maxLocalRepairFiles: 3
maxValidationRuns: 3
maxRetriesAfterTransientFailure: 1
maxResultCount: 1
```

Counters remain zero in CM-1963 because no runtime action is executed.

## Raw Diagnostic Policy

Raw diagnostic authority is scoped to the disposable target only. The contract
allows runtime diagnostic inspection/output authority as a future execution
permission, but rejects committed raw values in the boundary contract itself.

Durable repository receipt policy remains:

```yaml
receiptMode: low_disclosure_with_raw_diagnostic_usage_flag_no_raw_value_persistence
mayMentionRawDiagnosticOutputUsed: true
mayPersistRawEndpointLocator: false
mayPersistRawRequestBody: false
mayPersistRawResponseBody: false
mayPersistRawErrorPayload: false
mayPersistRawLogs: false
mayPersistSecrets: false
mayPersistPrivateMemoryContent: false
mustRecordReadShapeUnlocked: true
mustRecordReadinessClaimedFalse: true
```

The practical rule is:

- raw target diagnostics may be used transiently in the later disposable-target
  execution window when needed
- raw diagnostic values must not be committed into source/docs/status by this
  contract path
- non-target workspace/private/production material remains out of scope

## Explicitly Still Forbidden

CM-1963 does not authorize:

- non-target workspace secrets
- Jenn private data outside the disposable target
- production secrets or production credentials
- broad memory scan/export/import/migration
- memory write
- durable runtime/audit/store mutation
- provider/API call
- dependency install/update/removal
- public MCP tool/schema expansion
- VCPToolBox core code modification
- release, deploy, cutover, tag, or push
- readiness, `RC_READY`, production-ready, release-ready, cutover-ready,
  complete V8, full bridge completion, or broad read-shape support claims

## Validation

Targeted validation:

```text
node --check src/core/VcpNativeDisposableTargetResolverTransportBoundaryContract.js
node --check tests/vcp-native-disposable-target-resolver-transport-boundary-contract.test.js
node --test tests/vcp-native-disposable-target-resolver-transport-boundary-contract.test.js
```

Result:

```text
8/8 targeted tests passed
```

The tests verify:

- accepted disposable-target resolver/transport boundary
- non-disposable/private/production declarations fail closed
- raw diagnostic authority flags are accepted, but committed raw values are
  rejected without echo
- memory writes, durable writes, provider calls, dependency changes, public MCP
  expansion, VCPToolBox core modification, release/deploy/cutover/push, and
  readiness drift fail closed
- over-broad budgets, unknown fields, and nonzero counters fail closed
- target/component/action and receipt-policy mismatches fail closed
- required fields are enforced
- public MCP surface remains unchanged

## Decision

```yaml
cm1963_contract_added: true
cm1963_runtime_executed: false
cm1963_network_called: false
cm1963_vcp_toolbox_called: false
cm1963_request_body_generated: false
cm1963_response_body_consumed: false
cm1963_memory_written: false
cm1963_public_mcp_expanded: false
cm1963_read_shape_unlocked: false
cm1963_readiness_claimed: false
next_route: cm1964_execute_disposable_target_resolver_transport_read_shape_probe_or_prepare_executor
```

## Next Route

Next route:

```text
CM-1964 execute disposable-target resolver/transport request/read-shape probe or prepare concrete executor
```

CM-1964 may use the CM-1963 contract as the local preflight boundary. It must
keep any raw target diagnostics scoped to the disposable target and must avoid
committing raw endpoint, locator, request body, response body, error payload,
logs, secrets, or private memory values into repository docs/status.
