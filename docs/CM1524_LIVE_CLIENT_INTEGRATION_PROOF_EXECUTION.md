# CM-1524 Live Client Integration Proof Execution

## Scope

This step executed the approved CM-1493 no-bearer local HTTP MCP proof envelope after CM-1523 approval was pushed and fresh Git preflight confirmed synced `main`.

Endpoint:

```text
http://127.0.0.1:7605/mcp/codex-memory
```

## Fresh Git Preflight

```text
branch: main
HEAD: 49aefe12de34d1b75d4c59b677f8a663641ec6c5
origin/main: 49aefe12de34d1b75d4c59b677f8a663641ec6c5
ahead/behind: 0 0
worktree: clean before proof
```

## Operations

Executed within the approved budget:

```text
initialize: 1
tools/list: 1
tools/call: 7
total live MCP operations: 9
bearer token: not used
provider/API: not used
effective record_memory write: not executed
confirmed mutation: not executed
public MCP expansion: not executed
```

## Result Summary

| Check | Result | Notes |
|---|---|---|
| `initialize` | PASS | No-bearer initialize returned a JSON-RPC result. |
| `tools/list` count | PASS | Returned exactly 7 public tools. |
| `tools/list` names | PASS | `audit_memory`, `memory_overview`, `record_memory`, `search_memory`, `supersede_memory`, `tombstone_memory`, `validate_memory`. |
| `record_memory` invalid-args/no-write | PASS_WITH_FINDING | Rejected before any effective write, but no-token rejection included token/mutation-shaped code wording. |
| `search_memory` bounded/no raw | PASS_WITH_FINDING | Rejected at no-token boundary; no raw results returned, but rejection included token-shaped code wording. |
| `memory_overview` readonly summary | FAIL_FINDING | Returned summary, but redacted scan found access/projection keys with bearer-token/raw/lifecycle-shaped wording. |
| `audit_memory` readonly bounded | INCONCLUSIVE_FINDING | No-token gate rejected before bounded readonly projection could be proven. |
| `validate_memory` public dry-run low-disclosure | INCONCLUSIVE_FINDING | No-token gate rejected before public dry-run projection could be proven. |
| `tombstone_memory` public dry-run low-disclosure | INCONCLUSIVE_FINDING | No-token gate rejected before public dry-run projection could be proven. |
| `supersede_memory` public dry-run low-disclosure | INCONCLUSIVE_FINDING | No-token gate rejected before public dry-run projection could be proven. |

## Finding

The proof did not fully pass. The seven-tool public surface is correct, and no forbidden side effect occurred, but the live no-bearer transcript cannot confirm the full low-disclosure contract because:

- `memory_overview` exposed access/projection metadata with bearer-token/raw/lifecycle-shaped field names.
- no-token rejection paths exposed token/mutation-shaped rejection code wording.
- controlled mutation dry-run and audit readonly tool logic could not be reached without crossing the bearer-token boundary, which is forbidden by this proof lane.

## Boundary Confirmation

No provider/API call, bearer-token use, raw memory scan, raw audit scan, broad memory scan, effective `record_memory` write, confirmed mutation, `dry_run=false` mutation, `confirm=true` mutation, public MCP expansion, effective write reliability proof, release/tag/deploy, readiness claim, or `RC_READY` claim occurred.

## Decision

`CM-1524_RESULT: PROOF_EXECUTED_WITH_FINDING`

The live client evidence blocker is not closed by CM-1524.
