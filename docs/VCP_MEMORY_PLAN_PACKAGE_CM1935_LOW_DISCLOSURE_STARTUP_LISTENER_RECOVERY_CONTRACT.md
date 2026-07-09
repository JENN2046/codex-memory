# CM-1935 Low-Disclosure Startup Listener Recovery Contract

Status: `COMPLETED_VALIDATED_LOW_DISCLOSURE_STARTUP_LISTENER_RECOVERY_CONTRACT_NO_LIVE_NO_MUTATION`

Date: 2026-07-05

## Scope

CM-1935 turns the CM-1934 recovery preflight into a machine-verifiable local
contract.

This is source/test/docs/status work only. It does not start, stop, or restart
runtime, inspect process state, perform live/network calls, retry CM-1932,
call VCPToolBox, resolve endpoint or locator values, read config/env, read
secrets, read logs, read stdout/stderr, read response bodies, read raw memory,
generate request bodies, generate approval lines, write memory, change
runtime/config/startup/watchdog state, expand public MCP, push, release,
deploy, cut over, or claim readiness.

## Implementation

Added:

```text
src/core/VcpNativeStartupListenerRecoveryContract.js
tests/vcp-native-startup-listener-recovery-contract.test.js
```

The contract accepts only low-disclosure category, bucket, boolean, and zero
counter evidence for:

- runtime process-state bucket
- service startup / listener recovery boundary
- target safe-reference binding category
- service listener recheck boundary
- transport wrapper no-body/no-request shape
- exact approval boundary

## Accepted Output

The accepted contract output keeps the route locked:

```yaml
recovery_result:
  accepted: true
  runtimeProcessStateKnown: false
  processCountBucketDisclosed: false
  runningCategoryKnown: false
  serviceStartupRecoveryAuthorizedNow: false
  serviceStartAttempted: false
  listenerRecheckAuthorizedNow: false
  listenerRecheckAttempted: false
  targetReferenceKnown: true
  targetLocatorBindingKnown: false
  locatorValueDisclosed: false
  endpointDisclosed: false
  transportWrapperShapeLocked: true
  transportWrapperLiveProofKnown: false
  componentActionStatusProbeUnlocked: false
  readShapeUnlocked: false
  nextLiveRecoveryRequiresExactApproval: true
```

Side-effect flags remain false:

```yaml
runtimeExecuted: false
liveVcpToolBoxCalled: false
networkCalled: false
liveProcessInspected: false
serviceStartAttempted: false
listenerRecheckAttempted: false
requestBodyGenerated: false
responseBodyRead: false
rawErrorPayloadRead: false
approvalLineGenerated: false
memoryReadPerformed: false
memoryWritten: false
durableWritePerformed: false
readinessClaimed: false
```

## Fail-Closed Boundaries

The contract rejects:

- missing required lane fields
- unknown fields outside the declared schema
- unsafe or mismatched target reference names
- nonzero or unknown side-effect counters
- endpoint URLs
- locator values
- config/env paths or values
- secrets, tokens, credentials, or keys
- logs
- stdout or stderr
- process identifiers
- command lines
- startup commands
- request bodies
- response bodies
- raw error payloads
- raw memory
- raw stores
- raw audit rows
- provider payloads
- approval lines
- live execution claims
- listener recheck claims
- service start claims
- readiness claims
- write or durable-write counters

Rejected results return only a low-disclosure projection and do not echo
private values.

## Public Surface

CM-1935 does not change public MCP tools. The targeted test preserves the
current public tool surface:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

## Decision

```yaml
decision:
  cm1934_preflight_consumed: true
  contract_implemented: true
  source_change: true
  test_change: true
  docs_status_change: true
  live_execution_allowed_now: false
  runtime_start_allowed_now: false
  listener_recheck_allowed_now: false
  process_state_inspection_allowed_now: false
  request_body_generation_allowed_now: false
  approval_line_generation_allowed_now: false
  component_action_status_probe_unlocked: false
  read_shape_unlocked: false
  readiness_claimed: false
  next_route: cm1936_startup_listener_recovery_exact_approval_request_packet
```

CM-1935 proves only that the next recovery lane has a local low-disclosure
contract. It does not prove runtime startup, process state, target locator
binding, listener reachability, component/action routing, read shape, bridge
readiness, or production readiness.

## Validation

```text
node --check src/core/VcpNativeStartupListenerRecoveryContract.js
node --test tests/vcp-native-startup-listener-recovery-contract.test.js
git diff --check
bash scripts/validate-local.sh docs
node scripts/validate_current_facts_drift.js
node scripts/validate_autopilot_ledger_consistency.js
targeted endpoint/locator/approval-line/secret/raw-output/readiness scan over changed files
changed-scope re-review
```

## Next Route

CM-1936 should prepare a non-authorizing exact approval request packet for one
future startup/listener recovery diagnosis. It must not generate a real
approval line, execute runtime, inspect process state, start runtime, recheck
listener reachability, generate a request body, or claim readiness.
