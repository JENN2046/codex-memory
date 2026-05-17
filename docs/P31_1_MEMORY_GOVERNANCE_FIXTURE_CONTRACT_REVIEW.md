# P31.1 Memory Governance Fixture Contract Review

Phase: `P31.1-memory-governance-fixture-contract-review`

Status: fixture contract review

## Purpose

Review the existing memory governance fixtures and identify the smallest missing fixture contract before any new implementation.

This phase is docs/status/board only. It does not add a fixture, add tests, change runtime behavior, expand public MCP tools, mutate durable memory, scan real memory, run migration/import-export apply, create backups, restore data, start services, call providers, change package scripts, change config, push, tag, release, deploy, or create PRs.

## Existing Fixture Coverage

| Surface | Existing fixture/test | Covered boundary |
|---|---|---|
| Lifecycle states and read policy | `tests/fixtures/lifecycle-policy-v1.json`; lifecycle fixture/runtime tests | allowed statuses, allowed transitions, default read exclusion for proposal/rejected/superseded/tombstoned |
| Controlled write candidates | `tests/fixtures/controlled-write-tools-v1.json`; `tests/controlled-write-tools-fixture.test.js` | candidate tools, dry-run-first policy, public MCP freeze, required audit fields, forbidden actions |
| Controlled write dry-run | `tests/fixtures/controlled-write-dry-run-v1.json`; `tests/controlled-write-dry-run-cli.test.js` | fixture-only no-mutation operation summaries, rejected unsafe actions, public MCP freeze |
| Proposal review | `tests/fixtures/controlled-write-proposal-review-v1.json`; `tests/controlled-write-proposal-review.test.js` | candidate approval posture, deferred public MCP expansion, validate_memory as first future runtime candidate after approval |
| Mutation audit shape | `tests/fixtures/mutation-audit-shape-v1.json`; `tests/mutation-audit-shape.test.js` | mutation event families, required audit fields, supersession links, tombstone default, validate transition rules |
| Validate memory runtime fixture | `tests/fixtures/validate-memory-runtime-v1.json`; validate-memory fixture/runtime tests | internal-only validate_memory behavior, dry-run default, approval requirement, audit requirement, forbidden revive states |
| VCP object model | `tests/fixtures/vcp-memory-object-model-v1.json`; object-model fixture tests | MemoryRecord, Tombstone, MemoryProposal, AuditEvent, migration object families and privacy/audit/lifecycle boundaries |

## Fixture Gaps

The existing fixtures are strong but distributed. They do not yet provide one governance-level fixture that:

- names the safe evidence source classes for governance review
- maps proposal, supersession, tombstone, validation, audit, and approval surfaces into one summary contract
- states which existing fixture proves each surface
- records public MCP freeze and durable mutation blockers in one place
- states that the contract is review-only and cannot be used to claim runtime readiness
- rejects unsupported source classes before any future aggregator or gate consumes the governance evidence

The missing piece is not a runtime implementation. It is a committed synthetic fixture contract that ties existing governance evidence together and fails closed for unsupported source classes.

## Smallest Next Fixture Contract

Recommended next safe slice: `P31.2-memory-governance-lifecycle-contract`.

Candidate files:

- `tests/fixtures/memory-governance-lifecycle-contract-v1.json`
- `tests/memory-governance-lifecycle-contract-fixture.test.js`

The fixture should be synthetic and committed. It should reference only existing committed fixtures/docs/tests and should not read real memory or runtime state.

Minimum contract fields:

- `schemaVersion`
- `version`
- `phase`
- `fixtureOnly`
- `reviewOnly`
- `mutated`
- `runtimeIntegrated`
- `publicMcpExpanded`
- `publicToolsFrozen`
- `publicTools`
- `safeSourceTypes`
- `acceptedSourceTypes`
- `unsupportedSourceTypes`
- `surfaces`
- `blockers`
- `requiredApprovals`
- `safety`
- `decision`

Minimum surface entries:

- `proposal_lifecycle`
- `supersession_lifecycle`
- `tombstone_lifecycle`
- `validate_memory_internal`
- `mutation_audit`
- `approval_posture`
- `public_mcp_freeze`

Minimum lifecycle cases:

- `proposal_accept`: `proposal -> active`, evidence, reason, audit, redaction, lifecycle policy, scope policy, and internal-only validation required
- `proposal_reject`: `proposal -> rejected`, hidden by default, evidence, reason, and audit required
- `supersession_deferred`: requires old and new memory ids, bidirectional references, evidence, audit, and `mutated=false`
- `tombstone_deferred`: defaults to soft tombstone, requires tombstone reason, forbids hard delete, and stays hidden by default

## Required Fail-Closed Rules

The future fixture/test should prove:

- `fixtureOnly=true`
- `reviewOnly=true`
- `mutated=false`
- `runtimeIntegrated=false`
- `publicMcpExpanded=false`
- public tools remain exactly `record_memory`, `search_memory`, and `memory_overview`
- `acceptedSourceTypes` is a subset of `safeSourceTypes`
- unsupported source types keep the contract `acceptedForPlanning=false`
- durable mutation, public MCP expansion, real memory scan, migration/import-export apply, backup/restore, provider/service/config action, package script, push, tag, release, and deploy remain blocked

## Not Yet Ready

P31.1 does not make governance runtime-ready.

Still blocked:

- runtime schema/version enforcement
- public MCP governance tool/schema expansion
- real durable memory mutation
- real memory scan/export/import
- migration/import-export apply
- backup/restore
- provider/service/config action
- final RC validation matrix execution
- v1.0 RC readiness

## Validation Plan

Docs-only P31.1 review validation:

```powershell
git diff --check
scripts\validate-local.ps1 -Area docs
rg -n "memory-governance-lifecycle-contract|acceptedSourceTypes|safeSourceTypes|public MCP|durable memory|migration|provider|push|release|deploy" docs\P31_1_MEMORY_GOVERNANCE_FIXTURE_CONTRACT_REVIEW.md STATUS.md CODEX_MEMORY_NEXT_PHASE_PLAN.md MAINTENANCE_BACKLOG.md .agent_board
```

No `npm test` is required for this review unless fixture/test/source files change.

## Result

Result: `P31_1_GOVERNANCE_LIFECYCLE_CONTRACT_REVIEW_ADDED_FIXTURE_IMPLEMENTATION_PENDING`

The next safe phase may add a synthetic committed fixture and focused fixture test for the governance-level contract. It must remain fixture-first and read-only.
