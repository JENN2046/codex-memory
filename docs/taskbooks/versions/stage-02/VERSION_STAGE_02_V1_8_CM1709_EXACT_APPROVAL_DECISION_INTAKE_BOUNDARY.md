# Version Stage 02 v1.8 - CM-1709 Exact Approval Decision Intake Boundary

```yaml id="version-stage-02-v1-8-metadata"
document_type: colameta_version_task
schema_version: taskbook_version.v1
status: prepared_for_local_execution
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-02
stage_reference: docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
version_id: CM-1709
version_label: stage-02-v1.8
version_name: Stage 02 Exact Approval Decision Intake Boundary
created_at: 2026-07-03
master_taskbook: PROJECT_MASTER_TASKBOOK.md
prior_version: v1.7.0 / CM-1708
prior_version_status: PASSED
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
one_capability: fixture-only exact approval decision intake boundary
runtime_authorization: not_granted
approval_line_authorization: not_granted
approval_line_generation: forbidden
approval_line_validation: forbidden
```

## 1. Master Reference

This Version cites `PROJECT_MASTER_TASKBOOK.md`.

It serves the Master final direction by making the post-review human outcome
intake explicit before any later exact approval request can be prepared.

It does not expand the Master goal and does not authorize runtime execution.

## 2. Stage Reference

This Version belongs to:

```text
docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
```

Stage 02 prepares exact approval readiness. CM-1709 handles only sanitized
human review outcome intake after CM-1708 packet review.

## 3. Prior Version Reference

Prior Version:

```text
v1.7.0 / CM-1708 - Stage 02 Exact Approval Packet Review Boundary
```

CM-1708 decided whether a preflighted packet candidate may enter human review.
CM-1709 classifies the human review outcome without issuing, validating, or
generating approval.

## 4. One Capability

Add a fixture-only decision intake helper:

```text
src/core/VcpToolBoxStage02ExactApprovalDecisionIntakeBoundary.js
```

The helper accepts caller-provided sanitized summaries and returns one of:

- `exact_approval_approve_request_intake_ready`
- `exact_approval_reject_intake_ready`
- `exact_approval_needs_adjustment_intake_ready`
- `blocked_needs_exact_approval_packet_review_boundary`
- `blocked_needs_exact_approval_packet_preflight`
- `blocked_needs_exact_approval_decision_intake_boundary`
- `blocked_needs_receipt_plan`
- `needs_plan_adjustment`

`approve_requested` means only that a future exact approval request may be
prepared. It does not mean approval was granted, an approval line exists,
runtime authorization exists, VCPToolBox compatibility was proven, or complete
V8 is ready.

## 5. Allowed Files

```yaml id="allowed-files"
allowed_files:
  - .colameta/prompts/v1.8.0.md
  - src/core/VcpToolBoxStage02ExactApprovalDecisionIntakeBoundary.js
  - tests/vcp-toolbox-stage02-exact-approval-decision-intake-boundary.test.js
  - docs/CM1709_VCPTOOLBOX_STAGE02_EXACT_APPROVAL_DECISION_INTAKE_BOUNDARY.md
  - docs/taskbooks/stages/STAGE_02_EXACT_APPROVED_LIVE_INSPECTION_READINESS.md
  - docs/taskbooks/versions/stage-02/VERSION_STAGE_02_V1_8_CM1709_EXACT_APPROVAL_DECISION_INTAKE_BOUNDARY.md
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
- approval-line validation, generation, issue, consume, storage, or value
  exposure;
- runtime authorization or readiness claim;
- public MCP tool/schema expansion;
- startup, watchdog, service, or config mutation;
- push, PR, merge, tag, release, deploy, cutover, readiness claim, or complete
  V8 claim.

## 7. Required Validation

```bash
git diff --check
node --test tests/vcp-toolbox-stage02-exact-approval-decision-intake-boundary.test.js
node --test tests/vcp-toolbox-stage02-exact-approval-decision-intake-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-packet-review-boundary.test.js tests/vcp-toolbox-stage02-exact-approval-packet-preflight.test.js tests/vcp-toolbox-stage-closeout-live-inspection-readiness-gate.test.js tests/vcp-toolbox-exact-approved-live-inspection-execution-boundary.test.js tests/vcp-toolbox-target-specific-runtime-inspection-receipt.test.js tests/vcp-toolbox-commander-runtime-inspection-go-no-go-packet.test.js tests/vcp-toolbox-target-specific-runtime-inspection-execution-approval-draft.test.js tests/vcp-toolbox-target-specific-runtime-inspection-approval-packet.test.js tests/vcp-toolbox-exact-target-discovery-packet-preflight.test.js
bash scripts/run-default-tests-node22.sh --summary
```

## 8. Done Definition

This Version is done only when:

- CM-1708 review boundary is required;
- CM-1707 packet preflight is required;
- CM-1705 future execution boundary is required;
- CM-1704 receipt plan is required;
- sanitized decision outcomes are limited to `approve_requested`, `reject`, and
  `needs_adjustment`;
- `approve_requested` cannot grant approval or runtime authorization;
- approval-line validation, generation, issue, consume, storage, and value
  exposure all fail closed;
- current decision-intake actions and budgets remain zero-runtime;
- future runtime actions remain CM-1705-bound;
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
