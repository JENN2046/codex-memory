# Full Taskbooks for M0-M3

These taskbooks are written as future Codex execution prompts. They do not execute in this package.

### M0-T1 — Repository Fresh Reality Snapshot

```yaml
task:
  id: M0-T1
  title: Repository Fresh Reality Snapshot
  mode: read-only calibration
  risk_level: L1
  objective: produce a fresh repository state snapshot before any planning or docs work
  context: Committed files disagree on current task/validation and committed snapshots do not include live HEAD/origin facts.
  boundaries:
    - No file changes
    - No runtime calls
    - No VCPToolBox calls
    - No provider/API calls
    - No secret/config/private runtime reads
  files_to_inspect:
    - README.md
    - package.json
    - STATUS.md
    - CURRENT_STATE.md
    - .agent_board/CURRENT_FACTS.json
    - .agent_board/VALIDATION_LOG.md
    - .agent_board/TASK_QUEUE.md
    - CODEX_MEMORY_NEXT_PHASE_PLAN.md
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
  files_allowed_to_change:
    - none
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Run fresh git status and rev-parse commands in the executor checkout
    - Record branch, HEAD, origin/main, ahead/behind, dirty status
    - Inspect current facts and validation log IDs
    - Compare committed snapshot IDs against STATUS/CURRENT_STATE/TASK_QUEUE
    - Do not edit any file
  validation_commands:
    - git status --short --branch
    - git rev-parse HEAD
    - git rev-parse origin/main
    - git log -1 --format='%H %ci %s'
    - git diff --check
  evidence_to_collect:
    - actual HEAD
    - origin/main HEAD
    - worktree status
    - latest committed task ID
    - latest validation ID
    - list of stale state files
  success_criteria:
    - HEAD/origin facts captured
    - stale state files identified
    - no forbidden paths read
    - no files changed
  stop_conditions:
    - git cannot establish HEAD/origin
    - worktree has unexplained dirty changes
    - any command requests secrets/private runtime
    - HEAD differs from expected target without explanation
  expected_receipt: CM-M0-T1-REALITY-SNAPSHOT
```

### M0-T2 — Repository Drift Matrix

```yaml
task:
  id: M0-T2
  title: Repository Drift Matrix
  mode: read-only calibration
  risk_level: L1
  objective: produce a precise drift matrix across README, STATUS, CURRENT_STATE, taskboard, validation log, and roadmaps
  context: Current README and long-term roadmaps contain old independent/parity positioning while the new strategy requires VCP-native-first governance.
  boundaries:
    - No file changes
    - No implementation
    - No live runtime calls
    - Only compare committed text and current strategy
  files_to_inspect:
    - README.md
    - STATUS.md
    - CURRENT_STATE.md
    - .agent_board/CURRENT_FACTS.json
    - .agent_board/VALIDATION_LOG.md
    - .agent_board/TASK_QUEUE.md
    - CODEX_MEMORY_NEXT_PHASE_PLAN.md
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
    - docs/DOCS_GOVERNANCE.md
  files_allowed_to_change:
    - none
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Create a table with document, current claim, evidence, drift type, recommended treatment
    - Classify each judgment as verified/inferred/assumed/unresolved
    - Flag README independent/no-VCP wording
    - Flag VCP parity roadmap primary-route language
    - Flag STATUS/CURRENT_STATE/TASK_QUEUE ID drift
    - Do not patch files
  validation_commands:
    - git diff --check
    - test -f README.md && test -f .agent_board/CURRENT_FACTS.json && test -f .agent_board/VALIDATION_LOG.md
  evidence_to_collect:
    - drift matrix
    - source-of-truth recommendation
    - legacy roadmap disposition
  success_criteria:
    - every key doc has a drift classification
    - README and VCP parity roadmap are explicitly judged
    - STATUS/CURRENT_STATE/TASK_QUEUE consistency is judged
  stop_conditions:
    - missing required files
    - conflicting evidence cannot be classified
    - request would require reading secrets/private runtime
  expected_receipt: CM-M0-T2-DRIFT-MATRIX
```

### M0-T3 — Validation Boundary Reality Check

```yaml
task:
  id: M0-T3
  title: Validation Boundary Reality Check
  mode: read-only calibration
  risk_level: L1
  objective: separate fixture-only/default-safe validation from live VCP runtime proof
  context: Latest validation appears strong but explicitly states no live VCPToolBox runtime call, no memory write, and no provider/API call.
  boundaries:
    - No new tests required unless already safe and local
    - No live calls
    - No readiness claims
  files_to_inspect:
    - package.json
    - .agent_board/VALIDATION_LOG.md
    - .agent_board/CURRENT_FACTS.json
    - test/
    - tests/
    - scripts/
  files_allowed_to_change:
    - none
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Read package scripts and latest validation log
    - List safe local validation commands
    - List live/provider/runtime-sensitive scripts that require exact approval
    - Mark fixture-only, dry-run, and live proof categories separately
    - Do not execute provider-smoke, benchmark, observe-lite, or runtime target commands
  validation_commands:
    - npm pkg get scripts || true
    - git diff --check
  evidence_to_collect:
    - latest validation IDs
    - validation command categories
    - explicit not-performed list
  success_criteria:
    - fixture-only gates are not mislabeled live proof
    - approval-bound commands are named
    - no runtime calls occur
  stop_conditions:
    - script inspection exposes secrets
    - command would probe runtime/provider
    - unclear whether command is live
  expected_receipt: CM-M0-T3-VALIDATION-BOUNDARY
```

### M1-T1 — Strategy Pivot Decision Record

```yaml
task:
  id: M1-T1
  title: Strategy Pivot Decision Record
  mode: docs-only planning patch
  risk_level: L2
  objective: create a future docs-only decision record freezing VCP-native-first governed bridge as primary route
  context: M0 should show that existing docs still carry independent/parity route language.
  boundaries:
    - Docs-only changes allowed in future execution
    - No source implementation
    - No runtime calls
    - No readiness claims
  files_to_inspect:
    - README.md
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
    - CODEX_MEMORY_NEXT_PHASE_PLAN.md
    - docs/DOCS_GOVERNANCE.md
  files_allowed_to_change:
    - docs/STRATEGY_PIVOT_DECISION_VCP_NATIVE_FIRST.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Draft decision record with old route, new route, non-goals, local fallback role
    - State evidence levels
    - State no live VCP proof is claimed
    - State VCPToolBox owns intelligence and codex-memory owns governance
    - State parity roadmap disposition
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - new decision record diff
    - evidence classification table
  success_criteria:
    - decision record is explicit enough to guide future tasks
    - no implementation files changed
    - no current capability overclaim
  stop_conditions:
    - attempted code change
    - live/runtime operation requested
    - unable to reconcile strategy with safety boundaries
  expected_receipt: CM-M1-T1-STRATEGY-PIVOT-DECISION
```

### M1-T2 — Legacy Roadmap Disposition Plan

```yaml
task:
  id: M1-T2
  title: Legacy Roadmap Disposition Plan
  mode: docs-only planning patch
  risk_level: L2
  objective: downgrade old VCP parity route to fallback/compatibility reference and name the new primary bridge roadmap
  context: Existing VCP parity documents can still be useful, but not as the primary implementation path.
  boundaries:
    - Docs-only changes
    - Preserve history
    - No deletion unless explicitly approved
    - No runtime proof
  files_to_inspect:
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - CODEX_MEMORY_NEXT_PHASE_PLAN.md
  files_allowed_to_change:
    - docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Add or draft a banner marking parity roadmap legacy/fallback/reference
    - Draft new primary bridge roadmap outline
    - Move donor/local parity items to fallback/test/compatibility lane
    - Leave archived ROADMAP historical
    - Do not claim replacement until README/STATUS are synced
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - roadmap disposition diff
    - legacy/fallback lane mapping
  success_criteria:
    - primary roadmap is VCP-native bridge
    - legacy route cannot be mistaken for next active path
  stop_conditions:
    - deleting historical info without approval
    - renaming files that break links without inventory
    - claiming local parity as primary
  expected_receipt: CM-M1-T2-LEGACY-ROADMAP-DISPOSITION
```

### M1-T3 — Approval and Autonomy Boundary Freeze

```yaml
task:
  id: M1-T3
  title: Approval and Autonomy Boundary Freeze
  mode: docs-only planning patch
  risk_level: L2
  objective: document bounded autonomous approval with L0-L3 auto and L4 strict stop
  context: AGENTS OS should not require Jenn for every routine memory operation inside approved boundaries.
  boundaries:
    - Docs-only
    - No live calls
    - No authority expansion by documentation alone
  files_to_inspect:
    - README.md
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - docs/DOCS_GOVERNANCE.md
    - .agent_board/TASK_QUEUE.md
  files_allowed_to_change:
    - docs/MEMORY_APPROVAL_AUTONOMY_POLICY.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Define L0-L3 auto-approved operations
    - Define L4 hard stops
    - Define Jenn-required boundary expansions
    - Define audit receipt fields
    - Define self-review/self-approval semantics
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - policy doc diff
    - L4 matrix
    - Jenn-required list
  success_criteria:
    - routine operations inside boundary do not require per-call approval
    - L4 stops are unambiguous
    - audit receipt required
  stop_conditions:
    - policy appears to authorize secrets/runtime config/private raw reads
    - policy permits unbounded scan or irreversible deletion
  expected_receipt: CM-M1-T3-APPROVAL-AUTONOMY
```

### M2-T1 — README Positioning Synchronization

```yaml
task:
  id: M2-T1
  title: README Positioning Synchronization
  mode: docs-only patch
  risk_level: L2
  objective: update README positioning from independent/no-VCP runtime implementation to VCP-native-first governed memory bridge
  context: README is the first public source users will trust and currently contradicts the new strategy.
  boundaries:
    - README-only or docs-only
    - No implementation
    - No runtime calls
    - No readiness claim
  files_to_inspect:
    - README.md
    - docs/STRATEGY_PIVOT_DECISION_VCP_NATIVE_FIRST.md
    - docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md
    - docs/MEMORY_APPROVAL_AUTONOMY_POLICY.md
  files_allowed_to_change:
    - README.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Replace independent/no-VCP primary positioning with governed bridge positioning
    - Preserve current capability caveats
    - Add local fallback role
    - Add no-live-proof caveat where relevant
    - Update source-of-truth links
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - README diff
    - before/after positioning summary
  success_criteria:
    - README states VCPToolBox owns memory intelligence
    - README states codex-memory owns governance
    - README does not claim production/live proof
  stop_conditions:
    - README edit claims implemented VCP-native live calls without evidence
    - README removes safety boundaries
  expected_receipt: CM-M2-T1-README-SYNC
```

### M2-T2 — STATUS CURRENT_STATE TASK_QUEUE Synchronization

```yaml
task:
  id: M2-T2
  title: STATUS CURRENT_STATE TASK_QUEUE Synchronization
  mode: docs-board patch
  risk_level: L2
  objective: sync active state files to the latest validated committed snapshot or fresh git evidence
  context: STATUS/CURRENT_STATE/TASK_QUEUE currently appear behind CURRENT_FACTS/VALIDATION_LOG.
  boundaries:
    - Docs/board state only
    - No runtime calls
    - No readiness claim
  files_to_inspect:
    - STATUS.md
    - CURRENT_STATE.md
    - .agent_board/CURRENT_FACTS.json
    - .agent_board/VALIDATION_LOG.md
    - .agent_board/TASK_QUEUE.md
  files_allowed_to_change:
    - STATUS.md
    - CURRENT_STATE.md
    - .agent_board/TASK_QUEUE.md
    - .agent_board/CURRENT_FACTS.json
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Use M0 fresh git facts and latest validation log
    - Update task and validation IDs consistently
    - State committed snapshot limits and fresh Git requirement
    - Mark no live VCP proof if true
    - Do not alter validation history
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - state sync diff
    - ID consistency checklist
  success_criteria:
    - STATUS/CURRENT_STATE/TASK_QUEUE agree with selected source-of-truth
    - no false readiness claims
    - fresh git requirement preserved
  stop_conditions:
    - latest validation ambiguous
    - fresh git facts conflict with committed snapshot
    - edit would hide validation limits
  expected_receipt: CM-M2-T2-STATE-SYNC
```

### M2-T3 — Documentation Navigation and Metadata Sync

```yaml
task:
  id: M2-T3
  title: Documentation Navigation and Metadata Sync
  mode: docs-only patch
  risk_level: L2
  objective: make docs navigation point to the new source-of-truth stack and mark legacy material correctly
  context: Even after README sync, older docs can continue to mislead unless navigation is corrected.
  boundaries:
    - Docs/navigation metadata only
    - No code logic
    - No runtime calls
  files_to_inspect:
    - README.md
    - docs/DOCS_GOVERNANCE.md
    - CODEX_MEMORY_NEXT_PHASE_PLAN.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
    - package.json
  files_allowed_to_change:
    - README.md
    - docs/DOCS_GOVERNANCE.md
    - CODEX_MEMORY_NEXT_PHASE_PLAN.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Update docs source-of-truth table
    - Add legacy banner where needed
    - Update next phase plan pointer to M0-M3 bridge plan
    - If package.json description is changed, keep it metadata-only and run diff check
    - Do not alter scripts or runtime entries
  validation_commands:
    - git diff --check
    - npm pkg get description
  evidence_to_collect:
    - navigation diff
    - legacy banner diff
    - metadata impact note
  success_criteria:
    - new readers can identify current route within two links
    - legacy docs are not primary
    - no script/runtime changes
  stop_conditions:
    - package metadata change affects scripts or dependencies
    - docs now conflict with README
  expected_receipt: CM-M2-T3-DOCS-NAVIGATION-SYNC
```

### M3-T1 — VCP Native Capability Inventory

```yaml
task:
  id: M3-T1
  title: VCP Native Capability Inventory
  mode: read-only inventory
  risk_level: L2
  objective: map VCPToolBox native memory capabilities from repository docs/source references without live runtime access
  context: Bridge design must call native VCP capabilities where available and avoid reimplementation.
  boundaries:
    - Read-only
    - No live VCP target discovery
    - No raw private runtime/config/secret reads
  files_to_inspect:
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - docs/
    - README.md
    - package.json
    - src/
    - lib/
    - scripts/
  files_allowed_to_change:
    - none
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Inventory named VCP components and candidate capabilities
    - Classify each as verified from docs/source, inferred, assumed, or unresolved
    - Map capabilities to bridge profiles
    - List missing exact live facts
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - capability inventory table
    - profile mapping
    - unresolved live facts list
  success_criteria:
    - all VCP-native-first claims are evidence-tagged
    - no runtime capability is assumed implemented
    - no live calls occur
  stop_conditions:
    - inventory requires secret/private runtime access
    - source suggests target authority unknown
  expected_receipt: CM-M3-T1-VCP-CAPABILITY-INVENTORY
```

### M3-T2 — Invocation Profile Boundary Templates

```yaml
task:
  id: M3-T2
  title: Invocation Profile Boundary Templates
  mode: contract planning
  risk_level: L2
  objective: define exact approval boundary templates for observe-lite, observe-full, trusted-full-read, write-proposal, and trusted-full
  context: Later live work needs exact approval boundaries, budgets, targets, and stop conditions.
  boundaries:
    - Docs/contracts only
    - No live calls
    - No authorization by template alone
  files_to_inspect:
    - docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md
    - docs/MEMORY_APPROVAL_AUTONOMY_POLICY.md
    - docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md
  files_allowed_to_change:
    - docs/VCP_MEMORY_INVOCATION_BOUNDARY_TEMPLATES.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Define target alias fields
    - Define profile-specific allowed actions
    - Define forbidden actions and L4 stops
    - Define budgets: max calls, max results, max duration, output disclosure
    - Define receipt shape
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - boundary template doc
    - profile stop-condition matrix
  success_criteria:
    - each live-sensitive profile has exact approval template
    - write profiles are separated from read profiles
    - templates do not self-authorize
  stop_conditions:
    - template permits broad scans or raw private output
    - template blurs observe-lite and read proof
  expected_receipt: CM-M3-T2-INVOCATION-PROFILE-TEMPLATES
```

### M3-T3 — Local Fallback Role Contract

```yaml
task:
  id: M3-T3
  title: Local Fallback Role Contract
  mode: contract planning
  risk_level: L2
  objective: define when local memory may act as fallback and how it must be marked in results and receipts
  context: Local memory remains useful but must not silently become the primary VCP clone route.
  boundaries:
    - Docs/contracts only
    - No code
    - No runtime calls
  files_to_inspect:
    - README.md
    - docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - src/
    - test/
  files_allowed_to_change:
    - docs/LOCAL_FALLBACK_MEMORY_ROLE_CONTRACT.md
  files_forbidden_to_read_or_change:
    - .env
    - **/.env
    - **/*secret*
    - **/*token*
    - runtime private state
    - raw VCPToolBox private memory
    - provider credentials
    - logs containing credentials or raw private memory
  implementation_steps:
    - Define fallback entry conditions
    - Define fallback result marker
    - Define audit receipt fields
    - Define cases where fallback must not run
    - Define compatibility/test substrate role
  validation_commands:
    - git diff --check
  evidence_to_collect:
    - fallback role contract
    - fallback/non-fallback examples
  success_criteria:
    - fallback cannot be mistaken for VCP-native success
    - fallback obeys same scope/client/visibility policy
    - fallback does not claim intelligence ownership
  stop_conditions:
    - fallback contract authorizes ungoverned local writes
    - fallback hides VCP failure
  expected_receipt: CM-M3-T3-FALLBACK-ROLE-CONTRACT
```


## Evidence posture

- `verified from repository`: GitHub web inspection of `JENN2046/codex-memory` main and committed repository files, inspected on 2026-07-03.
- `verified from repository snapshot`: committed `.agent_board/CURRENT_FACTS.json` / `.agent_board/VALIDATION_LOG.md` values, which are themselves snapshots and not live git facts.
- `inferred from docs`: conclusions derived by comparing README, STATUS, CURRENT_STATE, taskboard, roadmap, and VCPToolBox vision documents.
- `assumed from user strategy`: VCP-native-first governed memory bridge as the requested new target.
- `unresolved`: facts requiring fresh local `git fetch`, exact runtime target binding, or exact-approved live VCP proof.
