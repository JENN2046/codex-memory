# VALIDATION.md — codex-memory

## 1. Purpose

This document defines the validation standard for `codex-memory`.

`codex-memory` is the independent, Codex-oriented implementation of the full VCP memory system.

Current repository reality: the active project already has HTTP/stdio MCP entrypoints, diary-compatible writes, SQLite shadow storage, vector/profile artifacts, active-memory compatibility, compare/rollback harnesses, and Phase E gates. Use the current `package.json` scripts and project-specific validation matrix before applying any greenfield Phase 1 guidance in this document.

Because memory affects future agent behavior, validation must be stricter than ordinary feature work.

A memory feature is not complete merely because code exists.

A memory feature is complete only when its behavior is clear, tested where possible, audited where required, and honest about what remains unvalidated.

The validation goal is simple:

```text
No unverified memory claim should silently become durable truth.
```

---

## 2. Validation Philosophy

`codex-memory` must validate four things at once:

1. Correctness — does the feature do what it claims?
2. Safety — does it avoid secrets, data loss, and hidden side effects?
3. Governance — does it respect memory policy, scope, audit, and correction paths?
4. Future Trust — will future agents understand what was verified and what was not?

Memory bugs are not ordinary bugs.

A normal bug may break one run.

A memory bug may poison many future runs.

---

## 3. Result Labels

Every meaningful task must end with one of these labels:

```text
COMPLETED_VALIDATED
COMPLETED_UNVALIDATED
PARTIAL
BLOCKED
FAILED
```

### 3.1 COMPLETED_VALIDATED

Use only when:

- requested work is complete
- relevant validation was run
- validation passed
- limitations are disclosed

### 3.2 COMPLETED_UNVALIDATED

Use when:

- requested work is complete
- validation was not run or unavailable
- reason is stated clearly
- risk is stated clearly

### 3.3 PARTIAL

Use when:

- only part of the task was completed
- remaining work is clear
- validation status for completed part is clear

### 3.4 BLOCKED

Use when:

- human approval is required
- validation failure needs design decision
- repository state is unsafe
- action would cross a hard stop gate
- required dependency/tool/data is missing

### 3.5 FAILED

Use when:

- attempted work did not produce usable result
- validation failed and no safe narrow fix is available
- implementation is inconsistent or unsafe

Do not use optimistic labels.

The label is part of the evidence trail.

---

## 4. Global Validation Report Format

For normal work:

```text
Status:
Changed:
Validated:
Not validated:
Risk:
Next:
```

For repository work:

```text
Workspace:
Mode:
Risk:
Branch:
Worktree:
Changed:
Validated:
Not validated:
Result:
Remaining risk:
Next:
```

For memory operations:

```text
Memory operation:
Scope:
Records read:
Records written:
Records updated/superseded:
Records deleted/tombstoned:
Records rejected:
Sensitive data handling:
Audit events:
Validation:
Not validated:
Risk:
Next:
```

Rules:

- never expose secrets
- never claim full validation when only targeted validation ran
- never hide skipped validation
- never treat inference as verification
- always separate verified fact from memory candidate

---

## 5. Workspace Validation

Before implementation, validation, migration, or repository-sensitive action, inspect workspace reality.

Required in Git repositories:

```bash
git branch --show-current
git status --short
git diff --stat
```

For merge, push, release, rollback, branch movement, migration, or remote-sensitive work, also inspect:

```bash
git log --oneline --decorate -n 10
```

Validation must treat uncommitted changes as user-owned until proven otherwise.

Do not overwrite user-owned changes.

Do not delete untracked files without explicit instruction.

---

## 6. Documentation Validation

Documentation is valid only if it does not overclaim.

For docs changes, validate:

- internal consistency
- no contradiction with project goal
- no contradiction with architecture
- no claim that unimplemented features already exist
- phase boundaries are clear
- validation status is honest
- commands are marked as examples unless verified
- no secrets are included
- links or external claims are current only if verified

Docs-only validation may be:

- manual diff inspection
- file review
- markdown lint if available
- link check if available and relevant

Minimum report:

```text
Changed docs:
Validated by:
Claims not verified:
Risk:
```

---

## 7. Schema Validation

Schema changes must prove that memory objects are structured, scoped, and governable.

Validate:

- required fields exist
- optional fields are documented
- invalid records are rejected
- statuses are constrained
- sensitivity levels are constrained
- scope is represented
- provenance can be represented
- supersession can be represented
- tombstone/deletion state can be represented
- audit references can be represented

Minimum test cases:

- valid `MemoryRecord`
- missing scope
- missing summary/content
- invalid status
- invalid sensitivity
- superseded record with link
- tombstoned record with reason
- redacted record without raw secret

A schema that accepts everything validates nothing.

---

## 8. Storage Validation

Storage must prove durable behavior without hidden side effects.

Validate:

- write record
- read record
- list records
- search records if storage owns search
- reject malformed record
- preserve ids
- preserve timestamps
- handle empty store
- handle corrupted or malformed line/file if using JSONL
- preserve audit log if applicable
- avoid writing outside configured storage path

For JSONL:

- append works
- each line is valid JSON
- malformed line handling is explicit
- concurrent write limitations are documented

For SQLite:

- schema migration is explicit
- WAL behavior is documented if used
- transactions are used where needed
- rollback behavior is tested where possible

Storage validation must not use real user memory unless explicitly approved.

Use fixtures.

---

## 9. Write Pipeline Validation

A durable write must pass through policy, sensitivity, deduplication, storage, and audit.

Validate write flow:

```text
input
-> intent/scope check
-> sensitivity scan
-> redaction or rejection
-> duplicate check
-> record construction
-> storage write
-> audit event
-> safe response
```

Minimum test cases:

- record valid memory
- reject unscoped memory
- reject or redact API key
- reject or redact token
- reject or redact password
- skip duplicate active memory
- supersede older memory when requested
- write audit event
- report record id without exposing secrets

A write that bypasses audit is not validated.

A write that stores raw secrets is failed, not partial.

---

## 10. Sensitivity and Redaction Validation

Secret handling is a hard validation area.

Validate detection for:

- API key-like values
- bearer tokens
- passwords
- private key blocks
- database URLs with credentials
- webhook URLs with tokens
- `.env`-style assignments
- service account-like JSON
- authorization headers

Validate behavior:

- raw secret is not stored
- raw secret is not printed
- redacted placeholder is used
- audit event records redaction outcome without secret value
- search results do not reveal secret
- export does not reveal secret
- logs do not reveal secret

Suggested fake fixtures:

```text
sk-fake-not-real-000000000000000000000000
fake_bearer_token_1234567890
postgres://user:password@example.local/db
-----BEGIN PRIVATE KEY----- FAKE -----END PRIVATE KEY-----
```

Never use real credentials in tests.

---

## 11. Retrieval Validation

Retrieval returns candidates, not truth.

Validate:

- keyword retrieval
- metadata filter
- scope filter
- tag filter
- status filter
- time filter if implemented
- deduplication if implemented
- reranking if implemented
- redaction in results
- explanation/match reason
- stale/superseded distinction

Minimum test cases:

- scoped query returns scoped records
- unrelated scope is excluded by default
- stale memory is marked
- superseded memory is marked or excluded according to policy
- tombstoned memory is not used as active memory
- duplicate records do not dominate results
- sensitive content is redacted
- match reason is present

Retrieval validation must verify that memory is not presented as current repository truth unless separately checked.

---

## 12. Audit Validation

Audit is mandatory for durable mutations.

Validate audit event creation for:

- record
- update
- supersede
- tombstone
- hard delete if supported
- import
- export
- migration
- compaction
- reject sensitive write
- approve proposal
- reject proposal

Audit event must include:

- action
- timestamp
- actor/tool if available
- scope
- record ids or counts
- result
- validation status
- sensitivity outcome
- reason

Audit event must not include raw secrets.

Minimum tests:

- write creates audit event
- rejection creates audit event if policy requires it
- supersession creates audit event
- redaction outcome is recorded safely
- audit query does not expose secret content

---

## 13. Supersession and Tombstone Validation

Memory must be correctable and forgettable.

### Supersession Validation

Test:

- old record becomes `superseded`
- old record points to new record
- new record lists superseded old record
- retrieval prefers new record
- audit event exists

### Tombstone Validation

Test:

- record becomes `tombstoned`
- content is removed or redacted according to policy
- tombstone reason exists
- retrieval does not use tombstoned record as active memory
- audit event exists

### Hard Delete Validation

Hard delete is exceptional.

Test only with fixtures.

Validate:

- explicit confirmation required
- target id is exact
- audit event exists if supported
- retrieval no longer returns record
- backup/rollback behavior is documented if available

---

## 14. Import Validation

Import can contaminate memory at scale.

Validate import in dry-run first.

Dry-run should report:

- source format
- record count
- valid records
- invalid records
- duplicate candidates
- sensitive candidates
- proposed scopes
- proposed actions

Apply import only after approval if real memory is involved.

Minimum tests:

- import valid fixture
- reject malformed fixture
- detect duplicate fixture
- detect sensitive fixture
- dry-run does not write durable memory
- applied import creates audit event

Do not import real VCP memory without explicit approval.

---

## 15. Export Validation

Export can leak private data.

Validate:

- export requires explicit scope
- redacted export removes secrets
- tombstoned records are handled according to policy
- audit event is created
- counts are reported
- destination is local unless explicitly approved
- external destination requires approval

Minimum tests:

- export project-scoped fixture
- redacted export hides secret-like content
- broad export is blocked or requires explicit flag
- export report contains counts, not raw sensitive data

---

## 16. Migration Validation

Migration can corrupt durable context.

Migration validation must include:

- source schema inspection
- target schema inspection
- dry-run
- record counts
- invalid records
- duplicate records
- sensitive records
- backup or rollback plan
- audit event
- post-migration validation

Minimum tests with fixtures:

- migrate valid record
- reject invalid record
- preserve id or map id explicitly
- preserve audit reference when possible
- mark incompatible record safely
- rollback or explain no rollback

Real memory migration requires explicit approval.

---

## 17. Compaction Validation

Compaction condenses memory and can destroy signal.

Validate:

- source records are listed
- compacted summary is created
- unique information is preserved or omissions are disclosed
- source links are preserved
- old records are archived/superseded only by policy
- audit event exists
- dry-run exists for non-trivial compaction

Minimum tests:

- compact repeated checkpoint fixtures
- preserve unique detail
- reject compaction containing raw secrets
- create audit event
- retrieval finds compacted summary

Compaction without source trace is not validated.

---

## 18. VCP Compatibility Validation

VCP parity must be validated in stages.

### Phase 2 Validation

Validate:

- `MemoChunk` model
- `Tag` model
- `KnowledgeChunk` model
- conversion to/from `MemoryRecord`
- lifecycle states
- fixture import/export

### Phase 4 Validation

Validate:

- tag graph
- tag sequence
- tag weights
- semantic association trace
- bounded expansion

### Phase 5 Validation

Validate:

- EPA-style analysis produces inspectable output
- Residual Pyramid preserves residual novelty
- SVD/PCA basis behavior is documented and testable
- compaction remains traceable

Do not claim full VCP memory parity until practical parity is implemented and tested.

VCP compatibility can be partial.

Partial means partial.

Say so.

---

## 19. MCP Tool Validation

MCP tools must be thin, safe interfaces over core services.

For every MCP tool, validate:

- input schema
- output schema
- policy enforcement
- redaction
- scope behavior
- error handling
- audit behavior for mutations
- no raw secret output

Current public MCP tools:

### record_memory

Validate:

- valid write
- unscoped write rejection
- secret redaction/rejection
- duplicate handling
- audit event

### search_memory

Validate:

- scoped search
- stale/superseded marking
- redacted result
- match reason

### memory_overview

Validate:

- counts by status/type/scope
- no secret exposure
- clear storage location if safe

Planned governance tool:

### audit_memory

Validate:

- audit query
- redacted audit output
- action filters if implemented

Later tools require the same standard before being called stable.

---

## 20. CLI Validation

CLI commands must be safe by default.

Validate:

- help output
- dry-run behavior
- explicit confirmation for destructive commands
- local path handling
- no secrets printed
- exit codes
- structured output if used

Dangerous commands must require explicit flags:

```bash
codex-memory forget --id <id> --confirm
codex-memory migrate --apply --confirm
```

Import/export/migrate/compact should support dry-run.

---

## 21. Codex / Claude Client Validation

Codex/Claude memory must prevent client-originated pollution.

Validate:

- Codex can retrieve scoped memory
- Claude can retrieve scoped memory
- client can create memory proposal
- proposal is not durable memory
- policy review can approve proposal
- approved proposal becomes durable record
- rejected proposal is audited
- duplicate proposals are detected
- conflicting proposals are not silently merged

Minimum test flow:

```text
client proposal
-> policy scan
-> deduplication
-> policy approval
-> durable write
-> audit event
```

Default to proposal mode for uncertain writes.

---

## 22. Background Association Validation

Background association or dream-like processing must not silently mutate durable memory.

Validate:

- background process generates proposals
- proposals are marked as proposals
- durable write requires policy checks
- association trace exists
- generated associations are bounded
- no secret content is introduced
- audit event exists if proposal is approved

Dreams may suggest.

They must not secretly remember.

---

## 23. Performance and Scale Validation

Early phases do not need heavy performance optimization.

Still, record basic expectations:

Phase 1:

- small local store works
- tests complete quickly
- retrieval does not hang on empty or small datasets

Later phases:

- retrieval latency target
- index build time
- memory count scale
- compaction cost
- vector index size
- import/export size

Do not optimize before correctness and safety.

---

## 24. Security Validation

Security validation overlaps with sensitivity but also includes behavior.

Validate:

- no secret printing
- no raw `.env` readout in summaries
- no writes outside configured storage root
- no remote writes without approval
- no command injection in CLI/MCP input handling
- no path traversal in storage paths
- no uncontrolled broad export
- no default cloud sync
- no hard delete without confirmation

Security failures are hard failures.

---

## 25. Dependency Validation

Before dependency changes:

- inspect current package manager
- inspect lockfile
- explain why dependency is needed
- prefer minimal dependency
- avoid heavy vector/ML dependencies before Phase 3+
- request approval when manifests or lockfiles change

After dependency changes, validate:

- install succeeds
- lockfile behavior is clear
- tests run
- dependency purpose is documented

Do not add dependencies to solve vague architecture discomfort.

---

## 26. Phase Validation Matrix

The matrix below is a generic evolution model. For the current repository, prefer the concrete commands in `AGENTS.md` and README for MCP, HTTP, active memory, provider/profile, cleanup, and rollback-sensitive changes.

| Phase | Required Validation |
| --- | --- |
| Phase 0 | docs consistency, goal clarity, no overclaim |
| Phase 1 | schema, local write/read, redaction, audit, basic search |
| Phase 2 | VCP-compatible models, conversion, lifecycle state |
| Phase 3 | scoped retrieval, filters, dedup, stale handling |
| Phase 4 | tag graph, bounded association, traceability |
| Phase 5 | compaction, novelty/residual preservation, proposal-only background association |
| Phase 6 | MCP contracts, tool safety, Codex/Claude proposal flow |
| Phase 7 | integration scopes, dry-run migration, cross-project isolation |
| Phase 8 | observability counts, review flows, safe admin operations |

---

## 27. Minimum Phase 1 Test List

Historical greenfield Phase 1 tests:

A blank Phase 1 should not proceed without tests for:

1. Creating a valid memory record.
2. Rejecting missing required fields.
3. Rejecting or redacting API key-like content.
4. Writing to local storage.
5. Reading from local storage.
6. Searching by keyword.
7. Creating memory overview counts.
8. Creating audit event on durable write.
9. Ensuring search output does not expose secrets.
10. Handling empty storage.

Recommended test file names:

```text
tests/memory-record.test.ts
tests/memory-write.test.ts
tests/memory-search.test.ts
tests/sensitivity-policy.test.ts
tests/audit-log.test.ts
```

Current repository note: the active test files are JavaScript files under `tests/*.test.js`, and the authoritative baseline is `npm test`.

---

## 28. Validation Commands

Do not assume commands exist.

Discover scripts first.

For this repository:

```bash
npm run
npm test
```

Other commands must be discovered before use. If `npm run` lists additional validation scripts, use the exact discovered names.

Do not invent script names in reports.

If scripts are unavailable, report:

```text
Not validated:
- No test/typecheck/lint script was available.
```

---

## 29. Failure Handling

When validation fails:

1. Report the exact failing area.
2. Do not hide the failure.
3. Attempt one narrow obvious fix if safe.
4. Rerun relevant validation.
5. Stop if the next fix requires design decision or broad change.

Do not continue building new features on failed validation.

A cracked foundation should not receive another floor.

---

## 30. Evidence Standard

Good validation evidence includes:

- command run
- test file
- test result
- diff inspection
- count summary
- dry-run report
- audit event id/count
- redaction outcome
- fixture name

Bad validation evidence:

- "looks good"
- "should work"
- "probably fine"
- "not tested but simple"
- "memory says it works"

Memory cannot validate itself.

---

## 31. Release / Completion Validation

Before any release-like milestone:

- inspect Git status
- inspect recent commits
- run full available validation
- verify docs do not overclaim
- verify no secrets
- verify no unintended data files
- verify no real memory export/import side effects
- produce final checkpoint

Release, deployment, push, or tag requires explicit approval.

---

## 32. Final Rule

A memory system must earn trust every time it writes.

Validation is not ceremony.

Validation is how the future knows the past was not forged.
