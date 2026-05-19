# DOGFOOD_001 Local Scoped Non-Release Plan

Status: DOGFOOD_001_PLAN_READY_NOT_EXECUTED
Decision: NOT_READY_BLOCKED
Mode: A4 docs/board only
Risk: low
Date: 2026-05-20

## Purpose

`DOGFOOD_001` defines a future local, scoped, non-release dogfood lane for the current local candidate state.

This plan is not dogfood execution. It only records the route, boundaries, candidate checks, evidence shape, and stop conditions.

## Entry Condition

Required entry state:

- `LOCAL_RC_CANDIDATE_001_RECORDED_NOT_RC_READY`
- `DOGFOOD_MAY_START_LOCAL_SCOPED_NON_RELEASE`
- `REAL_ROLLBACK_REMAINS_A5_BLOCKED`
- `RC_NOT_READY_BLOCKED`

## Dogfood Mode

Dogfood may only be considered as:

- local
- scoped
- non-release
- non-production
- no default client config switch
- no readiness claim

## Candidate Checks

Allowed local-only smoke checks are candidates only in this plan and are not executed by this document.

Future execution of any smoke check requires a separate confirmation naming the exact command list and boundary.

Candidate read-only checks:

- `git status -sb`
- `git log --oneline --decorate -n 20`
- `git diff --check`
- docs validation
- read current candidate, precheck, rollback closeout, and runtime gap truth-table documents

Candidate local-only smoke checks:

- local package script discovery
- local docs validation
- local targeted readonly status inspection
- local HTTP observe only if separately approved with endpoint and exact command
- active-memory compare/rollback only if separately approved with exact command and evidence boundary

## Forbidden Actions

This plan does not authorize:

- executing dogfood
- switching Codex or Claude default configuration
- provider/model calls
- real memory broad scans
- durable memory or audit writes
- migration/import/export/backup/restore apply
- public MCP expansion
- push, tag, release, deploy, or cutover
- real rollback, reset, restore, revert, or checkout rollback
- `RC_READY`, runtime readiness, final RC readiness, production readiness, or cutover readiness claims

## Evidence Output Shape

If a future dogfood execution is separately approved, evidence must record:

- exact command list
- exact local target commit
- whether any command can mutate state
- observed result
- warnings
- skipped checks
- forbidden actions not executed
- final state remains `NOT_READY_BLOCKED` unless separately changed by an approved governance process

Allowed result labels for this planning slice:

- `DOGFOOD_001_PLAN_READY_NOT_EXECUTED`
- `DOGFOOD_001_BLOCKED_SCOPE_UNCLEAR`

## Stop Conditions

Stop before execution if:

- command scope is ambiguous
- a candidate command can mutate durable state
- a provider call may occur
- real memory content may be broadly scanned
- a default client config switch is requested
- public MCP tool/schema expansion is requested
- migration/import/export/backup/restore apply is requested
- push/tag/release/deploy/cutover is requested
- real rollback is requested
- any readiness claim would be implied

## Result

DOGFOOD_001_PLAN_READY_NOT_EXECUTED

