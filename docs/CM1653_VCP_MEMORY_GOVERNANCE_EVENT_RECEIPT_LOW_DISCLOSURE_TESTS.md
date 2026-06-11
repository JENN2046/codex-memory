# CM-1653 VCP Memory Governance Event Receipt Low-Disclosure Tests

Date: 2026-06-11

Status: `IMPLEMENTED_TEST_ONLY_NO_RUNTIME_WIRING`

## Purpose

CM-1653 adds focused low-disclosure receipt regression tests for the fixture-only
`VcpMemoryGovernanceEventAdapter` introduced in CM-1652.

This slice does not add runtime wiring. It does not connect to VCP, start a
bridge, call MCP, call `record_memory`, read VCP stores, read raw DailyNote,
read raw RAG, read raw vectors, read raw prompts, or expand public MCP tools.

## Test

```text
tests/vcp-memory-governance-event-receipt-low-disclosure.test.js
```

The test file calls the existing pure helper:

```text
buildVcpMemoryGovernanceEventAdapterResult(input)
```

## Coverage

The tests assert:

- raw DailyNote content is not echoed in rejected receipt output
- raw RAG injected context is not echoed in rejected receipt output
- raw vector rows are not echoed in rejected receipt output
- raw prompt text is not echoed in rejected receipt output
- raw workspace id values are not echoed
- raw DailyNote paths are not echoed
- bearer token values are not echoed
- provider/API key values are not echoed
- private key values are not echoed
- `forbiddenFields` contains only field names or dotted paths
- `forbiddenCounters` contains only counter names
- output counters remain zero
- accepted projection contains only low-disclosure fields
- accepted and rejected receipts keep `recordMemoryCalled=false`
- accepted and rejected receipts keep `publicMcpExpanded=false`
- public MCP surface remains seven tools

## Accepted Projection Shape

Accepted `lowDisclosureProjection` is limited to:

```text
eventIdPresent
sourceSystem
sourceComponent
eventType
rawContentIncluded
rawIdentifiersEchoed
```

It does not include raw content, raw ids, raw paths, token values, provider
values, prompt text, vector rows, DailyNote content, or RAG payloads.

## Rejected Receipt Shape

Rejected receipts may include:

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

Rejected receipts must not echo the forbidden input values.

## Non-Claims

```text
runtime wiring: NO
live VCP proof: NO
live MCP proof: NO
real record_memory write: NO
provider/API: NO
bearer-token material accepted: NO
raw DailyNote read: NO
raw RAG sync: NO
raw vector sync: NO
raw prompt sync: NO
public MCP expansion: NO
production ready: NO
release ready: NO
cutover ready: NO
complete V8: NOT_CLAIMED
```

## Validation

Executed:

```powershell
node --test tests\vcp-memory-governance-event-receipt-low-disclosure.test.js
```

Closeout validation:

```powershell
node --test tests\vcp-memory-governance-event-receipt-low-disclosure.test.js
node --test tests\vcp-memory-governance-event-adapter.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Additional checks:

- `CURRENT_FACTS.json` parse ok
- public MCP surface count remains `7`
- bad-claim scan passes
- changed-scope review passes
