# First Three Executable Tasks

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
## Coordination note

`M0-T2 Repository Drift Matrix` should be produced as part of M0 evidence before M1/M2 patching if the executor can queue more than exactly three tasks. `M2-T1 README Positioning Synchronization` and `M2-T2 STATUS CURRENT_STATE TASK_QUEUE Synchronization` are the most important docs/state sync tasks after strategy pivot.
