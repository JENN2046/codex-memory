# VCPToolBox Native Memory Capability Inventory

Task id: `CM-M3-T1-VCP-CAPABILITY-INVENTORY`
Implementation slice: `CM-1715`
Date: 2026-07-03
Source plan: `docs/archive/imported-plans/codex-memory-vcp-native-bridge-plan-20260703`
Evidence type: `docs-only`, `source-contract inventory`, `no-runtime`

## Purpose

This inventory maps candidate VCPToolBox native memory surfaces before drafting
the invocation contract.

It does not inspect a live VCPToolBox checkout, probe a target, read
`config.env` or `.env`, read raw private runtime or memory state, call
VCPToolBox, call providers/APIs, write memory, expand public MCP tools, submit
or generate an approval line, push, release, deploy, cut over, or claim
readiness.

## Evidence Tags

| Tag | Meaning |
|---|---|
| `verified_docs` | Present in committed docs such as `docs/VCPTOOLBOX_MEMORY_CAPABILITY_VISION_PLAN.md`, CM-1688, or the archived plan package |
| `verified_source_contract` | Present in local source contracts such as `src/core/VcpToolBoxFullCapabilityBridgePlan.js` or `src/core/VcpSustainedRecallEnvelopeContract.js` |
| `verified_local_compat` | Implemented locally as compatibility/fallback/donor behavior, not live VCPToolBox proof |
| `inferred` | Reasonable conclusion from docs/source comparison |
| `unresolved_live` | Requires exact target binding and exact-approved live proof |

## Native Surface Inventory

| VCP surface | Candidate native capability | Evidence | Candidate profiles | Unresolved live facts |
|---|---|---|---|---|
| `DailyNote` | Hot conversation and day-level memory read; governed write where VCP supports it | `verified_docs`; `verified_source_contract` actions `daily_note.read`, `daily_note.write_proposal`, `daily_note.write` | `observe-full`; `trusted-full-read`; `trusted-write-proposal`; `trusted-full` | exact target entrypoint, scope model, raw/structured output shape, write safety |
| `DailyNoteManager` | Native daily-note recall and management entrypoints | `verified_docs`; `verified_source_contract` action `daily_note_manager.recall` | `observe-lite`; `observe-full`; `trusted-full-read` | exact recall entrypoint, result paging, failure model |
| `KnowledgeBaseManager` | Hot memory search, vector/rerank, knowledge operations; possible governed write | `verified_docs`; `verified_source_contract` actions `knowledge_base.search`, `knowledge_base.rerank`, `knowledge_base.write_proposal`, `knowledge_base.write`; `verified_local_compat` profile config keys | `observe-full`; `trusted-full-read`; `trusted-write-proposal`; `trusted-full` | target transport, provider dependency boundary, raw vector/row disclosure rules, write entrypoint |
| `TagMemo` / `TagMemoEngine` | Native association, tag boost, semantic topology, geodesic behavior; possible governed tag write | `verified_docs`; `verified_source_contract` actions `tagmemo.associate`, `tagmemo.boost`, `tagmemo.write_proposal`, `tagmemo.write`; `verified_local_compat` TagMemo modules | `observe-full`; `trusted-full-read`; `trusted-write-proposal`; `trusted-full` | native call shape, whether association output is raw/structured/summary, durable write rollback |
| `LightMemo` | Native intent and directory recall route selection | `verified_docs`; `verified_source_contract` action `lightmemo.route`; `verified_local_compat` `src/adapters/vcp-light-memory` | `observe-lite`; `observe-full`; `trusted-full-read` | exact directory/scope semantics from live target, excluded-folder behavior, alias map |
| `TDBKnowledge` | Native cold knowledge retrieval | `verified_docs`; `verified_source_contract` action `tdb_knowledge.search` | `observe-full`; `trusted-full-read` | target entrypoint, result shape, disclosure boundary |
| `DeepMemo` | Native deep and semantic recall behavior | `verified_docs`; `verified_source_contract` action `deepmemo.recall`; `verified_local_compat` DeepMemo CLI/adapter behavior | `observe-lite`; `observe-full`; `trusted-full-read` | native target path/transport, query grammar parity, raw memory output rules |
| `TopicMemo` | Native topic list, topic get, and topic recall behavior | `verified_docs`; `verified_source_contract` action `topicmemo.recall`; `verified_local_compat` TopicMemo CLI/adapter behavior | `observe-lite`; `observe-full`; `trusted-full-read` | native command vocabulary, topic identity model, cross-agent scope rules |
| `MeshMemo` | Native mesh and association recall where exposed | `verified_docs`; `verified_source_contract` action `meshmemo.recall` | `observe-full`; `trusted-full-read` | whether the installed target exposes MeshMemo, result graph shape, disclosure boundary |
| `RAGDiaryPlugin` | Native passive injection and orchestration behavior | `verified_docs`; `verified_source_contract` action `rag_diary.inject_context`; `verified_local_compat` `RAGDiaryPlugin` profile config references | `observe-lite`; `observe-full`; `trusted-full-read` | injected context boundary, raw prompt/RAG disclosure rules, provider dependency boundary |

## Profile Capability Map

| Profile | Inventory meaning | Read | Raw/structured output | Write proposal | Durable write | Evidence status |
|---|---|---:|---|---:|---:|---|
| `observe-lite` | conservative summary/no-write projection for first compatibility evidence | limited | summary/low-disclosure only | no | no | `verified_docs`; `verified_source_contract`; no live proof |
| `observe-full` | full VCP read capability, no writes | yes | profile-approved raw/structured/summary | no | no | `verified_docs`; `verified_source_contract`; live output shape unresolved |
| `trusted-full-read` | sustained workflow full read profile | yes | profile-approved raw/structured/summary | no | no | `verified_docs`; `verified_source_contract`; live trust boundary unresolved |
| `trusted-write-proposal` | full read plus proposed writes, without durable mutation | yes | profile-approved raw/structured/summary | yes | no | `verified_docs`; `verified_source_contract`; proposal review flow unresolved |
| `trusted-full` | full native read/write behind exact trusted approval | yes | profile-approved raw/structured/summary | yes | yes | `verified_docs`; `verified_source_contract`; exact write proof unresolved |

Templates for these profiles do not authorize execution by themselves. M3-T2
must define exact approval boundary templates separately.

## Target Kinds

Local source contract vocabulary can represent these target kinds:

- `local_checkout`
- `service_url`
- `mcp_server`
- `cli`
- `plugin_api`
- `ipc`

No exact target is bound by this inventory. Runtime target, startup state,
transport, auth/profile mechanism, read entrypoints, write entrypoints, raw
output mode, scope model, failure model, and receipt source remain unresolved.

## Local Compatibility Surfaces

The repository already has local compatibility/fallback surfaces that may help
test or normalize bridge behavior:

- `src/adapters/vcp-active-memory`
- `src/adapters/vcp-light-memory`
- `src/adapters/vcp-passive-memory`
- `src/cli/deepmemo.js`
- `src/cli/topicmemo.js`
- `src/cli/compare-vcp-active-memory.js`
- `src/cli/rollback-active-memory.js`
- TagMemo source modules under `src/tagmemo` and `src/recall/TagMemoEngine.js`

These are not live VCPToolBox proof. They are compatibility, fallback,
regression, and donor-behavior references.

## M3-T1 Conclusion

The capability inventory is sufficient to draft invocation boundaries and local
fallback rules.

Next safe tasks:

1. `M3-T2 Invocation Profile Boundary Templates`
2. `M3-T3 Local Fallback Role Contract`

Unsafe tasks remain blocked: live VCPToolBox runtime discovery, raw memory or
runtime reads, provider/API calls, approval-line generation or submission,
durable memory writes, public MCP expansion, push, release, deploy, cutover,
and readiness claims.
