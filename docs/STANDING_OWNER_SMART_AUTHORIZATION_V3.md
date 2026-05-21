# Smart Standing Authorization v3 - Budgeted Autonomy Envelope

Updated: 2026-05-21

## Purpose

Smart Standing Authorization v3 gives Codex a bounded autonomy envelope for `codex-memory`.

It is the default model for project startup, resume, and Autopilot Rule Intake.

A4.8 remains available only as the legacy local-safe rail and Green Lane substrate. It provides the old local-safe mechanics for planning, validation, guarded commits, push readiness, and safe-push, but it does not replace v3 budgets, receipts, lane decisions, or Red hard stops.

It preserves standing owner authorization and continuous automatic progress, but makes that progress budgeted, receipt-backed, and fail-closed at Red conditions.

Core rule:

```text
Standing owner authorization grants Codex a bounded autonomy envelope.
Within that envelope, Codex must not ask for step-by-step approval.
Codex should plan, execute, validate, repair once when safe, record receipts, and continue until the goal is complete or a Red condition appears.
```

This policy is an operating authority model. It is not a readiness claim, release claim, cutover claim, public MCP expansion, dependency approval, provider execution, real memory scan, durable memory write, config change, or remote-write instruction.

Current project state remains:

```text
NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

Public MCP tools remain frozen at:

- `record_memory`
- `search_memory`
- `memory_overview`

## Lane Model

### Green Lane

Green Lane actions run directly and are recorded afterward.

Allowed examples:

- docs, fixtures, tests, and `.agent_board` local maintenance
- local read-only checks
- local validation
- small reversible code or documentation repair
- no external service contact
- no cost-bearing call
- no true memory write
- no dependency change
- no secret read
- no config, watchdog, startup, or client switch

### Amber Lane

Amber Lane actions may run continuously inside the autonomy envelope without step-by-step user approval.

Every Amber action must have:

- a clear current user goal
- exact scope
- remaining budget
- an obvious validation path
- no Red condition
- a receipt after every meaningful external or write action
- at most one obvious, safe, local repair or retry after validation failure

`codex-memory` Amber examples:

- bounded provider smoke or benchmark only when the task explicitly needs provider evidence
- bounded runtime observe or local probe that does not change config, install watchdog/startup, or switch mainline
- exact `search_memory` or `memory_overview` call within budget
- exact sanitized `record_memory` write within budget, default maximum one write, with explicit content, target, and purpose
- exact real memory read query within budget, with broad scan/export blocked
- exact VCPChat or VCPToolBox read limited to named files or objects
- exact small dependency action with package/action list and budget
- local code, docs, fixture, or test edits inside the task scope and project hard-stop gates

Amber is not unlimited "task-relevant" authority. It is exact, budgeted, validated, and receipted.

### Red Lane

Red Lane actions require explicit user approval and must not run automatically.

Red examples:

- git push
- PR creation or update
- tag
- release
- deploy
- force push
- history rewrite
- destructive Git or filesystem action
- secret value read or edit
- raw private data or raw chat history exposure
- broad real memory scan/export
- real VCP memory import/migration
- wide VCPChat or VCPToolBox write
- public MCP tool/schema expansion
- Codex or Claude config change
- watchdog/startup install, update, or removal
- dependency change without exact package/action list
- audit fix, batch upgrade, or package manager switch
- uncapped cost
- unbounded loops
- overwriting existing artifacts without explicit overwrite allowance
- validation failure requiring non-obvious judgment
- readiness, cutover, production, release, or `RC_READY` claim without required evidence

## Default Autonomy Envelope

```yaml
default_autonomy_envelope:
  max_provider_calls: 3
  max_api_calls: 5
  max_mcp_tool_calls: 5
  max_runtime_probe_minutes: 10
  max_external_read_files: 20
  max_real_memory_read_queries: 5
  max_memory_writes: 1
  max_write_files: 10
  max_dependency_actions: 2
  max_retry_per_transient_failure: 1
  overwrite_existing_files_allowed: false
  secret_value_read_allowed: false
  raw_private_data_print_allowed: false
  broad_real_memory_scan_allowed: false
  public_mcp_expansion_allowed: false
  config_watchdog_startup_change_allowed: false
  push_allowed: false
  tag_release_deploy_allowed: false
  destructive_action_allowed: false
```

Budgets are ceilings, not targets.

## Receipt Rule

Every meaningful Amber external or write action must leave a receipt.

Minimum receipt fields:

```yaml
task_id:
lane:
envelope_id:
action_performed:
target_systems:
calls_used:
files_read:
files_written:
memory_queries_used:
memory_writes_used:
dependency_actions_used:
validation_run:
validation_result:
rollback_or_cleanup_available:
next_auto_step_allowed:
stop_reason:
```

For this repository, receipts should be recorded in the relevant task doc, `STATUS.md`, `.agent_board/VALIDATION_LOG.md`, `.agent_board/CHECKPOINT.md`, or `.agent_board/HANDOFF.md`, depending on the action shape.

## Continuation Rule

Codex may continue through multiple Amber steps without asking the user for each step when:

- the current user goal is clear
- every step stays within the envelope budget
- every step has exact scope and validation
- no Red condition appears
- receipts are recorded after meaningful Amber external/write actions
- validation failure needs at most one obvious, safe, local repair or retry

Ambiguous continuation phrases such as `继续`, `go ahead`, or `自动推进` may continue Green and in-envelope Amber work. They do not authorize Red actions.

## Codex-Memory Semantic Repairs

Use these meanings consistently:

- exact read may be Amber
- exact sanitized memory write may be Amber, default maximum one write
- broad write, broad scan, raw private data, and raw chat history exposure are Red
- exact provider/runtime/dependency authority is budgeted Amber only when task scope requires it
- dependency changes are Amber only with exact package/action list and budget; `audit fix`, batch upgrades, and package manager switches are Red
- docs-only, fixture-only, no-mutation, and read-only evidence are not runtime readiness, cutover readiness, production readiness, or `RC_READY`

## Status Surface

When this policy is active, status surfaces may record:

```yaml
standing_owner_smart_authorization_v3_active: true
autonomy_envelope_active: true
green_lane_direct: true
amber_lane_autonomous_with_budget_and_receipts: true
red_lane_requires_user: true
bounded_provider_calls_allowed: true
bounded_runtime_probe_allowed: true
bounded_memory_read_allowed: true
bounded_sanitized_exact_memory_write_allowed: true
exact_external_read_allowed: true
exact_small_dependency_change_allowed: true
push_tag_release_deploy_allowed_automatically: false
secret_value_access_allowed_automatically: false
destructive_action_allowed_automatically: false
public_mcp_expansion_allowed_automatically: false
readiness_claim_allowed_automatically: false
recommended_next: pending_human_push_or_next_autonomous_envelope_task
```

## Dashboard And Recorder Surface

The first local dashboard/recorder contract is:

```text
docs/SMART_STANDING_AUTHORIZATION_V3_DASHBOARD_RECORDER.md
tests/fixtures/smart-standing-authorization-v3-dashboard-recorder-v1.json
tests/smart-standing-authorization-v3-dashboard-recorder-fixture.test.js
```

The dashboard surface tracks policy version, project state, current lane, envelope id, budget limit/used/remaining, receipt status, last validation, Red gate status, next automatic step, and stop reason.

The recorder surface tracks Green no-Amber receipts, Amber external/write receipts, validation results, and Red stop events. It is a local review shape only; it does not implement a runtime dashboard, CLI recorder, provider call, MCP tool call, real memory read/write, dependency change, config change, public MCP expansion, push, tag, release, deploy, cutover, or readiness claim.

The first read-only parser contract is:

```text
docs/SMART_STANDING_AUTHORIZATION_V3_READONLY_RECEIPT_PARSER.md
tests/fixtures/smart-standing-authorization-v3-readonly-receipt-parser-v1.json
tests/smart-standing-authorization-v3-readonly-receipt-parser-fixture.test.js
```

It parses local board/docs receipt rows into the dashboard summary shape and fails closed on missing validation result, readiness overclaim, Red stop, malformed rows, or fields that would require guessing.

The scoped read-only CLI/parser implementation is:

```text
src/core/SmartStandingAuthorizationV3ReceiptParser.js
src/cli/smart-standing-authorization-v3-receipts.js
tests/smart-standing-authorization-v3-receipts-cli.test.js
```

The existing memory dashboard consumes the parser summary read-only and exposes it as `smartStandingAuthorizationV3` in JSON plus `V3Receipt` in text output:

```text
src/cli/dashboard.js
tests/dashboard-cli.test.js
```

This dashboard integration is local Markdown parsing only. It is not a receipt writer, provider/API/MCP call, real memory read, runtime probe, config/dependency change, remote action, cutover evidence, or readiness claim.

It reads `.agent_board/VALIDATION_LOG.md` by default, supports `--validation-log <workspace-relative path>`, emits JSON with `--json`, and rejects side-effectful flags such as `--write`, `--provider`, `--mcp-call`, `--record-memory`, `--push`, and `--readiness-claim`.

The first receipt rollup contract is:

```text
docs/SMART_STANDING_AUTHORIZATION_V3_RECEIPT_ROLLUP.md
tests/fixtures/smart-standing-authorization-v3-receipt-rollup-v1.json
tests/smart-standing-authorization-v3-receipt-rollup-fixture.test.js
```

It rolls up the local Green Lane receipt posture from `CM-0673` through `CM-0676`, keeps all external/write budget counters at `0`, and preserves Red gates for push, release, deploy, public MCP expansion, real memory, provider, dependency, config, and readiness actions.

## Non-Claim Boundary

This policy does not by itself execute any Amber action.

This policy also does not make the project ready. It keeps:

- `NOT_READY_BLOCKED`
- `RC_NOT_READY_BLOCKED`
- no Phase F readiness claim
- no runtime readiness claim
- no cutover readiness claim
- no public MCP expansion
