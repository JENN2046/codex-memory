# Phase Plans

Planning depth follows the requested rule: M0-M3 full taskbooks, M4-M8 key drafts, M9-M15 entry/exit/risk only.

### M0 — Reality Calibration

```yaml
phase:
  id: M0
  name: Reality Calibration
  goal: establish current repo, HEAD, status, task, validation, and doc drift without changing repository files
  why_now: current committed docs disagree and live git facts are not embedded in committed snapshots
  scope:
    - read README, package metadata, STATUS, CURRENT_STATE, `.agent_board/*`, roadmaps, validation logs
    - collect fresh git facts in executor environment
    - produce evidence map and drift matrix
  non_goals:
    - no implementation
    - no live VCP/API/runtime calls
    - no repo edits
  allowed_actions:
    - read-only file inspection
    - safe git status/rev-parse/fetch
    - safe validation-log parsing
  forbidden_actions:
    - secrets/.env/private runtime reads
    - source edits
    - runtime target probing
    - provider/API/VCP calls
  expected_outputs:
    - reality calibration receipt
    - drift matrix
    - fresh git facts block
    - source-of-truth recommendation
  validation:
    - fresh git output captured
    - drift matrix identifies README/STATUS/CURRENT_STATE/TASK_QUEUE/roadmap mismatches
    - no forbidden actions
  rollback_or_abort_posture:
    - abort on dirty unexpected worktree, unknown target, secret path, git failure that prevents HEAD proof
  completion_criteria:
    - actual HEAD and origin/main identified
    - doc drift mapped
    - current authoritative snapshot selected
  risks:
    - remote changed after inspection
    - local executor cannot access remote
    - status files stale
  dependencies:
    - none
  next_phase_unlocked_by: fresh repo facts and drift matrix accepted
```

### M1 — Strategy Pivot Alignment

```yaml
phase:
  id: M1
  name: Strategy Pivot Alignment
  goal: freeze VCP-native-first governed memory bridge as the primary route
  why_now: legacy parity route still appears in README/roadmaps and would steer execution toward reimplementation
  scope:
    - draft strategy decision record
    - define primary/fallback split
    - decide legacy roadmap treatment
    - freeze non-goals
  non_goals:
    - no code implementation
    - no live proof
    - no public MCP expansion
  allowed_actions:
    - docs-only route decision drafts
    - roadmap disposition plan
    - approval/autonomy model documentation
  forbidden_actions:
    - claiming runtime capability
    - deleting legacy docs without archival plan
    - starting live VCP call
  expected_outputs:
    - strategy pivot decision
    - legacy roadmap disposition
    - updated route glossary
  validation:
    - new route states VCPToolBox intelligence / codex-memory governance
    - old parity route downgraded to fallback/reference
  rollback_or_abort_posture:
    - abort if user strategy conflicts with verified runtime safety constraints
  completion_criteria:
    - primary route and local fallback role unambiguous
  risks:
    - overcorrecting and losing useful local fallback
    - leaving hidden clone language in docs
  dependencies:
    - M0
  next_phase_unlocked_by: route decision accepted
```

### M2 — Documentation Source-of-Truth Synchronization

```yaml
phase:
  id: M2
  name: Documentation Source-of-Truth Synchronization
  goal: align README, STATUS, CURRENT_STATE, taskboard, validation summary, and roadmap pointers
  why_now: operators need a single consistent source of truth before running live boundary tasks
  scope:
    - prepare docs-only patch plan
    - sync current facts
    - add drift banners to legacy docs
    - update README summary
    - sync task queue headers
  non_goals:
    - no source/runtime implementation
    - no readiness claim
  allowed_actions:
    - docs-only edits in a future approved execution task
    - validation commands for markdown and git diff
  forbidden_actions:
    - runtime calls
    - secrets
    - release claims
    - live VCP calls
  expected_outputs:
    - README route patch
    - STATUS/CURRENT_STATE/TASK_QUEUE sync
    - new VCP-native bridge roadmap
    - legacy roadmap banner
  validation:
    - git diff check
    - state IDs match CURRENT_FACTS/VALIDATION_LOG or fresh git receipt
    - no production/release language
  rollback_or_abort_posture:
    - abort on stale HEAD, conflicting active task, or accidental code changes
  completion_criteria:
    - public docs no longer contradict new strategy
    - current state docs agree
  risks:
    - manual doc sync may miss a state file
    - package metadata may still say standalone
  dependencies:
    - M1
  next_phase_unlocked_by: docs source-of-truth aligned
```

### M3 — VCP Native Memory Capability Inventory

```yaml
phase:
  id: M3
  name: VCP Native Memory Capability Inventory
  goal: map VCPToolBox native memory surfaces and required invocation profiles without assuming capability
  why_now: bridge contract cannot be designed until native surfaces, profiles, and exact approval boundaries are named
  scope:
    - inspect existing VCPToolBox vision docs
    - inventory candidate surfaces
    - define profile vocabulary
    - prepare exact approval packets
    - identify unresolved live facts
  non_goals:
    - no live target discovery unless separately approved
    - no memory read/write
    - no provider/API
  allowed_actions:
    - read-only doc/source inspection
    - draft target/profile matrices
    - draft exact approval boundary templates
  forbidden_actions:
    - raw runtime/private memory/config/secret reads
    - live calls
    - broad scans
  expected_outputs:
    - capability inventory
    - profile matrix
    - approval boundary templates
    - unresolved questions list
  validation:
    - all capabilities tagged verified/inferred/assumed/unresolved
    - no fixture-only proof mislabeled live
  rollback_or_abort_posture:
    - abort if capability requires secret/private runtime inspection
  completion_criteria:
    - inventory complete enough to draft invocation contract
  risks:
    - VCPToolBox surfaces may differ from docs
    - transport/auth unknown
  dependencies:
    - M2
  next_phase_unlocked_by: profile matrix and exact boundary templates complete
```

### M4 — VCP Memory Invocation Contract

```yaml
phase:
  id: M4
  name: VCP Memory Invocation Contract
  goal: define request/result/error/receipt contract for governed VCP calls
  why_now: contract must exist before implementation or live invocation
  scope:
    - profile-specific request schemas
    - result normalizer shape
    - error taxonomy
    - receipt envelope
  non_goals:
    - no live proof
    - no write
  allowed_actions:
    - contract docs
    - fixture examples
    - schema review
  forbidden_actions:
    - runtime target calls
    - raw private output
  expected_outputs:
    - contract spec
    - fixture request/response examples
    - negative examples
  validation:
    - schema review passes
    - L4 cases represented
    - low-disclosure output specified
  rollback_or_abort_posture:
    - abort if contract requires secrets or raw output
  completion_criteria:
    - contract unambiguous
  risks:
    - overfitting to hypothetical VCPToolBox shape
  dependencies:
    - M3
  next_phase_unlocked_by: contract approved
```

### M5 — Governance Policy Shield

```yaml
phase:
  id: M5
  name: Governance Policy Shield
  goal: define and later implement L0-L3 auto approval and L4 hard-stop policy
  why_now: live calls require hard-stop preflight and self-review boundaries
  scope:
    - policy matrix
    - client_id/scope/visibility rules
    - stop conditions
    - receipt requirements
  non_goals:
    - no live calls
    - no expansion of authority
  allowed_actions:
    - docs/tests/fixtures in future tasks
    - policy truth table
  forbidden_actions:
    - secrets
    - bypass paths
    - unbounded scans
  expected_outputs:
    - policy spec
    - truth table
    - negative test inventory
  validation:
    - all L4 conditions fail closed
    - routine L0-L3 cases do not require Jenn per-call approval
  rollback_or_abort_posture:
    - abort on ambiguous authority
  completion_criteria:
    - policy is testable and auditable
  risks:
    - too strict reduces automation; too permissive causes leakage
  dependencies:
    - M4
  next_phase_unlocked_by: policy shield spec accepted
```

### M6 — Observe-lite Live Target Proof

```yaml
phase:
  id: M6
  name: Observe-lite Live Target Proof
  goal: perform first exact-approved live target/handshake proof without memory read/write
  why_now: after docs and policy are aligned, the bridge must verify a real target exists without reading memory
  scope:
    - one exact runtime target alias
    - one transport
    - bounded call budget
    - low-disclosure receipt
  non_goals:
    - no memory read/write
    - no provider/API
    - no broad discovery
  allowed_actions:
    - exact-approved observe-lite call only
    - receipt generation
  forbidden_actions:
    - unapproved runtime target
    - secret/config reads
    - private memory reads
  expected_outputs:
    - observe-lite receipt
    - target binding evidence
    - no-memory-access statement
  validation:
    - receipt proves target/transport only
    - no raw private output
  rollback_or_abort_posture:
    - abort on unknown target, auth prompt, unexpected data payload, L4 condition
  completion_criteria:
    - exact target exists and profile can fail closed
  risks:
    - could be mistaken for read proof; must label narrowly
  dependencies:
    - M5
    - Jenn exact boundary approval
  next_phase_unlocked_by: observe-lite receipt accepted
```

### M7 — Observe-full Read Shape Proof

```yaml
phase:
  id: M7
  name: Observe-full Read Shape Proof
  goal: perform exact-approved bounded read-shape proof with low-disclosure output
  why_now: observe-lite only proves target presence; read shape must be proven separately
  scope:
    - bounded query shape
    - limited result count
    - redacted/metadata-only output as approved
    - no write
  non_goals:
    - no durable mutation
    - no broad scan
    - no raw private dump
  allowed_actions:
    - exact-approved read-shape call
    - response shape capture
    - redacted receipt
  forbidden_actions:
    - scope expansion
    - visibility expansion
    - unbounded query
  expected_outputs:
    - read-shape proof receipt
    - normalization gaps
    - policy evaluation
  validation:
    - result shape known without leaking raw private memory
    - fallback behavior specified
  rollback_or_abort_posture:
    - abort on unexpected private data, too many results, cross-client leakage
  completion_criteria:
    - read profile shape documented
  risks:
    - read shape may reveal more than intended
  dependencies:
    - M6
    - Jenn exact read-shape approval
  next_phase_unlocked_by: read-shape receipt accepted
```

### M8 — Trusted-full-read Workflow Harness

```yaml
phase:
  id: M8
  name: Trusted-full-read Workflow Harness
  goal: prove sustained bounded read-only memory workflow for Codex/Claude
  why_now: workflow reliability matters only after target and read shape are bounded
  scope:
    - multiple bounded recall operations
    - client_id isolation
    - checkpoint/handoff receipt
    - no writes
  non_goals:
    - no durable writes
    - no public MCP expansion
    - no production claim
  allowed_actions:
    - approved trusted-full-read profile
    - bounded workflow run
    - audit receipts
  forbidden_actions:
    - unapproved visibility expansion
    - provider/API calls
    - runtime mutation
  expected_outputs:
    - workflow harness report
    - client isolation evidence
    - receipt chain
  validation:
    - bounded session passes without L4 stop
    - fallback and abort behavior tested
  rollback_or_abort_posture:
    - abort on leakage, raw private output, target drift, auth ambiguity
  completion_criteria:
    - trusted-full-read harness green
  risks:
    - stateful workflows may mask stale facts or leakage
  dependencies:
    - M7
  next_phase_unlocked_by: read-only workflow evidence accepted
```

### M9 — Governed Mutation Proposal Mode

```yaml
phase:
  id: M9
  name: Governed Mutation Proposal Mode
  goal: create non-durable mutation proposals before any write
  why_now: writes must be proposed, reviewed, and rollback-shaped before durability
  scope:
    - proposal envelope
    - diff/intent/rollback receipt
    - no durable write
  non_goals:
    - no write
    - no update
    - no tombstone
  allowed_actions:
    - proposal generation inside approved boundary
  forbidden_actions:
    - durable mutation
    - irreversible deletion
  expected_outputs:
    - proposal receipts
  validation:
    - proposal can be accepted/rejected without state mutation
  rollback_or_abort_posture:
    - abort on unclear authority or deletion intent
  completion_criteria:
    - proposal mode passes
  risks:
    - proposal may be confused with write
  dependencies:
    - M8
  next_phase_unlocked_by: proposal receipts accepted
```

### M10 — Bounded Autonomous Write / Update / Supersede / Tombstone

```yaml
phase:
  id: M10
  name: Bounded Autonomous Write / Update / Supersede / Tombstone
  goal: enable durable mutation only inside approved write boundary
  why_now: routine writes should self-approve only after write boundary is explicitly approved
  scope:
    - write/update/supersede/tombstone within exact scope
    - audit/rollback
    - client isolation
  non_goals:
    - unapproved broad write
    - irreversible deletion
    - scope expansion
  allowed_actions:
    - bounded autonomous mutation
    - receipt and rollback steps
  forbidden_actions:
    - secret content
    - cross-client private leakage
    - unbounded modification
  expected_outputs:
    - mutation receipts
    - rollback/supersession audit
  validation:
    - writes are auditable, reversible where possible, and scope-limited
  rollback_or_abort_posture:
    - hard stop on L4 or unclear authority
  completion_criteria:
    - bounded write safe
  risks:
    - largest safety risk phase
  dependencies:
    - M9
    - Jenn exact write boundary approval
  next_phase_unlocked_by: one bounded write family proven
```

### M11 — Response Normalization + Audit Receipts

```yaml
phase:
  id: M11
  name: Response Normalization + Audit Receipts
  goal: stabilize result and receipt shapes across VCP and fallback
  why_now: clients need consistent output independent of runtime target
  scope:
    - normalizer
    - receipt schema
    - fallback marker
    - error taxonomy
  non_goals:
    - new memory intelligence
    - unapproved live calls
  allowed_actions:
    - schema implementation later
    - regression tests
  forbidden_actions:
    - raw private output
  expected_outputs:
    - stable response contract
    - receipt suite
  validation:
    - same request class produces stable normalized shape
  rollback_or_abort_posture:
    - abort on raw leakage
  completion_criteria:
    - normalizer stable
  risks:
    - over-normalization hides important safety info
  dependencies:
    - M7
  next_phase_unlocked_by: receipt schema stable
```

### M12 — Codex / Claude Sustained Workflow Integration

```yaml
phase:
  id: M12
  name: Codex / Claude Sustained Workflow Integration
  goal: integrate governed recall into AGENTS OS workflows
  why_now: memory must support long-running agent workflows after read governance is proven
  scope:
    - checkpoint memory
    - handoff memory
    - client_id isolation
    - bounded recall
  non_goals:
    - write expansion without approval
    - production claim
  allowed_actions:
    - workflow harnesses
    - receipts
  forbidden_actions:
    - cross-client leakage
  expected_outputs:
    - sustained workflow report
  validation:
    - Codex/Claude isolation demonstrated
  rollback_or_abort_posture:
    - abort on leakage or stale target
  completion_criteria:
    - workflow integration proven
  risks:
    - multi-client conflicts
  dependencies:
    - M8
    - M11
  next_phase_unlocked_by: workflow receipts accepted
```

### M13 — Fallback Local Memory Hardening

```yaml
phase:
  id: M13
  name: Fallback Local Memory Hardening
  goal: keep local memory safe as fallback/test substrate
  why_now: fallback remains necessary but must not revive primary clone route
  scope:
    - scope/client isolation
    - secret rejection
    - lifecycle filter
    - query tests
  non_goals:
    - primary VCP intelligence clone
  allowed_actions:
    - local tests
    - dry-run gates
  forbidden_actions:
    - private runtime reads
  expected_outputs:
    - fallback hardening report
  validation:
    - fallback obeys same governance rules
  rollback_or_abort_posture:
    - abort on policy bypass
  completion_criteria:
    - fallback safety green
  risks:
    - legacy code complexity
  dependencies:
    - M5
  next_phase_unlocked_by: fallback governance parity green
```

### M14 — Observability / Dashboard / Health Report

```yaml
phase:
  id: M14
  name: Observability / Dashboard / Health Report
  goal: expose health without leaking raw private memory
  why_now: operators need receipts, policy status, and quality trend before RC gate
  scope:
    - dashboard JSON
    - policy health
    - query quality
    - receipt summaries
  non_goals:
    - raw private memory UI
    - release claim
  allowed_actions:
    - health report
    - dashboard tests
  forbidden_actions:
    - secrets/private payloads
  expected_outputs:
    - health dashboard report
  validation:
    - dashboard has no raw leak and marks readiness accurately
  rollback_or_abort_posture:
    - abort on secret/private leak
  completion_criteria:
    - health report stable
  risks:
    - dashboard can overclaim
  dependencies:
    - M11
    - M13
  next_phase_unlocked_by: health report accepted
```

### M15 — Release Candidate Gate / v1 Stable Bridge

```yaml
phase:
  id: M15
  name: Release Candidate Gate / v1 Stable Bridge
  goal: gate future RC/v1 claim without performing release
  why_now: only after evidence chain and docs are aligned can RC be considered
  scope:
    - RC checklist
    - risk review
    - evidence map
    - Jenn approval requirement
  non_goals:
    - tag/release/deploy/cutover
    - production claim
  allowed_actions:
    - gate report only
  forbidden_actions:
    - push/tag/release/deploy
  expected_outputs:
    - RC gate checklist
  validation:
    - no P0/P1 open risk; dedicated approval required
  rollback_or_abort_posture:
    - abort if evidence is fixture-only or stale
  completion_criteria:
    - candidate gate ready, not released
  risks:
    - pressure to overclaim
  dependencies:
    - M0-M14
  next_phase_unlocked_by: dedicated RC approval packet ready
```


## Evidence posture

- `verified from repository`: GitHub web inspection of `JENN2046/codex-memory` main and committed repository files, inspected on 2026-07-03.
- `verified from repository snapshot`: committed `.agent_board/CURRENT_FACTS.json` / `.agent_board/VALIDATION_LOG.md` values, which are themselves snapshots and not live git facts.
- `inferred from docs`: conclusions derived by comparing README, STATUS, CURRENT_STATE, taskboard, roadmap, and VCPToolBox vision documents.
- `assumed from user strategy`: VCP-native-first governed memory bridge as the requested new target.
- `unresolved`: facts requiring fresh local `git fetch`, exact runtime target binding, or exact-approved live VCP proof.
