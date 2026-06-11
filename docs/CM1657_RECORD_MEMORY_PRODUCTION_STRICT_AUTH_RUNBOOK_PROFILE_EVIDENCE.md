# CM-1657 Record Memory Production Strict Auth Runbook / Profile Evidence

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRODUCTION_STRICT_AUTH_RUNBOOK_PROFILE_EVIDENCE_DOCS_ONLY_NO_ENABLEMENT`

## Scope

This runbook fixes the operator-owned env/profile fields and pre-production checks needed before `record_memory` strict principal/scope auth can be considered for a production candidate.

This is documentation and handoff evidence only. It does not edit `.env`, does not change runtime defaults, does not change startup/watchdog configuration, does not deploy, and does not enable strict auth in production.

## Required Trusted Runtime Context

Every strict production candidate must provide all six trusted context fields from process-side env, trusted server context, or an operator-owned profile. Public tool payload scope is not trusted authority for these fields.

| Runtime field | Env key | Requirement |
|---|---|---|
| `agentAlias` | `CODEX_MEMORY_AGENT_ALIAS` | exact allowed alias, for example `Codex` |
| `agentId` | `CODEX_MEMORY_AGENT_ID` | exact runtime/agent identity |
| `requestSource` | `CODEX_MEMORY_REQUEST_SOURCE` | exact trusted entry source, for example approved HTTP MCP or stdio MCP source |
| `projectId` | `CODEX_MEMORY_PROJECT_ID` | exact project boundary |
| `workspaceId` | `CODEX_MEMORY_WORKSPACE_ID` | exact workspace boundary |
| `clientId` | `CODEX_MEMORY_CLIENT_ID` | exact client/application boundary |

## Required Strict Auth Policy

The strict auth policy must be complete before `observe` or `strict` can be effective. Missing or blank allowlist fields must fail closed to effective `off` for config completeness, or reject before persistence when already running a strict stage.

| Policy field | Env key | Requirement |
|---|---|---|
| `mode` | `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE` | `observe` for stage 1, `strict` only for approved strict candidate stages |
| `allowedAgentAlias` | `CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_ALIAS` | must include the trusted `agentAlias` |
| `allowedAgentIds` | `CODEX_MEMORY_RECORD_MEMORY_ALLOWED_AGENT_IDS` | comma-separated exact allowed `agentId` values |
| `allowedRequestSources` | `CODEX_MEMORY_RECORD_MEMORY_ALLOWED_REQUEST_SOURCES` | comma-separated exact allowed `requestSource` values |
| `allowedProjectIds` | `CODEX_MEMORY_RECORD_MEMORY_ALLOWED_PROJECT_IDS` | comma-separated exact allowed `projectId` values |
| `allowedWorkspaceIds` | `CODEX_MEMORY_RECORD_MEMORY_ALLOWED_WORKSPACE_IDS` | comma-separated exact allowed `workspaceId` values |
| `allowedClientIds` | `CODEX_MEMORY_RECORD_MEMORY_ALLOWED_CLIENT_IDS` | comma-separated exact allowed `clientId` values |

## Profile Shape

Sanitized profile evidence should use this shape. Values below are placeholders, not production values.

```json
{
  "recordMemoryPrincipalScopeAuthorization": {
    "mode": "observe",
    "policy": {
      "allowedAgentAlias": "Codex",
      "allowedAgentIds": ["agent-id-placeholder"],
      "allowedRequestSources": ["http-mcp-placeholder"],
      "allowedProjectIds": ["project-id-placeholder"],
      "allowedWorkspaceIds": ["workspace-id-placeholder"],
      "allowedClientIds": ["client-id-placeholder"]
    }
  },
  "recordMemoryTrustedExecutionContext": {
    "agentAlias": "Codex",
    "agentId": "agent-id-placeholder",
    "requestSource": "http-mcp-placeholder",
    "projectId": "project-id-placeholder",
    "workspaceId": "workspace-id-placeholder",
    "clientId": "client-id-placeholder"
  }
}
```

Do not commit real production identifiers when they are sensitive. Use sanitized placeholders in evidence and keep real values in the operator-owned deployment profile.

## Rollout Checks

| Stage | Mode | Boundary | Required evidence before exit |
|---|---|---|---|
| 0 | `off` | current default | strict auth is not enabled by default |
| 1 | `observe` | complete policy, no rejection | intended writes would pass; missing/mismatch observations remain low-disclosure |
| 2 | `strict` | temp-local only | accept and reject paths pass before persistence in tests |
| 3 | `strict` | local HTTP/stdio candidate | trusted runtime context covers all six fields; payload scope cannot spoof authority; rollback to `off` documented |
| 4 | `strict` | production candidate | fresh exact approval names target commit, runtime surface, complete policy source, validation evidence, and rollback path |

## Pre-Production Checklist

- Run fresh `git status --short --branch` before branch-sensitive or runtime-sensitive work.
- Confirm no user-owned dirty changes would be overwritten.
- Confirm `.env`, secret files, startup/watchdog config, package manifests, and lockfiles are unchanged unless separately approved.
- Confirm all six trusted runtime context fields are present from trusted env/profile/server context.
- Confirm all six policy allowlist groups are complete.
- Confirm public MCP payload fields such as `project_id`, `workspace_id`, and `client_id` are not treated as trusted authority.
- Confirm rejection output does not echo raw `agentId`, `workspaceId`, `clientId`, bearer tokens, provider/API keys, private keys, or profile secrets.
- Confirm rollback is a config/profile-only switch back to `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off`.
- Confirm production/release/deploy/cutover approval is separate from this runbook.

## Validation Commands

Use this local validation set before requesting any stricter rollout stage:

```text
node --test tests\record-memory-principal-scope-authorization-config.test.js tests\record-memory-principal-scope-observe-only-integration.test.js
node --test tests\mcp-http.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:mainline
```

For production candidate approval, attach the exact command output summary, target commit, runtime surface, mode, complete policy source, rollback path, and no-go review.

## No-Go Conditions

Do not enable strict production candidate if any condition is true:

- any trusted runtime context field is missing
- any policy allowlist group is incomplete
- intended stage 1 observe evidence shows the scoped write path would be rejected
- payload scope is required to authorize the same write
- rejection output leaks raw principal/scope values or secret-shaped material
- rollback to `off` is not documented for the exact target runtime
- startup/watchdog/config mutation is required but not exactly approved
- public MCP surface would expand
- provider/API calls, raw store scans, broad real-memory scans, or migration/import/export actions are needed
- production/release/deploy/cutover readiness or complete V8 must be claimed to justify the change

## Rollback

Primary rollback:

```text
CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off
```

Secondary rollback:

```text
unset or remove incomplete strict policy keys from the operator-owned profile
```

Expected rollback result:

```text
effective recordMemoryPrincipalScopeAuthorization.mode = off
public MCP schema unchanged
no data migration required for config-only rollback
```

Restarting services, changing watchdog/startup behavior, or editing production config is outside this document and requires separate exact approval.

## Boundaries

- `.env` edit: `NO`
- runtime default changed: `NO`
- startup/watchdog/config changed: `NO`
- strict production mode enabled: `NO`
- provider/API called: `NO`
- raw/broad memory scan: `NO`
- public MCP expansion: `NO`
- push/PR/release/deploy/cutover: `NO`
- production/release/cutover ready: `NO`
- complete V8 claimed: `NO`

## Validation

Passed:

```text
node --test tests\record-memory-principal-scope-authorization-config.test.js tests\record-memory-principal-scope-observe-only-integration.test.js
node --test tests\mcp-http.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
npm run gate:mainline
```

Result:

```text
principal/scope config + integration: 21 passed / 0 failed
HTTP MCP: 31 passed / 0 failed
diff whitespace check: passed
docs validation: passed
mainline gate: passed; health ok; compare 43/43; rollback 43/43
```

## Remaining Blockers

- Exact production enablement approval is still required.
- Operator-owned real env/profile values are still required and must not be committed when sensitive.
- Stage 1 observe-only rollout evidence is still required before strict production candidate.
- Stage 3 local HTTP/stdio runtime evidence is still separate from production enablement.
- Local CLI and future VCP Bridge strict candidates remain separate route-specific work.
- Broad `record_memory` production reliability is not claimed by this runbook.
