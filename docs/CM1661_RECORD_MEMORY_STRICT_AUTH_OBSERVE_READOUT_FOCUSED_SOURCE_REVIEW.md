# CM-1661 Record Memory Strict Auth Observe Readout Focused Source Review

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_STRICT_AUTH_OBSERVE_READOUT_FOCUSED_SOURCE_REVIEW_REPAIRED`

## Scope

Focused source review of the CM-1660 fixture-only observe readout helper, tests, and evidence.

Review target:

- `src/core/RecordMemoryStrictAuthObserveReadout.js`
- `tests/record-memory-strict-auth-observe-readout.test.js`
- `docs/CM1660_RECORD_MEMORY_STRICT_AUTH_OBSERVE_READOUT_HELPER_CONTRACT_TESTS.md`

## Finding

One actionable boundary gap was found.

The CM-1660 helper rejected explicit raw-value key names such as `workspaceIdValue`, `rawWorkspaceId`, and `bearerToken`, but did not reject direct principal/scope value keys such as:

```text
workspaceId
clientId
project_id
```

The helper did not echo those values in output, but accepting them was weaker than the fixture contract. Stage 1 observe readout fixtures should fail closed when raw principal/scope values are supplied as object keys.

## Repair

Updated `FORBIDDEN_RAW_KEYS` in `src/core/RecordMemoryStrictAuthObserveReadout.js` to reject direct camelCase and snake_case principal/scope value keys:

```text
agentAlias
agentId
requestSource
projectId
workspaceId
clientId
agent_alias
agent_id
request_source
project_id
workspace_id
client_id
```

Added regression test:

```text
CM1661 observe readout rejects direct camelCase and snake_case principal scope values
```

## Boundaries

- fixture-only helper: `YES`
- runtime wiring changed: `NO`
- observe readout executed against runtime: `NO`
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

## Review Result

After the repair, no further actionable low-disclosure, runtime wiring, provider/API, raw/broad scan, public MCP expansion, or readiness-claim issues were found in the changed scope.

## Validation

Passed:

```text
node --test tests\record-memory-strict-auth-observe-readout.test.js
git diff --check
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS.json ok')"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Result:

```text
observe readout helper contract: 7 passed / 0 failed
diff whitespace check: passed
CURRENT_FACTS.json parse: passed
docs validation: passed
```
