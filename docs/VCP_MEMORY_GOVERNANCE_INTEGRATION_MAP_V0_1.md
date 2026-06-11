# VCP Memory Governance Integration Map v0.1

Date: 2026-06-11

Status: `DESIGN_RECORDED_DOCS_ONLY_NO_LIVE_NO_WRITE`

## Purpose

This document redefines the boundary between upstream VCP memory and
`codex-memory` governance.

The decision is:

```text
codex-memory must not replace VCP memory.
codex-memory should govern selected VCP memory events.
```

VCP memory remains the runtime memory system for VCP hot memory, cold knowledge,
active recall, and passive injection. `codex-memory` remains the controlled memory
governance kernel for audit, scope, authorization, correction, receipt, and safe
memory lifecycle decisions.

This document is design-only. It does not read VCP DailyNote files, does not
scan VCP stores, does not connect to a live VCP bridge, does not call MCP, does
not call `record_memory`, and does not expand the public MCP surface.

## Evidence Baseline

Local review sources:

- `docs/VCPToolBox_VCPChat_代码审查与向量模型迁移汇总.md`
- `docs/VCP_MEMORY_CORE_100_PERCENT_IMPLEMENTATION_PLAN.md`
- `docs/CM1645_VCP_BRIDGE_TRUSTED_CONTEXT_CONTRACT_PREFLIGHT.md`
- `docs/CM1646_VCP_BRIDGE_TRUSTED_CONTEXT_ADAPTER_SKELETON.md`
- `docs/CM1647_VCP_BRIDGE_SIGNED_STATIC_ALLOWLIST_PROOF_PREFLIGHT.md`
- `docs/CM1648_VCP_BRIDGE_EXACT_APPROVAL_GATE_DESIGN.md`
- `docs/CM1649_VCP_BRIDGE_LIVE_NO_WRITE_PROBE_DESIGN.md`

External public reference:

- <https://github.com/lioensky/VCPToolBox>

The external reference is used only as an upstream orientation anchor. CM-1650
does not clone, execute, or inspect private VCP runtime data.

## 1. VCP Memory Capability Inventory

VCP memory is the runtime owner for memory creation, storage, retrieval, and
injection. Its capabilities should stay in VCP unless an event needs governance.

| Area | VCP component | Capability | Integration stance |
|---|---|---|---|
| Hot memory | `DailyNote` | Conversation/day-level memory accumulation | VCP-owned runtime memory; do not bulk-sync |
| Hot memory | `KnowledgeBaseManager` | Main vector knowledge management, SQLite/vector indexes, search, rerank entry | VCP-owned retrieval/storage; sync governance events only |
| Hot memory | `TagMemo` / `TagMemoEngine` | Tag association, tag boost, semantic topology, geodesic rerank support | VCP-owned recall enhancer; sync bounded evidence/receipts only |
| Cold knowledge | `TDBKnowledge` | Cold knowledge base route | VCP-owned cold store; do not mirror raw content |
| Cold knowledge | `LightMemo` cold route | Directory/cold-route retrieval behavior | VCP-owned retrieval route; sync only boundary decisions/evidence |
| Active recall | `LightMemo` | Lightweight retrieval and directory strategy | VCP-owned active recall |
| Active recall | `DailyNoteManager` | Daily note recall and management | VCP-owned recall manager; no bulk DailyNote read |
| Active recall | `DeepMemo` | Deep/semantic recall behavior | VCP-owned recall behavior; codex-memory can record parity evidence |
| Active recall | `MeshMemo` | Mesh/association recall | VCP-owned recall behavior |
| Active recall | `TopicMemo` | Topic-oriented recall/list/get behavior | VCP-owned recall behavior; codex-memory can record compatibility evidence |
| Passive injection | `RAGDiaryPlugin` | Context injection and RAG diary orchestration | VCP-owned injection layer; sync only governance-relevant injection evidence |

## 2. codex-memory Governance Capability Inventory

`codex-memory` is the governance layer, not the replacement runtime.

| Governance capability | Current / intended codex-memory role |
|---|---|
| Controlled public memory tools | Public MCP surface remains seven tools; no expansion in this task |
| Write governance | `record_memory` authorization, scope, preflight, write receipts, idempotency, and audit |
| Read governance | Bounded low-disclosure recall/search/overview projection and audit |
| Mutation governance | Controlled dry-run validation/tombstone/supersede surfaces and confirmed-mutation gates |
| Principal/scope control | Default-off strict principal/scope context, trusted execution context, allowlist model |
| Bridge context governance | VCP Bridge trusted context adapter, proof preflight, exact approval gate, and no-write probe plan |
| Safety vocabulary | `docs-only`, `fixture-only`, `no-mutation`, `read-only`, `live-runtime` proof taxonomy |
| Receipt ledger | `.agent_board`, `CURRENT_FACTS.json`, validation log, and bounded receipts |
| Correction lifecycle | Future correction, tombstone, supersession, and memory proposal review |
| Low-disclosure outputs | Avoid raw ids/content/path/token/provider/secret/workspace/client/agent leakage |

## 3. Content That Should Not Be Synchronized

The bridge must not synchronize broad runtime memory content into codex-memory.

Do not sync:

- all `DailyNote` content
- all diary history
- all VCP hot memory records
- all cold knowledge records
- raw `TDBKnowledge` content
- raw `LightMemo` cold-route files
- raw vector rows, vector caches, chunk stores, or embeddings
- raw `RAGDiaryPlugin` injected context
- raw prompts, raw conversations, raw model outputs, or raw chain-of-thought-like material
- raw workspace id, client id, agent id, token, provider, endpoint, path, or private-key material
- full recall result payloads when only governance evidence is needed
- broad VCP memory scans, exports, imports, or migrations

Reason:

```text
VCP memory content is runtime memory.
codex-memory only needs governance events that change safety, authority, lifecycle, or evidence state.
```

## 4. Content That Must Be Synchronized

The bridge should synchronize governance-significant events, not memory bodies.

Must sync:

| Event class | Required event | Why codex-memory needs it |
|---|---|---|
| `governance memory event` | Memory write accepted/rejected decision with low-disclosure scope | Governs whether a write was authorized and why |
| `write receipt event` | Bounded write receipt counters and idempotency result | Supports audit and rollback reasoning |
| `memory correction event` | Tombstone/supersede/validation dry-run or exact confirmed mutation receipt | Governs lifecycle mutation safety |
| `safety boundary event` | Any blocked raw scan, broad scan, provider/API, token, public MCP expansion, or write attempt | Preserves hard-stop evidence |
| `agent decision event` | Agent chose to create/correct/suppress memory, with low-disclosure reason | Separates agent intent from runtime memory content |
| `recall evidence event` | Sanitized recall quality/shape evidence that influenced a memory decision | Explains why a memory was used without copying raw memory |
| `runtime memory event` | Minimal event envelope for VCP memory action category, target surface, and counters | Lets governance observe runtime memory flow without taking ownership |

Minimum required event fields:

```text
eventId
eventType
sourceSystem
sourceComponent
occurredAt
bridgeInstanceId
agentAlias
agentId_hash_or_alias_only
requestSource
projectId_hash_or_alias_only
workspaceId_hash_or_alias_only
clientId_hash_or_alias_only
decision
reasonCode
counters
lowDisclosure=true
rawContentIncluded=false
recordMemoryCalled=false unless separately exact-approved
publicMcpExpanded=false
```

## 5. Optional Synchronization

Optional sync is allowed only when bounded, low-disclosure, and useful for
governance. It must never become a covert broad memory scan.

Optional events:

- summarized recall ranking evidence
- TagMemo activation summary, without raw memory body
- EPA / residual / semantic-width style metrics as bounded numbers
- dedup/suppression reasons
- stale-memory detection hints
- query-quality fixture or benchmark evidence
- cold-route selected/not-selected reason codes
- operator review outcome for memory correction proposals
- bridge health/freshness proof metadata

Optional fields should be aggregated or hashed when possible.

## 6. VCP Bridge Minimal Event Model

The bridge should emit a small event envelope. It should not transform itself
into a memory migration tool.

```json
{
  "schemaVersion": 1,
  "eventId": "vcp-bridge-event-<nonce>",
  "eventType": "governance_memory_event",
  "sourceSystem": "VCPToolBox",
  "sourceComponent": "RAGDiaryPlugin",
  "occurredAt": "2026-06-11T00:00:00.000Z",
  "bridge": {
    "bridgeInstanceIdPresent": true,
    "requestSource": "vcp-bridge",
    "contextHashPresent": true,
    "allowlistHashPresent": true,
    "approvalReceiptIdPresent": true
  },
  "principal": {
    "agentAlias": "Codex",
    "agentIdPresent": true,
    "projectIdPresent": true,
    "workspaceIdPresent": true,
    "clientIdPresent": true
  },
  "decision": {
    "status": "accepted",
    "reasonCode": "bounded_governance_event",
    "lowDisclosure": true
  },
  "counters": {
    "rawDailyNoteReads": 0,
    "broadMemoryScans": 0,
    "rawContentIncluded": 0,
    "recordMemoryCalls": 0,
    "recordMemoryWrites": 0,
    "persistentTagWrites": 0,
    "providerApiCalls": 0,
    "publicMcpExpansions": 0,
    "confirmedMutations": 0
  }
}
```

Allowed event types:

```text
runtime_memory_event
governance_memory_event
recall_evidence_event
write_receipt_event
memory_correction_event
agent_decision_event
safety_boundary_event
```

## 7. What VCP Bridge Must Not Do

The bridge must not:

- replace VCP memory storage, retrieval, or injection
- mirror all VCP memory into codex-memory
- read all DailyNote files
- scan broad memory stores
- read raw vector/cache/sqlite/jsonl stores for governance events
- treat prompt/tool args as principal authority
- call `record_memory` without exact approval and trusted context
- execute live `record_memory` proof under no-write approval
- expose bearer-token material, provider secrets, private keys, paths, or raw identifiers
- expand public MCP tools or schemas
- enable production strict default
- claim production, release, cutover, or complete V8 readiness
- perform confirmed mutation without separate exact approval

## 8. Next-Stage Adapter Contract

The next adapter should be a governance-event adapter, not a memory-content
sync adapter.

Recommended name:

```text
VcpMemoryGovernanceEventAdapter
```

Input:

```text
bridgeRuntimeContext
bridgeStaticConfig
bridgeAllowlist
vcpMemoryEventEnvelope
proofPreflightResult
approvalGateResult
```

Output:

```text
accepted / rejected
eventType
governanceAction
lowDisclosureProjection
counters
requiredApprovals
forbiddenActions
rawContentIncluded=false
recordMemoryCalled=false by default
publicMcpExpanded=false
nextAllowedStep
```

Acceptance rules:

- event type must be one of the seven allowed categories
- bridge trusted context must be accepted
- signed/static proof must be accepted for bridge-owned context
- exact approval gate must match the event class
- raw content and broad scan counters must be zero
- `recordMemoryCalled` must be false unless the event is a separately exact-approved bounded write proof
- public MCP expansion must remain false
- output must stay low-disclosure

Recommended next tasks:

```text
CM-1651 VCP memory governance event adapter contract preflight
CM-1652 VCP memory governance event adapter fixture-only skeleton
CM-1653 VCP memory governance event receipt low-disclosure tests
```

## Non-Claims

```text
VCP memory replacement: NO
full DailyNote sync: NO
raw scan / broad scan: NO
live VCP proof: NO
real record_memory write: NO
provider/API: NO
bearer-token material: NO
public MCP expansion: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```

## Validation

CM-1650 validation should include:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

- `CURRENT_FACTS.json` parse ok
- public MCP surface count remains `7`
- changed-scope bad-claim scan passes
- changed-scope review passes
