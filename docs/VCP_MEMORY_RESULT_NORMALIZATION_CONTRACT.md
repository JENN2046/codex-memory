# VCP Memory Result Normalization Contract

Task id: `M4-K2-RESULT-NORMALIZATION-CONTRACT`
Implementation slice: `CM-1719`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Depends on: `docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md`
Evidence type: `docs-only`, `normalization contract`, `no-runtime`

## Purpose

This contract defines how future VCPToolBox-native memory results and local
fallback results must normalize before they are shown to Codex, Claude, or a
human operator.

It does not call VCPToolBox, read raw private memory, execute fallback, write
durable memory, call providers/APIs, expand public MCP tools, issue an
approval line, or claim readiness.

## Normalized Envelope

Every accepted, denied, stopped, fallback, partial, or error result must project
to this low-disclosure envelope.

```yaml
normalized_memory_result:
  result_id: <safe_id>
  request_id: <safe_id>
  receipt_id: <safe_id>
  contract_version: vcp_memory_result_normalization_v1
  status: <success|fallback_success|denied|stopped_l4|unknown_target|partial|error>
  source_runtime: <vcp_toolbox|local_fallback|none>
  source_component: <surface_name_or_absent>
  source_capability: <safe_action_or_absent>
  profile: <observe-lite|observe-full|trusted-full-read|trusted-write-proposal|trusted-full|absent>
  confidence:
    level: <none|low|medium|high>
    basis: <fixture|schema|bounded_read|exact_approved_live|fallback_policy>
    live_runtime_claimed: false
  evidence:
    evidence_type: <schema-only|fixture-only|read-only|live-runtime|none>
    evidence_refs:
      - <safe_doc_or_receipt_ref>
    raw_payload_included: false
    raw_payload_required_for_client: false
  scope:
    client_id_present: <true|false>
    workspace_scope_present: <true|false>
    owner_scope_present: <true|false>
    visibility: <private|shared|public|unknown>
    cross_client_checked: <true|false>
  fallback:
    used: <true|false>
    reason: <safe_reason_code_or_absent>
    vcp_native_result: <true|false>
  output:
    disclosure_level: <summary|structured|raw-approved|none>
    items_count: <integer>
    items:
      - item_id: <safe_id>
        item_type: <memory_summary|memory_pointer|decision|error|warning>
        text: <low_disclosure_text>
        source_component: <surface_name_or_absent>
        evidence_level: <none|low|medium|high>
        raw_source_ref_disclosed: false
  warnings:
    - <safe_warning_code>
  next_action_allowed: <safe_next_action_code>
```

`receipt_id`, `source_runtime`, confidence/evidence, scope, visibility, and
fallback fields are mandatory. Missing mandatory fields fail closed.

## Source Runtime Rules

| Source runtime | Allowed statuses | Required fallback flag | Client-facing raw payload |
|---|---|---:|---|
| `vcp_toolbox` | `success`, `partial`, `error` | `false` | not required; allowed only by exact future raw approval |
| `local_fallback` | `fallback_success`, `partial`, `error` | `true` | never required |
| `none` | `denied`, `stopped_l4`, `unknown_target`, `error` | `false` | never included |

`local_fallback` must never normalize to `vcp_native_result=true`.
For executed results, `vcp_toolbox` must never be used when the evidence came
only from local fixtures or local fallback execution.

## Confidence Rules

Confidence is a disclosure-safe quality marker, not a readiness claim.

| Basis | Maximum confidence | Notes |
|---|---|---|
| `schema` | `low` | Contract shape only |
| `fixture` | `low` | Synthetic/static examples only |
| `bounded_read` | `medium` | Future read-only evidence, no raw private output required |
| `exact_approved_live` | `high` | Future live evidence only after exact approval |
| `fallback_policy` | `medium` | Only when fallback is explicitly allowed and marked |

Current M4-K2 evidence can only use `schema` or `fixture` basis.

## Projection Rules

Normalization must preserve these invariants:

- client-facing output never requires raw VCP private payload;
- raw payload, locator, endpoint, token, cookie, secret, config/env value,
  approval-line value, raw audit row, raw sqlite/jsonl/cache row, vector row,
  prompt text, or provider payload is not projected;
- `visibility=unknown` cannot produce `success` or `fallback_success`;
- missing client/workspace/owner scope cannot produce `success` or
  `fallback_success`;
- cross-client private data risk must normalize to `denied` or `stopped_l4`;
- durable write without exact write approval normalizes to `stopped_l4`;
- fixture-only/schema-only evidence cannot set `live_runtime_claimed=true`;
- normalized output cannot claim production readiness, release readiness,
  cutover readiness, `RC_READY`, or complete V8.

## Status Mapping

| Input condition | Normalized status | Required source runtime | Required receipt decision |
|---|---|---|---|
| Approved VCP read shape succeeds | `success` | `vcp_toolbox` | `allow` |
| Explicit local fallback succeeds | `fallback_success` | `local_fallback` | `fallback` |
| Scope/profile/component/action denied | `denied` | `none` | `deny` |
| L4 hard stop encountered | `stopped_l4` | `none` | `stop` |
| Target alias absent or stale | `unknown_target` | `none` | `deny` |
| Budget cap truncates allowed output | `partial` | `vcp_toolbox` or `local_fallback` | `partial` |
| Safe error after approved path starts | `error` | `vcp_toolbox`, `local_fallback`, or `none` | `stop` or `partial` |

## Static Examples

These examples are schema shapes only. They are not live runtime proof and do
not claim that a VCPToolBox call occurred.

### VCP-Native Success Projection Shape

```yaml
normalized_memory_result:
  result_id: norm_m4k2_success_001
  request_id: req_m4_fixture_success_001
  receipt_id: rcp_m4_fixture_success_001
  status: success
  source_runtime: vcp_toolbox
  source_component: DailyNoteManager
  source_capability: daily_note_manager.recall
  confidence:
    level: low
    basis: schema
    live_runtime_claimed: false
  evidence:
    evidence_type: schema-only
    evidence_refs: [docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md]
    raw_payload_included: false
    raw_payload_required_for_client: false
  scope:
    client_id_present: true
    workspace_scope_present: true
    owner_scope_present: true
    visibility: private
    cross_client_checked: true
  fallback:
    used: false
    reason: absent
    vcp_native_result: true
```

### Local Fallback Projection

```yaml
normalized_memory_result:
  result_id: norm_m4k2_fallback_001
  request_id: req_m4_fixture_fallback_001
  receipt_id: rcp_m4_fixture_fallback_001
  status: fallback_success
  source_runtime: local_fallback
  source_component: local_compatibility
  source_capability: fixture_recall
  confidence:
    level: low
    basis: fixture
    live_runtime_claimed: false
  evidence:
    evidence_type: fixture-only
    evidence_refs: [docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md]
    raw_payload_included: false
    raw_payload_required_for_client: false
  scope:
    client_id_present: true
    workspace_scope_present: true
    owner_scope_present: true
    visibility: private
    cross_client_checked: true
  fallback:
    used: true
    reason: vcp_target_unapproved
    vcp_native_result: false
```

### L4 Stop Projection

```yaml
normalized_memory_result:
  result_id: norm_m4k2_stop_001
  request_id: req_m4_fixture_l4_001
  receipt_id: rcp_m4_fixture_l4_001
  status: stopped_l4
  source_runtime: none
  source_component: absent
  source_capability: absent
  confidence:
    level: none
    basis: schema
    live_runtime_claimed: false
  evidence:
    evidence_type: schema-only
    evidence_refs: [docs/VCP_MEMORY_INVOCATION_CONTRACT_SPEC.md]
    raw_payload_included: false
    raw_payload_required_for_client: false
  fallback:
    used: false
    reason: absent
    vcp_native_result: false
  warnings:
    - ERR_L4_HARD_STOP
```

## Fail-Closed Cases

Normalization must reject or stop when:

- `receipt_id` is missing;
- `source_runtime` conflicts with fallback markers;
- `fallback.used=true` and `vcp_native_result=true`;
- `source_runtime=local_fallback` with `fallback.used=false`;
- confidence claims `exact_approved_live` without exact-approved live evidence;
- `raw_payload_required_for_client=true`;
- scope or visibility is missing on a success-like status;
- `live_runtime_claimed=true` on schema-only or fixture-only evidence;
- readiness or complete V8 claims appear in the result.

## M4-K2 Conclusion

M4-K2 defines a stable normalized output shape across future VCP-native and
local fallback paths. It preserves low-disclosure output and keeps raw VCP
private payload out of the client-facing contract.

Next safe route: M5 governance policy shield truth table, still without live
runtime execution.
