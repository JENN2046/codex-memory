# VCP Memory Invocation Contract Spec

Task id: `M4-K1-VCP-INVOCATION-CONTRACT-SPEC`
Implementation slice: `CM-1718`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Evidence type: `docs-only`, `contract spec`, `fixture examples`, `no-runtime`

## Purpose

This spec defines the request, result, error, receipt, fallback marker, and
disclosure-budget shapes for future governed VCPToolBox-native memory calls.

It does not call VCPToolBox, discover a target, read raw runtime or private
memory, write durable memory, call providers/APIs, expand public MCP tools,
issue or store a real approval line, or claim readiness.

## Scope

This contract applies to future calls that route through a governed
`codex-memory` bridge into a VCPToolBox-native memory surface.

Allowed profile vocabulary:

- `observe-lite`
- `observe-full`
- `trusted-full-read`
- `trusted-write-proposal`
- `trusted-full`

Allowed target surface vocabulary is inherited from
`docs/VCPTOOLBOX_NATIVE_MEMORY_CAPABILITY_INVENTORY.md`:

- `DailyNote`
- `DailyNoteManager`
- `KnowledgeBaseManager`
- `TagMemo`
- `TagMemoEngine`
- `LightMemo`
- `TDBKnowledge`
- `DeepMemo`
- `TopicMemo`
- `MeshMemo`
- `RAGDiaryPlugin`

## Request Envelope

Every future invocation request must be represented by a low-disclosure
envelope before execution.

```yaml
vcp_memory_invocation_request:
  request_id: <safe_id>
  contract_version: vcp_memory_invocation_contract_v1
  profile: <observe-lite|observe-full|trusted-full-read|trusted-write-proposal|trusted-full>
  operation_type: <observe|read|write_proposal|write>
  target:
    alias: <safe_alias>
    kind: <local_checkout|service_url|mcp_server|cli|plugin_api|ipc>
    locator_hash_present: <true|false>
    locator_value_present: <true|false>
    locator_value_disclosed: false
  principal:
    client_id_present: <true|false>
    workspace_scope_present: <true|false>
    owner_scope_present: <true|false>
    visibility: <private|shared|public|unknown>
  requested_components:
    - <surface_name>
  requested_actions:
    - <action_name>
  budgets:
    max_runtime_calls: <integer>
    max_results: <integer>
    max_output_chars: <integer>
    max_duration_seconds: <integer>
    max_write_count: <integer>
  output_policy:
    disclosure_level: <summary|structured|raw-approved>
    raw_output_allowed: <true|false>
    secret_value_allowed: false
    raw_private_payload_allowed: <true|false>
  fallback_policy:
    local_fallback_allowed: <true|false>
    fallback_reason_if_used: <safe_reason_code_or_absent>
  approval_boundary:
    approval_line_present: <true|false>
    approval_line_value_disclosed: false
    exact_approval_required: <true|false>
  receipt_required: true
```

The envelope must fail closed when required principal, scope, visibility,
target alias, profile, component, action, budget, output policy, fallback
policy, or approval-boundary fields are missing.

## Profile Constraints

| Profile | Allowed operation types | Raw output | Write posture |
|---|---|---|---|
| `observe-lite` | `observe` | no | no write, no proposal |
| `observe-full` | `observe`, `read` | only if exact packet approves named component raw mode | no write, no proposal |
| `trusted-full-read` | `observe`, `read` | only if exact packet approves named component raw mode | no write, no proposal |
| `trusted-write-proposal` | `observe`, `read`, `write_proposal` | only if exact packet approves named component raw mode | proposal only, durable write forbidden |
| `trusted-full` | `observe`, `read`, `write_proposal`, `write` | only if exact packet approves named component raw mode | durable write allowed only by separate exact write approval |

`trusted-full` in this spec is still a contract shape only. It does not grant
write authority.

## Result Envelope

All results must normalize into one of these statuses:

- `success`
- `fallback_success`
- `denied`
- `stopped_l4`
- `unknown_target`
- `partial`
- `error`

```yaml
vcp_memory_invocation_result:
  request_id: <safe_id>
  receipt_id: <safe_id>
  status: <success|fallback_success|denied|stopped_l4|unknown_target|partial|error>
  source_runtime: <vcp_toolbox|local_fallback|none>
  profile: <profile>
  operation_type: <operation_type>
  target_alias: <safe_alias_or_absent>
  components_used:
    - <surface_name>
  scope:
    client_id_present: <true|false>
    workspace_scope_present: <true|false>
    visibility: <private|shared|public|unknown>
  evidence:
    level: <fixture-only|schema-only|read-only|live-runtime>
    live_runtime_claimed: false
    raw_payload_included: false
  output:
    disclosure_level: <summary|structured|raw-approved|none>
    items_count: <integer>
    summary_items:
      - <low_disclosure_summary>
  fallback:
    used: <true|false>
    reason: <safe_reason_code_or_absent>
    vcp_native_result: <true|false>
  warnings:
    - <safe_warning_code>
```

Client-facing output must never require raw VCP private payload. Raw output is
allowed only when an exact future approval packet names the component, scope,
visibility, and disclosure budget. This M4-K1 document provides no such
approval.

## Error Taxonomy

| Code | Meaning | Required result status |
|---|---|---|
| `ERR_UNKNOWN_TARGET_ALIAS` | Target alias is absent, stale, or not exact | `unknown_target` |
| `ERR_PROFILE_SCOPE_MISMATCH` | Requested profile exceeds approved scope | `denied` |
| `ERR_COMPONENT_NOT_ALLOWED` | Component is not listed in the boundary | `denied` |
| `ERR_ACTION_NOT_ALLOWED` | Requested action is not allowed for profile | `denied` |
| `ERR_L4_HARD_STOP` | Request touches a hard-stop boundary | `stopped_l4` |
| `ERR_RAW_OUTPUT_NOT_APPROVED` | Raw private output is requested without exact approval | `denied` |
| `ERR_WRITE_NOT_APPROVED` | Write/proposal/write count exceeds approval | `stopped_l4` |
| `ERR_SCOPE_MISSING` | Client, workspace, owner, or visibility scope is absent | `denied` |
| `ERR_FALLBACK_NOT_ALLOWED` | Local fallback would hide a required VCP-native result | `denied` |
| `ERR_PARTIAL_RESULT_BUDGET` | Execution would exceed budget or output cap | `partial` |

Errors must not echo secret values, locator values, raw private memory, raw
audit rows, raw runtime responses, provider payloads, approval-line values, or
environment/config details.

## Receipt Envelope

Every future invocation attempt, including denied and stopped attempts, must
produce a low-disclosure receipt.

```yaml
vcp_memory_invocation_receipt:
  receipt_id: <safe_id>
  timestamp: <iso8601>
  request_id: <safe_id>
  contract_version: vcp_memory_invocation_contract_v1
  profile: <profile>
  target_alias: <safe_alias_or_absent>
  target_kind: <kind_or_absent>
  client_id_present: <true|false>
  workspace_scope_present: <true|false>
  owner_scope_present: <true|false>
  visibility_present: <true|false>
  operation_type: <operation_type>
  components_requested_count: <integer>
  actions_requested_count: <integer>
  decision: <allow|deny|stop|partial|fallback>
  result_status: <result_status>
  fallback_used: <true|false>
  vcp_native_result: <true|false>
  runtime_calls_used: <integer>
  provider_api_calls_used: 0
  durable_write_count: <integer>
  raw_private_payload_disclosed: false
  secret_value_disclosed: false
  approval_line_value_disclosed: false
  public_mcp_expansion: false
  readiness_claimed: false
  rollback_or_cleanup_available: <true|false|not_applicable>
  next_action_allowed: <safe_next_action_code>
```

## Static Fixture Examples

These examples are schema fixtures only. They are not runtime evidence.

### Success

```yaml
request:
  request_id: req_m4_fixture_success_001
  profile: observe-full
  operation_type: read
  target:
    alias: approved_vcp_alias
    kind: mcp_server
    locator_hash_present: true
    locator_value_present: true
    locator_value_disclosed: false
  principal:
    client_id_present: true
    workspace_scope_present: true
    owner_scope_present: true
    visibility: private
  requested_components: [DailyNoteManager]
  requested_actions: [daily_note_manager.recall]
  budgets:
    max_runtime_calls: 3
    max_results: 5
    max_output_chars: 2000
    max_duration_seconds: 180
    max_write_count: 0
  output_policy:
    disclosure_level: structured
    raw_output_allowed: false
    secret_value_allowed: false
    raw_private_payload_allowed: false
result:
  status: success
  source_runtime: vcp_toolbox
  evidence:
    level: schema-only
    live_runtime_claimed: false
    raw_payload_included: false
```

### Fallback

```yaml
result:
  status: fallback_success
  source_runtime: local_fallback
  fallback:
    used: true
    reason: vcp_target_unapproved
    vcp_native_result: false
  evidence:
    level: fixture-only
    live_runtime_claimed: false
    raw_payload_included: false
```

### Denied

```yaml
error:
  code: ERR_COMPONENT_NOT_ALLOWED
  status: denied
  safe_message: requested component is outside the approved invocation boundary
```

### L4 Stop

```yaml
error:
  code: ERR_L4_HARD_STOP
  status: stopped_l4
  safe_message: request requires raw private output or durable mutation outside exact approval
```

### Unknown Target

```yaml
error:
  code: ERR_UNKNOWN_TARGET_ALIAS
  status: unknown_target
  safe_message: target alias is missing or not exact
```

### Partial

```yaml
result:
  status: partial
  source_runtime: vcp_toolbox
  evidence:
    level: schema-only
    live_runtime_claimed: false
    raw_payload_included: false
  warnings:
    - ERR_PARTIAL_RESULT_BUDGET
```

## Negative Examples

The following cases must fail closed:

- request includes a real path, endpoint, token, cookie, secret, or config/env
  value;
- request asks for raw private payload without an exact component/scope budget;
- request asks for durable write under any profile except future exact-approved
  `trusted-full`;
- request has unknown `client_id`, workspace scope, owner scope, or visibility;
- local fallback would hide a VCP-native-only requirement;
- receipt would need to expose an approval-line value;
- output would claim live runtime proof from fixture-only or schema-only
  evidence;
- response claims production, release, cutover, `RC_READY`, or complete V8.

## M4-K1 Conclusion

M4-K1 provides an unambiguous static contract for future governed invocation
work. It is sufficient to support schema review and future fixture tests, but
it is not runtime proof and does not unlock live calls.

Next safe route: M4-K2 result normalization contract, still without live
runtime execution.
