# CM-1915 Live Read-Only Proof Execution Harness

Status: `COMPLETED_VALIDATED_LIVE_READONLY_PROOF_EXECUTION_HARNESS_DEFAULT_NO_RUN_NO_RUNTIME_NO_WRITE`

## Scope

CM-1915 implements a pure local execution harness contract for the future exact-approved live read-only proof.

The harness has two modes:

```yaml
modes:
  dry_run:
    default: true
    live_call: false
  exact_approved_live:
    default: false
    requires_external_approval: true
```

CM-1915 is still a no-run harness. It can evaluate whether a future exact-approved proof may proceed to CM-1916, but it does not execute runtime in this task.

## Added Surfaces

- `src/core/VcpNativeReadOnlyProofExecutionHarness.js`
- `tests/vcp-native-readonly-proof-execution-harness.test.js`

The module does not import network, process, filesystem, runtime, MCP memory, provider, or VCPToolBox client APIs.

## Input Boundary

The harness consumes:

- CM-1912 dry-run runtime adapter contract result.
- CM-1914 request boundary values.
- Optional exact approval object for `exact_approved_live` mode.
- Zero side-effect counters.

The request boundary remains limited to:

```yaml
request_boundary:
  action: one_read_only_vcp_native_proof
  profile: observe-lite
  max_runtime_calls: 1
  max_network_calls: 1
  write_budget: 0
  response_body_byte_budget: 0
  log_read_budget: 0
  result_projection: shape_only
```

## Gate Results

No exact approval in `exact_approved_live` mode:

```yaml
result:
  accepted: false
  reason: exact_approval_required
  runtimeExecuted: false
```

Exact approval present but parameters exceed boundary:

```yaml
result:
  accepted: false
  reason: boundary_violation
  runtimeExecuted: false
```

Complete exact approval plus legal budgets:

```yaml
result:
  accepted: true
  mode: exact_approved_live
  readyForCm1916LiveProof: true
  runtimeExecuted: false
  liveVcpToolBoxCalled: false
  networkCalled: false
  requestBodyGenerated: false
  responseBodyRead: false
  memoryWritten: false
```

Accepted `exact_approved_live` mode means only that CM-1916 may execute under the exact boundary. It is not execution proof and not readiness.

## Explicit Non-Actions

CM-1915 did not execute runtime, call VCPToolBox, call MCP memory tools, read response bodies, read logs/stdout/stderr, read config/env/secrets, read raw private memory/raw stores/raw audit rows, run real queries, write memory, write durable state, write receipts, call providers/APIs, change config/startup/watchdog, expand public MCP, create/submit authorization requests, generate or submit request bodies, generate or submit approval lines, push, tag, release, deploy, cut over, claim readiness, claim `RC_READY`, claim production readiness, or claim full bridge completion.

## Validation

- `node --check src/core/VcpNativeReadOnlyProofExecutionHarness.js`
- `node --check tests/vcp-native-readonly-proof-execution-harness.test.js`
- `node --test tests/vcp-native-readonly-proof-execution-harness.test.js`

Broader validation is recorded as `CMV-2018` in `.agent_board/VALIDATION_LOG.md`.

## Next Route

Next route: `CM-1916 first exact-approved live observe-lite proof`.

CM-1916 is the first live proof step and requires Jenn explicit exact approval before any runtime call. Without that approval, stop at the approval boundary.
