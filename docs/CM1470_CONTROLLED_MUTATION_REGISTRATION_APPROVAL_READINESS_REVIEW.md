# CM-1470 Controlled Mutation Registration Approval Readiness Review

Date: 2026-06-04

## Purpose

This review evaluates whether `docs/CM1469_CONTROLLED_MUTATION_PUBLIC_REGISTRATION_APPROVAL_PACKET.md` is sufficient as an operator decision packet for a future guarded public MCP registration of:

- `validate_memory`
- `tombstone_memory`
- `supersede_memory`

This review does not authorize registration.

This review does not register public MCP tools.

This review does not execute real mutation.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Reviewed Inputs

- `docs/CM1469_CONTROLLED_MUTATION_PUBLIC_REGISTRATION_APPROVAL_PACKET.md`
- `docs/CM1468_CONTROLLED_MUTATION_PUBLIC_CONTRACT_PREFLIGHT.md`
- `src/core/ControlledMutationPublicContractPreflight.js`
- `.agent_board/CURRENT_FACTS.json`
- `CURRENT_STATE.md`

## Approval Checklist

| Check | Result | Notes |
|---|---|---|
| Names exactly scoped to `validate_memory`, `tombstone_memory`, `supersede_memory` | PASS | Packet excludes `update_memory`, `forget_memory`, raw audit/store, provider, migration apply, and readiness tools. |
| Current public MCP surface preserved until future approval | PASS | Packet states current public tools remain `record_memory`, `search_memory`, `memory_overview`, and `audit_memory`. |
| Public expansion treated as Red-boundary work | PASS | Packet requires future exact operator approval. |
| Schema exposure checklist present | PASS | Packet requires object schemas, `additionalProperties=false`, bounded fields, explicit booleans, and fail-closed unknown inputs. |
| Low-disclosure output contract present | PASS | Packet forbids raw memory/audit/JSONL/path/provider/token/content/title/snippet output. |
| Dry-run default policy present | PASS | Packet requires no `confirm=true` to remain dry-run/planning only. |
| Confirmed mutation separated from registration | PASS | Packet says confirmed mutation requires a later exact mutation approval. |
| Test obligations listed | PASS | Packet requires tool list, dispatch, schema, dry-run no-mutation, low-disclosure, no provider/API, no bearer, and no readiness tests. |
| Rollback plan present | PASS | Packet describes revert and validation steps. |
| Non-claims present | PASS | Packet explicitly rejects readiness, `RC_READY`, mutation authorization, raw access, provider/API, bearer, release/deploy/tag/push. |

## Risk Table

| Risk | Severity | Current Mitigation | Remaining Requirement |
|---|---|---|---|
| Public MCP expansion accidentally includes extra tools | High | Packet limits candidates to three tools and requires `tools/list` tests | Future implementation must assert exact tool set. |
| Registration path accidentally enables real mutation | High | Packet requires dry-run default and confirm path blocked without exact approval | Future tests must use temp DB only and prove dry-run no mutation. |
| Output leaks raw memory or audit data | High | Packet forbids raw memory/audit/content/title/snippet/path/provider/token output | Future low-disclosure projection tests must cover recursive forbidden keys. |
| Confirm path conflates registration approval with mutation approval | High | Packet separates public registration from later exact mutation approval | Future registration must block confirmed mutation without separate approval. |
| Existing public tools drift | Medium | Packet requires existing schemas/descriptions preserved unless separately approved | Future diff review and contract tests must check old tools. |
| Readiness overclaim | Medium | Packet includes explicit non-claims | Future docs/status updates must keep `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`. |
| Rollback evidence incomplete | Medium | Packet includes rollback plan | Future implementation must record rollback receipt if reverted. |

## Go / No-Go Decision

Decision:

```text
GO_TO_OPERATOR_EXACT_APPROVAL_DECISION
NO_GO_FOR_AUTOMATIC_REGISTRATION
```

Rationale:

CM-1469 is sufficient as a packet for a human/operator to decide whether to authorize a future guarded implementation. It is not sufficient as an implementation authorization by itself.

Future implementation may begin only if a new exact approval explicitly names:

- approval id
- allowed tools
- allowed source files
- allowed public surface changes
- forbidden boundaries
- operator acknowledgements

## Required Future Approval Shape

The future approval should name the CM-1469 packet and a fresh Git baseline:

```yaml
approval_id: CM1471-CONTROLLED-MUTATION-PUBLIC-REGISTRATION-<date>
basis_packet: docs/CM1469_CONTROLLED_MUTATION_PUBLIC_REGISTRATION_APPROVAL_PACKET.md
baseline_commit: <fresh HEAD commit>
allowed_tools:
  - validate_memory
  - tombstone_memory
  - supersede_memory
allowed_public_surface:
  - TOOL_DEFINITIONS registration for the three allowed tools only
  - app.callTool dispatch for the three allowed tools only
  - MCP tools/list and tools/call validation tests
forbidden:
  - update_memory
  - forget_memory
  - real mutation
  - raw audit access
  - raw store access
  - provider/API calls
  - bearer token use
  - readiness or RC_READY claim
```

## Boundary Receipt

CM-1470 is docs/status/board review only.

No public MCP expansion occurred.

No `validate_memory`, `tombstone_memory`, or `supersede_memory` registration occurred.

No real mutation, raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push occurred.
