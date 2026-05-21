# Autopilot Goal Decomposition Runtime

Updated: 2026-05-21

This runtime defines how `codex-memory` turns a non-trivial user goal into safe local execution under Smart Standing Authorization v3.

It is a governance runtime contract. It does not execute provider calls, MCP memory writes, real memory scans, dependency changes, config changes, push, release, deploy, cutover, or readiness claims by itself.

## Required Flow

```text
user_goal
-> goal
-> route_plan
-> task_queue
-> Green / Amber / Red classification
-> executable Green tasks
-> exact in-envelope Amber tasks with receipts
-> blocked Red items
-> next_safe_task
```

For any non-single-step goal, Codex must:

1. Compile the user request into a `goal`.
2. Inspect repository reality and `.agent_board`.
3. Generate a `route_plan`.
4. Mark each route step as `Green`, `Amber`, or `Red`.
5. Put only `Green` and valid in-envelope `Amber` tasks into the executable `task_queue`.
6. Put all `Red` steps into `blocked_red_items`.
7. Select one `next_safe_task`.
8. Execute only that safe task.
9. Validate.
10. Update `.agent_board`.
11. Record a receipt for every meaningful Amber external or write action.
12. Continue until the goal is complete or a Red condition appears.

## Goal Shape

```yaml
goal:
  id: CM-0684
  objective: Build the local Smart Standing Authorization v3 complete autopilot governance kernel
  scope:
    allowed_areas:
      - docs
      - schemas
      - tests/schema_examples
      - scripts validators
      - .agent_board
    forbidden_areas:
      - provider calls
      - real MCP memory writes
      - real memory broad scans
      - dependency changes
      - config changes
      - push/tag/release/deploy
  success_criteria:
    - project profile exists
    - goal decomposition runtime exists
    - schemas and examples exist
    - validators pass
    - .agent_board records current route and blocked Red items
  validation_required:
    - node --check scripts\validate_autopilot_governance_kernel.js
    - node scripts\validate_autopilot_governance_kernel.js
    - node --check scripts\validate_autopilot_goal_compiler.js
    - node scripts\validate_autopilot_goal_compiler.js
    - powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
    - git diff --check
  stop_conditions:
    - Red Lane action required
    - validation failure requiring non-obvious judgment
    - user-owned uncommitted change would be overwritten
```

## Route Plan Shape

```yaml
route_plan:
  goal_id: CM-0684
  current_state_summary: v3 policy, parser, dashboard, and board basics exist; complete schema/validator/ledger layer is missing
  target_state_summary: local complete autopilot governance kernel exists and validates without external side effects
  route_steps:
    - id: CM-0684-1
      lane: Green
      purpose: add project profile and goal runtime docs
      target_files_or_systems:
        - docs/AUTOPILOT_PROJECT_PROFILE.md
        - docs/AUTOPILOT_GOAL_DECOMPOSITION_RUNTIME.md
      validation:
        - docs validation
      receipt_required: false
      stop_conditions:
        - Red Lane action required
    - id: CM-0684-2
      lane: Green
      purpose: add schemas, examples, validators, and local ledger
      target_files_or_systems:
        - schemas/autopilot_*.schema.yaml
        - tests/schema_examples/autopilot_*.example.json
        - scripts/validate_autopilot_*.js
        - .agent_board/AUTOPILOT_LEDGER.md
      validation:
        - validator checks
      receipt_required: false
      stop_conditions:
        - validator requires external side effect
    - id: CM-0684-R1
      lane: Red
      purpose: publish, push, release, deploy, or claim readiness
      target_files_or_systems:
        - origin/main
        - release artifacts
      validation:
        - not executable under this goal
      receipt_required: true
      stop_conditions:
        - always blocked without explicit approval
```

## Task Queue Shape

```yaml
task_queue:
  goal_id: CM-0684
  executable_tasks:
    - id: CM-0684-1
      lane: Green
      status: done
      objective: add project profile and goal runtime docs
      scope: local docs only
      allowed_files_or_systems:
        - docs/AUTOPILOT_PROJECT_PROFILE.md
        - docs/AUTOPILOT_GOAL_DECOMPOSITION_RUNTIME.md
      forbidden_files_or_systems:
        - .env*
        - data/**
        - remote repositories
      budget_expected:
        provider: 0
        api: 0
        mcp_tool: 0
        memory_writes: 0
        dependency_actions: 0
      allowed_commands_or_operations:
        - read files
        - edit local docs
        - docs validation
      validation:
        - powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
      receipt_required: false
      stop_conditions:
        - Red Lane action required
        - user-owned work would be overwritten
    - id: CM-0684-2
      lane: Green
      status: in_progress
      objective: add schemas, examples, validators, and ledger
      scope: local schema/example/validator/ledger only
      allowed_files_or_systems:
        - schemas/**
        - tests/schema_examples/**
        - scripts/validate_autopilot_governance_kernel.js
        - scripts/validate_autopilot_goal_compiler.js
        - .agent_board/AUTOPILOT_LEDGER.md
      forbidden_files_or_systems:
        - provider systems
        - real memory stores
        - dependency manifests
      budget_expected:
        provider: 0
        api: 0
        mcp_tool: 0
        memory_writes: 0
        dependency_actions: 0
      allowed_commands_or_operations:
        - node --check scripts\validate_autopilot_governance_kernel.js
        - node scripts\validate_autopilot_governance_kernel.js
        - node --check scripts\validate_autopilot_goal_compiler.js
        - node scripts\validate_autopilot_goal_compiler.js
      validation:
        - validators pass
      receipt_required: false
      stop_conditions:
        - validator requires external side effect
        - Red Lane action required
  blocked_red_items:
    - id: CM-0684-R1
      reason: push/tag/release/deploy/readiness claim remains Red
  next_safe_task: CM-0684-2
```

Red route steps must never be copied into `executable_tasks`.
