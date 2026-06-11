# CM-1654 VCP Memory Governance Runtime Wiring Preflight Design

Date: 2026-06-11

Status: `PREFLIGHT_DESIGN_DOCS_ONLY_NO_RUNTIME_WIRING`

## Purpose

CM-1654 defines the future runtime wiring boundary for
`VcpMemoryGovernanceEventAdapter`.

The future runtime wiring goal is not to let VCP write memory directly into
`codex-memory`. The goal is to let `VCPBridgeServer` or another VCP runtime
submit a low-disclosure governance event envelope when a governance-relevant
memory event happens.

```text
VCP memory content does not enter codex-memory.
VCP memory governance events may enter codex-memory after bounded checks.
```

This task is docs-only. It does not add code wiring, execute runtime calls, call
MCP, call VCP, call `record_memory`, read VCP stores, read raw memory content,
or expand public MCP tools.

## Current Baseline

```text
CM-1651: governance event adapter contract preflight CLOSED
CM-1652: fixture-only adapter skeleton CLOSED
CM-1653: low-disclosure receipt tests CLOSED
```

Current implementation remains fixture/test only. Runtime wiring is not
implemented.

## Minimum Future Runtime Entrypoint

Future runtime wiring may expose only one narrow entrypoint:

```text
VcpMemoryGovernanceEventAdapter.handleGovernanceEvent(envelope, context)
```

Equivalent pure-function wrapper:

```text
buildVcpMemoryGovernanceEventAdapterResult({
  adapterResult,
  proofPreflightResult,
  approvalGateResult,
  vcpMemoryGovernanceEventEnvelope
})
```

The runtime-facing wrapper must not become a public MCP tool. It must not accept
raw memory content. It must not call `record_memory` under no-write approval.

## Allowed Runtime Inputs

Future runtime wiring may pass only:

```text
bridgeRuntimeContext
bridgeStaticConfig
bridgeAllowlist
proofPreflightResult
approvalGateResult
vcpMemoryGovernanceEventEnvelope
```

Allowed authority sources:

| Input | Authority boundary |
|---|---|
| `bridgeRuntimeContext` | Bridge-owned runtime context only |
| `bridgeStaticConfig` | Operator-owned static bridge config only |
| `bridgeAllowlist` | Static allowlist evidence only |
| `proofPreflightResult` | Accepted proof preflight result only |
| `approvalGateResult` | Exact approval gate result only |
| `vcpMemoryGovernanceEventEnvelope` | Low-disclosure governance event envelope only |

## Forbidden Runtime Inputs

Future runtime wiring must reject or refuse to accept:

```text
raw DailyNote
raw RAG payload
raw vector row
raw embedding
raw prompt
raw conversation transcript
raw model output
raw workspace/client/agent id
raw DailyNote path
bearer token
provider/API key
private key
full VCP payload
bulk memory migration payload
```

Prompt text, public tool args, VCP tool payload identity, or raw runtime memory
content must never be used as authority.

## Allowed Event Types

Only the seven CM-1650 event classes are allowed:

```text
runtime_memory_event
governance_memory_event
recall_evidence_event
write_receipt_event
memory_correction_event
agent_decision_event
safety_boundary_event
```

Unknown event types must fail closed.

## Runtime Wiring Stages

| Stage | Name | Allowed | Forbidden | Status |
|---|---|---|---|---|
| 0 | Docs-only preflight | Design boundary and validation matrix | Code wiring, live bridge, runtime call, `record_memory` | Current CM-1654 stage |
| 1 | Fixture-only adapter invocation | Tests invoke adapter with fixture envelope | Runtime source, MCP, write, provider/API | Already covered by CM-1652/CM-1653 |
| 2 | Local no-write dry-run wiring | Local process event envelope, low-disclosure receipt, zero write counters | `record_memory`, provider/API, raw store read | Future separate task |
| 3 | Live bridge no-write probe | Bridge reachability design/probe, accepted context/proof/approval, zero side-effect receipt | Memory write, broad scan, raw payload sync | Future exact approval required |
| 4 | Exact-approved bounded write proof | One bounded proof only after separate approval | Production default, broad write, unbounded mutation | Future separate approval-bound task |

Stage 2 must return adapter result only. Stage 3 must not write memory. Stage 4
is out of scope for CM-1654.

## Fail-Closed Conditions

Future runtime wiring must reject when any condition is true:

```text
adapterResult.accepted !== true
proofPreflightResult.accepted !== true
approvalGateResult.accepted !== true
event envelope missing
unknown event type
classification.lowDisclosure !== true
raw-content flag is true
positive raw/broad/provider/public-expansion counter
recordMemoryCalls > 0 under no-write approval
recordMemoryWrites > 0 unless exact live-write approval
confirmedMutations > 0 without exact confirmed-mutation approval
prompt/tool args used as authority
raw ids or raw paths included
bearer token or provider key included
private key included
production/release/cutover/complete V8 claim included
```

Rejected output must be low-disclosure and must not echo the forbidden values.

## Output Contract

Future runtime wiring output must stay within this low-disclosure projection:

```text
accepted
eventType
governanceAction
reasonCode
lowDisclosureProjection
missingFields
forbiddenFields
forbiddenCounters
counters
recordMemoryCalled=false
publicMcpExpanded=false
providerApiCalled=false
nextAllowedStep
```

The output must not include:

```text
raw content
raw DailyNote path
raw vector rows
raw prompt
raw workspace/client/agent id
token value
provider value
private key
full VCP payload
full recall result
```

## Future Runtime Wrapper Requirements

If a future helper is added, it should be a pure plan/helper only until a
separate runtime task authorizes wiring.

Allowed future helper shape:

```text
runtimeWiringPlanned: true
runtimeWiringExecuted: false
liveVcpCalled: false
mcpCalled: false
recordMemoryCalled: false
providerApiCalled: false
rawStoreRead: false
publicMcpExpanded: false
```

The helper must produce a plan or adapter result only. It must not connect to
VCP, call MCP, call `record_memory`, call provider/API, read raw stores, or
expand public MCP tools.

## Future Validation Matrix

If a Stage 2 plan helper is implemented later, validation should cover:

| Case | Expected result |
|---|---|
| accepted low-disclosure event planned for local no-write wiring | accepted plan, no runtime execution |
| raw DailyNote event | rejected low-disclosure |
| raw RAG event | rejected low-disclosure |
| raw vector event | rejected low-disclosure |
| raw prompt event | rejected low-disclosure |
| positive `recordMemoryCalls` under no-write | rejected |
| live write approval in preflight design | rejected unless exact later task |
| provider/API intent | rejected |
| public MCP expansion intent | rejected |
| production ready claim | rejected |
| forbidden raw values | not echoed |
| public MCP surface | remains seven tools |

## Required Evidence Before Runtime Wiring

Before any real runtime wiring can be claimed, a future task must provide:

```text
accepted bridge trusted context evidence
accepted proof preflight evidence
accepted approval gate evidence
low-disclosure event envelope fixtures
no-write receipt counters
public MCP surface count = 7
bad-claim scan
changed-scope review
explicit statement that record_memory was not called
explicit statement that raw stores were not read
```

Live bridge no-write proof and bounded write proof remain separate
approval-bound stages.

## Non-Claims

```text
runtime wiring complete: NO
runtime wiring executed: NO
live VCP proof complete: NO
live MCP proof complete: NO
record_memory write proof complete: NO
provider/API: NO
raw DailyNote/RAG/vector/prompt sync: NO
public MCP expansion: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```

## Validation

Closeout validation for CM-1654:

```powershell
git diff --check
git diff --cached --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

- `CURRENT_FACTS.json` parse ok
- public MCP surface count remains `7`
- bad-claim scan passes
- changed-scope review passes
