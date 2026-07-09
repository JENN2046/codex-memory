# Local Fallback Memory Role Contract

Task id: `CM-M3-T3-FALLBACK-ROLE-CONTRACT`
Implementation slice: `CM-1717`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Evidence type: `docs-only`, `fallback contract`, `no-runtime`

## Purpose

This contract defines when local `codex-memory` behavior may act as fallback
while the primary strategy is VCPToolBox-native governed memory.

It does not execute local fallback, call VCPToolBox, read raw memory/runtime
state, write durable memory, call providers/APIs, expand public MCP tools, or
claim readiness.

## Role

Local memory is a fallback, compatibility, and test substrate. It is not the
primary memory intelligence owner for the VCP-native bridge plan.

```yaml
local_memory:
  primary: false
  permitted_roles:
    - offline continuity fallback
    - compatibility with existing MCP tools
    - donor-behavior regression reference
    - fixture and dry-run validation substrate
    - audit receipt and checkpoint substrate
    - differential comparison against VCP output
```

## Fallback Entry Conditions

Fallback may be considered only when all required governance fields are present
and at least one entry condition is true.

Required governance fields:

- `client_id` or client identity presence proof;
- project/workspace scope presence proof;
- visibility expectation;
- operation type;
- fallback reason;
- output disclosure level;
- no-mutation or approved mutation posture.

Allowed entry conditions:

| Condition | Fallback allowed? | Required marker |
|---|---:|---|
| VCPToolBox target is not approved | yes | `fallback_reason=vcp_target_unapproved` |
| VCPToolBox target is unavailable | yes | `fallback_reason=vcp_target_unavailable` |
| Offline continuity is required | yes | `fallback_reason=offline_continuity` |
| Test/fixture/dry-run validation is the requested mode | yes | `fallback_reason=test_or_dry_run` |
| Differential comparison against VCP output is requested | yes, no mutation | `fallback_reason=differential_comparison` |
| VCPToolBox live result failed and exact fallback policy exists | yes, if policy-bound | `fallback_reason=vcp_failure_policy_bound` |

## Result Marker

Every fallback result must carry a low-disclosure marker:

```yaml
memory_source: local_fallback
vcp_native_result: false
fallback_used: true
fallback_reason: <safe_reason_code>
vcp_target_alias: <safe_alias_or_absent>
profile: <requested_profile_or_fallback_profile>
scope_checked: true
visibility_checked: true
```

The marker must be present in both user-facing summaries and audit receipts
when a result could otherwise be mistaken for VCP-native success.

## Receipt Fields

Fallback receipts must include:

- `receipt_id`
- `timestamp`
- `client_id_present`
- `scope_present`
- `visibility_present`
- `operation_type`
- `requested_vcp_profile`
- `fallback_reason`
- `fallback_source=local_fallback`
- `vcp_native_result=false`
- `mutation_attempted`
- `durable_write_count`
- `output_disclosure`
- `stop_condition_triggered`
- `rollback_posture`
- `next_action_allowed`

Receipts must not include raw private memory, raw diary content, raw audit rows,
raw sqlite/jsonl/cache content, provider payloads, secrets, tokens, endpoints,
paths, or approval-line values.

## Must Not Run

Local fallback must not run when:

- the user or approval boundary requires a VCP-native-only result;
- fallback would hide a VCPToolBox failure that must be surfaced;
- client, project, workspace, visibility, or owner scope is missing;
- fallback would read cross-client private data;
- fallback would write memory without exact write approval;
- fallback would perform broad scan/export/import/migration/backfill;
- fallback would access secrets, raw runtime state, raw private memory, or
  provider/auth configuration;
- fallback would claim VCP-native success, production readiness, release
  readiness, cutover readiness, `RC_READY`, or complete V8.

## Examples

| Scenario | Correct result marker |
|---|---|
| VCP target not approved and user asks for prior project context | `memory_source=local_fallback`, `fallback_reason=vcp_target_unapproved`, `vcp_native_result=false` |
| User asks to test a fixture-only recall contract | `memory_source=local_fallback`, `fallback_reason=test_or_dry_run`, `vcp_native_result=false` |
| VCP read is exact-approved and succeeds | no fallback marker; receipt must identify VCP target alias and profile |
| VCP read is required but target is unavailable and no fallback policy exists | stop; do not silently fallback |
| Durable write requested without exact write approval | stop; no fallback write |

## M3-T3 Conclusion

Fallback can remain useful without becoming a hidden replacement for
VCPToolBox. Any fallback use must be explicit, marked, scoped, low-disclosure,
and receipted.

Next safe route: M4 invocation contract design, still without live runtime
execution.
