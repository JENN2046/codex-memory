# CM-1659 Record Memory Strict Auth Stage 1 Observe Readout Design

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_STRICT_AUTH_STAGE1_OBSERVE_READOUT_DESIGN_DOCS_ONLY_NO_RUNTIME_WIRING`

## Scope

This document defines the bounded readout needed for a future stage 1 `record_memory` strict auth observe-only rollout.

This is design evidence only. It does not wire runtime telemetry, does not read production logs, does not edit `.env`, does not change startup/watchdog configuration, and does not enable strict enforcement.

## Readout Goal

Stage 1 observe-only needs enough information to answer:

```text
Would intended authenticated record_memory writes pass strict principal/scope auth?
```

It must not answer by exposing raw identities, raw workspace ids, raw client ids, bearer tokens, provider keys, private keys, paths, or write payload content.

## Allowed Counters

A bounded readout may expose only aggregate counters:

| Counter | Meaning |
|---|---|
| `observedRecordMemoryCalls` | authenticated `record_memory` calls evaluated by observe-only preflight |
| `acceptedForPrincipalScopeAuthorizationPreflight` | calls that would pass strict principal/scope auth |
| `rejectedForPrincipalScopeAuthorizationPreflight` | calls that would fail strict principal/scope auth if strict were enabled |
| `missingRequiredContextFieldCount` | total missing required trusted context fields |
| `mismatchedFieldCount` | total mismatched trusted context fields |
| `payloadScopeAuthorityUsedCount` | must remain `0`; payload scope must not authorize strict principal/scope |
| `strictRuntimeRejectionCount` | must remain `0` during stage 1 observe-only |
| `publicMcpExpansionCount` | must remain `0` |
| `providerApiCallCount` | must remain `0` |
| `rawScanCount` | must remain `0` |
| `broadScanCount` | must remain `0` |

## Allowed Field Names

The readout may list field names only:

```text
agentAlias
agentId
requestSource
projectId
workspaceId
clientId
```

Allowed grouped examples:

```json
{
  "missingRequiredContextFields": ["workspaceId", "clientId"],
  "mismatchedFields": ["workspaceId", "clientId"]
}
```

Forbidden examples:

```json
{
  "workspaceId": "real-workspace-value",
  "clientId": "real-client-value",
  "agentId": "real-agent-value"
}
```

## Readout Shape

Recommended low-disclosure shape:

```json
{
  "scope": "record_memory_principal_scope_observe",
  "mode": "observe",
  "strictEnforcementEnabled": false,
  "window": {
    "startedAt": "sanitized-or-operator-owned",
    "endedAt": "sanitized-or-operator-owned"
  },
  "counters": {
    "observedRecordMemoryCalls": 0,
    "acceptedForPrincipalScopeAuthorizationPreflight": 0,
    "rejectedForPrincipalScopeAuthorizationPreflight": 0,
    "missingRequiredContextFieldCount": 0,
    "mismatchedFieldCount": 0,
    "payloadScopeAuthorityUsedCount": 0,
    "strictRuntimeRejectionCount": 0,
    "publicMcpExpansionCount": 0,
    "providerApiCallCount": 0,
    "rawScanCount": 0,
    "broadScanCount": 0
  },
  "fieldNamesOnly": {
    "missingRequiredContextFields": [],
    "mismatchedFields": []
  },
  "nonClaims": {
    "productionReady": false,
    "releaseReady": false,
    "cutoverReady": false,
    "completeV8Claimed": false
  }
}
```

## Promotion Criteria

Stage 1 can only support a later strict candidate request when all are true:

- complete trusted env/profile policy is present
- intended authenticated writes have `rejectedForPrincipalScopeAuthorizationPreflight=0`
- `missingRequiredContextFieldCount=0`
- `mismatchedFieldCount=0`
- `payloadScopeAuthorityUsedCount=0`
- `strictRuntimeRejectionCount=0`
- readout stays low-disclosure
- rollback to `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off` is documented for the exact target runtime

These criteria support requesting the next local candidate stage. They do not enable production strict mode by themselves.

## Abort Conditions

Abort the stage 1 rollout or do not request strict candidate if any are true:

- intended authenticated writes would fail strict principal/scope auth
- any trusted runtime context field is missing
- payload scope is needed to authorize the write
- raw principal/scope values appear in public response, audit output, logs, docs, or handoff
- provider/API calls are needed for the readout
- raw store scan or broad memory scan is needed
- startup/watchdog/config changes are needed without exact approval
- production/release/deploy/cutover readiness would need to be claimed

## Boundaries

- runtime wiring changed: `NO`
- observe readout executed: `NO`
- production logs read: `NO`
- `.env` edit: `NO`
- startup/watchdog/config changed: `NO`
- strict enforcement enabled: `NO`
- provider/API called: `NO`
- raw/broad memory scan: `NO`
- public MCP expansion: `NO`
- push/PR/release/deploy/cutover: `NO`
- production/release/cutover ready: `NO`
- complete V8 claimed: `NO`

## Validation

Passed:

```text
git diff --check
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS.json ok')"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Result:

```text
diff whitespace check: passed
CURRENT_FACTS.json parse: passed
docs validation: passed
```
