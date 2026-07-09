# VCP Memory Bounded Mutation Exact Write Boundary Packet Preparation

Task id: `M10-K2-BOUNDED-MUTATION-EXACT-WRITE-BOUNDARY-PACKET-PREPARATION`
Implementation slice: `CM-1749`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_BOUNDED_MUTATION_HARNESS_DRAFT_BOUNDARY.md`
Evidence type: `docs-only`, `approval packet preparation`, `no-runtime`, `no-write`

## Purpose

This document prepares the future exact write-boundary approval packet shape
for M10 bounded mutation work.

It does not provide a real approval line, submit an approval request, bind a
live target, provide real mutation payload, call VCPToolBox, inspect runtime,
read memory, write memory, update memory, supersede memory, tombstone memory,
call providers/APIs, read secrets/config, expand public MCP tools, claim
bounded write safety, or claim readiness.

## Packet State

```yaml
packet_state:
  packet_id: m10_bounded_mutation_exact_write_boundary_packet_preparation_cm1749
  phase: bounded-autonomous-mutation
  source_m10_harness_draft_boundary: cm1748
  source_m10_precondition_record: cm1747
  execution_authorized: false
  approval_line_present: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  m9_proposal_mode_passed: false
  accepted_m9_proposal_receipts_present: false
  exact_write_boundary_approval_present: false
  real_target_bound: false
  real_mutation_family_bound: false
  real_mutation_scope_bound: false
  real_mutation_payload_bound: false
  rollback_posture_bound: false
  audit_receipt_plan_bound: false
  live_runtime_call_performed: false
  mutation_harness_started: false
  write_authorized: false
  update_authorized: false
  supersede_authorized: false
  tombstone_authorized: false
  memory_read_performed: false
  memory_write_performed: false
  memory_update_performed: false
  memory_supersede_performed: false
  memory_tombstone_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  bounded_write_safe_claimed: false
  readiness_claimed: false
```

This packet is a preparation artifact only. It cannot be pasted or treated as
approval.

## Exact Fields Required From Jenn Later

Future bounded mutation requires a separate current exact approval boundary
that supplies all fields below. Values are intentionally absent here.

| Field | Required state now | Future exact approval requirement |
|---|---|---|
| `accepted_m9_proposal_receipt_ids` | `EXACT_REQUIRED_NOT_SET` | accepted proposal-mode receipt ids |
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_NOT_SET` | one exact approved transport only |
| `mutation_family` | `EXACT_REQUIRED_NOT_SET` | one of write/update/supersede/tombstone |
| `mutation_scope` | `EXACT_REQUIRED_NOT_SET` | exact memory surface, item, client, and visibility boundary |
| `mutation_payload_shape` | `EXACT_REQUIRED_NOT_SET` | redacted low-disclosure shape only |
| `client_id` | `EXACT_REQUIRED_NOT_SET` | exact Codex/Claude/client alias |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | exact workspace/project boundary |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | exact owner/operator boundary |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | exact visibility boundary per client |
| `rollback_posture` | `EXACT_REQUIRED_NOT_SET` | reversal, supersession, tombstone, or abort posture |
| `audit_receipt_plan` | `EXACT_REQUIRED_NOT_SET` | mutation receipt and rollback/supersession audit rules |
| `max_mutations` | `EXACT_REQUIRED_NOT_SET` | exact integer mutation budget |
| `max_runtime_calls` | `EXACT_REQUIRED_NOT_SET` | exact integer runtime-call budget |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | exact integer duration budget |
| `output_disclosure` | `EXACT_REQUIRED_NOT_SET` | redacted mutation receipt/rollback metadata only |
| `secret_content_allowed` | `false` | secret content forbidden |
| `cross_client_private_leakage_allowed` | `false` | cross-client leakage forbidden |
| `irreversible_deletion_allowed` | `false` | irreversible deletion forbidden |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |
| `fallback_allowed` | `false` | no fallback execution in this packet |

## Future Allowed Action Boundary

If Jenn later provides an exact approval packet, the future action is limited
to:

- accepted M9 proposal receipt crosscheck;
- exact write-boundary field validation;
- M5 client/scope/visibility policy evaluation;
- L4 hard-stop evaluation for secrets, cross-client leakage, unbounded write,
  irreversible deletion, and raw output;
- low-disclosure mutation plan rendering;
- low-disclosure mutation receipt and rollback audit plan rendering.

This packet does not authorize the future runtime call or mutation itself.

## Forbidden Actions

The future execution boundary must stop before:

- missing or stale accepted M9 proposal receipts;
- unapproved target alias, transport, mutation family, mutation scope, payload
  shape, client, scope, visibility, rollback posture, audit receipt plan, or
  budget;
- any generated or guessed mutation payload;
- auth ambiguity or prompt for credentials;
- secrets, tokens, cookies, endpoints, paths, locators, config/env values, or
  provider/auth material;
- raw memory, raw runtime, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt content, or private payloads;
- unbounded memory write, direct update, direct supersede, direct tombstone,
  irreversible deletion, migration, import/export, broad scan, or backfill;
- provider/API call;
- cross-client private leakage or visibility expansion;
- public MCP tool/schema expansion;
- config/startup/watchdog/dependency change;
- push, release, deploy, cutover, production readiness, release readiness,
  `RC_READY`, complete V8 claim, or bounded write safety claim.

## Stop Conditions

Any future attempt must abort with a low-disclosure receipt if:

- accepted M9 proposal receipts are missing, stale, unaccepted, or mismatched;
- target alias, transport, mutation family, mutation scope, payload shape,
  client, workspace, owner, visibility, rollback posture, audit receipt plan,
  mutation budget, call budget, or duration budget is missing or ambiguous;
- output cannot be summarized as redacted mutation/rollback metadata;
- mutation content would disclose raw private payload;
- mutation count exceeds the exact budget;
- cross-client leakage risk appears;
- runtime attempts more calls or duration than approved;
- any broad scan, provider/API, secret/config read, public MCP expansion,
  release/deploy/cutover, or readiness claim is requested.

## Receipt Skeleton

```yaml
bounded_mutation_packet_preparation_receipt:
  receipt_id: cm1749_bounded_mutation_exact_write_boundary_packet_preparation
  packet_id: m10_bounded_mutation_exact_write_boundary_packet_preparation_cm1749
  phase: bounded-autonomous-mutation
  source_harness_draft_boundary: cm1748
  source_precondition_record: cm1747
  exact_fields_complete: false
  accepted_m9_proposal_receipts_present: false
  target_alias_present: false
  transport_present: false
  mutation_family_present: false
  mutation_scope_present: false
  mutation_payload_shape_present: false
  client_id_present: false
  workspace_scope_present: false
  owner_scope_present: false
  visibility_present: false
  rollback_posture_present: false
  audit_receipt_plan_present: false
  max_mutations_present: false
  max_runtime_calls_present: false
  max_duration_seconds_present: false
  execution_authorized_by_this_packet: false
  durable_mutation_authorized_by_this_packet: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  runtime_calls_used: 0
  memory_reads_used: 0
  memory_writes_used: 0
  memory_updates_used: 0
  memory_supersedes_used: 0
  memory_tombstones_used: 0
  durable_writes_used: 0
  mutation_receipts_created: 0
  rollback_audits_performed: 0
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  bounded_write_safe_claimed: false
  readiness_claimed: false
  next_action_allowed: exact_approval_required_before_runtime_or_mutation
```

## Review Gate

Before any future M10 runtime or mutation attempt, the operator/agent must
confirm:

1. The packet still serves the VCPToolBox-native governed bridge goal.
2. Accepted M9 proposal-mode receipts exist.
3. Jenn supplied a current exact M10 write boundary.
4. Mutation family, scope, payload shape, rollback posture, and audit receipt
   plan were supplied by Jenn in the current context.
5. M5 client/scope/visibility checks pass for every client.
6. Output is redacted mutation/rollback metadata only.
7. Secrets, cross-client leakage, irreversible deletion, broad scans,
   provider/API, fallback execution, public MCP expansion, and readiness claims
   remain forbidden.

If any item is false or uncertain, bounded mutation must not start.

## M10-K2 Packet Preparation Conclusion

CM-1749 prepares a non-authorizing exact write-boundary packet shape for future
M10 bounded mutation work. It does not authorize or execute mutation.

M10 remains blocked before runtime, write, update, supersede, tombstone, durable
mutation, bounded write safety proof, and readiness claim until Jenn provides a
separate exact approval boundary and the required accepted M9 proposal receipts
exist.
