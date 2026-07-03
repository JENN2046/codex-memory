# VCP Memory Trusted-Full-Read Exact Approval Packet Preparation

Task id: `M8-K2-TRUSTED-FULL-READ-EXACT-APPROVAL-PACKET-PREPARATION`
Implementation slice: `CM-1735`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_FULL_READ_HARNESS_DRAFT_BOUNDARY.md`
Evidence type: `docs-only`, `approval packet preparation`, `no-runtime`

## Purpose

This document prepares the future exact approval packet shape for a
trusted-full-read workflow harness.

It does not provide a real approval line, bind a live target, provide real
workflow steps, call VCPToolBox, inspect runtime, read memory, write memory,
call providers/APIs, read secrets/config, expand public MCP tools, unlock M9,
or claim readiness.

## Packet State

```yaml
packet_state:
  packet_id: m8_trusted_full_read_exact_approval_packet_preparation_cm1735
  profile: trusted-full-read
  source_m8_harness_draft_boundary: cm1734
  source_m8_precondition_record: cm1733
  execution_authorized: false
  approval_line_present: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  m7_read_shape_receipt_accepted: false
  trusted_full_read_profile_approved: false
  real_target_bound: false
  real_workflow_bound: false
  live_runtime_call_performed: false
  workflow_harness_started: false
  workflow_steps_executed: 0
  memory_read_performed: false
  memory_write_performed: false
  durable_write_allowed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
```

This packet is a preparation artifact only. It cannot be pasted or treated as
approval.

## Exact Fields Required From Jenn Later

Future execution requires a separate current exact approval boundary that
supplies all fields below. Values are intentionally absent here.

| Field | Required state now | Future exact approval requirement |
|---|---|---|
| `m7_read_shape_receipt_id` | `EXACT_REQUIRED_NOT_SET` | accepted exact-approved observe-full receipt id |
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_NOT_SET` | one exact transport only |
| `profile` | `trusted-full-read` | may be narrowed, but cannot escalate to write/proposal/trusted-full |
| `workflow_step_limit` | `EXACT_REQUIRED_NOT_SET` | exact integer |
| `recall_operations` | `EXACT_REQUIRED_NOT_SET` | exact bounded operation list supplied by Jenn later |
| `client_ids` | `EXACT_REQUIRED_NOT_SET` | exact Codex/Claude client ids or safe aliases |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | exact workspace/project boundary |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | exact owner/operator boundary |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | exact visibility boundary per client |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | exact integer runtime-call budget |
| `max_results_per_step` | `EXACT_REQUIRED_NOT_SET` | exact integer result budget per workflow step |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | exact integer duration budget |
| `output_disclosure` | `EXACT_REQUIRED_NOT_SET` | redacted summary/shape/metadata only unless separately exact-approved |
| `receipt_chain` | `EXACT_REQUIRED_NOT_SET` | checkpoint/handoff/audit receipt rules only |
| `write_allowed` | `false` | writes forbidden |
| `write_proposal_allowed` | `false` | proposal mode belongs to M9, not M8 |
| `broad_scan_allowed` | `false` | broad scan forbidden |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |
| `fallback_allowed` | `false` | no fallback execution in this packet |

## Future Allowed Action Boundary

If Jenn later provides an exact approval packet, the future action is limited
to:

- bounded trusted-full-read workflow steps;
- client_id isolation checks for Codex/Claude scope;
- checkpoint/handoff/audit receipt capture without durable memory writes;
- redacted summary/shape/metadata output only;
- fallback and abort behavior evaluation without fallback success claim;
- policy evaluation against M5 client/scope/visibility constraints;
- no write, no write proposal, no broad scan, no provider/API, no public MCP
  expansion, and no readiness claim.

## Forbidden Actions

The future execution boundary must stop before:

- missing or stale M7 observe-full read-shape receipt;
- unapproved target alias, transport, profile, workflow step, client, scope,
  visibility, receipt chain, or budget;
- any generated or guessed workflow operation;
- auth ambiguity or prompt for credentials;
- secrets, tokens, cookies, endpoints, paths, locators, config/env values, or
  provider/auth material;
- raw memory, raw runtime, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt content, or private payloads;
- checkpoint/handoff/audit receipt generation that requires durable memory
  write, raw store read, or private payload disclosure;
- memory write, write proposal, durable mutation, migration, import/export,
  broad scan, or backfill;
- provider/API call;
- cross-client private leakage or visibility expansion;
- public MCP tool/schema expansion;
- config/startup/watchdog/dependency change;
- push, release, deploy, cutover, production readiness, release readiness,
  `RC_READY`, complete V8 claim, or M9 unlock.

## Stop Conditions

Any future attempt must abort with a low-disclosure receipt if:

- `m7_read_shape_receipt_id` is missing, stale, unaccepted, or mismatched;
- target alias, transport, profile, workflow steps, client, scope, visibility,
  receipt chain, result budget, call budget, or duration budget is missing or
  ambiguous;
- output cannot be summarized as redacted summary/shape/metadata;
- raw private payload appears unexpectedly;
- result count exceeds the exact budget;
- cross-client leakage risk appears;
- runtime attempts more calls or duration than approved;
- any write, write proposal, broad scan, provider/API, secret/config read,
  public MCP expansion, or readiness claim is requested.

## Receipt Skeleton

```yaml
trusted_full_read_packet_preparation_receipt:
  receipt_id: cm1735_trusted_full_read_exact_approval_packet_preparation
  packet_id: m8_trusted_full_read_exact_approval_packet_preparation_cm1735
  profile: trusted-full-read
  source_harness_draft_boundary: cm1734
  exact_fields_complete: false
  m7_read_shape_receipt_id_present: false
  target_alias_present: false
  transport_present: false
  workflow_step_limit_present: false
  recall_operations_present: false
  client_ids_present: false
  workspace_scope_present: false
  owner_scope_present: false
  visibility_present: false
  max_calls_present: false
  max_results_per_step_present: false
  max_duration_seconds_present: false
  receipt_chain_present: false
  execution_authorized_by_this_packet: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  runtime_calls_used: 0
  workflow_steps_executed: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  durable_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m9_unlocked: false
  readiness_claimed: false
  next_action_allowed: exact_approval_required_before_workflow_execution
```

## Review Gate

Before any future M8 execution, the operator/agent must confirm:

1. The packet still serves the VCPToolBox-native governed bridge goal.
2. An accepted M7 observe-full read-shape receipt exists.
3. Jenn supplied a current exact trusted-full-read approval boundary.
4. The workflow operations were supplied by Jenn in the current context and
   are bounded.
5. M5 client/scope/visibility checks pass for every client.
6. Output is redacted summary/shape/metadata only.
7. Checkpoint/handoff/audit receipts do not require durable memory writes.
8. Writes, write proposals, broad scans, provider/API calls, fallback
   execution, public MCP expansion, and readiness claims remain forbidden.

If any item is false or uncertain, execution must not start.

## M8-K2 Preparation Conclusion

M8-K2 now has a non-authorizing exact approval packet preparation artifact. It
is sufficient to review or request future exact approval, but it is not
approval and it does not execute trusted-full-read workflow.

Next safe route: exact approval decision/review boundary for M8, still without
workflow/runtime, or remain blocked until accepted M7 read-shape receipt and
exact Jenn trusted-full-read approval exist.
