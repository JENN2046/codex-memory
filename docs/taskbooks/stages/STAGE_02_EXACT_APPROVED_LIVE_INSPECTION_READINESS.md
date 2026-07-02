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
