# CM-1536 Live Proof Rerun Readiness Decision After Freshness Guard Audit

## Goal

Record the decision point after CM-1532, CM-1534, and CM-1535: whether the live client integration proof can be considered for rerun.

This task is a docs decision record only. It does not execute live proof, close the live client evidence blocker, close the effective write reliability blocker, call provider/API, use bearer-token material, perform raw memory/audit/broad scan, execute effective `record_memory`, execute confirmed mutation, expand public MCP tools, release/tag/deploy, or claim readiness / `RC_READY`.

## Decision

```text
decision: READY_TO_REQUEST_EXACT_OPERATOR_APPROVAL_FOR_LIVE_PROOF_RERUN
execution_status: NOT_EXECUTED
approval_status: NOT_GRANTED_BY_CM_1536
live_client_evidence_blocker: STILL_OPEN
effective_write_reliability_blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

The local source/audit prerequisites are now strong enough to ask for a separate exact live proof rerun approval. CM-1536 does not grant that approval and does not run the proof.

## Freshness Guard Closeout Summary

| Requirement | Status | Evidence |
|---|---|---|
| Runtime freshness guard | `AUDITED` | CM-1532 implemented bounded `/health.runtimeFreshness`; CM-1533 independently audited the changed scope. |
| Ensure healthy stale runtime handling | `AUDITED_FAIL_CLOSED` | CM-1533 confirmed `scripts/ensure-codex-memory-http.ps1` does not accept healthy-only stale runtime. |
| Runner stale fingerprint short-circuit | `AUDITED` | CM-1534 implemented immediate fail-closed behavior; CM-1535 independently audited it. |
| Runner proof request ordering | `AUDITED_FAIL_CLOSED` | CM-1535 confirmed mismatch returns before `resolveMcpUrl`, `initialize`, `tools/list`, or `tools/call`. |
| Failure disclosure | `AUDITED_LOW_DISCLOSURE` | CM-1535 confirmed `runtime_source_fingerprint_mismatch` and blocked-health summary omit sensitive values. |
| Public MCP surface | `UNCHANGED_SEVEN_TOOLS` | CM-1534 and CM-1535 preserve seven public tools. |
| Live proof rerun | `NOT_EXECUTED` | This decision record does not run live proof. |

## Rerun Readiness Checklist

The following must be true before any future live proof rerun:

```text
fresh_git_required: true
branch_required: main
worktree_required: clean
head_required: HEAD == origin/main at execution time
runtime_freshness_required: /health.runtimeFreshness matches expected runtime source fingerprint
runner_short_circuit_required: stale fingerprint blocks before proof requests
public_tool_count_required: 7
exact_operator_approval_required: true
```

The following remain forbidden unless a future exact approval explicitly changes the boundary:

```text
provider/API: forbidden
bearer token: forbidden
raw scan: forbidden
effective record_memory write: forbidden
confirmed mutation: forbidden
public MCP expansion: forbidden
release/tag/deploy: forbidden
readiness / RC_READY claim: forbidden
blocker closure from pre-proof docs: forbidden
```

## Exact Allowed Command Envelope Reference

The future proof rerun must be based on the existing no-bearer live client proof envelope:

```text
reference envelope: docs/CM1493_LIVE_CLIENT_PROOF_APPROVAL_ENVELOPE.md
approval decision required: APPROVE_LIVE_CLIENT_INTEGRATION_PROOF
transport: local_http_mcp
endpoint: http://127.0.0.1:7605
auth boundary: no_bearer_token
allowed live MCP operations: initialize=1, tools/list=1, tools/call=7
```

CM-1536 adds the freshness guard precondition to that future envelope:

```text
pre-proof health freshness check: required
expected runtime source fingerprint: required
fingerprint mismatch behavior: blocked_before_proof_requests
acceptable proof evidence after mismatch: false
```

CM-1536 does not execute any of those commands and does not authorize a rerun by itself.

## Live Proof Rerun Go / No-Go

```text
GO to request exact approval: yes
GO to execute proof now: no
GO to close live client evidence blocker now: no
GO to close effective write reliability blocker now: no
GO to claim RC_READY: no
```

Rationale:

- CM-1532 / CM-1533 cover runtime freshness guard and stale runtime handling.
- CM-1534 / CM-1535 cover runner stale fingerprint short-circuit and no proof requests after mismatch.
- The previous live client evidence blocker is still open because no new live proof has been run after these guard/audit changes.
- Effective write reliability remains a separate blocker and is not affected by this decision record.

## Boundary Confirmation

```text
live_client_proof_execution: 0
live_client_proof_closeout: 0
live_client_blocker_closed: false
effective_write_blocker_closed: false
provider_api_calls: 0
bearer_token_use: 0
raw_memory_scan: 0
raw_audit_scan: 0
broad_memory_scan: 0
effective_record_memory_writes: 0
confirmed_mutation: 0
public_mcp_expansion: 0
release_tag_deploy: 0
readiness_claim: false
rc_ready_claim: false
```

## Next Route

The next action is an operator decision: either approve a bounded no-bearer live proof rerun under the referenced exact envelope plus freshness precondition, or keep the live client evidence blocker open without execution.
