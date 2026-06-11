# CM-1648 VCP Bridge Exact Approval Gate Design

## Summary

CM-1648 adds a default-off, pure, no-live exact approval gate skeleton for future VCP Bridge proof work.

This is not a live bridge proof. It does not connect to `VCPBridgeServer`, does not call public MCP, does not call `record_memory`, does not enable strict production defaults, and does not create production, release, cutover, or complete V8 readiness.

Implemented files:

- `src/core/VcpBridgeExactApprovalGate.js`
- `tests/vcp-bridge-exact-approval-gate.test.js`

## Current Baseline

CM-1646 added a fixture-only VCP Bridge trusted execution context adapter skeleton.

CM-1647 added a fixture-only signed/static allowlist proof preflight.

CM-1648 defines the approval gate that must exist before any future step can move from fixture-only proof preflight toward a live bridge probe or live bridge `record_memory` proof.

## Approval Packet Shape

The approval packet must include:

| Field | Meaning |
|---|---|
| `token` | Exact approval token for the requested action |
| `operatorIntentScope` | Human-readable scope of the operator intent |
| `allowedAction` | One exact action from the allowed action enum |
| `expiresAt` | Expiration timestamp; expired approvals fail closed |
| `nonce` | Single-use nonce marker for future receipt binding |
| `receiptId` | Single-use receipt id marker for future audit binding |
| `expectedContextHash` | Hash of the approved trusted context |
| `expectedAllowlistHash` | Hash of the approved static allowlist |

The helper returns only low-disclosure token/nonce/receipt presence and gate state. It does not echo raw token, nonce, or receipt values on rejection.

## Allowed Actions

| Action | Token requirement | Boundary |
|---|---|---|
| `design_only` | `APPROVE_VCP_BRIDGE_FIXTURE_ONLY_PROOF_PREFLIGHT` | Design and docs only |
| `fixture_only` | `APPROVE_VCP_BRIDGE_FIXTURE_ONLY_PROOF_PREFLIGHT` | Fixture-only tests and synthetic proof packets |
| `local_dry_run` | `APPROVE_VCP_BRIDGE_LOCAL_DRY_RUN_NO_WRITE` | Future local dry-run only, no live bridge and no write |
| `live_bridge_probe_no_write` | `APPROVE_VCP_BRIDGE_LIVE_PROBE_NO_WRITE` | Future live bridge no-write probe only |
| `live_bridge_record_memory_proof` | `APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT` | Future exact live write proof only; bounded proof still must be separately approved and implemented |

Default safe design scope remains `design_only` / `fixture_only`. Stronger actions require stronger exact tokens.

## Hard Boundaries

The gate never enables:

- production strict default
- production, release, or cutover readiness
- complete V8 readiness
- public MCP expansion
- raw scan or broad scan
- confirmed mutation
- persistent tag write
- provider/API calls
- bearer-token material handling
- unbounded `record_memory` write

`live_bridge_record_memory_proof` is intentionally separate from `live_bridge_probe_no_write` and requires the exact token `APPROVE_VCP_BRIDGE_LIVE_RECORD_MEMORY_PROOF_EXACT`. Even when accepted by the helper, CM-1648 still performs no write and calls no runtime.

## Expiry And Hash Binding

Approvals fail closed when:

- the packet is missing or malformed
- the action is unknown
- the token does not match the requested action
- `expiresAt` is expired or malformed
- `expectedContextHash` does not match the supplied expected context hash
- `expectedAllowlistHash` does not match the supplied expected allowlist hash

The `nonce` and `receiptId` are required so a future live bridge proof can bind one approval to one receipt. CM-1648 only models the shape and presence requirement; it does not implement a durable nonce registry or live receipt sink.

## Non-Claims

CM-1648 does not prove:

- live VCP Bridge behavior
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
