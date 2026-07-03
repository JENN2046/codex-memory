# VCP Memory Governance Policy Shield Truth Table

Task id: `M5-K1-GOVERNANCE-POLICY-SHIELD-TRUTH-TABLE`
Implementation slice: `CM-1720`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md`, `docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md`
Evidence type: `docs-only`, `policy truth table`, `no-runtime`

## Purpose

This truth table defines the governance policy shield for future governed
VCPToolBox-native memory calls. It separates routine self-reviewed operations
inside an exact approved boundary from L4 hard stops.

It does not call VCPToolBox, inspect a target, read raw memory/runtime state,
execute fallback, write durable memory, call providers/APIs, expand public MCP
tools, issue an approval line, or claim readiness.

## Level Model

| Level | Meaning | Default decision posture |
|---|---|---|
| `L0` | Static docs, schema, fixture, no-op, and dry-run design checks | self-approve when no runtime/private/external state is touched |
| `L1` | Future exact-approved observe-lite target/transport presence check, no memory access | self-approve only inside an exact approved boundary |
| `L2` | Future bounded read-shape or structured read inside approved profile/scope | self-approve only inside an exact approved read boundary |
| `L3` | Future sustained read workflow or write-proposal path without durable mutation | self-approve only inside an exact approved workflow boundary |
| `L4` | Hard stop: secrets, raw private data, cross-client leakage, unapproved write, broad scan, migration, provider/API, config/startup, public MCP expansion, release/deploy/cutover/readiness | stop; exact approval where allowed, otherwise plan adjustment or proposal-only |

`L0-L3` does not mean unlimited autonomy. It means the operation may
self-review and self-approve only when the exact boundary already exists and
the request remains inside that boundary.

## Decision Vocabulary

| Decision | Meaning |
|---|---|
| `self_approve` | Proceed inside already-approved boundary and write receipt |
| `deny` | Reject request without external action |
| `stop_l4` | Stop before action because a hard-stop condition is present |
| `needs_exact_boundary` | Prepare/request exact boundary; do not execute |
| `fallback_allowed` | Use explicitly marked local fallback only if fallback policy allows it |
| `plan_adjustment` | Return to review or revise scope before any execution |

## Required Receipt Fields

Every policy decision, including denial and L4 stop, must be receipted with:

- `receipt_id`
- `policy_level`
- `decision`
- `request_id`
- `profile`
- `target_alias_present`
- `target_locator_value_disclosed=false`
- `client_id_present`
- `workspace_scope_present`
- `owner_scope_present`
- `visibility_present`
- `components_requested_count`
- `actions_requested_count`
- `raw_private_payload_requested`
- `durable_write_requested`
- `fallback_requested`
- `fallback_used`
- `vcp_native_result`
- `provider_api_requested`
- `public_mcp_expansion_requested`
- `config_startup_watchdog_requested`
- `readiness_claim_requested`
- `stop_condition`
- `next_action_allowed`

Receipts must not include raw private memory, raw runtime responses, provider
payloads, secrets, tokens, endpoints, locator values, config/env values, raw
audit rows, approval-line values, or raw client-private content.

## Truth Table

| ID | Level | Input condition | Expected decision | Required receipt fields | Stop condition |
|---|---|---|---|---|---|
| `M5-POL-001` | `L0` | Contract/docs/schema review with no runtime/private/external state | `self_approve` | `policy_level=L0`, `decision=self_approve`, `raw_private_payload_requested=false`, `durable_write_requested=false` | none |
| `M5-POL-002` | `L0` | Fixture example generation with synthetic data only | `self_approve` | `policy_level=L0`, `decision=self_approve`, `fallback_used=false`, `vcp_native_result=false` | none |
| `M5-POL-003` | `L1` | Exact-approved observe-lite target/transport check, no memory read/write | `self_approve` | `policy_level=L1`, `profile=observe-lite`, `target_alias_present=true`, `actions_requested_count=1` | stop if payload includes memory content |
| `M5-POL-004` | `L1` | Observe-lite target alias missing, stale, or ambiguous | `deny` | `policy_level=L1`, `decision=deny`, `target_alias_present=false`, `stop_condition=ERR_UNKNOWN_TARGET_ALIAS` | unknown target |
| `M5-POL-005` | `L2` | Bounded routine read inside exact-approved profile, scope, visibility, component, and result budget | `self_approve` | `policy_level=L2`, `decision=self_approve`, `profile=observe-full|trusted-full-read`, `visibility_present=true`, `raw_private_payload_requested=false` | stop if scope/profile drifts |
| `M5-POL-006` | `L2` | Raw private payload requested without exact raw-output approval | `stop_l4` | `policy_level=L4`, `decision=stop_l4`, `raw_private_payload_requested=true`, `stop_condition=ERR_RAW_OUTPUT_NOT_APPROVED` | raw output unapproved |
| `M5-POL-007` | `L2` | Codex-private result requested by Claude-private scope, or reverse | `stop_l4` | `policy_level=L4`, `decision=stop_l4`, `visibility_present=true`, `stop_condition=ERR_CROSS_CLIENT_PRIVATE_LEAKAGE` | cross-client private leakage risk |
| `M5-POL-008` | `L2` | Unknown `client_id`, workspace scope, owner scope, or visibility | `deny` | `policy_level=L2`, `decision=deny`, `client_id_present=false|workspace_scope_present=false|owner_scope_present=false|visibility_present=false`, `stop_condition=ERR_SCOPE_MISSING` | missing scope |
| `M5-POL-009` | `L3` | Trusted write-proposal request inside exact-approved proposal boundary, no durable write | `self_approve` | `policy_level=L3`, `profile=trusted-write-proposal`, `durable_write_requested=false`, `actions_requested_count>=1` | stop if durable write is requested |
| `M5-POL-010` | `L3` | Local fallback is explicitly allowed and VCP-native-only result is not required | `fallback_allowed` | `policy_level=L3`, `fallback_requested=true`, `fallback_used=true`, `vcp_native_result=false` | stop if fallback hides VCP failure |
| `M5-POL-011` | `L3` | Local fallback would hide a required VCP-native result | `deny` | `policy_level=L3`, `fallback_requested=true`, `fallback_used=false`, `stop_condition=ERR_FALLBACK_NOT_ALLOWED` | fallback not allowed |
| `M5-POL-012` | `L4` | Durable write/update/supersede/tombstone requested without separate exact write approval | `stop_l4` | `policy_level=L4`, `durable_write_requested=true`, `decision=stop_l4`, `stop_condition=ERR_WRITE_NOT_APPROVED` | unapproved durable mutation |
| `M5-POL-013` | `L4` | Secrets, tokens, cookies, endpoints, locator values, config/env, or auth material requested | `stop_l4` | `policy_level=L4`, `decision=stop_l4`, `stop_condition=ERR_SECRET_OR_CONFIG_REQUESTED` | secret/config boundary |
| `M5-POL-014` | `L4` | Provider/API call requested without exact bounded approval | `stop_l4` | `policy_level=L4`, `provider_api_requested=true`, `decision=stop_l4`, `stop_condition=ERR_PROVIDER_API_NOT_APPROVED` | provider/API boundary |
| `M5-POL-015` | `L4` | Broad scan, export/import, migration, backfill, or raw store/audit/vector/cache read requested | `stop_l4` | `policy_level=L4`, `decision=stop_l4`, `stop_condition=ERR_BROAD_OR_RAW_MEMORY_ACCESS` | broad/raw memory boundary |
| `M5-POL-016` | `L4` | Public MCP tool/schema expansion, config/startup/watchdog change, dependency change, push, release, deploy, cutover, or readiness claim requested | `stop_l4` | `policy_level=L4`, `public_mcp_expansion_requested=<true|false>`, `config_startup_watchdog_requested=<true|false>`, `readiness_claim_requested=<true|false>`, `decision=stop_l4` | external/state/release boundary |

## Self-Review Gate

Before any future L0-L3 self-approval, the agent must verify:

1. The request still serves the VCPToolBox-native governed bridge goal.
2. The exact profile, target alias, scope, visibility, components, actions,
   budget, and output policy are present.
3. No L4 condition is present.
4. The receipt can be produced without private leakage.
5. The result can normalize through
   `docs/VCP_MEMORY_RESULT_NORMALIZATION_CONTRACT.md`.

If any item is uncertain, the decision becomes `needs_exact_boundary`,
`plan_adjustment`, `deny`, or `stop_l4`; it must not be treated as success.

## M5-K1 Conclusion

M5-K1 makes the policy shield testable and auditable. Routine future work may
avoid per-call Jenn approval only when it remains inside a prior exact boundary.
L4 conditions remain hard stops.

Next safe route: M5-K2 client/scope/visibility matrix, still without live
runtime execution.
