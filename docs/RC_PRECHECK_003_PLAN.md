# RC_PRECHECK_003 Plan

Status: `PLANNING_ONLY_NOT_APPROVED`
Decision: `RC_NOT_READY_BLOCKED`
Date: 2026-05-22

## Purpose

`RC_PRECHECK_003` is a planning-only packet for a future exact-approved precheck. It does not execute precheck commands, start HTTP MCP, run HTTP observe, run compare/rollback, call providers, read or scan real memory, write durable memory or audit state, switch config, apply migration/backup work, expand public MCP tools, push, tag, release, deploy, cut over, or claim readiness.

## Accepted Review Inputs

- `MAINLINE_SPINE_SURFACE_CONSOLIDATION_REVIEW_ACCEPTED`.
- `DOGFOOD_001` through `DOGFOOD_004` have already been summarized.
- `CM-0558` no-token JSON-RPC mutation rejection shape is accepted.
- `CM-0561` search timeout side-effect guard is accepted as targeted evidence.
- `CM-0738` and `CM-0739` no-token read-only search boundary is accepted as sufficient for the no-token read-only search side-effect blocker.
- `CM-0737` exact-approved write remains exact-approval-only evidence. It does not prove `memory write reliable`.
- Autopilot / authorization surface growth should freeze. New governance surfaces should not be added unless a future exact task names a necessary gap that cannot be closed by consolidating existing surfaces.
- RC remains `RC_NOT_READY_BLOCKED`.

## Allowed Command Candidates

These commands are candidates only for a future exact-approved `RC_PRECHECK_003` run:

```powershell
git status -sb
git log --oneline --decorate -n 20
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
git diff --check
npm run gate:mainline:strict
npm run start:http:ensure
npm run observe:http -- --json
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --json --require-ready
```

The future approval must name the exact subset to run. This plan does not authorize running all candidates automatically.

## Forbidden Actions

Forbidden for this planning packet and for any future run unless a later exact approval explicitly changes the boundary:

- true `record_memory` or true `search_memory`
- provider calls
- real memory scan, broad preview, export, import, or migration
- durable memory write or durable audit write
- config switch, watchdog/startup install, or client configuration mutation
- migration / backup / restore apply
- public MCP tool or schema expansion
- source, test, or package changes
- push, tag, release, deploy, or cutover
- readiness, production, final RC, or `RC_READY` claim

## Evidence Output Shape

A future `RC_PRECHECK_003` evidence record should include:

```yaml
precheck_id: RC_PRECHECK_003
decision: PRECHECK_EVIDENCE_RECORDED_NOT_RC_READY
target_baseline:
  local_head: <commit>
  origin_main: <commit>
  remote_main: <commit>
  drift_status: matched | drifted_blocked
commands_requested:
  - <exact command>
commands_executed:
  - command: <exact command>
    exit_code: <number>
    status: passed | warn | failed | blocked
    sanitized_summary: <summary without secrets or raw private data>
warning_handling:
  warning_count: <number>
  warnings:
    - code: <warning_code>
      classification: historical | expected | needs_followup | blocking
      reason: <sanitized reason>
forbidden_actions_observed:
  true_record_memory: false
  true_search_memory: false
  provider_calls: false
  real_memory_scan: false
  durable_memory_write: false
  durable_audit_write: false
  config_switch: false
  migration_or_backup_apply: false
  public_mcp_expansion: false
  push_tag_release_deploy_cutover: false
readiness:
  rc_ready_claimed: false
  runtime_ready_claimed: false
  production_ready_claimed: false
final_state: RC_NOT_READY_BLOCKED
```

## Target Baseline / Drift Rule

Before any future execution, re-read:

```powershell
git status -sb
git log --oneline --decorate -n 20
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
```

If local `HEAD`, `origin/main`, or remote `refs/heads/main` differ in a way not explicitly named by the future approval, stop as `DRIFTED_BLOCKED`. Do not rebase, pull, push, force, checkout, or retarget automatically.

## Warning Handling Rule

A warning is not readiness evidence. A future evidence record must classify each warning as historical, expected, needs-followup, or blocking. Any warning tied to missing health, failed contract, failed compare/rollback, unexpected mutation, provider use, durable write, secret exposure, config change, public MCP expansion, or target drift is blocking until separately reviewed.

## No-Readiness Wording

Allowed wording:

- `PRECHECK_EVIDENCE_RECORDED_NOT_RC_READY`
- `RC_PRECHECK_003_PLANNED_NOT_EXECUTED`
- `RC_NOT_READY_BLOCKED`

Forbidden wording:

- `RC_READY`
- `runtime ready`
- `production ready`
- `cutover ready`
- `memory write reliable`
- `memory recall reliable`

## Current Result

`RC_PRECHECK_003_PLAN_READY_FOR_COMMIT` once docs validation and `git diff --check` pass.
