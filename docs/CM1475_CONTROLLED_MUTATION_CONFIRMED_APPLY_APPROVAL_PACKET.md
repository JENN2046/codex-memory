# CM-1475 Controlled Mutation Confirmed Apply Approval Packet

Date: 2026-06-09

## Purpose

This packet prepares the exact approval shape for a future confirmed controlled mutation apply through the already registered public MCP tools:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This packet does not execute mutation.

This packet does not authorize mutation by itself.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Current Boundary

CM-1472 registered the controlled mutation tools as public MCP tools with public dry-run bounded behavior only.

CM-1473 proved the tools are visible and return low-disclosure rejected dry-run projections.

Confirmed mutation remains blocked until a future operator provides an exact approval packet bound to one tool, one target, one purpose, one evidence set, and one rollback plan.

## Confirmed Apply Candidates

A future exact approval may authorize only one of these actions at a time:

```text
validate_memory
tombstone_memory
supersede_memory
```

No batch mutation, raw audit access, raw store access, provider/API call, migration apply, cleanup apply, release action, readiness claim, or `RC_READY` claim is included.

## Exact Approval Schema

Future confirmed mutation execution requires an operator approval with this exact shape:

```yaml
approval_id: CM1475-CONTROLLED-MUTATION-CONFIRMED-APPLY-<date>-<tool>-<target>
approved_tool: validate_memory | tombstone_memory | supersede_memory
approved_target:
  memory_id: <REDACTED_OR_EXACT_SINGLE_MEMORY_ID>
  target_store: sqlite_shadow
approved_action:
  dry_run: false
  confirm: true
  reason: <bounded human reason>
  evidence: <bounded evidence summary>
  actor_client_id: <bounded actor/client id>
  task_id: <bounded task id>
preconditions:
  - clean_synced_git_state_confirmed
  - current_public_tool_surface_confirmed
  - dry_run_projection_reviewed
  - rollback_plan_reviewed
  - no_raw_scan_required
allowed_execution:
  - exactly_one_tools_call_for_approved_tool
  - exactly_one_target_memory_id
  - selected_audit_evidence_only
forbidden:
  - any_second_mutation_call
  - any_unapproved_tool
  - batch_targets
  - raw_memory_scan
  - raw_audit_scan
  - raw_jsonl_dump
  - provider_api_call
  - bearer_token_use_unless_separately_named
  - readiness_claim
  - rc_ready_claim
  - release_tag_deploy
  - push
operator_acknowledges:
  - this is a Red-boundary confirmed mutation action
  - the approval is single-use
  - the approval is consumed whether the mutation is accepted or rejected
  - readiness remains blocked after execution
```

The future approval must name the exact tool, exact target, exact reason, exact evidence, and exact rollback posture. Blanket approvals, implied approvals, or approvals that omit target/action/boundary fields must fail closed.

## Pre-Mutation Checklist

Before any future confirmed mutation, the executor must record:

- fresh `git status --short --branch`
- fresh `git rev-list --left-right --count "@{u}...HEAD"`
- the exact approved tool name
- the exact target memory id, without printing raw memory content
- the reviewed dry-run projection summary
- the selected rollback plan
- confirmation that no provider/API call is required
- confirmation that no raw scan is required
- confirmation that no readiness or `RC_READY` claim is authorized

## Rollback Plan

If the future confirmed mutation is accepted and later needs rollback:

1. stop before any additional mutation
2. preserve the sanitized mutation receipt
3. identify the exact changed lifecycle fields from selected audit evidence
4. prepare a separate rollback approval packet for the inverse controlled mutation
5. require a new exact approval before rollback execution
6. execute at most one rollback mutation call after approval
7. run bounded post-rollback evidence checks
8. record rollback status in `.agent_board`, `CURRENT_STATE.md`, and `STATUS.md`
9. preserve `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

Rollback is not automatically authorized by the original apply approval.

## Post-Mutation Evidence Checklist

If a future exact approval is executed, closeout evidence must record only low-disclosure fields:

- approval id
- approved tool
- consumed approval status
- accepted or rejected decision
- dry-run status
- confirmed status
- mutated status
- target kind
- lifecycle status transition, if returned
- selected audit committed status
- rollback requirement
- forbidden key hit count
- provider/API call count
- bearer-token use count
- raw scan count
- readiness claim status
- `RC_READY` claim status

Post-mutation evidence must not print:

- raw memory content
- title
- snippet
- raw audit rows
- raw JSONL rows
- filesystem paths
- provider payloads
- token material
- secrets
- broad store dumps

## Validation Required After Future Execution

Future execution closeout must run at least:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

If source/runtime behavior is changed before future execution, the executor must also run the relevant targeted tests and project gates from `AGENTS.md`.

## Explicit Non-Claims

CM-1475 does not execute `dry_run=false`.

CM-1475 does not execute `confirm=true`.

CM-1475 does not execute real mutation.

CM-1475 does not scan raw memory, raw audit, raw JSONL, SQLite, vector, or cache stores.

CM-1475 does not call provider/API.

CM-1475 does not use bearer token.

CM-1475 does not approve release, tag, deploy, remote action, or push.

CM-1475 does not claim readiness.

CM-1475 does not claim `RC_READY`.

## Boundary Receipt

This packet is docs/status/board only.

No controlled mutation apply occurred.

No `dry_run=false` or `confirm=true` call occurred.

No real mutation, raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push occurred.
