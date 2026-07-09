# Repository Reality Calibration

## Actual repo

- Repo: `JENN2046/codex-memory`
- Branch inspected: `main`
- Latest GitHub main commit inspected: `93359a8cdc5781dfe591cbf842c28276f6528ea3`
- Latest visible main commit title: `feat: add VCPToolBox approval request display gate`
- Evidence level: `verified from repository`

## Worktree / remote status

- Local clone was not available in this environment because direct `git clone` failed with DNS resolution failure.
- GitHub web inspection was used for latest main commit and committed file contents.
- Committed `.agent_board/CURRENT_FACTS.json` explicitly states that live HEAD/origin/dirty facts are not committed and fresh Git is required before branch-sensitive, runtime-sensitive, or remote action.
- Evidence level: `verified from repository` for GitHub main; `unresolved` for local worktree cleanliness / ahead-behind / remote freshness in a future Codex executor environment.

## Current task / validation state

Most trustworthy committed state:

```yaml
current_committed_snapshot:
  facts_file: .agent_board/CURRENT_FACTS.json
  updated_at: 2026-07-03T11:26:05Z
  task_id: CM-1713
  validation_id: CMV-1816
  branch: main
  status:
    project: READY
    rc: RC_READY
    not_release_ready: true
    not_production_ready: true
    not_deploy_ready: true
    not_cutover_ready: true
    complete_v8_claimed: false
  validation_boundary:
    fixture_only: true
    no_live_vcp_toolbox_call: true
    no_runtime_call: true
    no_provider_api_call: true
    no_memory_write: true
```

Validation log latest entry:

```yaml
latest_validation:
  id: CMV-1816
  task: CM-1713
  key_commands:
    - git diff --check
    - targeted VCPToolBox approval request display tests
    - npm run vcp:adjacent-boundary:acceptance
    - npm run vcp:default-safe-suite
  key_counts:
    adjacent_boundary_chain: 187/187 passed
    default_safe_suite: 3600/3600 passed
  not_performed:
    - live VCPToolBox runtime call
    - target discovery
    - process/port probing
    - config/env/secret read
    - runtime log read
    - raw memory/runtime/provider read
    - approval request submission/dispatch/send
    - provider/API call
    - memory write
    - public MCP expansion
    - push/release/deploy/readiness claim
```

Evidence level: `verified from repository snapshot`.

## Documentation drift

### README positioning drift

Current README still describes `codex-memory` as an independent implementation that does not rely on VCPToolBox runtime. This conflicts with the requested new target:

```text
VCPToolBox owns memory intelligence.
codex-memory owns memory governance.
Codex / Claude consume VCP memory through governed MCP tools.
```

Recommended treatment: rewrite README positioning in a future docs-only task to state that codex-memory is a VCP-native-first governed memory bridge, with local memory retained as fallback/audit/compatibility/test substrate.

Evidence level: `verified from repository` + `assumed from user strategy`.

### Legacy roadmap drift

- `ROADMAP.md` is marked archived and should remain historical only.
- `docs/VCP_MEMORY_PARITY_ROADMAP.md` still presents VCP memory practical parity / local parity as the long-term route.
- The uploaded earlier review also follows a VCP practical parity sequence and recommends P10/P11/P12 local hardening as the next path.
- New strategy requires this parity route to stop being primary.

Recommended treatment:

```yaml
legacy_vcp_parity_route:
  decision: downgrade_to_fallback_and_compatibility_reference
  not_primary: true
  archive_or_split:
    - add legacy/fallback banner to existing parity roadmap
    - create new primary VCP-native bridge roadmap
    - move donor-parity/local-object-model items under fallback/test/compatibility appendix
```

Evidence level: `verified from repository` + `inferred from docs`.

### STATUS / CURRENT_STATE / taskboard drift

Observed committed inconsistency:

```yaml
CURRENT_FACTS:
  current_task: CM-1713
  current_validation: CMV-1816
  updated_at: 2026-07-03T11:26:05Z

VALIDATION_LOG:
  latest_validation: CMV-1816
  latest_task: CM-1713

STATUS:
  current_task: CM-1700
  current_validation: CMV-1805

CURRENT_STATE:
  current_task: CM-1700
  current_validation: CMV-1805

TASK_QUEUE:
  latest_active_task: CM-1700
  latest_validation: CMV-1805
```

Recommendation:

```yaml
trust_order_for_current_state:
  1: fresh git commands in execution environment
  2: .agent_board/CURRENT_FACTS.json committed status snapshot
  3: .agent_board/VALIDATION_LOG.md latest validation entry
  4: STATUS.md / CURRENT_STATE.md / TASK_QUEUE.md only after sync
```

Evidence level: `verified from repository snapshot`.

## Source-of-truth recommendation

Create a new explicit strategy source:

```text
docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md
```

Then align:

```yaml
source_of_truth_stack:
  live_facts:
    - fresh git status / rev-parse / fetch output
  committed_snapshot:
    - .agent_board/CURRENT_FACTS.json
    - .agent_board/VALIDATION_LOG.md
  strategic_route:
    - docs/VCP_NATIVE_GOVERNED_MEMORY_BRIDGE_ROADMAP.md
    - docs/STRATEGY_PIVOT_DECISION_VCP_NATIVE_FIRST.md
  public_summary:
    - README.md
  execution_queue:
    - .agent_board/TASK_QUEUE.md
    - STATUS.md
    - CURRENT_STATE.md
  legacy_reference:
    - docs/VCP_MEMORY_PARITY_ROADMAP.md
    - ROADMAP.md
```

## What is not proven

- No live VCPToolBox memory invocation is proven.
- No live VCP observe-lite target proof is proven.
- No live memory read shape proof is proven.
- No trusted-full-read workflow proof is proven.
- No durable VCP write / update / supersede / tombstone is proven.
- Fixture-only and approval-display gates are useful, but they are not live runtime proof.
- No production-ready / release-ready / cutover-ready conclusion is justified.


## Evidence posture

- `verified from repository`: GitHub web inspection of `JENN2046/codex-memory` main and committed repository files, inspected on 2026-07-03.
- `verified from repository snapshot`: committed `.agent_board/CURRENT_FACTS.json` / `.agent_board/VALIDATION_LOG.md` values, which are themselves snapshots and not live git facts.
- `inferred from docs`: conclusions derived by comparing README, STATUS, CURRENT_STATE, taskboard, roadmap, and VCPToolBox vision documents.
- `assumed from user strategy`: VCP-native-first governed memory bridge as the requested new target.
- `unresolved`: facts requiring fresh local `git fetch`, exact runtime target binding, or exact-approved live VCP proof.
