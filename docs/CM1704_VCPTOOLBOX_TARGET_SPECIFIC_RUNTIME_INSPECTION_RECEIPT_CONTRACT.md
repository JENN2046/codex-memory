# CM1704 VCPToolBox Target-Specific Runtime Inspection Receipt Contract

## Purpose

CM-1704 adds a fixture-only receipt contract for a future exact-approved
VCPToolBox target-specific runtime inspection.

It does not inspect VCPToolBox. It defines the low-disclosure evidence shape
that a future approved inspection must return so Review can answer:

```text
Does this work still serve project_final_goal?
```

## Accepted Shape

The helper is exported from:

```text
src/core/VcpToolBoxTargetSpecificRuntimeInspectionReceipt.js
```

The entrypoint is:

```text
buildVcpToolBoxTargetSpecificRuntimeInspectionReceipt(input)
```

The receipt is accepted only when caller-provided sanitized evidence proves:

- Master / Stage / Version references are present;
- `projectFinalGoalServed` is true;
- the referenced Commander decision is exact-approval-bound;
- exact approval binding is present through sanitized packet ids only;
- approval-line presence is recorded, but approval-line value is omitted;
- inspection evidence uses safe target/profile aliases only;
- runtime calls are bounded to at most three;
- exactly one target-specific runtime inspection is represented;
- memory reads/writes, provider/API calls, public MCP expansion,
  startup/watchdog/config mutation, raw reads, release/deploy/push/readiness
  claims, and complete V8 claims remain zero;
- the closeout review answer is explicitly `serves_project_final_goal`.

Accepted output is `reviewable_not_ready`. It is evidence for review, not a
readiness claim.

## Rejection Boundary

The helper fails closed when:

- Master / Stage / Version alignment is missing or ambiguous;
- exact approval binding is absent, incomplete, or exposes approval-line value;
- unsafe field names such as path, endpoint, token, secret, config, private
  state, approval-line value, raw runtime output, raw memory, commit/branch,
  expiry, or provider response appear;
- runtime call budget exceeds the bounded envelope;
- memory/provider/write/public-MCP/startup/config/readiness/release/deploy/push
  counters are nonzero;
- output expansion flags are true;
- the project final goal review answer is missing or uncertain.

The helper does not echo unsafe field names or values in returned output.

## Validation

CM-1704 validation commands:

```bash
git diff --check
node --test tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js
node --test tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## Non-Claims

CM-1704 does not perform a live VCPToolBox call, target discovery, runtime
inspection, config read, secret read, raw memory read, provider/API call,
memory write, public MCP expansion, startup/watchdog/config mutation, push,
PR, release, deploy, readiness claim, or complete V8 claim.
