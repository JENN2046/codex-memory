# CM-1684 VCPToolBox Sustained Conversation Memory Source Map

Date: 2026-06-12

Status: `SOURCE_MAP_DOCS_ONLY_NO_RUNTIME_NO_WRITE`

## Purpose

CM-1684 records the future route for connecting Codex sustained conversations to
VCPToolBox realtime memory capability through `codex-memory`.

Candidate architecture:

```text
Codex <-> codex-memory MCP <-> VCPToolBox memory runtime
```

This is a source map and boundary document only. It does not implement runtime
wiring, call VCPToolBox, call MCP, call `record_memory`, read VCP stores, read
raw memory content, edit VCP config/profile files, edit `.env`, call providers,
write memory, or expand public MCP tools.

## Current Decision

The route is feasible but not implemented.

`codex-memory` can already serve Codex as an independent MCP memory system, but
that is not the same as using VCPToolBox realtime memory during ongoing
conversation. A future bridge must treat VCPToolBox as the owner of VCP memory
runtime behavior and `codex-memory` as the controlled bridge/governance layer.

Do not claim:

```text
VCPToolBox live memory integration implemented
VCPToolBox runtime wiring executed
VCPToolBox realtime recall available to Codex
live VCP proof complete
production/release/cutover ready
```

## Source Baseline

Local source and docs reviewed for this map:

- `README.md`
- `docs/VCP_MEMORY_GOVERNANCE_INTEGRATION_MAP_V0_1.md`
- `docs/CM1654_VCP_MEMORY_GOVERNANCE_RUNTIME_WIRING_PREFLIGHT_DESIGN.md`
- `docs/CM1649_VCP_BRIDGE_LIVE_NO_WRITE_PROBE_DESIGN.md`
- `docs/CM1648_VCP_BRIDGE_EXACT_APPROVAL_GATE_DESIGN.md`
- `docs/VCPToolBox_VCPChat_代码审查与向量模型迁移汇总.md`
- `docs/浪潮V8_TagMemo_技术文档.md`
- `src/core/VcpMemoryGovernanceEventAdapter.js`
- `src/core/VcpBridgeTrustedExecutionContext.js`
- `src/core/VcpBridgeTrustedContextProofPreflight.js`
- `src/core/VcpBridgeExactApprovalGate.js`
- `src/core/VcpBridgeLiveNoWriteProbePlan.js`

This review did not inspect a live VCPToolBox checkout, did not execute VCP
code, and did not read private VCP runtime data.

## VCPToolBox Memory Surfaces To Map Later

CM-1650 identifies the relevant VCP-owned memory capability families:

| Surface | Candidate role in sustained conversation | Current CM-1684 stance |
|---|---|---|
| `DailyNote` | hot conversation/day-level memory source | Do not bulk read or sync |
| `DailyNoteManager` | hot memory recall manager | Future source-map target only |
| `KnowledgeBaseManager` | hot memory vector/search/rerank entry | Future read-only recall candidate |
| `TagMemo` / `TagMemoEngine` | association, tag boost, semantic topology, geodesic rerank | Future bounded activation summary only |
| `RAGDiaryPlugin` | passive injection and orchestration layer | Future integration candidate, not raw payload source |
| `LightMemo` | intent/directory retrieval route | Future read-only recall candidate |
| `TDBKnowledge` | cold knowledge retrieval | Future read-only recall candidate |
| `DeepMemo` / `TopicMemo` / `MeshMemo` | active recall variants | Compatibility evidence only until mapped |

These surfaces remain VCP-owned. A future bridge should request bounded recall
or governance events. It should not mirror VCP memory into `codex-memory`.

## Unknowns That Must Be Resolved Before Runtime Work

A future source-map pass must identify, from current VCPToolBox source or
operator-provided runtime docs:

| Unknown | Required answer before no-write probe |
|---|---|
| Transport | HTTP endpoint, MCP endpoint, plugin API, local IPC, or CLI |
| Auth mode | bearer token, shared secret, signed context, static allowlist, or local-only |
| Profile source | exact non-secret profile fields and where they are configured |
| Query entrypoint | exact method/path/tool for read-only memory recall |
| Component routing | how to select hot memory, cold knowledge, LightMemo, or RAGDiary route |
| Principal scope | how Codex agent/project/workspace/client context is represented |
| Output shape | whether output can be bounded and low-disclosure without raw payloads |
| No-write proof | how to prove zero writes, zero mutations, and zero broad scans |
| Timeout/failure mode | bounded timeout and fail-closed behavior |
| Audit receipt | low-disclosure receipt fields available without raw memory content |

These answers are not supplied by CM-1684. CM-1684 only records the checklist.

## Allowed Future Read-Only Recall Envelope

If a later exact-approved no-write probe is attempted, the bridge should request
only a bounded recall projection shaped like:

```json
{
  "schemaVersion": 1,
  "action": "vcp_recall_no_write",
  "sourceSystem": "VCPToolBox",
  "sourceComponent": "LightMemo",
  "queryHashPresent": true,
  "queryTextIncluded": false,
  "principal": {
    "agentAlias": "Codex",
    "agentIdPresent": true,
    "projectIdPresent": true,
    "workspaceIdPresent": true,
    "clientIdPresent": true
  },
  "limits": {
    "maxSnippets": 3,
    "maxCharsPerSnippet": 500,
    "timeoutMs": 5000
  },
  "projection": {
    "lowDisclosure": true,
    "rawContentIncluded": false,
    "rawIdsIncluded": false,
    "rawPathsIncluded": false,
    "snippetBodiesAllowed": false,
    "summaryOnly": true
  },
  "counters": {
    "recordMemoryCalls": 0,
    "recordMemoryWrites": 0,
    "providerApiCalls": 0,
    "rawDailyNoteReads": 0,
    "broadMemoryScans": 0,
    "publicMcpExpansions": 0
  }
}
```

The first live candidate should prefer summary-only recall evidence. Raw memory
snippets should remain off until a separate source review proves low-disclosure
projection and operator approval explicitly allows that payload class.

## Forbidden Inputs And Outputs

Future integration must fail closed if any of these are requested or returned:

- raw DailyNote content
- raw diary history
- raw `RAGDiaryPlugin` injected context
- raw `KnowledgeBaseManager` rows
- raw `TDBKnowledge` content
- raw vector rows, embeddings, chunks, or cache entries
- raw prompts, conversations, model outputs, or chain-of-thought-like material
- raw workspace id, client id, agent id, token, endpoint, provider key, file
  path, private key, or full payload
- broad memory scan, export, import, migration, or backfill
- memory write or durable mutation under a no-write probe
- public MCP tool expansion
- production, release, cutover, or complete V8 readiness claim

Rejected output must report field names, counters, and reason codes only. It
must not echo forbidden values.

## Candidate Integration Stages

| Stage | Name | Allowed | Forbidden | Approval |
|---|---|---|---|---|
| 0 | Source map | Read local docs/source and record boundary | Runtime call, VCP call, config edit, raw data read | Current CM-1684 |
| 1 | Fixture contract | Synthetic VCP recall envelope and fail-closed tests | Live VCP, raw payloads, writes | No live approval needed |
| 2 | Local connector plan | Pure helper that builds a no-write request plan | Network call, process call, write | No live approval needed |
| 3 | Live no-write probe | One bounded reachability/recall-shape probe | Writes, raw broad reads, config edits | Exact approval required |
| 4 | Sustained read-only candidate | Bounded per-conversation recall injection candidate | Writes, raw sync, production default | Exact approval required |
| 5 | Bounded write proof | One explicit governed write receipt | Default-on write, broad sync | Separate exact approval required |

Stage 3 and later are runtime-sensitive. Fresh Git, explicit target runtime,
exact approval token, no-secret profile evidence, rollback/cleanup plan, and
post-action validation are required before execution.

## Sustained Conversation Safety Model

For ongoing Codex conversations, a future runtime candidate must enforce:

- no automatic broad memory scan at conversation start
- bounded query count per turn or task
- bounded snippet count and character budget
- low-disclosure recall projection
- no raw private payload unless separately approved
- no VCP memory write during read-only recall
- no Codex `record_memory` call unless separately exact-approved
- fail-closed on missing auth/profile/scope
- fail-closed on unknown VCP component or output shape
- visible receipt for every runtime call
- user-visible distinction between `codex-memory` recall and VCPToolBox recall

## Minimum Future Profile Fields

A future profile must use sanitized field names only in committed docs:

```text
VCP bridge endpoint reference
VCP bridge auth mode
VCP bridge allowed source components
VCP bridge allowed action list
VCP bridge no-write default
VCP bridge max snippets
VCP bridge max chars per snippet
VCP bridge timeout
VCP bridge principal scope mapping
VCP bridge low-disclosure projection mode
VCP bridge receipt output path or ledger target
```

Do not commit secret values, bearer tokens, endpoints with private credentials,
or local private memory paths.

## Stop Conditions

Stop before runtime work if:

- VCPToolBox entrypoint is unknown
- auth/profile source is unknown
- no-write behavior cannot be proven
- output shape may include raw memory content by default
- operator cannot identify the target VCPToolBox runtime
- requested action requires `.env`, `config.env`, startup/watchdog, or provider
  configuration changes
- requested action would read all DailyNote files or export memory
- requested action would write memory, mutate VCP state, or call
  `record_memory`
- approval token is missing, stale, ambiguous, or does not bind target/runtime

## Validation For CM-1684

CM-1684 validation is docs-only:

```text
git diff --check
docs/source consistency review
fresh git status before branch-sensitive follow-up
```

No `npm run gate:mainline` is required for this route recording because no
source runtime behavior, package script, fixture, or validation gate changed.

## Next Safe Step

Recommended next task:

```text
CM-1685 fixture-only VCP sustained recall envelope contract
```

It should define a synthetic request/result fixture for the no-write recall
envelope, fail-closed negative cases, and low-disclosure receipt shape. It must
not call VCPToolBox, MCP, providers, or `record_memory`.
