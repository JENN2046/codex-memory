# CM-1685 VCP Sustained Recall Envelope Contract

Date: 2026-06-12

Status: `COMPLETED_VALIDATED_FIXTURE_ONLY_NO_RUNTIME_NO_WRITE`

## Purpose

CM-1685 turns the CM-1684 source-map route into a fixture-only contract for the
future VCPToolBox sustained-conversation recall envelope.

This task adds a pure helper, synthetic fixture, and contract tests. It does not
connect to VCPToolBox, call MCP, call `record_memory`, read VCP stores, read raw
memory content, edit VCP config/profile, edit `.env`, call providers, write
memory, or expand public MCP tools.

## Changed Files

- `src/core/VcpSustainedRecallEnvelopeContract.js`
- `tests/fixtures/vcp-sustained-recall-envelope-cm1685-v1.json`
- `tests/vcp-sustained-recall-envelope-contract.test.js`

## Contract

The accepted fixture shape is summary-only and no-write:

```text
schemaVersion=1
action=vcp_recall_no_write
sourceSystem=VCPToolBox
sourceComponent in allowed VCP memory components
queryHashPresent=true
queryTextIncluded=false
principal fields present
maxSnippets<=3
maxCharsPerSnippet<=500
timeoutMs<=5000
lowDisclosure=true
rawContentIncluded=false
rawIdsIncluded=false
rawPathsIncluded=false
snippetBodiesAllowed=false
summaryOnly=true
all runtime/write/provider/raw/broad/public-MCP/mutation counters are zero
```

Allowed source components are fixture vocabulary only:

```text
LightMemo
KnowledgeBaseManager
TDBKnowledge
DailyNoteManager
RAGDiaryPlugin
TagMemo
TagMemoEngine
DeepMemo
TopicMemo
MeshMemo
```

## Fail-Closed Coverage

The contract rejects:

- missing principal scope fields
- raw DailyNote/RAG/vector/prompt/content/id/path/token/provider/private-key fields
- positive `recordMemoryCalls` or `recordMemoryWrites`
- positive provider/API, raw read, broad scan, public MCP expansion, or mutation counters
- query text inclusion
- raw content/id/path/snippet body projection
- over-budget snippet, character, or timeout limits
- readiness claims by construction

Rejected output is low-disclosure. It reports field names, counter names, and
reason codes only, without echoing raw fixture values.

## Validation

Targeted validation:

```powershell
node --test tests\vcp-sustained-recall-envelope-contract.test.js
```

Expected result:

```text
7/7 pass
```

## Non-Claims

```text
runtime wiring: NO
live VCPToolBox call: NO
MCP call: NO
record_memory call: NO
VCP config/profile edit: NO
.env edit: NO
raw DailyNote/RAG/vector/prompt read: NO
broad scan/export/import: NO
memory write: NO
provider/API: NO
public MCP expansion: NO
production/release/cutover ready: NO
complete V8: NOT_CLAIMED
```

## Next Safe Step

Recommended next task:

```text
CM-1686 VCP sustained recall connector plan helper
```

That future task should remain pure planning/no-call unless a separate exact
approval is provided for a live no-write probe.
