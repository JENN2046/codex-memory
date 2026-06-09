# CM-1525 Live Client Integration Proof Evidence

## Source

Evidence source: CM-1524 no-bearer local HTTP MCP proof execution.

This document records only a redacted transcript summary. It does not include raw MCP response bodies, bearer-token material, provider/API payloads, raw memory content, raw audit content, or private field values.

## Command List

Approved and executed operation sequence:

```text
1. git fetch origin
2. git rev-parse HEAD
3. git rev-parse origin/main
4. git status --short
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
| `initialize` | 200 | result | PASS | No forbidden summary hit. |
| `tools/list` | 200 | result | PASS | Exact seven-tool public surface confirmed; raw schema not persisted in evidence. |
| `record_memory` invalid args | 403 | error `-32001` | PASS_WITH_FINDING | No effective write; no-token rejection included token/mutation-shaped code wording. |
| `search_memory` invalid args | 403 | error `-32001` | PASS_WITH_FINDING | No raw results; no-token rejection included token-shaped code wording. |
| `memory_overview` readonly summary | 200 | result | FAIL_FINDING | Summary included bearer-token/raw/lifecycle-shaped projection key names. |
| `audit_memory` readonly bounded | 403 | error `-32001` | INCONCLUSIVE_FINDING | Rejected at no-token gate before bounded readonly tool projection could be proven. |
| `validate_memory` dry-run | 403 | error `-32001` | INCONCLUSIVE_FINDING | Rejected at no-token gate before public dry-run projection could be proven. |
| `tombstone_memory` dry-run | 403 | error `-32001` | INCONCLUSIVE_FINDING | Rejected at no-token gate before public dry-run projection could be proven. |
| `supersede_memory` dry-run | 403 | error `-32001` | INCONCLUSIVE_FINDING | Rejected at no-token gate before public dry-run projection could be proven. |

## Pass/Fail Matrix

| Requirement | Status |
|---|---|
| `tools/list` returns public MCP tools and count remains 7 | PASS |
| public tools match the approved seven names | PASS |
| `record_memory` proof avoids effective write | PASS |
| `search_memory` proof avoids raw/private/client-boundary field output | PASS_WITH_FINDING |
| `memory_overview` readonly summary avoids raw/private/provider/token/API-shaped information | FAIL_FINDING |
| `audit_memory` readonly bounded projection proven | INCONCLUSIVE_FINDING |
| controlled mutation public dry-run low-disclosure projection proven | INCONCLUSIVE_FINDING |
| confirmed mutation avoided | PASS |
| `dry_run=false` mutation avoided | PASS |
| `confirm=true` mutation avoided | PASS |
| public MCP expansion avoided | PASS |
| provider/API avoided | PASS |
| bearer-token use avoided | PASS |
| raw memory/audit/broad scan avoided | PASS |
| release/tag/deploy avoided | PASS |
| readiness / `RC_READY` claim avoided | PASS |

## Finding

`CM-1525_FINDING: LIVE_CLIENT_LOW_DISCLOSURE_NOT_FULLY_PROVEN`

The proof is sufficient to confirm the live seven-tool public MCP surface and no-write/no-mutation/no-expansion boundaries. It is not sufficient to close the live client evidence blocker because the no-bearer transcript exposed token/raw/lifecycle-shaped wording and did not reach deeper audit/controlled-mutation public projection logic.

## Blocker Effect

```text
live client evidence blocker: STILL_OPEN_PENDING_CM1526_CLOSEOUT
effective write reliability blocker: OPEN / DEFERRED
RC_READY: BLOCKED
```
