# CM-1488 Post-Closeout Public Contract Evidence Bundle

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_PUBLIC_CONTRACT_EVIDENCE_BUNDLE_NO_READY_CLAIM`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Execute the minimal in-process MCP proof for the seven-tool public contract evidence bundle and close the first CM-1486 must-fix blocker as evidence-bundled, without claiming RC readiness.

This evidence bundle uses only in-process MCP JSON-RPC against a temp local app workspace. It does not use HTTP, bearer token material, provider/API calls, raw scan, new public MCP expansion, confirmed mutation, `dry_run=false`, `confirm=true`, or release/tag/deploy.

## Proof Scope

Allowed proof calls executed:

| Call type | Count | Result |
|---|---:|---|
| `initialize` | 1 | accepted; server name `vcp_codex_memory`; protocol `2025-06-18` |
| `tools/list` | 1 | exactly seven expected public tools |
| `tools/call` invalid-args rejection | 3 | `record_memory`, `search_memory`, and `memory_overview` rejected with `-32602` before tool execution |
| `tools/call audit_memory` | 1 | readonly bounded low-disclosure response |
| `tools/call` controlled mutation dry-run | 3 | `validate_memory`, `tombstone_memory`, and `supersede_memory` returned safe public dry-run low-disclosure rejection |

Forbidden proof calls not executed:

- no effective `record_memory` write
- no confirmed mutation
- no `dry_run=false`
- no `confirm=true`
- no raw scan
- no provider/API call
- no bearer token use
- no public MCP expansion
- no readiness or `RC_READY` claim

## `tools/list` Evidence

`tools/list` returned exactly seven tools:

```text
audit_memory
memory_overview
record_memory
search_memory
supersede_memory
tombstone_memory
validate_memory
```

Evidence summary:

| Assertion | Result |
|---|---|
| expected tool count is seven | passed |
| expected tool set matched | passed |
| no eighth tool observed | passed |
| no new public MCP expansion observed | passed |

## Invalid-Args Rejection Evidence

Invalid calls were intentionally schema-invalid and rejected before tool execution:

| Tool | Error code | Boundary |
|---|---:|---|
| `record_memory` | `-32602` | rejected on missing `arguments.target`; no valid write path entered |
| `search_memory` | `-32602` | rejected on missing `arguments.query`; no valid search path entered |
| `memory_overview` | `-32602` | rejected on disallowed `arguments.raw`; no valid overview path entered |

`record_memory` was not called with valid write arguments and did not perform a durable write.

## `audit_memory` Readonly Bounded Evidence

`audit_memory` was called with:

```text
audit_family=governance
window=10
include_raw=false
```

Evidence summary:

| Assertion | Result |
|---|---|
| accepted | `true` |
| access mode | `audit_memory_readonly_bounded` |
| raw memory returned | `false` |
| raw audit returned | `false` |
| token material returned | `false` |
| provider payload returned | `false` |
| raw audit scan performed | `false` |
| provider called | `false` |
| durable mutation performed | `false` |
| readiness claimed | `false` |
| `RC_READY` claimed | `false` |

## Controlled Mutation Dry-Run Evidence

The controlled mutation public tools were called with safe dry-run arguments only. No `dry_run=false` or `confirm=true` input was used.

| Tool | Decision | Accepted | Mutated | Dry run | Reason code | Forbidden key hits |
|---|---|---:|---:|---:|---|---:|
| `validate_memory` | `rejected` | `false` | `false` | `true` | `public_dry_run_low_disclosure` | `0` |
| `tombstone_memory` | `rejected` | `false` | `false` | `true` | `public_dry_run_low_disclosure` | `0` |
| `supersede_memory` | `rejected` | `false` | `false` | `true` | `public_dry_run_low_disclosure` | `0` |

Shared controlled mutation assertions:

| Assertion | Result |
|---|---|
| access mode | `controlled_mutation_public_bounded` |
| raw memory returned | `false` |
| raw audit returned | `false` |
| token material returned | `false` |
| provider payload returned | `false` |
| memory content returned | `false` |
| memory ids returned | `false` |
| low-disclosure projection | `true` |
| provider called | `false` |
| bearer token used | `false` |
| raw store scanned | `false` |
| durable mutation performed | `false` |
| confirmed mutation allowed | `false` |
| readiness claimed | `false` |
| `RC_READY` claimed | `false` |

Forbidden output keys checked for controlled mutation responses:

```text
memoryId
memory_id
old_memory_id
new_memory_id
title
content
snippet
filePath
relativePath
rawText
auditEventPreview
auditPlanPreview
providerUrl
embeddingFingerprint
fromStatus
toStatus
oldFromStatus
oldToStatus
newFromStatus
newToStatus
```

Observed forbidden key hits: `0`.

## Evidence Gap Disposition

The first CM-1486 must-fix blocker was:

```text
Fresh post-closeout public contract evidence is not bundled for the seven-tool surface.
```

CM-1488 bundles fresh in-process evidence for the seven-tool public contract and marks this specific blocker as evidence-bundled, not as RC-ready.

Remaining blocker classes still open:

- release/cutover readiness remains blocked
- confirmed mutation remains blocked and requires separate exact approval
- live HTTP/client evidence remains separate and unexecuted here
- provider/API and bearer-token paths remain forbidden unless separately approved
- no new public MCP expansion is authorized

## Validation

Required validation for CM-1488:

```text
node --test tests\controlled-mutation-public-registration.test.js
npm test
npm run gate:mainline:strict
git diff --check
scripts\validate-local.ps1 -Area docs
```

## Explicit Non-Claims

CM-1488 does not:

- claim readiness or `RC_READY`
- release, tag, or deploy
- perform an effective `record_memory` write
- execute confirmed mutation
- use `dry_run=false`
- use `confirm=true`
- perform raw scan
- call provider/API
- use bearer token material
- expand public MCP tools
