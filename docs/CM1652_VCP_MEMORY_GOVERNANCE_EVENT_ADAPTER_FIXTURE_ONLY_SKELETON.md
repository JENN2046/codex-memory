# CM-1652 VCP Memory Governance Event Adapter Fixture-Only Skeleton

Date: 2026-06-11

Status: `IMPLEMENTED_FIXTURE_ONLY_NO_LIVE_NO_WRITE`

## Purpose

CM-1652 implements the fixture-only skeleton for the future
`VcpMemoryGovernanceEventAdapter` defined in CM-1651.

The adapter is a pure governance-event projection helper. It accepts a
low-disclosure event envelope only when bridge context, proof preflight, and
approval gate results are already accepted fixture/preflight inputs.

It is not wired into runtime. It does not connect to VCP, start a bridge, call
MCP, call `record_memory`, read VCP stores, read raw DailyNote, read raw RAG,
read raw vectors, read raw prompts, or expand public MCP tools.

## Source

```text
src/core/VcpMemoryGovernanceEventAdapter.js
```

Exported helper:

```text
buildVcpMemoryGovernanceEventAdapterResult(input)
```

Exported constants:

```text
ADAPTER_NAME
ADAPTER_MODE
ALLOWED_EVENT_TYPES
FORBIDDEN_RAW_FIELD_NAMES
RAW_CLASSIFICATION_FLAGS
ZERO_COUNTERS
ZERO_COUNTER_FIELDS
```

## Test

```text
tests/vcp-memory-governance-event-adapter.test.js
```

Targeted coverage:

- accepted low-disclosure governance event envelope passes
- raw DailyNote payload is rejected without echoing content
- raw RAG payload is rejected without echoing content
- raw vector payload is rejected without echoing content
- raw prompt payload is rejected without echoing content
- raw classification flags are rejected before projection
- positive broad scan counter is rejected
- `record_memory` call intent is rejected in fixture-only no-write mode
- live `record_memory` proof approval remains rejected by fixture-only adapter
- output counters stay zero
- only the seven CM-1650 governance event types are accepted
- public MCP surface remains seven tools

## Accepted Inputs

The helper accepts only:

```text
adapterResult
proofPreflightResult
approvalGateResult
vcpMemoryGovernanceEventEnvelope
```

The helper requires:

- accepted CM-1646-style adapter result
- accepted CM-1647-style proof preflight result
- accepted CM-1648-style approval gate result
- low-disclosure envelope
- supported schema version
- one of the seven CM-1650 event classes
- raw-content flags explicitly false
- raw/broad/provider/public-expansion/write/mutation counters zero
- `bridge.requestSource === "vcp-bridge"`

## Accepted Event Types

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

## Rejected Inputs

The helper rejects:

- non-plain input
- missing accepted adapter/proof/approval preflight result
- live write approval action
- unsupported schema
- unknown event type
- missing required envelope fields
- missing or false low-disclosure classification
- any raw-content flag that is not explicitly false
- prompt/tool/public payload authority
- raw DailyNote content/path/history
- raw RAG injected context
- raw vector rows/cache/chunk store/embeddings
- raw prompt/conversation/model output
- chain-of-thought-like material
- raw workspace/client/agent ids
- bearer token material
- provider/API key material
- private key material
- VCP store export payload
- bulk memory migration payload
- positive raw/broad/provider/public-expansion/write/mutation counters
- fixture-only `record_memory` call intent
- confirmed mutation intent
- public MCP expansion intent

## Low-Disclosure Output

Rejected output includes only:

```text
reasonCode
missingFields
forbiddenFields
forbiddenCounters
eventIdPresent
sourceSystem
sourceComponent
eventType
zero counters
```

Rejected output does not echo raw DailyNote, raw RAG, raw vector, raw prompt,
raw ids, paths, tokens, provider values, private keys, or private data.

Accepted output remains a projection only:

```text
accepted=true
adapterMode=fixture_only
governanceAction=accept_low_disclosure_event
recordMemoryCalled=false
providerApiCalled=false
publicMcpExpanded=false
rawContentIncluded=false
rawIdentifiersEchoed=false
nextAllowedStep=fixture_receipt_only
```

## Boundary Counters

The helper returns zero counters for:

```text
recordMemoryCalls
recordMemoryWrites
providerApiCalls
publicMcpExpansions
confirmedMutations
rawDailyNoteReads
rawRagPayloads
rawVectorReads
rawPromptReads
broadMemoryScans
```

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
runtime wiring: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```

## Validation

Executed:

```powershell
node --test tests\vcp-memory-governance-event-adapter.test.js
```

Required closeout validation:

```powershell
node --test tests\vcp-memory-governance-event-adapter.test.js
node --test tests\vcp-bridge-trusted-context-contract.test.js
node --test tests\vcp-bridge-trusted-context-proof-preflight.test.js
node --test tests\vcp-bridge-exact-approval-gate.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

- `CURRENT_FACTS.json` parse ok
- public MCP surface count remains `7`
- bad-claim scan passes
- changed-scope review passes
