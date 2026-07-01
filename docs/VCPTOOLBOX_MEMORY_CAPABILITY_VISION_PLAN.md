# VCPToolBox Memory Capability Vision Plan

Status: vision and routing plan only.
Date: 2026-07-02

This document records the long-term VCPToolBox memory capability goal for
`codex-memory`.

It is not runtime authorization, live proof approval, production readiness,
release readiness, cutover readiness, public MCP expansion approval, provider
approval, secret/config access approval, or durable memory write approval.

## North Star

The final goal is full governed use of the native VCPToolBox memory system from
Codex and Claude sustained workflows.

Target architecture:

```text
Codex / Claude sustained conversation
  -> codex-memory governance bridge
    -> VCPToolBox memory runtime
      -> DailyNote / DailyNoteManager / KnowledgeBaseManager
      -> TagMemo / LightMemo / TDBKnowledge
      -> DeepMemo / TopicMemo / MeshMemo / RAGDiaryPlugin
```

The bridge must not downgrade VCPToolBox to summary-only behavior as the final
state. Summary-only is useful as an early `observe-lite` safety profile, not the
capability ceiling.

VCPToolBox remains the native owner of VCP memory behavior. `codex-memory`
provides orchestration, profile selection, approval gating, low-disclosure
projection, audit receipts, rollback posture, client scope governance, and
Codex / Claude workflow integration.

## Non-Negotiable Boundary

This vision does not authorize:

- reading `.env`, `.env.*`, `config.env`, credentials, tokens, cookies, or
  provider/auth configuration;
- printing, committing, or summarizing secret values;
- reading raw DailyNote, RAG, vector, prompt, private memory, audit, sqlite,
  jsonl, or cache data without a separate exact approval;
- broad VCPToolBox memory scan, export, import, migration, sync, or backfill;
- durable memory writes, VCP writes, `record_memory` calls, or public MCP
  expansion without a separate exact approval;
- provider/API calls;
- startup, watchdog, service install, or config changes;
- push, PR, merge, tag, release, deploy, cutover, `RC_READY`, production
  readiness, release readiness, or complete V8 claims.

All runtime-sensitive work must start from fresh Git facts, exact target
binding, exact approval, low-disclosure output, bounded budgets, and explicit
receipt evidence.

## Capability Surface

The long-term bridge should preserve native VCPToolBox component identity in
every receipt and result projection.

| VCPToolBox surface | Final capability target |
|---|---|
| `DailyNote` | Hot conversation and day-level memory read; governed write only under exact approval |
| `DailyNoteManager` | Native daily-note recall and management entrypoints |
| `KnowledgeBaseManager` | Native hot memory search, vector, rerank, and knowledge operations |
| `TagMemo` / `TagMemoEngine` | Native association, tag boost, semantic topology, and geodesic behavior |
| `LightMemo` | Native intent and directory recall route selection |
| `TDBKnowledge` | Native cold knowledge retrieval |
| `DeepMemo` | Native deep and semantic recall behavior |
| `TopicMemo` | Native topic list, topic get, and topic recall behavior |
| `MeshMemo` | Native mesh and association recall where exposed |
| `RAGDiaryPlugin` | Native passive injection and orchestration behavior |

## Runtime Profiles

The bridge should expose capability by profile.

| Profile | Capability | Intended use |
|---|---|---|
| `observe-lite` | Conservative summary/no-write projection | First reachability and compatibility evidence |
| `observe-full` | Full VCP read capability, no writes | Runtime discovery, quality review, call-shape validation |
| `trusted-full-read` | Full native VCP read capability with structured/raw output only when approved by profile | Sustained conversation recall |
| `trusted-write-proposal` | Full read plus Codex-generated write proposals, no durable write | Human-reviewed memory curation |
| `trusted-full` | Full native VCP read/write behind exact trusted approval | Owner-controlled full-power integration |

Profile selection is a governance decision. It must be explicit, auditable, and
fail closed when target, auth, scope, or output shape is unknown.

## Current Evidence Chain

Current local evidence already establishes the first boundary layers:

- `CM-1684`: source map for sustained conversation memory integration.
- `CM-1685`: fixture-only VCP sustained recall envelope.
- `CM-1688`: full-capability bridge direction; summary-only is not the final
  ceiling.
- `CM-1689`: target/profile parser and call-plan contract.
- `CM-1690`: no-secret runtime target locator preflight.
- `CM-1691`: non-secret runtime target operator packet.
- `CM-1692`: low-disclosure alias boundary focused review and repair.
- `CM-1693`: fixture-only live target proof packet contract.
- `CM-1694`: fixture-only live target proof approval packet contract.
- `CM-1695`: approval packet execution-boundary focused review and repair.
- `CM-1696`: compact local mainline health after CM-1695.
- `CM-1697`: fixture-only live target proof execution approval draft
  contract; validates future exact approval-line shape without issuing approval
  or executing runtime.

Next selected local-safe route:

```text
CM-1698 VCPToolBox exact target discovery packet preflight
```

`CM-1698` should remain local docs/fixture/source-review unless Jenn gives a
separate exact approval for target-specific runtime inspection. It should not
execute VCPToolBox, inspect secrets, read raw memory, wire runtime behavior,
write memory, or claim readiness by default.

## Phased Plan

### Phase 0 - Vision Anchor

Record the final goal, non-claims, capability surface, runtime profiles, and
approval boundary in one stable document.

Done when:

- the final goal is explicit;
- summary-only is classified as an early safety profile, not the final target;
- Red Lane boundaries are clear.

### Phase 1 - Target And Profile Contracts

Represent VCPToolBox target references and profiles without executing them.

Covered by CM-1689 through CM-1697.

CM-1697 adds the execution approval draft layer and negative cases around
approval-line value persistence, current-facts value disclosure, target binding,
profile/runtime-action mismatch, budget expansion, non-stop conditions, and
forbidden expansion.

### Phase 2 - Exact Target Discovery Packet

Prepare a non-secret operator packet for a real VCPToolBox target.

Required answers:

- target kind: checkout, service URL, MCP server, CLI, plugin API, or IPC;
- startup state: already running or externally started;
- transport: HTTP, stdio MCP, local CLI, websocket, file bridge, or plugin call;
- auth/profile field names without secret values;
- read entrypoints by memory surface;
- write entrypoints where VCPToolBox supports them;
- scope model for user, project, workspace, client, session, and agent;
- timeout and failure model;
- receipt fields that can be recorded without secrets or raw memory.

This phase may record only safe aliases and presence flags. It must not persist
path, endpoint, token, config, raw memory, or provider values.

### Phase 3 - Exact-Approved Live Target Proof

Run one bounded proof that a named VCPToolBox target exists and the selected
transport can respond.

Allowed shape:

- fresh clean or explicitly scoped Git facts;
- exact target binding;
- exact approval string bound to the target, commit, action, call budget, and
  expiry;
- no memory read unless explicitly included;
- no write;
- no provider/API call;
- no raw output persistence;
- low-disclosure receipt only.

This phase proves target reachability or entrypoint shape only. It does not
prove sustained recall, write reliability, production readiness, or full VCP
capability.

### Phase 4 - Read-Only Recall Candidate

Introduce bounded read-only recall through `observe-lite`, then `observe-full`,
then `trusted-full-read` when evidence supports it.

Done when:

- query budget and output budget are enforced;
- component identity is preserved in receipts;
- low-disclosure projection is stable;
- unknown component, scope, auth, or output shape fails closed;
- runtime calls produce visible receipts;
- Codex can distinguish `codex-memory` recall from VCPToolBox recall.

### Phase 5 - Sustained Conversation Integration

Use VCPToolBox recall during real Codex / Claude workflows without defaulting to
broad scans or raw payloads.

Candidate integration points:

- session startup and resume;
- task selection;
- before source/docs/test/governance edits;
- after validation failure;
- before commit or push decisions;
- handoff and checkpoint generation;
- user asks for prior context, decisions, or preferences;
- memory proposal decisions.

Each call must stay bounded by profile, budget, scope, and receipt rules.

### Phase 6 - Write Proposal Mode

Add `trusted-write-proposal` before any durable write integration.

The bridge may draft candidate VCP memory updates, but durable writes remain
off. Human/operator review, exact approval packet shape, rollback/cleanup
posture, and audit receipt shape must be proven before any write execution.

### Phase 7 - Trusted Full Write Proof

Execute a single exact-approved governed write only after proposal mode, source
review, receipt design, rollback/cleanup plan, and validation have closed.

Done when:

- one bounded write can be executed with exact approval;
- write target, scope, payload hash, profile, and rollback/cleanup posture are
  bound;
- output is low-disclosure;
- receipt proves the write count, target class, and side effects without raw
  private data;
- no second write or broad reliability claim is inferred.

### Phase 8 - Operational Hardening

Only after bounded read and write proofs exist, harden long-running operations:

- observability and admin review surfaces;
- profile health and freshness checks;
- failure classification;
- replay and receipt reconciliation;
- rollback runbooks;
- client-scope acceptance for Codex and Claude;
- compare/quality gates that cover VCPToolBox-backed recall behavior.

## Acceptance Definition For "Full Use"

The final goal is not met until all of these are true:

- VCPToolBox target discovery is exact, repeatable, and low-disclosure.
- Runtime profiles are implemented and tested.
- Read-only VCPToolBox recall can be used during sustained Codex / Claude
  workflows with bounded calls and receipts.
- Native VCPToolBox components remain identifiable in results.
- Write proposals exist before durable writes.
- At least one exact-approved trusted write proof is executed and audited before
  any broader write claim.
- Secret/config/raw/private data boundaries are enforced.
- Public MCP expansion, if ever needed, is separately approved and validated.
- Production/release/cutover readiness is claimed only from dedicated runtime
  evidence, not from docs-only, fixture-only, no-mutation, or read-only proof.

## Validation Families

Local-safe phases:

```text
git diff --check
bash scripts/validate-local.sh docs --quiet-scripts
targeted VCPToolBox contract tests
CURRENT_FACTS.json parse
changed-scope review
```

Source or shared-runtime phases:

```text
npm test
npm run gate:mainline
npm run gate:mainline:strict
targeted compare/rollback gates where recall behavior changes
```

Runtime-sensitive phases:

```text
fresh Git facts
exact approval packet validation
bounded live probe receipt
post-action low-disclosure review
rollback/cleanup posture review
mainline gate when shared behavior changes
```

Provider, broad memory, migration, config, startup/watchdog, public MCP
expansion, push, release, deploy, cutover, and readiness work remain separate
approval-bound routes.

## Relationship To Existing Roadmaps

This document complements, but does not replace:

- `docs/VCP_MEMORY_PARITY_ROADMAP.md`
- `CODEX_MEMORY_NEXT_PHASE_PLAN.md`
- `docs/CM1684_VCPTOOLBOX_SUSTAINED_CONVERSATION_MEMORY_SOURCE_MAP.md`
- `docs/CM1688_VCPTOOLBOX_FULL_CAPABILITY_RUNTIME_BRIDGE_DISCOVERY.md`
- `.agent_board/TASK_QUEUE.md`
- `.agent_board/VALIDATION_LOG.md`

If these documents disagree, current source behavior, fresh command output,
active task board state, and explicit user instruction take priority.
