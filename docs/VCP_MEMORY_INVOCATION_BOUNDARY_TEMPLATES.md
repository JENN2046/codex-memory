# VCP Memory Invocation Boundary Templates

Task id: `CM-M3-T2-INVOCATION-PROFILE-TEMPLATES`
Implementation slice: `CM-1716`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Evidence type: `docs-only`, `non-authorizing boundary templates`, `no-runtime`

## Purpose

This document defines non-authorizing boundary templates for future
VCPToolBox-native memory invocation profiles.

It is not an approval line, approval request, runtime authorization, live proof,
target binding, provider/API approval, durable write approval, public MCP
expansion approval, release approval, or readiness claim.

The templates must not be pasted or treated as authorization. A future live or
write task still requires a fresh exact approval packet, fresh Git facts, exact
target binding, low-disclosure output rules, bounded budgets, validation
commands, and receipt requirements.

## Shared Packet Fields

Every future boundary packet must define these fields without exposing raw
secrets, endpoints, paths, tokens, credentials, raw memory, or approval-line
values.

| Field | Required meaning |
|---|---|
| `boundary_id` | Stable non-secret identifier for the requested boundary |
| `profile` | One of `observe-lite`, `observe-full`, `trusted-full-read`, `trusted-write-proposal`, `trusted-full` |
| `target_alias` | Safe alias only; no path, endpoint, token, or config value |
| `target_kind` | `local_checkout`, `service_url`, `mcp_server`, `cli`, `plugin_api`, or `ipc` |
| `target_locator_hash_present` | Boolean proof that a locator exists without including the locator value |
| `principal_scope_present` | Presence flags for agent, project, workspace, client, session, and visibility scope |
| `allowed_components` | Explicit VCPToolBox native surfaces allowed for this boundary |
| `allowed_actions` | Exact action vocabulary allowed for this profile |
| `budgets` | Max runtime calls, max results, max chars, max duration, and write/proposal caps |
| `output_disclosure` | Summary, structured, raw, and redaction rules |
| `receipt_plan` | Required low-disclosure receipt fields |
| `stop_conditions` | Explicit fail-closed conditions |
| `rollback_posture` | Required rollback or non-mutation statement |
| `not_authorization` | Must be true for these templates |

Forbidden packet content:

- raw path, URL, endpoint, token, credential, cookie, `.env`, `config.env`, or
  provider/auth value;
- raw DailyNote, RAG, vector, prompt, audit, sqlite, jsonl, cache, or private
  memory content;
- generated, simulated, stored, or placeholder approval-line value;
- broad scan/export/import/migration/backfill instruction;
- production, release, cutover, or `RC_READY` claim.

## Profile Templates

| Profile | Allowed actions | Budget ceiling | Output disclosure | Write posture | Required stop conditions |
|---|---|---|---|---|---|
| `observe-lite` | target presence, component vocabulary, summary/no-write compatibility shape | max 1 runtime call, max 5 summary items, max 60 seconds | summary only, low-disclosure, no raw ids/paths/content | writes forbidden | stop on missing target alias, auth uncertainty, raw output request, write intent, broad scan, provider dependency, or unapproved target |
| `observe-full` | full VCP read shape inspection for approved components, no writes | max 3 runtime calls, max 10 results, max 180 seconds | structured output allowed; raw output only when the exact packet explicitly approves raw mode for named components | writes forbidden | stop on raw output outside approved components, private leakage risk, provider dependency, write intent, broad scan, or target drift |
| `trusted-full-read` | sustained workflow read recall for approved components | max 5 runtime calls, max 20 results, max 300 seconds | structured/raw/summary according to exact packet; low-disclosure receipt required | writes forbidden | stop on cross-client leakage, missing principal scope, unexpected component, unapproved raw mode, write intent, or stale target |
| `trusted-write-proposal` | trusted read plus write proposals for DailyNote, KnowledgeBase, or TagMemo | max 5 read calls, max 5 proposals, max 300 seconds | proposal text must be reviewable and low-disclosure; no durable mutation output | durable writes forbidden | stop on direct write request, missing reviewer route, secret/raw content in proposal, batch mutation, or rollback uncertainty |
| `trusted-full` | trusted read plus bounded durable write where exact write boundary allows it | max 5 read calls, max 1 durable write, max 300 seconds | write receipt must be low-disclosure and include rollback/tombstone posture | durable write allowed only by separate exact write approval | stop on missing write approval, missing rollback, broad mutation, unclear owner, cross-client risk, provider dependency, or stale target |

## Receipt Shape

Every future invocation must produce a receipt with:

- `receipt_id`
- `timestamp`
- `boundary_id`
- `profile`
- `target_alias`
- `target_kind`
- `client_id_present`
- `scope_present`
- `visibility_present`
- `allowed_components`
- `allowed_actions`
- `budget_used`
- `output_disclosure`
- `fallback_used`
- `stop_condition_triggered`
- `mutation_attempted`
- `durable_write_count`
- `rollback_posture`
- `validation_run`
- `next_action_allowed`

Receipts must not include raw secrets, raw locators, raw private memory, raw
provider payload, raw approval-line values, raw audit rows, raw sqlite/jsonl
content, or broad scan output.

## Non-Authorization Review

Before any future execution uses these templates, review must confirm:

1. The requested work still serves the VCPToolBox-native governed bridge goal.
2. The profile does not exceed the user's exact approval.
3. The target alias is exact and low-disclosure.
4. The output disclosure level is explicit.
5. The budget is bounded.
6. The receipt can be produced without private leakage.
7. The rollback or no-mutation posture is clear.
8. No live call, raw read, provider/API call, durable write, public MCP
   expansion, push, release, deploy, cutover, or readiness claim is implied by
   the template itself.

## M3-T2 Conclusion

These templates are sufficient to prepare future approval packets. They do not
authorize runtime execution.

Next safe task:

`M3-T3 Local Fallback Role Contract`
