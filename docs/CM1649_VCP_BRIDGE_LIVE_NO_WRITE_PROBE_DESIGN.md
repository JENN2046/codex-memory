# CM-1649 VCP Bridge Live No-Write Probe Design

## Summary

CM-1649 defines the future `live_bridge_probe_no_write` execution boundary.

This slice adds a pure action-plan helper and tests only. It does not start VCP, does not connect to a real bridge, does not call MCP, does not call `record_memory`, and does not write memory.

Implemented files:

- `src/core/VcpBridgeLiveNoWriteProbePlan.js`
- `tests/vcp-bridge-live-no-write-probe-plan.test.js`

## Goal Of `live_bridge_probe_no_write`

The future live no-write probe should prove only that a bridge-owned context can be shaped, proof-bound, approval-gated, and receipted before any live write path is considered.

It is not a `record_memory` proof. It is not a production strict default switch. It is not a release, cutover, or complete V8 readiness signal.

## Allowed Checks

The planned probe may validate these checks only:

| Check | Boundary |
|---|---|
| `bridge_reachable_design_only` | Design placeholder only in CM-1649; no network call is executed |
| `trusted_context_shape` | Use accepted CM-1646 adapter result shape |
| `allowlist_hash` | Bind to expected static allowlist hash |
| `context_hash` | Bind to expected trusted context hash |
| `approval_gate_accepted` | Require accepted CM-1648 approval gate for `live_bridge_probe_no_write` |
| `no_record_memory_call` | Require zero planned `record_memory` calls and writes |
| `no_public_mcp_expansion` | Require unchanged seven-tool public MCP surface |

## Required Inputs

The no-write probe plan requires all of these to be accepted:

- CM-1646 VCP Bridge trusted context adapter result
- CM-1647 signed/static allowlist proof preflight result
- CM-1648 exact approval gate result for `live_bridge_probe_no_write`

If any accepted input is missing, the plan fails closed.

## Forbidden Actions

The no-write probe must reject:

- `record_memory` write intent
- `record_memory` call intent
- persistent tag write intent
- provider/API intent
- bearer-token material logging or handling
- raw scan intent
- broad scan intent
- confirmed mutation intent
- public MCP expansion intent
- `live_bridge_record_memory_proof` request

## No-Write Versus Live Write Proof

| Boundary | `live_bridge_probe_no_write` | `live_bridge_record_memory_proof` |
|---|---|---|
| Purpose | Prove bridge context/proof/approval shape can be planned safely | Prove one exact bounded live write, if separately approved |
| Token | `APPROVE_VCP_BRIDGE_LIVE_PROBE_NO_WRITE` | `APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT` |
| `record_memory` call | Forbidden | Future separate exact approval only |
| Persistent tag write | Forbidden | Still forbidden unless separately approved |
| Provider/API | Forbidden | Forbidden unless separately approved |
| Readiness claim | Forbidden | Forbidden |

CM-1649 only designs the no-write side. It does not authorize or implement the live write proof.

## Required Receipt Counters

Any future execution receipt for this no-write probe must record these counters:

- `networkCallsPlanned`
- `vcpRuntimeCallsPlanned`
- `mcpCallsPlanned`
- `recordMemoryCallsPlanned`
- `recordMemoryWritesPlanned`
- `persistentTagWritesPlanned`
- `providerApiCallsPlanned`
- `bearerTokenMaterialLogged`
- `rawScansPlanned`
- `broadScansPlanned`
- `confirmedMutationsPlanned`
- `publicMcpExpansionsPlanned`

CM-1649 keeps all counters at `0` because it outputs an action plan only.

## Fail-Closed Conditions

The plan fails closed when:

- input is not a plain object
- adapter result is missing or not accepted
- proof preflight result is missing or not accepted
- approval gate result is missing or not accepted
- approval gate action is not `live_bridge_probe_no_write`
- requested action is `live_bridge_record_memory_proof`
- any write, provider/API, bearer-token material, raw/broad scan, confirmed mutation, or public MCP expansion intent is present

Rejected output remains low-disclosure and does not echo bridge identity, token, nonce, receipt, bearer token, workspace id, client id, or agent id values.

## Rollback And Stop Conditions

CM-1649 has no runtime state to roll back because it does not execute a runtime action.

Future live no-write execution must stop immediately on:

- any planned nonzero write counter
- any planned provider/API call
- any bearer-token material logging requirement
- any raw/broad scan requirement
- any public MCP surface change
- any missing or stale exact approval
- any context hash or allowlist hash mismatch

## Non-Claims

CM-1649 does not prove:

- live VCP Bridge reachability
- live MCP behavior
- real `record_memory` reliability
- production strict auth readiness
- runtime wiring safety
- production persistent TagMemo writer
- runtime/public MCP persistent TagMemo enrichment
- production readiness
- release readiness
- cutover readiness
- complete V8 readiness

## Validation

Required validation for this slice:

```powershell
node --test tests\vcp-bridge-live-no-write-probe-plan.test.js
node --test tests\vcp-bridge-exact-approval-gate.test.js
node --test tests\vcp-bridge-trusted-context-proof-preflight.test.js
node --test tests\vcp-bridge-trusted-context-contract.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

- `CURRENT_FACTS.json` parse ok
- public MCP surface count remains `7`
- changed-scope bad-claim scan passes
- changed-scope review passes
