# Architecture Direction

## VCPToolBox responsibilities

VCPToolBox is the memory intelligence owner:

- native memory runtime;
- DailyNote / DailyNoteManager;
- KnowledgeBase / KnowledgeBaseManager;
- TagMemo / TagMemoEngine;
- LightMemo / TDBKnowledge;
- DeepMemo / TopicMemo / MeshMemo;
- RAGDiaryPlugin or equivalent native recall surfaces;
- ranking, semantic association, summarization, long-term memory intelligence.

## codex-memory responsibilities

codex-memory is the governance control plane:

- governed MCP adapter;
- client_id / scope / visibility enforcement;
- target runtime and profile resolver;
- L4 hard-stop shield;
- bounded autonomous approval engine;
- approval boundary receipt;
- low-disclosure output projection;
- response normalization;
- audit and evidence receipts;
- rollback-ready mutation posture;
- local fallback memory substrate;
- AGENTS OS sustained workflow integration;
- validation and compatibility harness.

## Codex / Claude responsibilities

Codex and Claude must:

- identify as a governed client;
- use only codex-memory exposed governed MCP tools;
- pass bounded request context such as client_id, project scope, visibility expectation, query intent, and write intent;
- not bypass governance by directly reading VCPToolBox private runtime;
- respect receipt and stop conditions.

## Local fallback memory responsibilities

Local memory remains, but not as primary intelligence:

```yaml
local_memory:
  primary: false
  use_when:
    - VCPToolBox unavailable
    - VCPToolBox target unapproved
    - fallback required for offline continuity
    - audit receipt persistence needed
    - compatibility with existing local tools needed
    - fixture tests / dry-run validation needed
    - differential comparison against VCP output needed
  must_not:
    - silently replace VCP native result when VCP was required
    - bypass scope/client_id/visibility rules
    - store secrets
    - perform irreversible deletion
```

## Governance flow diagram

```text
Codex / Claude
  |
  v
Governed MCP tool call
  |
  v
Request normalizer
  - client_id
  - project scope
  - visibility
  - intent
  - read/write profile
  |
  v
L4 hard-stop preflight
  - secrets?
  - raw private runtime?
  - unbounded scan?
  - cross-client leakage?
  - irreversible mutation?
  - unknown target?
  |
  v
Bounded autonomous approval
  - L0-L3 self-review
  - boundary receipt
  - budget enforcement
  |
  v
Runtime selector
  - VCPToolBox native memory first
  - local fallback only when allowed
  |
  v
VCP invocation contract / fallback local runtime
  |
  v
Result normalizer + leakage filter
  |
  v
Audit receipt + optional checkpoint/handoff memory
  |
  v
Response to Codex / Claude
```

## Primary contract surfaces

```yaml
governed_tools:
  stable_existing:
    - record_memory
    - search_memory
    - memory_overview
  future_bridge_tools_or_profiles:
    - recall_vcp_memory
    - propose_memory_write
    - commit_governed_memory_write
    - update_memory
    - supersede_memory
    - tombstone_memory
    - checkpoint_memory
    - handoff_memory
    - audit_memory
    - validate_memory
```

Public MCP expansion remains approval-bound. Early phases may express new behavior as profiles or internal contracts before public tool expansion.
