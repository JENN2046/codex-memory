# VCP Memory Trusted-Write-Proposal Exact Approval Packet Preparation

Task id: `M9-K2-TRUSTED-WRITE-PROPOSAL-EXACT-APPROVAL-PACKET-PREPARATION`
Implementation slice: `CM-1742`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_TRUSTED_WRITE_PROPOSAL_HARNESS_DRAFT_BOUNDARY.md`
Evidence type: `docs-only`, `approval packet preparation`, `no-runtime`, `no-write`

## Purpose

This document prepares the future exact approval packet shape for a
`trusted-write-proposal` harness.

It does not provide a real approval line, submit an approval request, bind a
live target, provide real proposal operations, generate a proposal, submit a
proposal, call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, unlock M10, or
claim readiness.

## Packet State

```yaml
packet_state:
  packet_id: m9_trusted_write_proposal_exact_approval_packet_preparation_cm1742
  profile: trusted-write-proposal
  source_m9_harness_draft_boundary: cm1741
  source_m9_precondition_record: cm1740
  execution_authorized: false
  approval_line_present: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  m8_trusted_full_read_receipt_accepted: false
  trusted_write_proposal_profile_approved: false
  real_target_bound: false
  real_proposal_scope_bound: false
  real_proposal_operations_bound: false
  proposal_review_route_bound: false
  live_runtime_call_performed: false
  proposal_harness_started: false
  proposal_generation_authorized: false
  proposal_submission_authorized: false
  write_proposal_generated: false
  write_proposal_submitted: false
  memory_read_performed: false
  memory_write_performed: false
  durable_write_allowed: false
  durable_write_performed: false
  runtime_mutation_allowed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
```

This packet is a preparation artifact only. It cannot be pasted or treated as
approval.

## Exact Fields Required From Jenn Later

Future proposal generation requires a separate current exact approval boundary
that supplies all fields below. Values are intentionally absent here.

| Field | Required state now | Future exact approval requirement |
|---|---|---|
| `m8_trusted_full_read_receipt_id` | `EXACT_REQUIRED_NOT_SET` | accepted exact-approved trusted-full-read workflow receipt id |
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_NOT_SET` | one exact approved transport only |
| `profile` | `trusted-write-proposal` | may be narrowed, but cannot escalate to `trusted-full` durable write |
| `proposal_scope` | `EXACT_REQUIRED_NOT_SET` | exact memory surface, topic, client, and visibility boundary |
| `proposal_operations` | `EXACT_REQUIRED_NOT_SET` | exact non-durable proposal operation list supplied by Jenn later |
| `proposal_payload_shape` | `EXACT_REQUIRED_NOT_SET` | redacted low-disclosure proposal shape only |
| `client_ids` | `EXACT_REQUIRED_NOT_SET` | exact Codex/Claude client ids or safe aliases |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | exact workspace/project boundary |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | exact owner/operator boundary |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | exact visibility boundary per client |
| `review_route` | `EXACT_REQUIRED_NOT_SET` | exact accept/reject route; no auto-accept |
| `rollback_posture` | `EXACT_REQUIRED_NOT_SET` | rollback, supersession, or tombstone posture without applying it |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | exact integer runtime-call budget |
| `max_proposals` | `EXACT_REQUIRED_NOT_SET` | exact integer proposal budget |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | exact integer duration budget |
| `output_disclosure` | `EXACT_REQUIRED_NOT_SET` | redacted proposal shape/metadata only unless separately exact-approved |
| `receipt_plan` | `EXACT_REQUIRED_NOT_SET` | proposal receipt and rollback posture only |
| `write_allowed` | `false` | direct writes forbidden |
| `durable_write_allowed` | `false` | durable writes forbidden in M9 |
| `direct_update_allowed` | `false` | direct updates forbidden |
| `direct_supersede_allowed` | `false` | direct supersede forbidden |
| `direct_tombstone_allowed` | `false` | direct tombstone forbidden |
| `broad_scan_allowed` | `false` | broad scan forbidden |
| `provider_api_allowed` | `false` | provider/API calls forbidden |
| `public_mcp_expansion_allowed` | `false` | public MCP expansion forbidden |
| `fallback_allowed` | `false` | no fallback execution in this packet |

## Future Allowed Action Boundary

If Jenn later provides an exact approval packet, the future action is limited
to:

- policy evaluation against the accepted M8 trusted-full-read receipt;
- bounded proposal-context shape reference without raw memory output;
- non-durable proposal envelope rendering;
- low-disclosure diff/intent/rollback receipt rendering;
- accept/reject review route rendering;
- L4 hard-stop evaluation for write intent;
- no durable write, no memory write, no direct update, no direct supersede, no
  direct tombstone, no broad scan, no provider/API, no fallback success claim,
  no public MCP expansion, and no readiness claim.

## Forbidden Actions

The future execution boundary must stop before:

- missing or stale M8 trusted-full-read workflow receipt;
- unapproved target alias, transport, profile, proposal scope, operation list,
  client, scope, visibility, review route, rollback posture, or budget;
- any generated or guessed proposal operation;
- any proposal that directly mutates memory or implies durable write authority;
- auth ambiguity or prompt for credentials;
- secrets, tokens, cookies, endpoints, paths, locators, config/env values, or
  provider/auth material;
- raw memory, raw runtime, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt content, or private payloads;
- memory write, direct update, direct supersede, direct tombstone, durable
  mutation, migration, import/export, broad scan, or backfill;
- provider/API call;
- cross-client private leakage or visibility expansion;
- public MCP tool/schema expansion;
- config/startup/watchdog/dependency change;
- push, release, deploy, cutover, production readiness, release readiness,
  `RC_READY`, complete V8 claim, or M10 unlock.

## Stop Conditions

Any future attempt must abort with a low-disclosure receipt if:

- `m8_trusted_full_read_receipt_id` is missing, stale, unaccepted, or
  mismatched;
- target alias, transport, profile, proposal scope, proposal operations,
  client, scope, visibility, review route, rollback posture, proposal budget,
  call budget, or duration budget is missing or ambiguous;
- output cannot be summarized as redacted proposal shape/metadata;
- proposal content would disclose raw private payload;
- proposal count exceeds the exact budget;
- cross-client leakage risk appears;
- runtime attempts more calls or duration than approved;
- any direct write, direct update, direct supersede, direct tombstone, broad
  scan, provider/API, secret/config read, public MCP expansion, or readiness
  claim is requested.

## Receipt Skeleton

```yaml
trusted_write_proposal_packet_preparation_receipt:
  receipt_id: cm1742_trusted_write_proposal_exact_approval_packet_preparation
  packet_id: m9_trusted_write_proposal_exact_approval_packet_preparation_cm1742
  profile: trusted-write-proposal
  source_harness_draft_boundary: cm1741
  source_precondition_record: cm1740
  exact_fields_complete: false
  m8_trusted_full_read_receipt_id_present: false
  target_alias_present: false
  transport_present: false
  proposal_scope_present: false
  proposal_operations_present: false
  proposal_payload_shape_present: false
  client_ids_present: false
  workspace_scope_present: false
  owner_scope_present: false
  visibility_present: false
  review_route_present: false
  rollback_posture_present: false
  max_calls_present: false
  max_proposals_present: false
  max_duration_seconds_present: false
  receipt_plan_present: false
  execution_authorized_by_this_packet: false
  proposal_generation_authorized_by_this_packet: false
  proposal_submission_authorized_by_this_packet: false
  durable_write_authorized_by_this_packet: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  runtime_calls_used: 0
  memory_reads_used: 0
  proposals_generated: 0
  proposals_submitted: 0
  memory_write_performed: false
  durable_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  public_mcp_expansion_performed: false
  fallback_executed: false
  m10_unlocked: false
  readiness_claimed: false
  next_action_allowed: exact_approval_required_before_proposal_generation
```

## Review Gate

Before any future M9 proposal generation, the operator/agent must confirm:

1. The packet still serves the VCPToolBox-native governed bridge goal.
2. An accepted M8 trusted-full-read workflow receipt exists.
3. Jenn supplied a current exact `trusted-write-proposal` approval boundary.
4. The proposal operations were supplied by Jenn in the current context and
   are bounded.
5. M5 client/scope/visibility checks pass for every client.
6. Output is redacted proposal shape/metadata only.
7. Review route and rollback posture are explicit.
8. Direct writes, durable writes, direct updates, direct supersedes, direct
   tombstones, broad scans, provider/API calls, fallback execution, public MCP
   expansion, M10 unlock, and readiness claims remain forbidden.

If any item is false or uncertain, proposal generation must not start.

## M9-K2 Preparation Conclusion

M9-K2 now has a non-authorizing exact approval packet preparation artifact. It
is sufficient to review future approval requirements, but it is not approval
and it does not generate or submit a proposal.

Next safe route: exact approval decision/review boundary for M9, still without
workflow/runtime/proposal generation/write, or remain blocked until accepted M8
trusted-full-read receipt and exact Jenn trusted-write-proposal approval exist.
