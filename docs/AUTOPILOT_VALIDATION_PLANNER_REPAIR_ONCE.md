# Autopilot ValidationPlanner / RepairOnce Orchestrator

Status: `NOT_READY_BLOCKED`

Evidence class: `docs-only` / `fixture-only` / `read-only`

This contract defines how a future Autopilot controller chooses the smallest necessary validation and how it decides whether a single safe repair may be attempted. It is a planner only. It does not run validation and does not apply repairs.

## Planning Inputs

Each validation plan must consider:

- task area
- changed path class
- risk
- lane
- adapter type
- minimum validation
- escalation triggers
- expected decision
- `readiness_claim_allowed=false`

## Validation Selection

The fixture covers:

- `docs_only_green`
- `schema_fixture_green`
- `dashboard_readonly_green`
- `source_helper_green`
- `adapter_contract_fixture`
- `amber_provider_planned_only`
- `red_git_remote_blocked`

Green cases may produce local validation plans. Amber cases remain plan-only unless an exact future envelope authorizes the adapter action. Red cases must stay blocked.

## Repair Once

The repair-once contract covers:

- `obvious_local_reversible_once`
- `second_failure_stop`
- `non_obvious_repair_stop`
- `design_judgment_stop`
- `red_gate_stop`
- `user_owned_change_stop`

Only one obvious, local, reversible repair may be considered by a future executor. This read-only planner never applies that repair. A second failure, non-obvious repair, design judgment, Red gate, or user-owned change conflict must stop.

## Boundary

This surface must not:

- run validation commands
- apply repairs
- call provider/API/MCP
- read or write real memory
- change dependencies
- change config/watchdog/startup
- run runtime probes
- push, create PRs, tag, release, deploy, or cut over
- claim runtime readiness, cutover readiness, production readiness, or `RC_READY`

`readiness_claim_allowed=false` remains mandatory.
