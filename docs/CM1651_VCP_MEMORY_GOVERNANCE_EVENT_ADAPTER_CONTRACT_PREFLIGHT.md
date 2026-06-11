# CM-1651 VCP Memory Governance Event Adapter Contract Preflight

Date: 2026-06-11

Status: `CONTRACT_RECORDED_DOCS_ONLY_NO_LIVE_NO_WRITE`

## Purpose

CM-1651 defines the contract for a future `VcpMemoryGovernanceEventAdapter`.

The adapter is not a VCP memory replacement and not a memory-content sync tool.
It accepts only a low-disclosure governance event envelope from a future bridge
and converts that envelope into a governance-ready projection for codex-memory.

This task is docs-only. It does not connect to VCP, does not execute a live
bridge probe, does not call MCP, does not call `record_memory`, does not inspect
raw VCP stores, and does not expand the public MCP surface.

## Position In The CM-1650 Map

CM-1650 selected this next route:

```text
CM-1651 VCP memory governance event adapter contract preflight
CM-1652 VCP memory governance event adapter fixture-only skeleton
CM-1653 VCP memory governance event receipt low-disclosure tests
```

CM-1651 records the contract only. CM-1652 may later add a fixture-only pure
helper. CM-1653 may later harden low-disclosure receipt tests. None of those
steps authorizes live VCP proof, broad VCP memory scan, or real memory write.

## Adapter Name

```text
VcpMemoryGovernanceEventAdapter
```

## Adapter Role

The adapter should answer one question:

```text
Is this VCP memory event safe, bounded, low-disclosure, and governance-relevant
enough for codex-memory to record or reason about?
```

It should not answer:

```text
What is inside VCP memory?
Can codex-memory mirror VCP memory?
Can codex-memory replace VCP retrieval/injection?
Can this event trigger a real record_memory write?
```

## Allowed Input Authority

The adapter may accept only these inputs:

```text
bridgeRuntimeContext
bridgeStaticConfig
bridgeAllowlist
vcpMemoryGovernanceEventEnvelope
proofPreflightResult
approvalGateResult
```

Allowed authority sources:

| Input | Authority boundary |
|---|---|
| `bridgeRuntimeContext` | Bridge-owned runtime context only |
| `bridgeStaticConfig` | Operator-owned static config only |
| `bridgeAllowlist` | Static allowlist / allowlist hash evidence only |
| `vcpMemoryGovernanceEventEnvelope` | Low-disclosure event envelope only |
| `proofPreflightResult` | Accepted fixture/live preflight result only when separately available |
| `approvalGateResult` | Exact approval gate result only; never inferred from prompt |

The adapter must not use prompt text, public tool args, VCP tool payload identity,
or raw runtime memory content as authority.

## Required Envelope Shape

The envelope must be low-disclosure by construction.

```json
{
  "schemaVersion": 1,
  "eventId": "vcp-governance-event-<nonce>",
  "eventType": "governance_memory_event",
  "sourceSystem": "VCPToolBox",
  "sourceComponent": "RAGDiaryPlugin",
  "occurredAt": "2026-06-11T00:00:00.000Z",
  "classification": {
    "lowDisclosure": true,
    "rawContentIncluded": false,
    "rawDailyNoteIncluded": false,
    "rawRagIncluded": false,
    "rawVectorIncluded": false,
    "rawPromptIncluded": false
  },
  "bridge": {
    "requestSource": "vcp-bridge",
    "bridgeInstanceIdPresent": true,
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
    "reasonCode": "bounded_governance_event"
  },
  "counters": {
    "rawDailyNoteReads": 0,
    "rawRagPayloads": 0,
    "rawVectorReads": 0,
    "rawPromptReads": 0,
    "broadMemoryScans": 0,
    "recordMemoryCalls": 0,
    "recordMemoryWrites": 0,
    "providerApiCalls": 0,
    "publicMcpExpansions": 0,
    "confirmedMutations": 0
  }
}
```

## Allowed Event Types

The adapter may accept only the seven CM-1650 event classes:

```text
runtime_memory_event
governance_memory_event
recall_evidence_event
write_receipt_event
memory_correction_event
agent_decision_event
safety_boundary_event
```

Unknown event types fail closed.

## Explicitly Forbidden Input Families

The adapter must reject any envelope containing or claiming authority from:

```text
raw DailyNote content
raw DailyNote file paths
raw diary history
raw RAG injected context
raw vector rows
raw vector cache
raw chunk store content
raw embeddings
raw prompt
raw conversation transcript
raw model output
chain-of-thought-like material
raw workspaceId
raw clientId
raw agentId
bearer token material
provider/API key material
private key material
VCP store export payload
bulk memory migration payload
```

The adapter should also reject positive counters for raw/broad activity:

```text
rawDailyNoteReads > 0
rawRagPayloads > 0
rawVectorReads > 0
rawPromptReads > 0
broadMemoryScans > 0
providerApiCalls > 0
publicMcpExpansions > 0
```

## Acceptance Rules

An event is accepted only when all are true:

1. Envelope is a plain object with supported `schemaVersion`.
2. `eventType` is one of the seven allowed event classes.
3. `classification.lowDisclosure === true`.
4. Raw-content flags are explicitly false.
5. Raw/broad/provider/public-expansion counters are zero.
6. Bridge request source is `vcp-bridge`.
7. Bridge trusted context is accepted or explicitly deferred for docs-only preflight.
8. Proof preflight is accepted when the event claims bridge-owned context proof.
9. Approval gate result matches the requested event class when approval is required.
10. Output can be rendered without raw ids, raw content, paths, secrets, provider values, or prompt text.

## Event Class Policy

| Event type | Accepted governance meaning | Approval need |
|---|---|---|
| `runtime_memory_event` | Bounded runtime memory action category and counters | No live action; event-only |
| `governance_memory_event` | Accepted/rejected memory governance decision | Approval only if it implies future write |
| `recall_evidence_event` | Sanitized recall-shape evidence used for a decision | No raw recall payload |
| `write_receipt_event` | Bounded write receipt metadata | Exact approval if tied to live write proof |
| `memory_correction_event` | Dry-run correction/tombstone/supersede receipt | Exact approval for confirmed mutation only |
| `agent_decision_event` | Low-disclosure agent intent or suppression decision | Event-only unless it requests write |
| `safety_boundary_event` | Blocked unsafe action receipt | Event-only; must preserve zero side effects |

## Output Shape

```json
{
  "accepted": false,
  "eventType": "governance_memory_event",
  "governanceAction": "reject",
  "reasonCode": "raw_content_not_allowed",
  "lowDisclosureProjection": {
    "eventIdPresent": true,
    "sourceSystem": "VCPToolBox",
    "sourceComponent": "RAGDiaryPlugin",
    "rawContentIncluded": false,
    "rawIdentifiersEchoed": false
  },
  "missingFields": [],
  "forbiddenFields": ["classification.rawDailyNoteIncluded"],
  "forbiddenCounters": [],
  "counters": {
    "recordMemoryCalls": 0,
    "recordMemoryWrites": 0,
    "providerApiCalls": 0,
    "publicMcpExpansions": 0,
    "confirmedMutations": 0
  },
  "recordMemoryCalled": false,
  "publicMcpExpanded": false,
  "nextAllowedStep": "fix_envelope_or_stop"
}
```

Rejected output must remain low-disclosure. It must not echo raw DailyNote,
raw RAG, raw vector, raw prompt, raw ids, paths, tokens, provider values, or
private data.

## Fail-Closed Conditions

Fail closed when:

- envelope is missing or not a plain object
- unsupported `schemaVersion`
- unknown `eventType`
- missing `eventId`, `sourceSystem`, `sourceComponent`, or `occurredAt`
- `classification.lowDisclosure` is not true
- any raw-content flag is true
- raw/broad/provider/public-expansion counter is positive
- event requests `record_memory` under no-write approval
- event requests confirmed mutation without exact confirmed-mutation approval
- event claims production strict default enablement
- event claims production, release, cutover, or complete V8 readiness
- prompt/tool args are used as authority
- output would need to echo raw values to explain rejection

## What The Adapter Must Not Do

The adapter must not:

- connect to real VCP
- start `VCPBridgeServer`
- call MCP
- call `record_memory`
- read all DailyNote files
- sync all diary history
- inspect raw `RAGDiaryPlugin` injected context
- inspect raw vector rows, vector cache, chunk store, or embeddings
- inspect raw prompts or raw conversation transcripts
- execute provider/API calls
- accept bearer-token material
- perform raw scan or broad scan
- expand public MCP tools or schemas
- enable strict production default
- claim production/release/cutover readiness
- claim complete V8

## CM-1652 Fixture-Only Skeleton Requirements

If CM-1652 implements a helper, it should be:

```text
pure function
fixture-only
default-off
no network
no VCP runtime call
no MCP call
no record_memory call
no provider/API call
no raw store read
no public MCP expansion
```

Suggested function:

```text
buildVcpMemoryGovernanceEventAdapterResult(input)
```

Suggested file:

```text
src/core/VcpMemoryGovernanceEventAdapter.js
```

## CM-1653 Low-Disclosure Test Requirements

CM-1653 should prove:

- accepted low-disclosure event envelope passes
- raw DailyNote payload is rejected without echoing content
- raw RAG payload is rejected without echoing content
- raw vector payload is rejected without echoing content
- raw prompt payload is rejected without echoing content
- positive broad scan counter is rejected
- no-write approval rejects `record_memory` call intent
- output counters stay zero
- public MCP surface remains seven tools

## Non-Claims

```text
VCP memory replacement: NO
full DailyNote sync: NO
all DailyNote read: NO
raw RAG sync: NO
raw vector sync: NO
raw prompt sync: NO
live VCP proof: NO
live MCP proof: NO
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

CM-1651 validation should include:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

- `CURRENT_FACTS.json` parse ok
- public MCP surface count remains `7`
- bad-claim scan passes
- changed-scope review passes
