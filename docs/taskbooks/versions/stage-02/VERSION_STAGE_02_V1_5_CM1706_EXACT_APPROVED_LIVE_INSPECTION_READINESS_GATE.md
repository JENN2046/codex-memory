# Version Stage 02 v1.5 - CM-1706 Exact-Approved Live Inspection Readiness Gate

```yaml id="version-stage-02-v1-5-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-02
stage_reference: docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
version_id: CM-1706
version_label: stage-02-v1.5
version_name: Stage 01 Closeout / Stage 02 Exact-Approved Live Inspection Readiness Gate
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.4.0 / CM-1705
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only Stage 01 closeout and Stage 02 exact-approval readiness gate
runtime_authorization: not_granted
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction by keeping future VCPToolBox live
inspection work target-anchored, exact-approval-bound, low-disclosure, and
reviewable before runtime.

It does not expand the Master goal and does not authorize runtime execution.

## 2. Stage Reference

This Version belongs to:

```text
docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
```

Stage 02 begins as readiness-gate work only. It must prove why a future live
inspection proposal still serves `project_final_goal` before exact approval can
be requested.

## 3. Prior Version Reference

Prior Version:

```text
v1.4.0 / CM-1705 - VCPToolBox Exact-Approved Live Inspection Execution Boundary
```

CM-1705 defined the future execution boundary. CM-1706 checks whether Stage 01
can close and whether Stage 02 can prepare an exact approval gate without
touching runtime.

## 4. One Capability

Add a fixture-only readiness gate helper:

```text
src/core/VcpToolBoxStageCloseoutLiveInspectionReadinessGate.js
```

The helper accepts caller-provided sanitized summaries and returns one of:

- `stage_02_exact_approval_readiness_gate_prepared`
- `blocked_needs_stage_01_closeout`
- `blocked_needs_exact_approval_boundary`
- `needs_plan_adjustment`

Prepared means the next stage gate is machine-checkable. It does not mean live
execution happened, runtime readiness exists, VCPToolBox compatibility was
proven, or complete V8 is ready.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - .colameta/prompts/v1.5.0.md
  - src/core/VcpToolBoxStageCloseoutLiveInspectionReadinessGate.js
  - tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js
  - docs/CM1706_VCPTOOLBOX_STAGE_CLOSEOUT_LIVE_INSPECTION_READINESS_GATE.md
  - docs/taskbooks/stages/STAGE_01_VCPTOOLBOX_TARGET_BOUNDARY_GOVERNANCE.md
  - docs/taskbooks/stages/STAGE_01_CLOSEOUT_CM1706.md
  - docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
  - docs/taskbooks/versions/stage-02/VERSION_STAGE_02_V1_5_CM1706_EXACT_APPROVED_LIVE_INSPECTION_READINESS_GATE.md
  - .agent_board/CURRENT_FACTS.json
  - .agent_board/VALIDATION_LOG.md
```

## 6. Forbidden Work

This Version forbids:

- live VCPToolBox runtime inspection;
- live VCPToolBox calls;
- target discovery, process probing, port probing, endpoint probing, path
  discovery, config reads, `.env`, `config.env`, secret, credential, token,
  cookie, provider auth, proxy config, private-state reads, or runtime log
  reads;
- raw memory, raw runtime response, DailyNote, RAG, vector, prompt, sqlite,
  jsonl, cache, or provider response reads;
- durable memory write or VCP write;
- provider/API call;
- approval-line issue or consume;
- public MCP tool/schema expansion;
- startup, watchdog, service, or config mutation;
- push, PR, merge, tag, release, deploy, cutover, readiness claim, or complete
  V8 claim.

## 7. Required Validation

```bash
git diff --check
node --test tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js
node --test tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- Stage 01 closeout is represented without claiming runtime readiness;
- Stage 02 is opened as exact-approval readiness only;
- CM-1701 / CM-1702 / CM-1704 / CM-1705 statuses are required;
- current gate actions and budgets remain zero-runtime;
- future runtime actions remain CM-1705-bound and exact-approval-required;
- unsafe fields, runtime authorization, approval-line values, budget/counter
  expansion, readiness, release, deploy, push, and complete V8 claims fail
  closed;
- validation passes or a precise blocker is recorded;
- no forbidden work was performed or implied.

## 9. Closeout Question

Every closeout must answer exactly:

```text
Does this work still serve project_final_goal?
```

If the answer is uncertain, report `needs_plan_adjustment`; do not mark complete
by assumption.
