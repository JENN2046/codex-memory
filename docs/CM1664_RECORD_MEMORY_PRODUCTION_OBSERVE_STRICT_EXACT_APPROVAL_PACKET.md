# CM-1664 Record Memory Production Observe / Strict Exact Approval Packet

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_RECORD_MEMORY_PRODUCTION_OBSERVE_STRICT_EXACT_APPROVAL_PACKET_DOCS_ONLY_NOT_EXECUTED`

## Scope

This packet defines the exact approval shape for a future `record_memory` production observe or strict rollout.

It is docs-only. It does not execute rollout, does not edit `.env`, does not change operator-owned profiles, does not change startup/watchdog/config, does not restart services, does not deploy, and does not enable production strict auth.

## Required Prior Evidence

Before any future execution task can use this packet, the operator must confirm the target commit and attach fresh evidence for:

- CM-1657 production strict auth runbook/profile evidence
- CM-1658 stage 1 observe-only local HTTP evidence
- CM-1662 stage 3 local stdio strict runtime candidate evidence
- CM-1663 focused review with no actionable findings
- fresh `git status --short --branch`
- fresh `npm run gate:mainline`
- exact target runtime surface: HTTP MCP, stdio MCP, or both
- exact target mode: `observe` or `strict`
- complete trusted context source for all six fields
- complete policy allowlists for all six groups
- rollback path to `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off`

## Approval Tokens

Future execution requires one of these exact operator tokens in a fresh message.

Observe-only rollout:

```text
APPROVE_RECORD_MEMORY_PRODUCTION_OBSERVE_ONLY_ROLLOUT_CM1664
```

Strict rollout candidate:

```text
APPROVE_RECORD_MEMORY_PRODUCTION_STRICT_AUTH_ROLLOUT_CM1664
```

The observe token does not authorize strict mode. The strict token does not authorize deploy, release, push, public MCP expansion, provider/API calls, raw scans, broad memory scans, or startup/watchdog changes unless those actions are separately and exactly named.

## Required Operator Fields

A future approval message must include all fields below.

```yaml
task_id: CM-1664-execution
approval_token: APPROVE_RECORD_MEMORY_PRODUCTION_OBSERVE_ONLY_ROLLOUT_CM1664 | APPROVE_RECORD_MEMORY_PRODUCTION_STRICT_AUTH_ROLLOUT_CM1664
target_commit: <full git commit sha>
target_runtime_surface: http_mcp | stdio_mcp | http_mcp_and_stdio_mcp
target_mode: observe | strict
trusted_context_source: env | operator_profile | trusted_server_context
policy_source: env | operator_profile | trusted_server_context
rollback_mode: off
rollback_owner: <operator-owned role/name placeholder>
max_runtime_probe_minutes: 10
allowed_validation_commands:
  - git status --short --branch
  - npm run gate:mainline
  - node --test tests\mcp-http.test.js
  - node --test tests\record-memory-strict-auth-stdio-runtime-candidate.test.js
  - node --test tests\record-memory-principal-scope-authorization-config.test.js tests\record-memory-principal-scope-observe-only-integration.test.js
production_identifiers_sanitized_in_evidence: true
secret_values_print_allowed: false
raw_memory_scan_allowed: false
provider_api_allowed: false
public_mcp_expansion_allowed: false
startup_watchdog_change_allowed: false
push_release_deploy_cutover_allowed: false
```

## Execution Boundary

Allowed in a future exact-approved execution task:

- verify fresh Git state
- verify exact target commit
- verify effective policy shape without printing secret values
- run approved local validation commands
- perform bounded runtime observe/probe only for the named runtime surface and target mode
- record sanitized evidence and rollback instructions

Forbidden unless separately and exactly approved:

- editing `.env`
- printing real secret/profile values
- changing startup/watchdog config
- changing package manifests or lockfiles
- provider/API calls
- raw/broad memory scans
- migration/import/export/apply/restore
- public MCP tool/schema expansion
- push, PR, tag, release, deploy, cutover
- production/release/cutover ready claim
- complete V8 claim

## Abort Conditions

Abort before any runtime action if any condition is true:

- target commit differs from approval
- worktree contains unreviewed user-owned changes
- target runtime surface is ambiguous
- target mode is missing or mismatched
- trusted context source is incomplete
- any of the six trusted context fields are absent
- any policy allowlist group is incomplete
- payload scope is required to authorize writes
- rejection output would expose raw `agentId`, `workspaceId`, `clientId`, profile values, tokens, provider/API keys, or private keys
- rollback to `CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off` is not operator-confirmed
- validation fails and the repair is not an obvious local docs/test correction

## Rollback

Rollback must be config/profile-only unless separately approved:

```text
CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off
```

Expected rollback state:

```text
effective recordMemoryPrincipalScopeAuthorization.mode = off
record_memory public schema unchanged
no data migration required
no public MCP expansion
```

## Non-Claims

- production rollout executed: `NO`
- strict production mode enabled: `NO`
- production readiness: `NO`
- release readiness: `NO`
- cutover readiness: `NO`
- complete V8: `NOT_CLAIMED`

## Validation

```text
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
CURRENT_FACTS.json parse and latest validation check
```
