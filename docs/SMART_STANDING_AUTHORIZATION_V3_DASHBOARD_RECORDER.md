# Smart Standing Authorization v3 Dashboard And Recorder

Status: `COMPLETED_VALIDATED`

Decision: `NOT_READY_BLOCKED`

Task: `CM-0674`

Scope: local docs/fixture/test/board surface only

## Purpose

Install the first local review shape for the v3 "dashboard and recorder".

The dashboard is a compact status surface for the active autonomy envelope. The recorder is a local receipt ledger shape for Green no-Amber steps, Amber receipts, validation results, and Red stop events.

This is not a runtime dashboard, CLI recorder, service integration, provider action, MCP tool call, real memory read/write, config change, dependency change, public MCP expansion, push, tag, release, deploy, cutover, or readiness claim.

## Dashboard Shape

The dashboard must show at least:

```text
policy_version
project_state
current_task_id
current_lane
envelope_id
budget_limit
budget_used
budget_remaining
receipt_status
last_validation
red_gate_status
next_auto_step_allowed
stop_reason
```

The frozen public MCP tool list remains:

```text
record_memory
search_memory
memory_overview
```

The dashboard must keep these automatic permissions false:

```text
push_allowed
tag_release_deploy_allowed
secret_value_read_allowed
destructive_action_allowed
public_mcp_expansion_allowed
readiness_claim_allowed
```

## Recorder Shape

The recorder must be append-only in meaning and must preserve a receipt after every meaningful Amber external or write action. Green no-Amber steps may record a lightweight no-Amber receipt.

Minimum receipt fields:

```text
task_id
lane
envelope_id
action_performed
target_systems
calls_used
files_read
files_written
memory_queries_used
memory_writes_used
dependency_actions_used
validation_run
validation_result
rollback_or_cleanup_available
next_auto_step_allowed
stop_reason
```

Red stop records must also name:

```text
red_condition
required_user_approval
safe_state
next_after_approval
```

## Fixture Contract

Artifacts:

```text
tests/fixtures/smart-standing-authorization-v3-dashboard-recorder-v1.json
tests/smart-standing-authorization-v3-dashboard-recorder-fixture.test.js
```

The fixture locks:

- synthetic local-only boundary
- dashboard required fields
- default envelope budgets
- false defaults for Red-gated capabilities
- recorder receipt fields
- sample Green no-Amber receipt
- sample Red stop event
- non-claim wording for runtime/readiness surfaces

## Storage Surfaces

Until a dedicated runtime or CLI surface is explicitly selected, receipts may be recorded in:

```text
task doc
STATUS.md
.agent_board/VALIDATION_LOG.md
.agent_board/CHECKPOINT.md
.agent_board/HANDOFF.md
```

## Read-Only Parser

The first read-only parser contract is:

```text
docs/SMART_STANDING_AUTHORIZATION_V3_READONLY_RECEIPT_PARSER.md
tests/fixtures/smart-standing-authorization-v3-readonly-receipt-parser-v1.json
tests/smart-standing-authorization-v3-readonly-receipt-parser-fixture.test.js
```

It parses local receipt-like board rows into the dashboard summary shape. If a source row does not record a value, such as lane or envelope id, the parser must emit `not_recorded_in_validation_log` instead of guessing.

The scoped read-only CLI/parser implementation is:

```text
node src\cli\smart-standing-authorization-v3-receipts.js --json
```

It reads local Markdown receipt rows only and rejects write/provider/MCP/memory/push/readiness flags.

## Existing Dashboard Integration

The existing memory dashboard now consumes the same read-only parser summary:

```text
node src\cli\dashboard.js --json --summary-only
node src\cli\dashboard.js --v3-receipts-validation-log .\tests\fixtures\smart-standing-authorization-v3-validation-log-sample.md
```

JSON output includes `smartStandingAuthorizationV3`. Summary-only JSON keeps the compact parser proof fields needed for operator review: `evidenceClass`, `latest_parser_status`, `budget_used`, latest task/validation ids, latest receipt/validation result, Red stop count, next-auto-step flag, and stop reason. Text output includes a compact `V3Receipt` line. The integration is read-only: it parses local Markdown validation-log rows and feeds dashboard status/check/recommendation surfaces. It does not write receipts, call provider/API/MCP, read real memory stores, perform runtime probes, change config/dependencies, push, release, deploy, or claim readiness.

## Non-Claims

This dashboard and recorder surface does not prove:

- runtime dashboard implementation
- write-capable CLI recorder implementation
- live Amber action execution
- provider evidence
- real memory evidence
- runtime readiness
- cutover readiness
- RC readiness

## Result

The v3 dashboard and recorder now have a local synthetic contract. The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
