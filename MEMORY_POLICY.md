# MEMORY_POLICY.md — codex-memory

## 1. Purpose

This document defines the memory policy for `codex-memory`.

`codex-memory` is the independent, Codex-oriented implementation of the full VCP memory system.

Current repository reality: the active project is already past a starter Phase 1 memory core. Apply this policy to the existing diary / SQLite shadow / vector / audit / MCP / active-memory implementation instead of restarting from a greenfield storage model.

Its purpose is not to remember everything.

Its purpose is to preserve trustworthy, scoped, useful, correctable, auditable, privacy-safe memory across time.

This policy governs:

- what may be recorded
- what must not be recorded
- how memory is scoped
- how memory is classified
- how memory is validated
- how memory is updated
- how memory is superseded
- how memory is forgotten
- how memory is audited
- how Codex/Claude memory proposals are handled
- how VCP-compatible memory should evolve safely

Memory is a map.

Repository reality, current user instruction, observed command output, and validation results are the ground.

---

## 2. Core Rule

A durable memory record must satisfy all of the following:

1. It is stable enough to matter later.
2. It is useful for future work.
3. It is scoped.
4. It is non-sensitive or safely redacted.
5. It has a source or clear provenance.
6. It is compact.
7. It can be corrected, superseded, or forgotten.
8. It does not overwrite current reality.
9. It does not leak secrets.
10. It creates or is linked to an audit event.

If any of these are unclear, do not silently record.

Create a memory proposal or ask for review instead.

---

## 3. Memory Is Not Truth

Memory records are historical evidence.

They may be:

- current
- stale
- partial
- superseded
- low confidence
- wrong
- context-dependent

Agents must not treat memory as truth without checking current reality when the answer or action depends on current state.

Examples:

- Memory may say a project uses JSONL, but the repository may now use SQLite.
- Memory may say a branch is clean, but Git status may now show user-owned changes.
- Memory may say a plan was approved, but the current user instruction may override it.

Current state wins.

---

## 4. Memory Operation Classes

Every memory action must be classified before execution.

### 4.1 Read-Class Operations

Usually low risk:

- `retrieve`
- `search`
- `overview`
- `audit_query`
- `validate_read`

Rules:

- prefer scoped reads
- redact sensitive content
- report stale/superseded status
- distinguish memory from verified fact

### 4.2 Write-Class Operations

Medium to high risk:

- `record`
- `update`
- `supersede`
- `checkpoint`
- `handoff`
- `compact`
- `tag`
- `retag`

Rules:

- run policy checks
- run sensitivity scan
- deduplicate
- create audit event
- report validation state

### 4.3 Destructive or Boundary Operations

High or critical risk:

- `forget`
- `delete`
- `hard_delete`
- `migrate`
- `import`
- `export`
- `remote_write`
- `cloud_sync`

Rules:

- require explicit approval when irreversible or external
- prefer dry-run
- report counts, not sensitive content
- create audit event
- provide rollback or explain lack of rollback

---

## 5. Memory Types

The system should distinguish memory by type.

Do not store all memory as undifferentiated text.

### 5.1 Project Fact

Stable information about a project.

Examples:

- project goal
- architecture decision
- directory convention
- validation command
- known risk
- integration boundary

Requirements:

- project scope
- source
- confidence
- last verified time when possible

### 5.2 User Preference

Stable preference expressed by the user.

Examples:

- preferred language
- preferred output style
- preferred project strategy
- recurring workflow preference

Requirements:

- user scope
- direct user source
- avoid overgeneralization
- do not infer sensitive preferences

### 5.3 Agent Preference / Operating Rule

Stable rule about how agents should work in a project.

Examples:

- use local-only mode
- do not push without approval
- workers create proposals instead of durable writes

Requirements:

- project or agent scope
- policy source
- authority level

### 5.4 Checkpoint Memory

A summary of completed work that helps resume later.

Examples:

- completed tasks
- changed files
- validation run
- blockers
- next safe step

Requirements:

- workspace/repo when applicable
- branch/worktree state when applicable
- validation status
- no secrets
- no raw noisy logs unless essential and sanitized

### 5.5 Handoff Memory

A structured transfer record between sessions or agents.

Requirements:

- original goal
- current status
- completed work
- remaining work
- blockers
- risks
- next safe action
- validation run/not run

### 5.6 Knowledge Memory

Reusable domain or technical knowledge.

Examples:

- VCP memory concept
- API behavior verified from docs
- architecture pattern
- reusable implementation detail

Requirements:

- source
- freshness if time-sensitive
- scope
- confidence

### 5.7 Conversation Memory

Condensed durable memory from conversation.

Rules:

- store only stable reusable decisions or preferences
- avoid raw chat dumps
- avoid emotional/private details unless explicitly useful and safe
- summarize compactly
- preserve provenance

### 5.8 VCP-Compatible Memory

Memory that maps to VCP concepts.

Examples:

- `MemoChunk`
- `Tag`
- `KnowledgeChunk`
- tag sequence
- semantic association
- residual/compaction summary

Rules:

- preserve VCP-compatible fields where useful
- do not force advanced VCP concepts into Phase 1
- keep compatibility separate from implementation detail

### 5.9 Memory Proposal

A candidate memory not yet durable.

Used when:

- source is weak
- duplicate risk exists
- worker generated it
- background association produced it
- sensitivity is uncertain
- commander review is required

Memory proposals must not be treated as durable memory.

---

## 6. Memory Scope

Every durable record must have a scope.

Possible scope dimensions:

- user
- project
- repository
- agent
- task
- branch
- workspace
- domain
- ecosystem

Recommended scope examples:

```text
user:JENN2046
project:codex-memory
project:VCPToolBox
repo:JENN2046/codex-router
agent:codex-worker
task:phase-1-local-memory-core
ecosystem:VCP
```

### Scope Rules

- Prefer the narrowest useful scope.
- Cross-project memory must be explicitly marked.
- Project-local memory must not leak into unrelated projects by default.
- User preferences may be global only when they are clearly stable and broadly applicable.
- Temporary branch state should not become global memory.
- Sensitive project details should remain project-scoped.

A memory without scope is a stray signal.

Stray signals become future hallucinations.

---

## 7. Sensitivity Levels

Each durable memory should have a sensitivity level.

Suggested levels:

```text
public
internal
private
sensitive
redacted
```

### 7.1 public

Safe to show broadly.

Examples:

- public architecture concept
- public README summary
- non-sensitive project goal

### 7.2 internal

Project-local but not secret.

Examples:

- internal architecture decision
- local workflow preference
- non-sensitive task checkpoint

### 7.3 private

User-specific or ecosystem-specific.

Examples:

- personal workflow preferences
- private project strategy
- non-secret but not public context

### 7.4 sensitive

Must not be stored raw.

Examples:

- credentials
- secret-bearing config
- private keys
- raw tokens
- production URLs if treated as sensitive
- private personal data not needed for future execution

### 7.5 redacted

Content was sanitized before storage.

The record may preserve safe metadata while removing secret values.

---

## 8. Prohibited Memory

Never store raw:

- API keys
- tokens
- passwords
- private keys
- seed phrases
- `.env` values
- service account JSON
- webhook secrets
- database URLs with credentials
- production credentials
- authentication cookies
- session tokens
- raw authorization headers
- personal identification data not required for future work
- private data unrelated to the project
- unverified accusations or sensitive speculation
- raw logs containing secrets

Do not store:

- all chat history by default
- raw noisy command output without durable value
- temporary branch state unless part of a checkpoint
- hallucinated architecture
- guessed dependency behavior
- broad imported data without review
- hidden background association as durable truth

If a prohibited item is detected, reject or redact.

---

## 9. Redaction Policy

When redaction is possible, replace sensitive values with placeholders.

Examples:

```text
<REDACTED_API_KEY>
<REDACTED_TOKEN>
<REDACTED_PASSWORD>
<REDACTED_DATABASE_URL>
<REDACTED_PRIVATE_KEY>
<REDACTED_SECRET>
```

A redacted memory may store:

- type of secret detected
- file or source category if safe
- action taken
- audit reference
- non-sensitive surrounding summary

A redacted memory must not preserve enough structure to reconstruct the secret.

Redaction failure means no durable write.

---

## 10. Provenance Policy

Every durable memory should include provenance.

Possible provenance:

- user instruction
- repository file path
- command output summary
- documentation file
- issue/PR reference
- checkpoint report
- import source
- manual review
- agent proposal approved by commander

Provenance should answer:

```text
Where did this memory come from?
Why should future agents believe it?
When should it be rechecked?
```

If provenance is missing, record as low-confidence proposal or do not record.

---

## 11. Confidence Policy

Memory should include confidence.

Suggested scale:

```text
1.0  directly verified current fact
0.8  strong evidence, likely current
0.6  plausible but may need verification
0.4  weak or old evidence
0.2  speculative proposal
0.0  rejected / not durable
```

Rules:

- user-stated durable preference can be high confidence
- observed repository state can be high confidence but may age quickly
- old memory should decay or require revalidation
- inferred memory should be lower confidence
- background association should create proposals, not high-confidence facts

Do not inflate confidence to make memory look cleaner.

---

## 12. Status Policy

Memory status should be explicit.

Suggested statuses:

```text
active
stale
superseded
tombstoned
archived
proposal
rejected
```

### active

Usable memory, still presumed relevant.

### stale

May be outdated. Must be rechecked before use.

### superseded

Replaced by a newer record.

Should not be used as current truth.

### tombstoned

No longer usable. Retained only for audit or deletion trace.

### archived

Historical context. Not normally retrieved for current tasks.

### proposal

Candidate memory awaiting review or approval.

### rejected

Rejected candidate. May be retained only as audit metadata.

---

## 13. Write Eligibility

Before recording durable memory, check:

### 13.1 Stability

Will this matter later?

Good:

- final project goal
- stable workflow preference
- verified architecture decision
- known recurring pitfall

Bad:

- transient mood
- one-time command output
- temporary failed attempt
- speculative idea with no decision

### 13.2 Usefulness

Will this improve future work?

Good:

- validation command
- scope boundary
- migration warning
- recurring user preference

Bad:

- verbose raw explanation
- duplicate of existing memory
- irrelevant context

### 13.3 Safety

Can it be stored without exposing secrets or private data?

If no, reject or redact.

### 13.4 Scope

Where does it apply?

If scope is unclear, do not record as durable memory.

### 13.5 Provenance

What supports it?

If unsupported, create proposal or skip.

---

## 14. Duplicate Policy

Duplicate memory pollutes retrieval.

Before durable write:

- search for similar active records
- compare scope
- compare type
- compare tags
- compare summary
- decide whether to skip, merge, update, or supersede

Recommended duplicate outcomes:

```text
skip        same memory already exists
update      same record needs minor correction
supersede   newer memory replaces older memory
merge       multiple records combine into stronger summary
proposal    similarity exists but decision needs review
```

Do not create near-duplicate records just because wording differs.

---

## 15. Update Policy

Use update for small corrections that do not change the historical meaning.

Examples:

- typo fix
- add missing tag
- add safe provenance
- adjust status
- add audit reference

Rules:

- create audit event
- preserve original meaning
- do not silently rewrite major decisions
- do not erase uncertainty

Major changes should use supersession.

---

## 16. Supersession Policy

Use supersession when a newer record replaces an older one.

Required actions:

```text
old.status = superseded
old.superseded_by = new.id
new.supersedes = [old.id]
audit event = supersede
```

Supersession is preferred when:

- project direction changed
- architecture changed
- user preference changed
- validation status changed
- old memory conflicts with current repository reality

Never let conflicting active memories coexist without marking the conflict.

---

## 17. Stale Memory Policy

Memory can grow old.

A record should be marked stale when:

- it references branch/worktree state
- it references dependency behavior that may change
- it references external API/product behavior
- it references project status that has likely changed
- it conflicts with current files or command output
- it has not been verified in a long time and is time-sensitive

Stale memory can still be useful.

It must not be presented as current fact.

---

## 18. Tombstone and Forget Policy

### 18.1 Tombstone

Use tombstone when the record should no longer be used but the fact that it existed matters.

Examples:

- sensitive record redacted after discovery
- old false memory retired
- user asked to stop using a memory
- duplicate memory removed from active retrieval

Tombstone should preserve:

- id
- type
- scope
- tombstone reason
- timestamp
- audit reference

It should not preserve sensitive content.

### 18.2 Forget

Use forget when the user asks to remove memory.

Rules:

- identify exact record
- explain deletion type
- prefer tombstone when auditability matters
- hard delete only with explicit approval or exact user request
- validate deletion or tombstone
- report without exposing sensitive content

### 18.3 Hard Delete

Hard delete is exceptional.

Require explicit approval unless the exact record is clearly requested for deletion.

Hard delete should create an audit event if the system supports deletion audit.

---

## 19. Compaction Policy

Memory compaction condenses multiple memories into a smaller durable form.

Compaction is useful for:

- repeated checkpoints
- long conversation histories
- overlapping project notes
- stale execution traces
- background association summaries

Rules:

- preserve source links when possible
- do not delete unique signal silently
- create audit event
- mark compacted records as archived or superseded if appropriate
- prefer dry-run before applying
- never compact secrets into durable summaries

Compaction output should include:

- compacted summary
- source record ids
- lost/omitted details if relevant
- confidence
- audit reference

---

## 20. Import Policy

Import can contaminate memory at scale.

Before import:

- inspect source format
- classify source trust
- scan for secrets
- run dry-run
- report counts
- detect duplicates
- map scopes
- create import audit event

Do not import real VCP memory, chat logs, or external memory dumps without explicit approval.

Import should default to proposal mode when source trust is uncertain.

---

## 21. Export Policy

Export can leak private data.

Before export:

- require explicit scope
- redact sensitive fields
- report record counts
- choose safe format
- include audit reference
- avoid exporting global memory by default

External export destinations require approval.

Export should support:

- redacted export
- project-scoped export
- audit-only export
- migration export
- dry-run summary

---

## 22. Migration Policy

Migration can corrupt the past.

Before migration:

- inspect current schema
- inspect target schema
- run dry-run
- back up if supported
- report counts
- scan for secrets
- preserve ids where possible
- preserve audit references where possible
- provide rollback path

Stop before real migration of user memory unless explicitly approved.

Do not run broad migrations as side effects of normal search or write tools.

---

## 23. Background Association Policy

Background association, dream-like processing, or semantic exploration must not directly mutate durable memory.

It may generate:

- memory proposals
- association candidates
- compaction suggestions
- stale-memory review suggestions
- tag suggestions
- knowledge linking suggestions

Durable writes require policy checks and audit events.

Dreams may suggest.

They must not secretly remember.

---

## 24. Codex / Claude Client Memory Policy

Multiple client surfaces increase memory pollution risk.

### 24.1 Client Rules

Codex and Claude may:

- retrieve scoped memory
- create checkpoints
- create memory proposals
- report observations

Codex and Claude should not:

- write durable long-term memory freely
- hard-delete memory
- run migration
- import/export broad memory
- resolve conflicting memories alone

### 24.2 Policy Rules

The memory policy layer should:

- review memory proposals
- deduplicate proposals
- approve durable writes
- resolve conflicts
- mark stale or superseded records
- preserve audit trail

### 24.3 Proposal Flow

```text
Codex/Claude observation
  |
  v
MemoryProposal
  |
  v
Policy scan
  |
  v
Deduplication
  |
  v
Policy review
  |
  v
Durable MemoryRecord or rejection
  |
  v
Audit event
```

Proposal mode is safer than uncontrolled durable writes.

---

## 25. Checkpoint Memory Policy

Checkpoint memory should help future agents resume work.

A checkpoint should include:

- original goal
- workspace/repository
- branch if applicable
- worktree state if applicable
- completed tasks
- changed files
- validation run
- validation not run
- blockers
- risks
- next safe action

Do not include:

- secrets
- raw large logs
- irrelevant command output
- unsupported claims
- remote credentials
- private data unrelated to the task

Checkpoint memory may become stale quickly.

It should be scoped and time-marked.

---

## 26. Handoff Memory Policy

Handoff memory is used when work may continue in another session or by another agent.

A handoff should include:

- task goal
- current status
- completed work
- remaining work
- files changed
- validation status
- blockers
- risks
- exact next safe step

A handoff is not authority.

Resuming agents must verify handoff against current repository reality.

---

## 27. VCP Compatibility Policy

The final system must implement VCP memory capabilities, but safely.

VCP compatibility means:

- compatible memory concepts
- import/export path where possible
- TagMemo-style association
- knowledge chunk modeling
- tag graph/sequence modeling
- memory compaction
- advanced semantic analysis
- background association

VCP compatibility does not mean:

- blindly copying implementation details
- skipping Codex safety gates
- importing real memory without review
- treating VCP memory as automatically current truth

Strategy:

```text
capability compatible
data migratable
interface modernized
governance stricter
implementation replaceable
```

---

## 28. Retrieval Policy

Retrieval should return memory candidates, not unchallengeable truth.

Retrieval should prefer:

- current records over stale records
- scoped records over global records
- high-confidence records over low-confidence records
- recent verified records over old unverified records
- deduplicated summaries over noisy repetition

Retrieval should include:

- id
- summary
- scope
- status
- confidence
- tags
- source
- updated_at
- match reason

Retrieval must not expose raw secrets.

---

## 29. Validation Policy for Memory Actions

Every memory action should have a validation status.

Suggested labels:

```text
COMPLETED_VALIDATED
COMPLETED_UNVALIDATED
PARTIAL
BLOCKED
FAILED
```

Examples:

- record with audit event and redaction test passed: `COMPLETED_VALIDATED`
- record written but tests unavailable: `COMPLETED_UNVALIDATED`
- some records imported, some rejected: `PARTIAL`
- export requires approval: `BLOCKED`
- migration failed validation: `FAILED`

Do not overclaim.

---

## 30. Audit Policy

Every durable mutation should create an audit event.

Audited actions:

- record
- update
- supersede
- tombstone
- hard delete
- compact
- import
- export
- migrate
- validate
- reject sensitive write
- approve proposal
- reject proposal

Audit events should include:

- action
- actor/tool
- timestamp
- record ids
- scope
- result
- reason
- sensitivity outcome
- validation status

Audit events should not include raw secrets.

---

## 31. Memory Review Policy

The system should support periodic review.

Review targets:

- stale records
- duplicate records
- low-confidence records
- sensitive/redacted records
- tombstoned records
- unscoped records
- old checkpoints
- unresolved proposals
- conflicting records

Recommended review outputs:

- keep
- update
- supersede
- archive
- tombstone
- delete with approval
- needs verification

A memory system must prune, or it becomes a swamp.

---

## 32. Reporting Format

For memory operations, report:

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

Never expose secrets.

Never hide failed redaction.

Never claim memory is current without verification.

---

## 33. First Phase Policy

Historical Phase 1 policy:

For a blank implementation, keep the policy implementation small.

Required:

- `MemoryRecord` minimum schema
- scoped durable write
- redaction or rejection
- audit event
- keyword retrieval
- memory overview
- tests

Not required yet:

- full TagMemo
- EPA
- Residual Pyramid
- dream/background association
- external vector database
- full VCP import
- general-purpose multi-agent arbitration

The first memory core should be modest and trustworthy.

Current repository note: use this section as a safety template only. The active repository already has the starter core plus Phase E mainline assets, so policy changes should be made against existing services and validated with the repository's current tests and gates.

Depth comes later.

---

## 34. Final Rule

Do not build a memory system that merely accumulates.

Build a memory system that can remember, doubt, correct, forget, and explain itself.

The feature is trustworthy memory.

Governance is the spine.

Validation is the proof.

Time is the material.
