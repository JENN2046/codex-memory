# CM-1491 Live Client Integration Evidence Exact-Proof Preflight

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_LIVE_CLIENT_INTEGRATION_PREFLIGHT_NO_LIVE_CALL`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Prepare an exact-proof preflight for future live client integration evidence for the post-closeout seven-tool public surface.

This is docs preflight only. It does not execute a live client call, call provider/API, use bearer token material, perform raw scan, execute confirmed mutation, perform an effective `record_memory` write, expand public MCP tools, or claim readiness / `RC_READY`.

## Blocker Addressed

CM-1490 selected this next must-fix blocker:

```text
live_client_integration_evidence_not_current_for_post_closeout_seven_tool_surface
```

CM-1491 does not close that blocker. It prepares the exact approval and evidence shape required before any future proof may run.

## Public Surface Under Test

Future proof must observe exactly these seven public tools:

```text
record_memory
search_memory
memory_overview
audit_memory
validate_memory
tombstone_memory
supersede_memory
```

No additional public tool may appear. Missing or extra tools fail closed.

## Exact Approval Requirements

A future live client integration proof requires a fresh exact approval that names all of the following:

| Field | Required value or constraint |
|---|---|
| `task_id` | future task id, not `CM-1491` |
| `baseline_commit` | fresh full local `HEAD` commit at execution time |
| `origin_commit` | fresh full `origin/main` commit at execution time |
| `worktree_required` | clean |
| `transport` | exactly one of `local_http_mcp`, `codex_client_mcp`, `claude_client_mcp`, or another named live client transport |
| `endpoint` | exact local endpoint or client name; no production endpoint |
| `auth_boundary` | either `no_bearer_token` or exact approval for bearer use |
| `allowed_calls` | exact ordered command / transcript shape from this packet |
| `record_memory_policy` | invalid-args rejection only; no valid write |
| `controlled_mutation_policy` | dry-run low-disclosure only; no `dry_run=false`, no `confirm=true` |
| `output_policy` | sanitized transcript only; no raw response dump |
| `stop_conditions` | fail closed on any drift listed in this packet |

If bearer token is required by the selected transport, that must be separately and explicitly approved before execution. CM-1491 does not authorize bearer-token use.

## Expected Live Client Commands / Transcript Shape

The future proof may use only one selected transport. The approval must choose exactly one transcript family.

### Option A: Local HTTP MCP Client

Allowed transcript shape:

```text
1. fresh git facts
2. local runtime freshness / endpoint availability check, if separately allowed
3. MCP initialize
4. MCP tools/list
5. tools/call record_memory with invalid args only
6. tools/call search_memory with invalid args only
7. tools/call memory_overview with invalid args only, or no-token selected projection only if exact-approved
8. tools/call audit_memory readonly bounded request
9. tools/call validate_memory safe public dry-run low-disclosure request
10. tools/call tombstone_memory safe public dry-run low-disclosure request
11. tools/call supersede_memory safe public dry-run low-disclosure request
12. sanitized evidence summary
```

### Option B: Codex Or Claude Client MCP

Allowed transcript shape:

```text
1. fresh git facts
2. exact client identity declaration
3. MCP initialize through the named client
4. MCP tools/list through the named client
5. invalid-args or readonly/low-disclosure tools/call sequence matching Option A
6. sanitized client transcript summary
```

No future proof may mix transports unless a separate approval names the exact reason and combined call budget.

## Expected Assertions

### `tools/list`

Required:

- exactly seven public tools
- names match the public surface list above
- no new public MCP expansion
- no hidden eighth tool
- no missing controlled mutation dry-run tool

### Invalid-Args Rejections

For `record_memory`, `search_memory`, and `memory_overview`, future proof should prefer invalid-args rejection shape unless separately exact-approved otherwise.

Required low-disclosure assertions:

- rejected or invalid request status
- no memory id
- no title
- no snippet
- no content
- no file path
- no source file
- no raw audit row
- no provider metadata
- no token material
- no durable write

### `audit_memory`

Future proof may call only readonly bounded aggregate/explainability shape.

Required low-disclosure assertions:

- readonly mode
- bounded aggregate or explanation only
- no raw audit row
- no raw memory payload
- no memory id
- no file path
- no provider/API call
- no bearer token material in output

### Controlled Mutation Public Dry-Run Tools

For `validate_memory`, `tombstone_memory`, and `supersede_memory`, future proof may use only safe public dry-run low-disclosure requests.

Required assertions:

- `accepted=false`
- `decision=rejected`
- `dryRun=true`
- `mutated=false`
- no `fromStatus`
- no `toStatus`
- no `newFromStatus`
- no `newToStatus`
- no target existence disclosure
- no lifecycle eligibility disclosure
- no `dry_run=false`
- no `confirm=true`

## Forbidden Output Keys

Future sanitized transcript must fail closed if any of these appear in client-visible tool output, except where the key is part of a known safe boolean access flag explicitly checked by value:

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

The future collector must distinguish safe access flags from actual leaked values. Presence of a safe boolean flag name is not sufficient to claim leakage; actual value and location must be inspected.

## Failure / Abort Criteria

Abort before any tool call if:

- branch is not `main`
- worktree is dirty
- local `HEAD` does not match the exact approved baseline
- `origin/main` does not match the exact approved origin
- approval omits transport, auth boundary, call count, or expected output shape
- bearer token would be required but is not exactly approved
- endpoint or client identity differs from approval

Abort during proof if:

- `tools/list` returns anything other than the seven expected tools
- any valid `record_memory` write would be attempted
- any controlled mutation call would use `dry_run=false` or `confirm=true`
- any output contains raw memory, raw audit, provider/API, bearer-token, file path, memory id, title, snippet, content, lifecycle transition, or target eligibility leakage
- any provider/API call is needed
- any raw scan would be needed
- any public MCP expansion is observed

Abort after proof if:

- sanitized transcript cannot prove call count and output shape
- side-effect counters are unavailable or contradictory
- evidence cannot distinguish docs-only, live-runtime, no-mutation, and read-only claims
- any wording would imply readiness, release readiness, cutover readiness, reliability, or `RC_READY`

## Rollback / Cleanup Plan

CM-1491 has no runtime rollback because it performs no runtime action.

Future proof rollback / cleanup must be declared before execution:

- if no valid write is allowed, cleanup should be unnecessary
- if any unexpected durable write is observed, stop and require human incident review
- if runtime/client state was started only for proof, stop it only if that stop action was pre-approved or is already part of a local safe cleanup procedure
- do not delete logs, stores, or evidence to hide an unexpected side effect

## Evidence Checklist For Future Proof

Future evidence packet must include:

- exact approval line
- fresh Git facts
- selected transport and auth boundary
- transcript command list with exact call counts
- `tools/list` exact seven-tool result summary
- per-tool sanitized output summary
- forbidden key scan summary over sanitized output
- side-effect summary:
  - valid `record_memory` writes: `0`
  - confirmed mutations: `0`
  - `dry_run=false`: `0`
  - `confirm=true`: `0`
  - provider/API calls: `0`
  - bearer-token use: exact approved value or `0`
  - raw scans: `0`
  - public MCP expansion: `0`
- distinction between live-runtime evidence and readiness
- explicit non-claims

## Validation Matrix

| Validation | Scope | Required for CM-1491 |
|---|---|---|
| `git diff --check` | whitespace / patch hygiene | yes |
| `scripts\validate-local.ps1 -Area docs` | docs governance and board consistency | yes |
| `CURRENT_FACTS.json` parse | machine snapshot integrity | yes |
| staged diff check | commit hygiene | yes |
| changed-scope review | no readiness overclaim or boundary drift | yes |

## Go / No-Go

| Route | Decision | Reason |
|---|---|---|
| Prepare live client integration exact-proof preflight | `GO` | This is docs-only and follows CM-1490 selection. |
| Execute live client proof in CM-1491 | `NO-GO` | Live calls require separate exact approval. |
| Use bearer token in CM-1491 | `NO-GO` | Forbidden by task scope. |
| Call provider/API in CM-1491 | `NO-GO` | Forbidden by task scope. |
| Execute valid `record_memory` write | `NO-GO` | Future proof may only use invalid-args rejection unless separately approved. |
| Execute confirmed mutation | `NO-GO` | Still separate exact approval / Red-boundary work. |
| Expand public MCP tools | `NO-GO` | Seven-tool surface must remain stable. |
| Claim readiness or `RC_READY` | `NO-GO` | Blockers remain. |

## Recommended Next Route

```text
CM-1492 live client integration evidence exact approval decision
```

Recommended scope:

- approve or reject one exact transport
- approve or reject bearer-token use
- approve exact call sequence and output sanitizer
- still no provider/API, raw scan, confirmed mutation, valid `record_memory` write, public MCP expansion, release/tag/deploy, or readiness / `RC_READY` claim unless separately approved

## Explicit Non-Claims

CM-1491 does not:

- execute live client calls
- call provider/API
- use bearer token material
- perform raw scan
- execute confirmed mutation
- perform an effective `record_memory` write
- expand public MCP tools
- release, tag, or deploy
- claim readiness or `RC_READY`
