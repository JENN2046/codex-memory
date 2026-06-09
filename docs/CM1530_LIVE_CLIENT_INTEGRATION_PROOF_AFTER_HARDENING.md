# CM-1530 Live Client Integration Proof After Hardening

## Source

Evidence source: no-bearer local HTTP MCP proof against `http://127.0.0.1:7605/mcp/codex-memory` after CM-1527 no-token low-disclosure hardening and CM-1529 Phase F1 runner public-tool expectation hardening were pushed.

This document records only a redacted transcript summary. It does not include raw MCP response bodies, bearer-token material, provider/API payloads, raw memory content, raw audit content, or private field values.

## Command List

Executed operation sequence:

```text
1. git branch --show-current
2. git status --short
3. git rev-parse HEAD
4. git rev-parse origin/main
5. git rev-list --left-right --count origin/main...HEAD
6. HTTP MCP initialize, no bearer token
7. HTTP MCP tools/list, no bearer token
8. HTTP MCP tools/call record_memory invalid args, no bearer token
9. HTTP MCP tools/call search_memory invalid args, no bearer token
10. HTTP MCP tools/call memory_overview readonly summary, no bearer token
11. HTTP MCP tools/call audit_memory readonly bounded request, no bearer token
12. HTTP MCP tools/call validate_memory dry-run request, no bearer token
13. HTTP MCP tools/call tombstone_memory dry-run request, no bearer token
14. HTTP MCP tools/call supersede_memory dry-run request, no bearer token
15. redacted evidence recording
```

## Tools/List Result

```text
tool_count: 7
exact_public_surface: true
tools:
- audit_memory
- memory_overview
- record_memory
- search_memory
- supersede_memory
- tombstone_memory
- validate_memory
```

## Redacted Transcript Summary

| Operation | HTTP | JSON-RPC | Result | Redacted finding |
|---|---:|---|---|---|
| `initialize` | 200 | result | PASS_WITH_FINDING | Accepted, but the redacted shape check still observed mutation-shaped schema wording in the advertised capabilities surface. |
| `tools/list` | 200 | result | PASS | Exact seven-tool public surface confirmed; raw tool schemas were not persisted in evidence. |
| `record_memory` invalid args | 403 | error `-32001` | FAIL_FINDING | No effective write; rejection still used old no-token mutation-shaped code/reason instead of generic `PUBLIC_REQUEST_BLOCKED`. |
| `search_memory` invalid args | 403 | error `-32001` | FAIL_FINDING | No raw search result; rejection still used old no-token bearer/token-shaped code/reason instead of generic `PUBLIC_REQUEST_BLOCKED`. |
| `memory_overview` readonly summary | 200 | result | FAIL_FINDING | Live projection still reported old selected overview metadata shape instead of low-disclosure v2. |
| `audit_memory` readonly bounded | 403 | error `-32001` | FAIL_FINDING | Rejected before bounded readonly projection; rejection still used old no-token mutation-shaped code/reason. |
| `validate_memory` dry-run | 403 | error `-32001` | FAIL_FINDING | Rejected before dry-run projection; rejection still used old no-token mutation-shaped code/reason. |
| `tombstone_memory` dry-run | 403 | error `-32001` | FAIL_FINDING | Rejected before dry-run projection; rejection still used old no-token mutation-shaped code/reason. |
| `supersede_memory` dry-run | 403 | error `-32001` | FAIL_FINDING | Rejected before dry-run projection; rejection still used old no-token mutation-shaped code/reason. |

## Pass/Fail Matrix

| Requirement | Status |
|---|---|
| `tools/list` still returns exactly seven public tools | PASS |
| public tools match the approved seven names | PASS |
| no Authorization header was sent | PASS |
| no-token rejection avoids token/raw/lifecycle/provider/API-shaped fields | FAIL_FINDING |
| `memory_overview` selected projection uses low-disclosure v2 | FAIL_FINDING |
| rejection paths use generic `PUBLIC_REQUEST_BLOCKED` / blocked status | FAIL_FINDING |
| Phase F1 runner no longer uses old three-tool expectation | PASS_SOURCE_TEST `7/7` |
| public MCP surface did not expand beyond seven tools | PASS |
| effective `record_memory` write avoided | PASS |
| confirmed mutation avoided | PASS |
| `dry_run=false` mutation avoided | PASS |
| `confirm=true` mutation avoided | PASS |
| provider/API avoided | PASS |
| bearer-token use avoided | PASS |
| raw memory/audit/broad scan avoided | PASS |
| release/tag/deploy avoided | PASS |
| readiness / `RC_READY` claim avoided | PASS |

## Finding

`CM-1530_FINDING: LIVE_RUNTIME_LOW_DISCLOSURE_STILL_NOT_OBSERVED_AFTER_HARDENING`

The pushed source and runner hardening were not sufficient to make the currently observed live HTTP MCP no-bearer transcript pass CM-1530. The live endpoint still returned old no-token rejection code/reason shapes and old `memory_overview` selected projection metadata.

This finding does not prove that the source hardening is absent from the committed tree. It proves that the live runtime evidence required by CM-1530 was not observed at the endpoint during this run.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
status: NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED
```

## Boundary Confirmation

```text
live_client_operations: 9
initialize_calls: 1
tools_list_calls: 1
tools_call_calls: 7
authorization_header_sent: false
provider_api_calls: 0
bearer_token_use: 0
raw_memory_scan: 0
raw_audit_scan: 0
broad_memory_scan: 0
effective_record_memory_writes: 0
confirmed_mutation: 0
dry_run_false_mutation: 0
confirm_true_mutation: 0
public_mcp_expansion: 0
release_tag_deploy: 0
readiness_claim: false
rc_ready_claim: false
```

## Next Route

Recommended next route: verify whether the live HTTP MCP runtime is refreshed to the current pushed `main`, then rerun the same no-bearer proof only under an allowed envelope. If a refreshed runtime still returns the same shapes, open a new source hardening task.
