# Autopilot Action Adapter Contract

Status: `NOT_READY_BLOCKED`

Evidence class: `docs-only` / `fixture-only` / `read-only`

This document defines the future adapter boundary for Budget Enforcement / Action Adapter Contract work. It is a contract only. It does not connect any real adapter and does not execute provider, MCP, memory, dependency, runtime, Git remote, or approval-packet actions.

## Required Adapter Fields

Every adapter must define:

- `preflight`
- `lane_allowed`
- `budget_required`
- `budget_debit`
- `receipt_required`
- `rollback_or_cleanup`
- `red_gate_conditions`
- `forbidden_without_explicit_approval`
- `validation_required`
- `stop_reason`

## Adapter Set

- `file_edit_adapter`
- `validation_command_adapter`
- `provider_call_adapter`
- `mcp_tool_adapter`
- `memory_read_adapter`
- `memory_write_adapter`
- `dependency_action_adapter`
- `runtime_probe_adapter`
- `git_remote_adapter`
- `approval_packet_adapter`

## Fail-Closed Fixtures

The contract must reject these before execution:

- `budget_exhausted`
- `missing_receipt`
- `red_gate_attempted`
- `second_repair_attempted`
- `unknown_cost`
- `secret_access_attempted`
- `broad_memory_scan_attempted`
- `push_attempted`

## Boundary

The adapter contract may be summarized by read-only helpers and dashboard surfaces. Those surfaces may report coverage, missing adapters, missing fail-closed fixtures, and readiness flags.

They must not:

- execute adapters
- call provider/API/MCP
- call `record_memory`, `search_memory`, or `memory_overview`
- read or write real memory
- change dependencies
- change config/watchdog/startup
- run runtime probes
- push, create PRs, tag, release, deploy, or cut over
- claim runtime readiness, cutover readiness, production readiness, or `RC_READY`

`readiness_claim_allowed=false` remains mandatory.
