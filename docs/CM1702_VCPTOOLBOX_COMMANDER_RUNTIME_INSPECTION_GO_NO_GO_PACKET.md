# CM1702 VCPToolBox Commander Runtime Inspection Go/No-Go Packet

## Purpose

CM-1702 adds a fixture-only Commander decision helper for the VCPToolBox memory
capability line.

The helper turns sanitized CM-1701 / CM-1700 / CM-1699 / CM-1698-style evidence
into one low-disclosure routing decision for the next local step:

- `continue_local_safe`
- `blocked_needs_exact_approval`
- `needs_plan_adjustment`

This keeps the Commander loop moving after the CM-1701 boundary review while
preserving the Master goal: governed Codex/Claude use of native VCPToolBox
memory through the `codex-memory` bridge.

## Accepted Shape

The helper is exported from:

```text
src/core/VcpToolBoxCommanderRuntimeInspectionGoNoGoPacket.js
```

The main entrypoint is:

```text
buildVcpToolBoxCommanderRuntimeInspectionGoNoGoPacket(input)
```

The input must provide Master, Stage, and Version references or sanitized ids,
`projectFinalGoalServed: true`, a passed CM-1701-style boundary review status,
sanitized evidence packet ids/statuses, and a local-safe requested next action.

Local-safe next action kinds are limited to:

- `docs`
- `fixture`
- `source_contract`
- `test`
- `low_disclosure_packet_hardening`

For a go decision, the helper returns `continue_local_safe` only when no
runtime-sensitive flag, unsafe field name, unbounded budget, or alignment gap is
present.

## Rejection Boundary

The helper returns `blocked_needs_exact_approval` when the requested next action
or submitted packet asks for target-specific runtime inspection, a live
VCPToolBox call, secret/config/private-state access, raw memory or raw runtime
output, durable memory write, provider/API call, public MCP expansion,
startup/watchdog/config mutation, readiness/cutover/release/deploy/push, an
unbounded budget, approval-line issue/consumption, or a complete V8 claim.

The helper returns `needs_plan_adjustment` when the Master / Stage / Version
alignment is missing or ambiguous, when `projectFinalGoalServed` is not true,
when CM-1701-style boundary review status is not passed, or when the requested
next action is not clearly local-safe.

Output remains low-disclosure. It preserves only sanitized ids/statuses,
presence booleans, category names, decisions, and zero counters. It does not
echo commit values, branch values, expiry values, paths, endpoints, tokens,
secrets, approval lines, raw runtime responses, raw memory,
DailyNote/RAG/vector/prompt/sqlite/jsonl/cache content, or provider responses.

## Validation

CM-1702 validation commands:

```bash
git diff --check
node --test tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js
node --test tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
npm test
```

The target test covers local-safe continuation, all required block decisions,
missing alignment, missing CM-1701 boundary status, zero counters, no approval
line issue/consumption, and low-disclosure rejection of nested unsafe fields.

Full-suite validation also includes a validation-harness repair in
`src/cli/run-default-tests.js`: `gate-ci-default-test-contract.test.js` is
classified as self-referential so default `npm test` does not recursively run
`gate-ci` and time out before producing JSON.

## Non-Claims

CM-1702 is source/test/docs and validation-harness-only.

It does not run live VCPToolBox inspection, does not call VCPToolBox, does not
read secrets or private runtime state, does not read raw memory, does not call
providers/APIs, does not write durable memory, does not change
config/startup/watchdog, does not expand public MCP tools, does not push or create a PR, and
does not claim runtime proof, readiness, cutover, release, deploy, or complete
V8.
