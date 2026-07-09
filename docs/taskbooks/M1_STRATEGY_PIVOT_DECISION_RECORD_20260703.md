# M1 Strategy Pivot Decision Record

Task id: `CM-M1-T1-STRATEGY-PIVOT-DECISION`
Implementation slice: `CM-1714`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Evidence type: `docs-only`, `strategy decision`, `no-runtime`

## Decision

The active strategic direction for this plan is:

```text
VCPToolBox-native-first governed memory bridge
```

`codex-memory` should become the governance bridge that lets Codex and Claude
use VCPToolBox native memory capability through bounded, auditable, scoped, and
approval-aware workflows.

The final architecture remains:

```text
Codex / Claude sustained workflow
  -> codex-memory governance bridge
    -> VCPToolBox native memory runtime
```

## Role Split

| System | Role |
|---|---|
| `VCPToolBox` | Native memory owner for DailyNote, DailyNoteManager, KnowledgeBaseManager, TagMemo, LightMemo, TDBKnowledge, DeepMemo, TopicMemo, MeshMemo, and RAGDiaryPlugin behavior |
| `codex-memory` | Governance bridge, profile selector, approval boundary, low-disclosure projection, receipt/audit surface, rollback posture, client scope policy, and local fallback/test substrate |
| Local `vcp_codex_memory` implementation | Protected compatibility layer and fallback/test substrate; not the final replacement for VCPToolBox memory intelligence |

## Superseded Primary Route

The older local practical-parity route remains useful but is no longer the
primary north star for the archived plan.

It should be treated as:

- compatibility protection;
- fallback/local substrate hardening;
- donor-behavior reference;
- regression and safety test surface.

It should not be treated as a reason to clone all VCPToolBox memory intelligence
inside `codex-memory` before building the governed native bridge.

## Execution Model

This strategy uses repo-native autopilot, not ColaMeta, for future plan
execution.

Historical ColaMeta evidence already committed in the repository remains a
factual record. It does not control the next implementation loop.

Allowed before exact live approval:

- docs synchronization;
- taskbooks;
- fixtures;
- pure helpers;
- no-runtime tests;
- approval packet skeletons and review boundaries that do not generate,
  validate, submit, issue, store, or simulate a real approval line.

Hard stops:

- live VCPToolBox runtime calls;
- secrets, `.env`, `config.env`, provider/auth configuration, or private runtime
  state reads;
- raw DailyNote, RAG, vector, prompt, audit, sqlite, jsonl, cache, or private
  memory reads;
- broad VCP memory scan/export/import/migration/sync/backfill;
- approval-line generation, submission, issue, storage, simulation, validation,
  or exposure;
- provider/API calls;
- durable memory writes or VCP writes;
- public MCP expansion;
- config, startup, watchdog, or service mutation;
- push, release, deploy, cutover, production readiness, release readiness,
  `RC_READY`, or complete V8 claims.

## Current Status

M0 established that current repository state is suitable for M1/M2 docs/state
synchronization only.

This decision does not prove live VCPToolBox capability. Exact target binding,
transport/auth/profile shape, live read result shape, and durable write safety
remain unresolved until later exact-approved phases.

## Next Action

Proceed to M2:

1. Update README positioning.
2. Reclassify the older VCP parity roadmap as fallback/reference for this plan.
3. Synchronize `STATUS.md`, `CURRENT_STATE.md`, and `.agent_board` active
   surfaces with the current `CM-1714` plan intake state.
