# Smart Standing Authorization v3 Read-Only Receipt Parser

Status: `COMPLETED_VALIDATED`

Decision: `NOT_READY_BLOCKED`

Task: `CM-0675`

Scope: local read-only CLI/parser plus docs/fixture/test contract

## Purpose

Define and implement the first read-only parser shape for v3 receipts.

The parser reads local receipt-like rows from board/docs surfaces and produces a compact dashboard summary. The scoped CLI implementation lives at:

```text
src/cli/smart-standing-authorization-v3-receipts.js
src/core/SmartStandingAuthorizationV3ReceiptParser.js
```

It does not write back to the board, call providers, call MCP tools, inspect live MCP schema, read real memory stores, mutate durable state, change dependencies, change config, push, tag, release, deploy, cut over, or claim readiness.

## Input Surfaces

Allowed local input surfaces:

```text
.agent_board/VALIDATION_LOG.md
.agent_board/CHECKPOINT.md
.agent_board/HANDOFF.md
task doc
STATUS.md
```

The primary first target is:

```text
.agent_board/VALIDATION_LOG.md
```

## Output Shape

The parser should produce:

```text
source_surface
latest_v3_task_id
latest_validation_id
latest_lane
latest_envelope_id
latest_receipt_status
latest_validation_result
budget_used
red_stop_count
next_auto_step_allowed
stop_reason
non_claims
```

When a field is not recorded in the source row, the parser must say so directly, for example:

```text
latest_envelope_id: not_recorded_in_validation_log
```

## Fail-Closed Cases

The parser must fail closed when:

- validation result is missing
- readiness-positive wording appears, such as `runtimeReady=true`
- Red stop wording is detected
- source row is malformed
- required fields cannot be inferred without guessing

Red stop rows must produce:

```text
next_auto_step_allowed: false
stop_reason: red_condition_requires_user_approval
```

## Fixture Contract

Artifacts:

```text
tests/fixtures/smart-standing-authorization-v3-readonly-receipt-parser-v1.json
tests/smart-standing-authorization-v3-readonly-receipt-parser-fixture.test.js
```

The fixture uses local sample rows for `CMV-0798` and `CMV-0797`. It verifies that the parser can extract the latest v3 task, validation id, lane, receipt status, validation result, budget-zero defaults, Red-stop count, next-step permission, and stop reason without executing any live action.

## Non-Claims

This parser contract does not prove:

- runtime recorder implementation
- CLI parser writes
- runtime parser integration execution
- live Amber action execution
- provider evidence
- real memory evidence
- runtime readiness
- cutover readiness
- RC readiness

## Result

The v3 recorder now has a read-only parser contract. The project remains:

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```
