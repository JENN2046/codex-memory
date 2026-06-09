# CM-1494 Live Client Proof Exact Approval Decision

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_LIVE_CLIENT_PROOF_DECISION_REJECTED_NO_LIVE_CALL`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Record whether the operator approves execution of the live client integration proof using the completed CM-1493 approval envelope.

This is a docs decision record only. It does not execute live client calls, call provider/API, use bearer token material, perform raw scan, execute confirmed mutation, perform an effective `record_memory` write, expand public MCP tools, or claim readiness / `RC_READY`.

## Decision

```text
REJECT_LIVE_CLIENT_INTEGRATION_PROOF
```

## Rationale

CM-1493 completed the exact no-bearer approval envelope shape for a future local HTTP MCP live client integration proof, but CM-1493 explicitly did not approve execution by itself.

The current operator task asks CM-1494 to record one of:

```text
APPROVE_LIVE_CLIENT_INTEGRATION_PROOF
REJECT_LIVE_CLIENT_INTEGRATION_PROOF
```

It does not provide the exact approval decision string `APPROVE_LIVE_CLIENT_INTEGRATION_PROOF` as an operator decision. Under the fail-closed approval policy, absence of that exact approval is recorded as rejection.

Therefore CM-1494 records rejection and preserves the live client evidence blocker.

## CM-1493 Envelope Reference

The allowed command envelope and abort criteria for any future approval remain defined by:

```text
docs/CM1493_LIVE_CLIENT_PROOF_APPROVAL_ENVELOPE.md
```

The candidate future proof remains constrained to:

- local HTTP MCP endpoint `http://127.0.0.1:7605`
- no bearer token
- no provider/API call
- no raw scan
- no valid `record_memory` write
- no confirmed mutation
- no public MCP expansion
- no release/tag/deploy
- no readiness / `RC_READY` claim
- one initialize
- one `tools/list`
- seven `tools/call` operations
- sanitized evidence artifact only

This CM-1494 decision does not activate that envelope.

## Rejected Execution Status

| Item | Status after CM-1494 |
|---|---|
| Live client integration proof | `REJECTED_NOT_EXECUTED` |
| CM-1493 command envelope | `REFERENCED_NOT_ACTIVATED` |
| Live client evidence blocker | `STILL_BLOCKED` |
| Seven-tool public surface | `UNCHANGED` |
| Confirmed mutation | `STILL_BLOCKED` |
| Effective `record_memory` write | `NOT_AUTHORIZED` |
| Bearer-token use | `NOT_AUTHORIZED` |
| Provider/API call | `NOT_AUTHORIZED` |
| Raw scan | `NOT_AUTHORIZED` |
| Public MCP expansion | `NOT_AUTHORIZED` |
| Readiness / `RC_READY` | `NOT_CLAIMED` |

## Future Approval Requirements

A future execution decision must explicitly state:

```text
APPROVE_LIVE_CLIENT_INTEGRATION_PROOF
```

and bind to the CM-1493 envelope by name.

Any future approval must also preserve the CM-1493 exact command list, transcript redaction rules, allowed / forbidden proof boundaries, expected evidence artifact checklist, and abort criteria unless a new approval packet replaces them.

## Abort Criteria Reference

Abort criteria are inherited from CM-1493.

Any future proof must abort if:

- branch is not `main`
- worktree is dirty
- local `HEAD` does not equal `origin/main` at execution time
- the approval decision is missing or not exactly `APPROVE_LIVE_CLIENT_INTEGRATION_PROOF`
- the approval is not bound to CM-1493 or an approved replacement envelope
- endpoint differs from `http://127.0.0.1:7605`
- bearer token would be required
- provider/API call would be required
- command sequence would exceed the CM-1493 envelope
- `tools/list` differs from the exact seven-tool public surface
- any valid `record_memory` write would occur
- any controlled mutation call would use `dry_run=false` or `confirm=true`
- any output exposes forbidden raw, id, content, status-transition, provider, token, or path material
- any wording implies readiness, cutover readiness, release readiness, reliability, or `RC_READY`

## Validation Matrix

| Validation | Scope | Required for CM-1494 |
|---|---|---|
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no live execution authorization, readiness overclaim, or boundary drift | yes |

## Explicit Non-Claims

CM-1494 does not:

- approve execution
- execute live client calls
- call provider/API
- use bearer token material
- perform raw scan
- execute confirmed mutation
- perform an effective `record_memory` write
- expand public MCP tools
- release, tag, or deploy
- claim readiness or `RC_READY`
