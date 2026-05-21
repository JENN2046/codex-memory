# Autopilot Project Profile

Updated: 2026-05-21

This file binds Smart Standing Authorization v3 to the current `codex-memory` repository reality.

It is a project profile, not a readiness claim. Repository reality, `AGENTS.md`, current user instruction, source behavior, and observed command output remain authoritative.

```yaml
project_name: codex-memory
project_goal: local-first auditable VCP-compatible memory spine for Codex and Claude workflows
active_autonomy_model: Smart Standing Authorization v3 - Budgeted Autonomy Envelope
project_status:
  readiness: NOT_READY_BLOCKED
  release_candidate: RC_NOT_READY_BLOCKED
public_mcp_tools_frozen:
  - record_memory
  - search_memory
  - memory_overview
local_safe_areas:
  - docs
  - fixtures
  - tests
  - schemas
  - validators
  - .agent_board
  - local read-only CLI output
amber_capable_areas:
  - exact provider smoke or benchmark only when task-scoped and budgeted
  - exact runtime observe or local probe without config/startup change
  - exact search_memory or memory_overview call inside budget
  - exact sanitized record_memory with default maximum one write
  - exact real memory read query without broad scan or export
  - exact external read file or object inside scope
  - exact small dependency action with package/action list
red_lane_areas:
  - push
  - PR
  - tag
  - release
  - deploy
  - force push
  - history rewrite
  - destructive Git or filesystem action
  - secret value read or edit
  - raw private data or raw chat history exposure
  - broad real memory scan or export
  - real VCP memory import or migration
  - wide VCPChat or VCPToolBox write
  - public MCP tool or schema expansion
  - Codex or Claude config change
  - watchdog/startup install/update/remove
  - dependency change without exact package/action list
  - audit fix, batch upgrade, or package manager switch
  - readiness, cutover, or RC_READY claim without required evidence
protected_paths:
  - .env*
  - data/**
  - runs/**
  - reports/**
  - package.json
  - package-lock.json
  - external VCPChat repositories
  - external VCPToolBox repositories
  - user Codex/Claude config paths
validation_commands:
  - powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
  - node --check scripts\validate_autopilot_governance_kernel.js
  - node scripts\validate_autopilot_governance_kernel.js
  - node --check scripts\validate_autopilot_goal_compiler.js
  - node scripts\validate_autopilot_goal_compiler.js
  - git diff --check
dependency_policy:
  default: Red unless exact package/action list, remaining v3 budget, validation, and receipt exist
  audit_fix: Red
  batch_upgrade: Red
  package_manager_switch: Red
external_systems:
  provider_calls: Amber only when exact, budgeted, validated, and receipted
  mcp_memory_calls: Amber only when exact, budgeted, validated, and receipted
  real_memory_store: broad scan/export/import/migration is Red
  VCPChat_VCPToolBox: exact read may be Amber; broad write is Red
push_release_deploy_policy:
  automatic_push_allowed: false
  tag_release_deploy_allowed: false
  push_requires: explicit user authorization or separately active safe-push packet that fully passes
owner_notes:
  - Keep NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED until runtime evidence removes blockers.
  - Do not treat docs-only, fixture-only, or read-only proof as readiness.
  - Keep public MCP tools frozen at record_memory, search_memory, memory_overview.
```
