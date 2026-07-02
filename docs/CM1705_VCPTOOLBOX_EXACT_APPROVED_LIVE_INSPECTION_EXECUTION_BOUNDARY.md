# CM1705 VCPToolBox Exact-Approved Live Inspection Execution Boundary

## Purpose

CM-1705 adds a fixture-only execution boundary contract for a future
exact-approved VCPToolBox live target-specific inspection.

It does not inspect VCPToolBox. It prepares the approval / execution envelope /
receipt chain so a future live action cannot drift into broad runtime access,
memory access, provider calls, public MCP expansion, or readiness claims.

## Accepted Shape

The helper is exported from:

```text
src/core/VcpToolBoxExactApprovedLiveInspectionExecutionBoundary.js
```

The entrypoint is:

```text
buildVcpToolBoxExactApprovedLiveInspectionExecutionBoundary(input)
```

The boundary is prepared only when caller-provided sanitized evidence proves:

- Master / Stage / Version references are present;
- `projectFinalGoalServed` is true;
- CM-1704 receipt contract status has passed;
- exact approval binding is present through sanitized packet ids only;
- approval-line presence is recorded, but approval-line value is omitted;
- future allowed runtime actions are exactly:
  - `target_presence_probe`
  - `runtime_handshake_probe`
  - `target_specific_no_memory_inspection`
- runtime budget is capped to three calls, ten minutes, and one target-specific
  no-memory inspection;
- memory/provider/write budgets are zero;
- all pre-execution counters remain zero;
- the project final goal review answer is explicitly
  `serves_project_final_goal`.

Prepared output is `prepared_no_runtime_execution`. It is a boundary for future
exact-approved work, not execution evidence and not readiness.

## Rejection Boundary

The helper fails closed when:

- Master / Stage / Version alignment is missing or ambiguous;
- CM-1704 receipt contract status has not passed;
- exact approval binding is absent, incomplete, or exposes approval-line value;
- unsafe field names such as path, endpoint, port, host, token, secret, config,
  private state, approval-line value, raw runtime output, raw memory,
  commit/branch, expiry, or provider response appear;
- allowed runtime actions include anything outside the three permitted actions;
- any required permitted action is missing;
- runtime budget or target-specific inspection budget expands;
- memory/provider/write budgets are nonzero;
- runtime has already been executed or any pre-execution counter is nonzero;
- output expansion, readiness, release, deploy, push, or complete V8 flags are
  true;
- the project final goal review answer is missing or uncertain.

The helper does not echo unsafe field names or values in returned output.

## Validation

CM-1705 validation commands:

```bash
git diff --check
node --test tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js
node --test tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## Non-Claims

CM-1705 does not perform a live VCPToolBox call, target discovery, runtime
inspection, process probe, port probe, config read, secret read, raw memory
read, provider/API call, memory write, public MCP expansion,
startup/watchdog/config mutation, push, PR, release, deploy, readiness claim,
or complete V8 claim.
