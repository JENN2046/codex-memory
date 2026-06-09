# CM-1535 Audit of Phase F1 Runner Freshness Short-Circuit

## Goal

Perform an independent changed-scope source audit of CM-1534 and confirm the Phase F1 runner fails closed immediately after a runtime source fingerprint mismatch, without continuing into proof requests.

This task does not execute live proof, close the live client evidence blocker, close the effective write reliability blocker, call provider/API, use bearer-token material, perform raw memory/audit/broad scan, execute effective `record_memory`, execute confirmed mutation, expand public MCP tools, release/tag/deploy, or claim readiness / `RC_READY`.

## Scope Reviewed

Reviewed CM-1534 changed scope and adjacent evidence surfaces:

- `src/core/PhaseF1LiveClientNoWriteEvidenceRunner.js`
- `tests/phase-f1-live-client-no-write-runner.test.js`
- `docs/CM1534_PHASE_F1_RUNNER_FRESHNESS_MISMATCH_SHORT_CIRCUIT.md`
- `.agent_board/*` CM-1534 status and validation receipts
- `CURRENT_STATE.md`
- `STATUS.md`

## Confirmed Within Changed Scope

### Fingerprint mismatch blocks before proof requests

Confirmed.

After `healthClient({ endpoint })`, the runner computes `healthSummary` and immediately returns fail-closed when `healthSummary.runtimeFreshness.matchesExpected !== true`.

The fail-closed path returns:

```text
status: PHASE_F1_LIVE_CLIENT_NO_WRITE_EXECUTION_BLOCKED_FAIL_CLOSED
executionMode: blocked_before_proof_requests
liveClientRefreshExecuted: false
evidenceAccepted: false
failClosedReasons includes: runtime_source_fingerprint_mismatch
runtimeReady: false
finalRcMatrixReady: false
rcReady: false
```

### No proof requests continue after mismatch

Confirmed.

The mismatch return happens before:

```text
resolveMcpUrl(endpoint)
initialize
tools/list
tools/call
```

The regression test injects a stale health fingerprint and an `httpJsonClient` that records any request and throws if called. It asserts:

```text
calls: []
executionMode: blocked_before_proof_requests
evidenceAccepted: false
```

Therefore stale runtime freshness cannot generate acceptable live proof evidence and cannot continue into `initialize`, `tools/list`, or `tools/call`.

### Failure reason is low-disclosure

Confirmed.

The failure reason is the bounded code:

```text
runtime_source_fingerprint_mismatch
```

The blocked-health summary omits `sourceFingerprint`; it keeps only:

```text
ok
service
authRequired
hasRuntime
runtimeFreshness.sourceFileCount
runtimeFreshness.matchesExpected
```

### No sensitive token/path/provider/API/raw disclosure in mismatch report

Confirmed in source and regression evidence.

The mismatch test asserts the serialized report does not include:

```text
secret token fixture value
expected runtime fingerprint fixture value
stale runtime fingerprint fixture value
Authorization bearer header material
OPENAI_API_KEY
ANTHROPIC_API_KEY
providerUrl
Windows absolute path fragments
```

The blocked report does not include raw memory or raw audit content. Safety counters remain zero for provider calls and durable writes.

### Public MCP surface remains seven tools

Confirmed.

`REQUIRED_PUBLIC_TOOLS` remains exactly:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

CM-1534 does not change `TOOL_DEFINITIONS`, public tool registration, MCP schema, or any public MCP expansion path. `tests/mcp-http.test.js` remains the runtime HTTP MCP contract regression for the seven-tool surface.

### No live proof automatic execution introduced

Confirmed.

The runner remains explicit-execution gated. When `execute` is false, it returns plan-only output and does not call health or proof clients. CM-1534 did not add any automatic live proof launcher, background proof, startup proof, package script, release path, or readiness path.

## Validation Evidence

Validation is recorded under `CMV-1639` in `.agent_board/VALIDATION_LOG.md`.

Required local validation:

```text
node --test tests\phase-f1-live-client-no-write-runner.test.js
node --test tests\live-http-runtime-freshness-guard.test.js
node --test tests\mcp-http.test.js
git diff --check
scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse
staged diff check
```

No live proof validation is part of CM-1535.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

CM-1535 audits the local source/test hardening from CM-1534. It does not rerun live proof and does not close live/effective-write blockers.

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

Future live proof retry remains separate exact-approval work. Do not execute live proof, use bearer-token material, or close blockers from this source audit.
