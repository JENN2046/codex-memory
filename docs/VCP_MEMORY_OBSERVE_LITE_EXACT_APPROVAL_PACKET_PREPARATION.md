# VCP Memory Observe-Lite Exact Approval Packet Preparation

Task id: `M6-K1-OBSERVE-LITE-EXACT-APPROVAL-PACKET`
Implementation slice: `CM-1722`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_CLIENT_SCOPE_VISIBILITY_MATRIX.md`
Evidence type: `docs-only`, `approval packet preparation`, `no-runtime`

## Purpose

This document prepares the future exact approval packet shape for the first
`observe-lite` target/transport proof.

It does not provide a real approval line, bind a real target, call VCPToolBox,
inspect a runtime, read memory, write memory, call providers/APIs, read
secrets/config, expand public MCP tools, or claim readiness.

## Packet State

```yaml
packet_state:
  packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  profile: observe-lite
  execution_authorized: false
  approval_line_present: false
  approval_line_value_disclosed: false
  real_target_bound: false
  live_runtime_call_performed: false
  memory_read_allowed: false
  memory_write_allowed: false
  provider_api_allowed: false
  config_secret_read_allowed: false
  readiness_claim_allowed: false
```

This packet is a preparation artifact only. It cannot be pasted or treated as
approval.

## Exact Fields Required From Jenn Later

Future execution requires a separate exact approval boundary that supplies all
fields below. Values are intentionally absent here.

| Field | Required state now | Future exact approval requirement |
|---|---|---|
| `target_alias` | `EXACT_REQUIRED_NOT_SET` | safe alias only; no path, endpoint, token, or secret value |
| `transport` | `EXACT_REQUIRED_NOT_SET` | one exact transport such as MCP server, CLI, IPC, or service alias |
| `client_id` | `EXACT_REQUIRED_NOT_SET` | safe client family/alias or presence proof |
| `workspace_scope` | `EXACT_REQUIRED_NOT_SET` | exact workspace/project boundary |
| `owner_scope` | `EXACT_REQUIRED_NOT_SET` | exact owner/operator scope |
| `visibility` | `EXACT_REQUIRED_NOT_SET` | `private`, `shared`, or `public` with policy boundary |
| `max_calls` | `EXACT_REQUIRED_NOT_SET` | upper bound must be exact; recommended maximum 1 |
| `max_duration_seconds` | `EXACT_REQUIRED_NOT_SET` | upper bound must be exact; recommended maximum 60 |
| `max_results` | `0` | observe-lite must not return memory results |
| `output_disclosure` | `target/handshake metadata only` | no raw ids, paths, private content, prompt content, or memory data |
| `allowed_actions` | `target_presence_check`, `transport_handshake_check` | no memory read/write |
| `forbidden_actions` | fixed by this packet | memory read/write, provider/API, secret/config, broad discovery, readiness claim |
| `receipt_required` | `true` | low-disclosure receipt required for any future attempt |

## Future Allowed Action Boundary

If Jenn later provides an exact approval packet, the allowed future action is
limited to:

- one target alias presence check;
- one transport/handshake compatibility check;
- low-disclosure observe-lite receipt generation;
- no memory result retrieval.

## Forbidden Actions

The future execution boundary must stop before:

- unapproved target alias or transport;
- auth ambiguity or prompt for credentials;
- secrets, tokens, cookies, endpoints, locator values, config/env values, or
  provider/auth material;
- raw memory, raw runtime, raw audit, raw sqlite/jsonl/cache/vector rows, raw
  DailyNote/RAG/prompt content, or private payloads;
- memory read, memory write, write proposal, migration, import/export, broad
  scan, or backfill;
- provider/API call;
- public MCP tool/schema expansion;
- config/startup/watchdog/dependency change;
- push, release, deploy, cutover, production readiness, release readiness,
  `RC_READY`, or complete V8 claim.

## Stop Conditions

Any future attempt must abort with low-disclosure receipt if:

- `target_alias` is missing, stale, ambiguous, or mismatched;
- transport is missing, stale, ambiguous, or mismatched;
- credentials, config, endpoint, path, or secret material is required;
- any memory payload or private data is returned;
- result count is greater than zero;
- runtime attempts more calls or duration than approved;
- scope, client identity, owner, or visibility is missing;
- cross-client private leakage risk appears;
- output cannot be summarized without raw/private disclosure.

## Receipt Skeleton

```yaml
observe_lite_receipt:
  receipt_id: <safe_id>
  packet_id: m6_observe_lite_exact_approval_packet_preparation_cm1722
  profile: observe-lite
  target_alias_present: <true|false>
  transport_present: <true|false>
  client_id_present: <true|false>
  workspace_scope_present: <true|false>
  owner_scope_present: <true|false>
  visibility_present: <true|false>
  execution_authorized_by_this_packet: false
  approval_line_value_disclosed: false
  runtime_calls_used: 0
  memory_results_returned: 0
  memory_read_performed: false
  memory_write_performed: false
  provider_api_calls_used: 0
  secret_or_config_read: false
  raw_private_payload_disclosed: false
  readiness_claimed: false
  stop_condition: <safe_code_or_absent>
  next_action_allowed: exact_approval_required_before_execution
```

## Review Gate

Before any future execution, the operator/agent must confirm:

1. The packet still serves the VCPToolBox-native governed bridge goal.
2. All exact fields are provided by Jenn in the current context.
3. The approval boundary is not stale and does not rely on this preparation
   document as authorization.
4. M5 policy shield and client/scope/visibility checks pass.
5. The output cannot include memory content or raw private runtime data.

If any item is false or uncertain, execution must not start.

## M6-K1 Preparation Conclusion

M6-K1 now has a non-authorizing packet preparation artifact. It is sufficient
to request or review a future exact approval boundary, but it is not approval
and it does not execute observe-lite.

Next safe route: exact approval decision/review boundary for observe-lite, or
remain blocked before live runtime until Jenn supplies an exact current
approval boundary.
