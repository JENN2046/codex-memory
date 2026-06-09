# CM-1492 Live Client Integration Proof Approval Decision

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_LIVE_CLIENT_PROOF_DECISION_REJECTED_NO_LIVE_CALL`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Record whether the operator approves execution of the live client integration proof prepared by CM-1491.

This is a docs decision record only. It does not execute live client calls, call provider/API, use bearer token material, perform raw scan, execute confirmed mutation, perform an effective `record_memory` write, expand public MCP tools, or claim readiness / `RC_READY`.

## Decision

```text
REJECT_LIVE_CLIENT_INTEGRATION_PROOF
```

## Rationale

The current operator message authorizes only:

- restricted push of `f92850b4`
- docs decision record
- approval / rejection rationale
- exact allowed command envelope
- abort criteria
- `.agent_board` / `CURRENT_STATE` / `STATUS` updates

It does not provide a complete exact approval to execute live client calls. In particular, it does not approve:

- selected live transport
- exact endpoint or client identity
- bearer-token use
- exact ordered live command transcript
- exact call count
- exact sanitized output collector
- execution of any live `tools/list` or `tools/call`

Therefore CM-1492 records rejection and preserves the live proof blocker.

## Rejected Execution Envelope

No live execution envelope is approved in CM-1492.

The following future envelope remains only a candidate shape from CM-1491 and cannot be executed from this decision:

```text
candidate_transport: local_http_mcp | codex_client_mcp | claude_client_mcp
candidate_public_tools: record_memory, search_memory, memory_overview, audit_memory, validate_memory, tombstone_memory, supersede_memory
candidate_record_memory_policy: invalid_args_only
candidate_controlled_mutation_policy: public_dry_run_low_disclosure_only
candidate_output_policy: sanitized_transcript_only
execution_status: NOT_APPROVED_NOT_EXECUTED
```

## Future Approval Requirements

A future approval must explicitly switch this decision to:

```text
APPROVE_LIVE_CLIENT_INTEGRATION_PROOF
```

and must name all required CM-1491 fields:

| Field | Required before execution |
|---|---|
| `task_id` | future execution task id |
| `baseline_commit` | fresh full local `HEAD` |
| `origin_commit` | fresh full `origin/main` |
| `worktree_required` | clean |
| `transport` | exactly one named transport |
| `endpoint_or_client` | exact local endpoint or exact client identity |
| `auth_boundary` | `no_bearer_token` or exact bearer-token approval |
| `allowed_calls` | exact ordered live call sequence |
| `call_budget` | exact call count |
| `record_memory_policy` | invalid-args only unless separately exact-approved |
| `controlled_mutation_policy` | no `dry_run=false`; no `confirm=true` |
| `output_policy` | sanitized transcript only |
| `abort_criteria` | fail-closed criteria from CM-1491 or stricter |

## Abort Criteria Preserved

Any future proof must abort if:

- branch is not `main`
- worktree is dirty
- local `HEAD` or `origin/main` differs from the exact approved commits
- transport or client identity differs from approval
- bearer token would be needed but is not exactly approved
- `tools/list` differs from the exact seven-tool public surface
- any valid `record_memory` write would be attempted
- any controlled mutation call would use `dry_run=false` or `confirm=true`
- any raw memory, raw audit, provider/API, bearer-token, path, memory id, title, snippet, content, lifecycle transition, or target eligibility leakage appears
- any public MCP expansion appears
- any wording would imply readiness, release readiness, cutover readiness, reliability, or `RC_READY`

## Decision Impact

| Item | Status after CM-1492 |
|---|---|
| Live client integration proof | `REJECTED_NOT_EXECUTED` |
| Live client evidence blocker | `STILL_BLOCKED` |
| Seven-tool public surface | `UNCHANGED` |
| Confirmed mutation | `STILL_BLOCKED` |
| Effective `record_memory` write | `NOT_AUTHORIZED` |
| Bearer-token use | `NOT_AUTHORIZED` |
| Provider/API call | `NOT_AUTHORIZED` |
| Raw scan | `NOT_AUTHORIZED` |
| Readiness / `RC_READY` | `NOT_CLAIMED` |

## Validation Matrix

| Validation | Scope | Required for CM-1492 |
|---|---|---|
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no readiness overclaim or boundary drift | yes |

## Explicit Non-Claims

CM-1492 does not:

- execute live client calls
- call provider/API
- use bearer token material
- perform raw scan
- execute confirmed mutation
- perform an effective `record_memory` write
- expand public MCP tools
- release, tag, or deploy
- claim readiness or `RC_READY`
