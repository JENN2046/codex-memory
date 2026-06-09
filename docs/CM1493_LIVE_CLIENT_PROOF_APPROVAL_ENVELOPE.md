# CM-1493 Live Client Proof Exact Approval Envelope Completion Packet

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_LIVE_CLIENT_PROOF_APPROVAL_ENVELOPE_NO_LIVE_CALL`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Complete the exact approval envelope required for a future live client integration proof over the post-closeout seven-tool public surface.

This packet does not execute live client calls, call provider/API, use bearer token material, perform raw scan, execute confirmed mutation, perform an effective `record_memory` write, expand public MCP tools, or claim readiness / `RC_READY`.

## Relationship To CM-1492

CM-1492 recorded:

```text
REJECT_LIVE_CLIENT_INTEGRATION_PROOF
```

because no complete exact approval envelope existed. CM-1493 completes that envelope shape, but it does not reverse CM-1492 and does not approve execution by itself.

Future execution still requires a separate operator decision explicitly stating:

```text
APPROVE_LIVE_CLIENT_INTEGRATION_PROOF
```

bound to a fresh clean synced `main` and this packet.

## Exact Approval Envelope

```yaml
task_id: CM-1494
approval_decision_required: APPROVE_LIVE_CLIENT_INTEGRATION_PROOF
approval_packet_dependency: docs/CM1493_LIVE_CLIENT_PROOF_APPROVAL_ENVELOPE.md
transport: local_http_mcp
endpoint: http://127.0.0.1:7605
auth_boundary: no_bearer_token
provider_api_allowed: false
raw_scan_allowed: false
public_mcp_expansion_allowed: false
valid_record_memory_write_allowed: false
confirmed_mutation_allowed: false
readiness_claim_allowed: false
rc_ready_claim_allowed: false
release_tag_deploy_allowed: false
required_branch: main
required_worktree: clean
required_head_state: local_HEAD_equals_origin_main_at_execution_time
```

This envelope is intentionally no-bearer. Any future bearer-token proof requires a new envelope and a separate exact approval.

## Exact Command List

The future proof may run only the following sequence, in order, after separate approval. CM-1493 does not run these commands.

```text
1. git fetch origin
2. git rev-parse HEAD
3. git rev-parse origin/main
4. git status --short
5. git rev-list --left-right --count origin/main...HEAD
6. initialize local HTTP MCP session without bearer token
7. tools/list
8. tools/call record_memory with invalid args only
9. tools/call search_memory with invalid args only
10. tools/call memory_overview no-token selected projection or invalid args only
11. tools/call audit_memory readonly bounded invalid/low-disclosure request
12. tools/call validate_memory public dry-run low-disclosure request
13. tools/call tombstone_memory public dry-run low-disclosure request
14. tools/call supersede_memory public dry-run low-disclosure request
15. write sanitized evidence artifact only
```

Allowed live MCP call budget for the future proof:

```text
initialize: 1
tools/list: 1
tools/call: 7
total_live_mcp_operations: 9
```

No retry is allowed unless a future approval explicitly names the retry condition and maximum retry count.

## Expected Seven-Tool Contract

`tools/list` must return exactly:

```text
record_memory
search_memory
memory_overview
audit_memory
validate_memory
tombstone_memory
supersede_memory
```

The future proof must fail closed if any tool is missing or any extra public tool appears.

## Allowed Proof Boundaries

Allowed only after separate approval:

- local HTTP MCP endpoint on `127.0.0.1:7605`
- no-token client path
- one `initialize`
- one `tools/list`
- invalid-args rejections for `record_memory` and `search_memory`
- no-token selected projection or invalid-args rejection for `memory_overview`
- readonly bounded low-disclosure `audit_memory`
- public dry-run low-disclosure `validate_memory`, `tombstone_memory`, and `supersede_memory`
- sanitized evidence artifact

## Forbidden Proof Boundaries

Forbidden:

- bearer token use
- provider/API call
- raw scan
- raw memory output
- raw audit output
- raw `.jsonl`, SQLite, vector, or candidate-cache output
- valid `record_memory` write
- `dry_run=false`
- `confirm=true`
- confirmed mutation
- public MCP expansion
- release/tag/deploy
- readiness / `RC_READY` claim
- printing or committing secrets

## Transcript Redaction Rules

The future evidence artifact must be sanitized before persistence.

Required redactions:

- replace any token-like value with `<REDACTED_TOKEN>`
- replace any auth header value with `<REDACTED_AUTHORIZATION>`
- omit raw response bodies if they contain content-like, path-like, id-like, provider-like, or token-like fields
- record only boolean/count summaries for forbidden key scans
- record command names, call order, expected result class, and sanitized status

Forbidden persisted fields:

```text
memoryId
memory_id
id
title
snippet
content
text
raw
rawAudit
rawMemory
sourceFile
filePath
path
fromStatus
toStatus
newFromStatus
newToStatus
provider
apiKey
authorization
bearer
token
```

Safe boolean access flags may be mentioned only by path and value, never by treating their key name alone as leakage.

## Abort Criteria

Abort before live MCP operation if:

- branch is not `main`
- worktree is dirty
- `HEAD != origin/main`
- future approval is missing or not exactly `APPROVE_LIVE_CLIENT_INTEGRATION_PROOF`
- future approval is not bound to this packet
- endpoint is not `http://127.0.0.1:7605`
- bearer token would be required
- provider/API call would be required

Abort during proof if:

- any command outside the exact command list is needed
- call count exceeds the approved budget
- `tools/list` is not exactly the seven-tool public surface
- any valid `record_memory` write would occur
- any controlled mutation call would use `dry_run=false` or `confirm=true`
- any output exposes a forbidden field or raw material
- any public MCP expansion is observed

Abort after proof if:

- evidence artifact cannot prove call counts
- evidence artifact cannot prove no-bearer/no-provider/no-write/no-mutation
- sanitizer output is ambiguous
- any wording implies readiness, cutover readiness, release readiness, reliability, or `RC_READY`

## Expected Evidence Artifact Checklist

Future evidence artifact must include:

- task id and approval id
- fresh Git command summaries
- endpoint and auth boundary summary
- exact call count summary
- seven-tool `tools/list` summary
- per-tool result class summary
- forbidden key scan summary
- no-bearer statement
- no-provider/API statement
- no-raw-scan statement
- no-valid-write statement
- no-confirmed-mutation statement
- no-public-expansion statement
- no-readiness / no-`RC_READY` statement
- abort criteria evaluation

## Validation Matrix

| Validation | Scope | Required for CM-1493 |
|---|---|---|
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no execution authorization, readiness overclaim, or boundary drift | yes |

## Explicit Non-Claims

CM-1493 does not:

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
