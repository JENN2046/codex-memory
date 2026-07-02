# Stage 02 - Exact-Approved Live Inspection Readiness

```yaml id="stage-02-metadata"
document_type: colameta_stage_taskbook
schema_version: taskbook_stage.v1
status: opened_as_readiness_gate_only
project: codex-memory
managed_project_name: codex-memory
stage_id: stage-02
stage_name: Exact-Approved Live Inspection Readiness
created_at: 2026-07-02
master_taskbook: PROJECT_MASTER_TASKBOOK.md
project_final_goal: governed Codex/Claude use of native VCPToolBox memory through the codex-memory bridge
serves_master_workstreams:
  - Workstream B - Exact-Approved Runtime Proofs
  - Workstream F - Mainline Protection And Runtime Hardening
default_lane: Green Lane fixture-only readiness gate
runtime_authorization: not_granted
current_version: CM-1711
```

## 1. Master Alignment

Master final direction: `codex-memory` should become the governed Codex/Claude
bridge that can use the native VCPToolBox memory system from sustained workflows
without downgrading the final target to summary-only behavior.

Stage 02 serves that direction by making the next runtime-facing step prove its
approval, scope, budget, disclosure, receipt, and closeout boundaries before any
live target-specific inspection is attempted.

## 2. Stage Goal

Prepare a readiness gate for a future exact-approved live VCPToolBox inspection.

This Stage begins with no runtime authorization. Its first capability is a
fixture-only gate that answers whether Stage 01 evidence is complete enough to
prepare a future exact approval packet.

## 3. Required Evidence

Before any future live inspection proposal, Stage 02 evidence must include:

- Stage 01 closeout evidence;
- CM-1701 / CM-1702 / CM-1704 / CM-1705 accepted statuses;
- a Stage 02 Version document citing the Master and this Stage;
- an execution envelope whose current action budget is zero-runtime;
- future execution boundary references that still require exact approval;
- a low-disclosure receipt plan;
- a Review answer to `Does this work still serve project_final_goal?`.

## 4. Non-Goals

This Stage does not authorize:

- live VCPToolBox runtime inspection;
- target discovery, process, port, endpoint, path, or config probing;
- `.env`, `config.env`, secrets, credentials, tokens, cookies, provider auth,
  proxy config, or private-state reads;
- raw memory, raw runtime response, runtime logs, provider responses, or raw
  store reads;
- durable memory writes;
- provider/API calls;
- public MCP expansion;
- startup/watchdog/config mutation;
- push, PR, release, deploy, readiness claim, or complete V8 claim.

## 5. First Version

First Version under this Stage:

```yaml id="stage-02-first-version"
version_id: CM-1706
version_name: Stage 01 Closeout / Stage 02 Exact-Approved Live Inspection Readiness Gate
version_goal: prepare a fixture-only gate that keeps the future live inspection exact-approval-bound
status: prepared_for_local_execution
```

## 6. Previous Version

Previous Version:

```yaml id="stage-02-current-version"
version_id: CM-1707
version_name: Stage 02 Exact Approval Packet Preflight
version_goal: prepare a fixture-only approval packet preflight without issuing or consuming approval
status: prepared_for_local_execution
```

CM-1707 may only inspect caller-provided sanitized summaries. It must not issue
an approval line, consume an approval line, expose an approval-line value, call
VCPToolBox, probe runtime, or claim readiness.

## 7. Previous Version

Previous Version:

```yaml id="stage-02-current-version-v1-7"
version_id: CM-1708
version_name: Stage 02 Exact Approval Packet Review Boundary
version_goal: prepare a fixture-only packet review boundary without generating approval or touching runtime
status: prepared_for_local_execution
```

CM-1708 may only inspect caller-provided sanitized summaries. It checks whether
the CM-1707-preflighted future packet candidate may enter human exact-approval
review. It must not generate, issue, consume, store, expose, or validate an
approval line; it must not call VCPToolBox, probe runtime, or claim readiness.

## 8. Previous Version

Previous Version:

```yaml id="stage-02-current-version-v1-8"
version_id: CM-1709
version_name: Stage 02 Exact Approval Decision Intake Boundary
version_goal: classify sanitized human review outcomes without granting approval or touching runtime
status: prepared_for_local_execution
```

CM-1709 may only inspect caller-provided sanitized summaries. It classifies
`approve_requested`, `reject`, and `needs_adjustment` outcomes after CM-1708
review. It must not validate, generate, issue, consume, store, expose, or rely
on an approval line; it must not grant runtime authorization, call VCPToolBox,
probe runtime, or claim readiness.

## 9. Previous Version

Previous Version:

```yaml id="stage-02-current-version-v1-9"
version_id: CM-1710
version_name: Stage 02 Exact Approval Request Packet Skeleton Boundary
version_goal: prepare a non-authorizing future exact approval request packet skeleton
status: prepared_for_local_execution
```

CM-1710 may only inspect caller-provided sanitized summaries. It prepares a
future exact approval request packet skeleton only after CM-1709
`approve_requested` intake. It must not validate, generate, issue, consume,
store, expose, or rely on a real approval line; it must not grant runtime
authorization, call VCPToolBox, probe runtime, or claim readiness.

## 10. Current Version

Current Version:

```yaml id="stage-02-current-version-v1-10"
version_id: CM-1711
version_name: Stage 02 Exact Approval Request Packet Review Readiness Boundary
version_goal: prepare a non-authorizing future exact approval request packet review-readiness boundary
status: prepared_for_local_execution
```

CM-1711 may only inspect caller-provided sanitized summaries. It checks whether
the CM-1710 request packet skeleton can enter human exact-approval request
review-readiness. It must not validate, generate, issue, consume, store,
template, expose, or rely on a real approval line; it must not grant runtime
authorization, call VCPToolBox, probe runtime, or claim readiness.
