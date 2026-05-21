# Autopilot Structured State Store Draft

Status: `NOT_READY_BLOCKED`

Evidence class: `docs-only` / `fixture-only` / `read-only`

This draft defines the append-only state model needed before the product-grade Autopilot control loop can persist or replay controller cycles. It is not a database migration, not a replacement for `.agent_board`, and not runtime readiness evidence.

## Boundary

This stage may define docs, schema, examples, validators, read-only helpers, and dashboard summaries.

It must not:

- create a database or table
- migrate `.agent_board`
- write durable controller state
- execute tasks
- call provider/API/MCP tools
- read or write real memory
- change dependencies, config, watchdog, startup, or runtime data
- push, open PRs, tag, release, deploy, cut over, or claim readiness

## Record Types

The draft model is append-only and covers:

- `goal`
- `route_plan`
- `task_queue_snapshot`
- `task_attempt`
- `lane_decision`
- `action_preflight`
- `budget_debit`
- `execution_receipt`
- `validation_run`
- `repair_attempt`
- `checkpoint`
- `approval_packet`
- `red_gate_event`
- `stop_reason`
- `resume_token`

Every record must include:

- `id`
- `created_at`
- `record_type`
- `goal_id`
- `task_id`
- `source_surface`
- `evidence_class`
- `mutation_boundary`
- `readiness_claim_allowed=false`

`mutation_boundary.mutated` must remain `false` for this draft. Future mutation requires a later approved implementation phase with a concrete storage target, migration plan, validation path, rollback path, and Red gate review where applicable.

## Dashboard Meaning

The dashboard state-store summary is a read-only integrity surface. It reports whether the schema, example, docs, validator, required record types, mutation boundaries, and readiness denial markers are present.

It does not prove runtime readiness, cutover readiness, production readiness, or `RC_READY`.
