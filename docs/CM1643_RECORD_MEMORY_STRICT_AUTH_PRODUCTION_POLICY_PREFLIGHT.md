# CM-1643 record_memory strict auth production policy preflight

Date: 2026-06-11

Status: `COMPLETED_VALIDATED_POLICY_PREFLIGHT_DOCS_ONLY_NO_RUNTIME_CHANGE`

## Scope

This preflight decides how `record_memory` strict principal/scope authorization
can move from default-off wiring toward a future production candidate.

This task is docs-only. It does not enable production strict mode, does not
change runtime auth behavior, does not execute `record_memory`, and does not
claim production, release, cutover, broad write reliability, or complete V8
readiness.

## Current Default-Off Implementation Summary

Current baseline:

```text
HEAD = origin/main = 002c6e4d9ea3ebf5f1c2c491690501e0cc2ff2bc
record_memory strict config/context wiring = IMPLEMENTED_DEFAULT_OFF
public MCP surface = 7
production ready = NO
complete V8 = NOT_CLAIMED
```

`recordMemoryPrincipalScopeAuthorization.mode` supports `off`, `observe`, and
`strict`, but the effective mode stays `off` unless a complete policy is
present. HTTP and stdio can construct trusted execution context from process
side sources, not from public tool payload scope.

Current policy decision:

```text
strict default changed: NO
production strict mode enabled: NO
real record_memory write: NO
runtime behavior changed: NO
```

## Required Production Principal / Scope Fields

Production candidate strict mode must require all of these fields:

| Field | Purpose | Production requirement |
|---|---|---|
| `agentAlias` | Human-stable actor family, such as `Codex` | Required, exact allowlist match |
| `agentId` | Specific agent/runtime identity | Required, exact allowlist match |
| `requestSource` | Runtime entry source, such as HTTP MCP or stdio MCP | Required, exact allowlist match |
| `projectId` | Project boundary | Required, exact allowlist match |
| `workspaceId` | Workspace boundary | Required, exact allowlist match |
| `clientId` | Client/application boundary | Required, exact allowlist match |

Bearer authentication is not enough by itself. It proves the caller can access
the transport, not that the write belongs to the allowed project/workspace/client
scope.

## Trusted Context Source Matrix

| Entry path | Current source status | Production candidate requirement | Decision |
|---|---|---|---|
| HTTP MCP | Can use env, `baseRequestContext`, and config defaults for all six fields | Deployment/runbook must provide all required fields from trusted process-side config or server context | Candidate-capable after staged observe evidence |
| stdio MCP | Can use env, `baseRequestContext`, and config defaults for all six fields | Client launcher/profile must provide all required fields from trusted process-side config or launch context | Candidate-capable after staged observe evidence |
| local CLI | Not proven as a production strict source for all entrypoints | Each write-capable CLI must either build the same trusted execution context or remain off/observe-only | Blocked until explicit CLI source map |
| future VCP bridge | Not implemented/proven for this strict policy | Bridge must pass trusted principal/scope from bridge config/session metadata, not user payload | Blocked until bridge contract exists |
| public MCP payload | Public user/tool arguments may contain scope-like fields | Must not authorize the same write by itself | Not trusted |

## Required Answers

1. When can strict mode move from default-off to production candidate?

Only after stage 1 observe-only with a complete policy has run without blocking
the scoped authenticated write path, stage 2 temp-local strict evidence remains
green, stage 3 local runtime candidate evidence proves HTTP/stdio context
coverage and low-disclosure rejection, and a separate exact approval authorizes
stage 4 production candidate.

2. Which identity fields are mandatory?

All six fields are mandatory for production candidate strict mode:
`agentAlias`, `agentId`, `requestSource`, `projectId`, `workspaceId`, and
`clientId`. Missing any of them means production candidate is not ready.

3. Can HTTP / stdio / local CLI / future VCP bridge provide these fields?

HTTP and stdio are candidate-capable after runbook/profile coverage because the
default-off wiring can already read trusted env/base/config sources. Local CLI
and future VCP bridge are not yet proven; each needs a separate source map,
tests, and receipt before strict production candidate can include it.

4. Should missing fields fail closed or observe only?

Policy depends on rollout stage. Stage 1 observe-only must not reject. Any
stage labeled strict must fail closed before persistence when required fields
are missing or mismatched. Production candidate must be strict fail-closed, not
silent observe-only.

5. Does strict enablement need migration / staged rollout?

Yes. It needs staged rollout because current scoped RC authenticated
`record_memory` writes rely on the existing accepted path. Enabling strict by
default without observe evidence and source coverage could create a broad write
outage.

6. How do we avoid breaking scoped RC authenticated `record_memory`?

Keep stage 0 default `off`, then use stage 1 observe-only with a complete policy
against the existing authenticated path. Do not switch to strict candidate until
the observed missing/mismatch rate is zero for intended scoped writes, public
rejection remains low-disclosure, and rollback to `off` is documented and tested
as a config-only recovery path.

## Production Enablement Blockers

| Blocker | Status | Required closure |
|---|---|---|
| Strict mode is not production default | Intended | Separate exact approval required before any production candidate |
| HTTP/studio deployment source of all six fields | Partially capable, not deployed | Runbook/profile evidence for complete trusted context |
| local CLI context source | Not proven | Source map and tests before inclusion |
| future VCP bridge context source | Not implemented/proven | Bridge contract and tests before inclusion |
| observe-only telemetry/readout | Not collected | Stage 1 receipt proving intended writes would pass |
| strict local runtime candidate | Not executed | Stage 3 local runtime evidence without live proof or production writes |
| broad `record_memory` reliability | Not proven | Separate reliability evidence |

## Rollout Stages

| Stage | Mode | Boundary | Exit criteria |
|---|---|---|---|
| stage 0 | `off` | Current default | No runtime behavior change; public MCP surface remains seven tools |
| stage 1 | `observe` with complete policy | No rejection | Observe intended authenticated writes would pass; missing/mismatch summary is low-disclosure |
| stage 2 | `strict` temp-local only | Fixture/test stores only | Accepted and rejected paths proven before persistence; no raw principal/scope echo |
| stage 3 | `strict` local runtime candidate | Local runtime only, not production default | HTTP/stdio provide all six fields; rollback to `off` documented; scoped RC path not broken |
| stage 4 | production candidate | Separate exact approval only | Explicit approval, current validation evidence, rollback plan, no no-go conditions |

## Rollback Plan

Primary rollback:

```text
CODEX_MEMORY_RECORD_MEMORY_AUTH_MODE=off
```

Secondary rollback:

```text
remove or unset incomplete strict policy keys
```

Expected rollback behavior:

```text
effective mode = off
default runtime behavior restored
public MCP schema unchanged
no data migration required for config-only rollback
```

Rollback is not a release or cutover claim. Any production candidate must carry a
fresh rollback receipt tied to the exact deployment/config surface.

## Exact Approval Requirement

Stage 4 production candidate requires a fresh operator approval naming:

- target commit
- target runtime surface
- exact mode
- exact complete policy source
- exact rollout stage
- validation evidence
- rollback command/path
- no provider/API, no raw scan, no broad memory scan, no public MCP expansion,
  no release/tag/deploy unless separately approved

Suggested approval wording for a future task:

```text
APPROVE_RECORD_MEMORY_STRICT_AUTH_PRODUCTION_CANDIDATE_STAGE4 for commit <sha>, target <runtime>, mode strict, complete policy source <source>, rollback mode off.
```

This document does not grant that approval.

## No-Go Conditions

Do not enable production candidate strict mode if any of these are true:

- any required field is missing for an intended write path
- local CLI or VCP bridge is included without source-map evidence
- observe-only evidence shows intended scoped writes would be rejected
- public or audit rejection output echoes raw `agentId`, `workspaceId`,
  `clientId`, or equivalent raw scope values
- rollback to `off` is not documented for the exact target runtime
- public MCP surface changes
- bearer-token material, provider/API calls, raw scan, or broad memory scan is
  required to make the decision
- production/release/cutover readiness or complete V8 would need to be claimed
  to justify the change

## Non-Claims

```text
strict default changed: NO
production strict mode enabled: NO
runtime auth behavior changed: NO
real record_memory write occurred: NO
provider/API occurred: NO
bearer token material used: NO
raw scan / broad scan occurred: NO
live proof occurred: NO
confirmed mutation occurred: NO
public MCP expansion occurred: NO
persistent tag write occurred: NO
release/tag/deploy occurred: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```
