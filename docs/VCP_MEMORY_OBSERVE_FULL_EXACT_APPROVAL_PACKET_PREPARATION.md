# VCP Memory Observe-Full Exact Approval Packet Preparation

Task id: `M7-K1-OBSERVE-FULL-EXACT-APPROVAL-PACKET-PREPARATION`
Implementation slice: `CM-1728`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_OBSERVE_FULL_M7_BLOCKED_PRECONDITION_RECORD.md`
Evidence type: `docs-only`, `approval packet preparation`, `no-runtime`

## Purpose

This document prepares the future exact approval packet shape for an
observe-full read-shape proof.

It does not provide a real approval line, bind a live target, provide a real
query, call VCPToolBox, inspect runtime, read memory, write memory, call
providers/APIs, read secrets/config, expand public MCP tools, unlock M8, or
claim readiness.

## Packet State

```yaml
packet_state:
  packet_id: m7_observe_full_exact_approval_packet_preparation_cm1728
  profile: observe-full
  source_m7_precondition_record: cm1727
  source_m6_closeout: cm1726
  execution_authorized: false
  approval_line_present: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  m6_observe_lite_receipt_accepted: false
  real_target_bound: false
  real_query_bound: false
  live_runtime_call_performed: false
  read_shape_proof_started: false
  memory_read_performed: false
  memory_write_performed: false
  provider_api_called: false
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  m8_unlocked: false
  readiness_claimed: false
```

This packet is a preparation artifact only. It cannot be pasted or treated as
approval.

## Exact Fields Required From Jenn Later

Future execution requires a separate current exact approval boundary that
supplies all fields below. Values are intentionally absent here.

| Field | Required state now | Future exact approval requirement |
|---|---|---|
| `m6_receipt_id` | `EXACT_REQUIRED_NOT_SET` | accepted exact-approved observe-lite receipt id |
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | safe alias only; no path, endpoint, token, secret, or locator |
| `transport` | `EXACT_REQUIRED_NOT_SET` | one exact transport only |
| `profile` | `observe-full` | may be narrowed, but cannot escalate to trusted-full-read |
| `query` | `EXACT_REQUIRED_NOT_SET` | exact bounded query supplied by Jenn later; omitted here |
| `client_id` | `EXACT_REQUIRED_NOT_SET` | exact client id or safe alias |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | exact workspace/project boundary |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | exact owner/operator boundary |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | exact visibility boundary |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | exact integer runtime-call budget |
| `max_results` | `EXACT_REQUIRED_NOT_SET` | exact integer result-shape budget |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | exact integer duration budget |
| `output_disclosure` | `redacted shape / metadata only` | no raw private payload unless separately exact-approved |
| `write_allowed` | `false` | writes forbidden |
| `broad_scan_allowed` | `false` | broad scan forbidden |
| `fallback_allowed` | `false` | no fallback execution in this packet |

## Future Allowed Action Boundary

If Jenn later provides an exact approval packet, the future action is limited
to:

- one bounded observe-full read-shape call or narrower read-shape call;
- response shape capture only;
- redacted/metadata-only receipt generation;
- normalization gap listing without raw memory content;
- policy evaluation against M5 client/scope/visibility constraints;
- no write, no broad scan, no provider/API, no fallback success claim.

## Forbidden Actions

The future execution boundary must stop before:

- missing or stale M6 observe-lite receipt;
- unapproved target alias, transport, profile, query, client, scope,
  visibility, or budget;
- any generated or guessed query value;
- auth ambiguity or prompt for credentials;
- secrets, tokens, cookies, endpoints, paths, locators, config/env values, or
  provider/auth material;
- raw memory, raw runtime, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt content, or private payloads;
- memory write, write proposal, durable mutation, migration, import/export,
  broad scan, or backfill;
- provider/API call;
- cross-client private leakage or visibility expansion;
- public MCP tool/schema expansion;
- config/startup/watchdog/dependency change;
- push, release, deploy, cutover, production readiness, release readiness,
  `RC_READY`, complete V8 claim, or M8 unlock.

## Stop Conditions

Any future attempt must abort with a low-disclosure receipt if:

- `m6_receipt_id` is missing, stale, unaccepted, or mismatched;
- target alias, transport, profile, query, client, scope, visibility, result
  budget, call budget, or duration budget is missing or ambiguous;
- output cannot be summarized as redacted shape/metadata;
- raw private payload appears unexpectedly;
- result count exceeds the exact budget;
- cross-client leakage risk appears;
- runtime attempts more calls or duration than approved;
- any write, broad scan, provider/API, secret/config read, public MCP
  expansion, or readiness claim is requested.

## Receipt Skeleton

```yaml
observe_full_packet_preparation_receipt:
  receipt_id: cm1728_observe_full_exact_approval_packet_preparation
  packet_id: m7_observe_full_exact_approval_packet_preparation_cm1728
  profile: observe-full
  source_precondition_record: cm1727
  exact_fields_complete: false
  m6_receipt_id_present: false
  target_alias_present: false
  transport_present: false
  query_present: false
  client_id_present: false
  workspace_scope_present: false
  owner_scope_present: false
  visibility_present: false
  max_calls_present: false
  max_results_present: false
  max_duration_seconds_present: false
  execution_authorized_by_this_packet: false
  approval_line_value_disclosed: false
  approval_request_submitted: false
  approval_granted: false
  runtime_calls_used: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  fallback_executed: false
  m8_unlocked: false
  readiness_claimed: false
  next_action_allowed: exact_approval_required_before_execution
```

## Review Gate

Before any future M7 execution, the operator/agent must confirm:

1. The packet still serves the VCPToolBox-native governed bridge goal.
2. An accepted M6 observe-lite receipt exists.
3. Jenn supplied a current exact read-shape approval boundary.
4. The query was supplied by Jenn in the current context and is bounded.
5. M5 client/scope/visibility checks pass.
6. Output is redacted shape/metadata only.
7. Writes, broad scans, provider/API calls, fallback execution, and readiness
   claims remain forbidden.

If any item is false or uncertain, execution must not start.

## M7-K1 Preparation Conclusion

M7-K1 now has a non-authorizing exact approval packet preparation artifact. It
is sufficient to review or request future exact approval, but it is not
approval and it does not execute observe-full.

Next safe route: exact approval decision/review boundary for M7, still without
query/runtime, or remain blocked until accepted M6 receipt and exact Jenn
read-shape approval exist.
