# CM-1365 Phase F1 Live No-Write Rejected Evidence

Status: `BLOCKED_NOT_READY`

Date: 2026-06-02

## Scope

CM-1365 records the exact-approved Phase F1 live-client no-write contract refresh attempt on the fresh synced `main` head.

The run was bounded to the approved no-write evidence path. It did not start or ensure services, did not call providers, did not execute successful `record_memory`, did not execute authenticated `search_memory`, did not read raw memory bodies or raw audit, did not write durable memory/audit data, did not change config/watchdog/startup, did not expand public MCP tools, and did not claim readiness or reliability.

## Fresh Facts

```text
branch=main
HEAD=546915bec01fd8ffd0fd974f59b6fc95966218a4
origin/main=546915bec01fd8ffd0fd974f59b6fc95966218a4
ahead_behind=0/0
worktree=clean
endpoint=http://127.0.0.1:7605
```

## Exact Approval

The user provided the exact A5-GAP-4 approval line bound to `main@546915bec01fd8ffd0fd974f59b6fc95966218a4`.

The approval checker accepted it:

```text
approvalAccepted=true
authorizationGranted=true
liveClientNoWriteContract=true
allowsMemoryOverviewToolCall=true
includesNoTokenRejectionChecks=true
noProvider=true
noDurableWrite=true
noConfigWatchdogStartupChange=true
```

## Execution Result

Command shape:

```text
node src\cli\phase-f1-live-client-no-write.js --branch main --commit 546915bec01fd8ffd0fd974f59b6fc95966218a4 --endpoint http://127.0.0.1:7605 --approval-line <exact-approved-line> --current-branch main --current-head 546915bec01fd8ffd0fd974f59b6fc95966218a4 --origin-head 546915bec01fd8ffd0fd974f59b6fc95966218a4 --dirty-status-line-count 0 --execute --json --pretty
```

Result:

```text
status=PHASE_F1_LIVE_CLIENT_NO_WRITE_EVIDENCE_REJECTED_FAIL_CLOSED
executionMode=executed_bounded_no_write
liveClientRefreshExecuted=true
evidenceAccepted=false
runtimeReady=false
finalRcMatrixReady=false
rcReady=false
tokenMaterialPrinted=false
tokenMaterialPersisted=false
```

Accepted evidence:

```text
health.ok=true
initialize.ok=true
toolsList.ok=true
publicToolCount=3
publicTools=memory_overview,record_memory,search_memory
publicToolsFrozen=true
authorizedOverview.ok=true
authorizedOverview.rawContentReturned=false
noTokenRecordMemory.rejected=true
noTokenSearchMemory.rejected=true
```

Rejected evidence boundary:

```text
noTokenOverview.ok=false
noTokenOverview.selectedProjection=false
noTokenRecordMemory.reasonCode=
noTokenSearchMemory.reasonCode=
expectedRecordReasonCode=NO_TOKEN_MUTATION_REJECTED
expectedSearchReasonCode=NO_TOKEN_SEARCH_REJECTED
```

## Interpretation

This is useful live evidence, but it is not accepted F1 evidence.

The current live endpoint did not satisfy the strict no-token selected projection / reason-code contract required by the Phase F1 harness. Therefore F1 remains blocked and F2/F3/F4/F5 must not proceed.

Source inspection after the run found a likely contract boundary: `src/adapters/codex-mcp/http.js` performs the detailed no-token JSON-RPC rejection path only when the server is not configured with a bearer token. When the server has a bearer token configured, no-token requests can be rejected earlier with a broader unauthorized envelope, which does not expose the selected overview projection or the expected reason codes.

## Remaining State

```text
NOT_READY_BLOCKED
RC_NOT_READY_BLOCKED
```

Next safe work is local source/test hardening or an explicit operator decision for how the authenticated HTTP runtime should expose no-token selected overview/rejection codes. Any service restart, config/watchdog/startup change, provider call, memory write, real recall proof, or readiness closeout remains a separate approval boundary.
