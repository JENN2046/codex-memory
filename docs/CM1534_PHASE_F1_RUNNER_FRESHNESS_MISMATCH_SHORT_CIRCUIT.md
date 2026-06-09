# CM-1534 Phase F1 Runner Freshness Mismatch Short-Circuit

## Goal

Fix the CM-1533 residual finding: after `/health.runtimeFreshness.sourceFingerprint` mismatches the expected runtime source fingerprint, the Phase F1 runner must fail closed immediately and must not continue into proof requests.

This task does not execute live proof, close the live client evidence blocker, close the effective write reliability blocker, call provider/API, use bearer-token material, perform raw memory/audit/broad scan, execute effective `record_memory`, execute confirmed mutation, expand public MCP tools, release/tag/deploy, or claim readiness / `RC_READY`.

## Implemented Changes

| Area | Change |
|---|---|
| Phase F1 runner | `runPhaseF1LiveClientNoWriteEvidence(...)` now summarizes `/health` before proof requests and returns fail-closed when runtime freshness is missing or mismatched. |
| Low-disclosure blocked evidence | Added a blocked-health summary that omits actual and expected source fingerprints and keeps only bounded freshness status/count metadata. |
| Regression test | Added a mismatch regression proving no HTTP JSON proof request is issued after stale health freshness. |

## Fail-Closed Behavior

When `/health.runtimeFreshness.sourceFingerprint` does not match the expected runtime source fingerprint:

```text
status: PHASE_F1_LIVE_CLIENT_NO_WRITE_EXECUTION_BLOCKED_FAIL_CLOSED
executionMode: blocked_before_proof_requests
evidenceAccepted: false
liveClientRefreshExecuted: false
failClosedReasons includes: runtime_source_fingerprint_mismatch
```

The runner returns before:

```text
initialize
tools/list
tools/call
```

Therefore mismatched runtime freshness cannot generate acceptable live proof evidence and cannot continue into the public MCP proof request sequence.

## Low-Disclosure Boundary

The mismatch report does not include:

```text
actual runtime source fingerprint
expected runtime source fingerprint
bearer token material
Authorization header material
provider/API keys or endpoints
local filesystem paths
raw memory or raw audit content
```

The blocked-health summary keeps only:

```text
ok
service
authRequired
hasRuntime
runtimeFreshness.sourceFileCount
runtimeFreshness.matchesExpected
```

## Public Contract Effect

```text
public MCP tools count: unchanged
public MCP tools expected: 7
public MCP expansion: 0
```

The runner still expects exactly:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

## Validation Evidence

Validation is recorded under `CMV-1638` in `.agent_board/VALIDATION_LOG.md`.

Required local validation:

```text
node --test tests\phase-f1-live-client-no-write-runner.test.js
node --test tests\live-http-runtime-freshness-guard.test.js
node --test tests\mcp-http.test.js
git diff --check
scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
changed-scope review
```

No live proof validation is part of CM-1534.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

CM-1534 fixes the local runner ordering finding, but it does not rerun live proof and does not close the live client evidence blocker.

## Boundary Confirmation

```text
live_client_proof_execution: 0
live_client_proof_closeout: 0
live_client_blocker_closed: false
effective_write_blocker_closed: false
provider_api_calls: 0
bearer_token_use: 0
raw_memory_scan: 0
raw_audit_scan: 0
broad_memory_scan: 0
effective_record_memory_writes: 0
confirmed_mutation: 0
public_mcp_expansion: 0
release_tag_deploy: 0
readiness_claim: false
rc_ready_claim: false
```

## Next Route

Future live proof retry remains separate exact-approval work and must start only after fresh runtime/source fingerprint evidence is available inside the approved envelope.
