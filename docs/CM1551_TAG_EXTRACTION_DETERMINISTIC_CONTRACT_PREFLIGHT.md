# CM-1551 Tag Extraction Deterministic Contract Preflight

## Scope

CM-1551 defines a deterministic, testable, low-disclosure tag extraction contract for the V8 deep recall / TagMemo lane.

This is docs/status/board preflight only. It does not implement tag extraction, change recall ranking, call providers or APIs, use bearer-token paths, run live proof, perform raw scans, execute confirmed mutation, expand public MCP tools, perform another effective `record_memory` write, release, tag, deploy, cut over, claim production/release/cutover readiness, or claim complete V8 readiness.

## Preflight Result

```text
CM-1551_RESULT: TAG_EXTRACTION_DETERMINISTIC_CONTRACT_PREFLIGHT_RECORDED_DOCS_ONLY
deterministic contract only: YES
tag extraction implementation: NOT_STARTED
TagMemo minimal schema compatibility: REQUIRED
complete V8: NOT_CLAIMED
production ready: NO
release ready: NO
cutover ready: NO
public MCP surface expanded: NO
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
```

## Input Contract

The future deterministic extractor should accept only a bounded memory projection that is already permitted by fixture or selected-projection rules.

```json
{
  "schemaVersion": "tagmemo-deterministic-extraction-input-v1",
  "memoryId": "memory:<bounded-id>",
  "boundedMemoryText": "short bounded fixture or selected projection text",
  "metadataProjection": {
    "title": "bounded title",
    "summary": "bounded summary",
    "explicitTags": ["existing tag"],
    "queryCoreTags": ["query tag"],
    "sourceKind": "fixture"
  }
}
```

Allowed input fields:

- `memoryId`: bounded linkage id; not a filesystem path, raw audit id, provider id, token-bearing value, or raw store key.
- `boundedMemoryText`: short fixture or selected-projection text that is safe for tests; not a raw body, transcript, JSONL row, SQLite row, vector payload, or audit record.
- `metadataProjection.title`: bounded title string.
- `metadataProjection.summary`: bounded summary string.
- `metadataProjection.explicitTags`: bounded operator- or fixture-provided labels.
- `metadataProjection.queryCoreTags`: bounded query-core labels already allowed by selected projection rules.
- `metadataProjection.sourceKind`: one of `fixture`, `selected_projection`, `explicit_record_tag`, `query_core`, or `operator_reviewed`.

Forbidden input fields:

```text
rawText
rawContent
content
rawBody
transcript
rawAudit
rawJsonl
sqliteRow
vectorPayload
candidateCachePayload
sourceFile
fullPath
filePath
relativePath
provider
apiKey
token
authorization
bearer
privateLifecycleState
```

## Output Contract

The future extractor output should be compatible with the CM-1548 / CM-1549 TagMemo minimal schema.

```json
{
  "schemaVersion": "tagmemo-deterministic-extraction-output-v1",
  "memoryId": "memory:<bounded-id>",
  "tags": [
    {
      "schemaVersion": "tagmemo-minimal-tag-v1",
      "tagId": "tag:<stable-local-id>",
      "tagLabel": "normalized label",
      "tagSource": "derived_candidate",
      "confidenceScore": 0.7,
      "confidenceBucket": "medium",
      "evidenceSourceId": "evidence:<bounded-id>",
      "memoryId": "memory:<bounded-id>",
      "rankingCompatibility": {
        "mayContributeToTagMemoScore": true,
        "mayContributeToStructuralSignal": true,
        "runtimeWeightTuningApproved": false
      }
    }
  ],
  "mutated": false,
  "providerCalls": 0,
  "publicMcpExpansion": 0
}
```

Output requirements:

- `tags` must be an array, deterministic for identical bounded inputs.
- Each tag must include `tagId`, `tagLabel`, `tagSource`, `confidenceScore`, `confidenceBucket`, `evidenceSourceId`, and `memoryId`.
- `tagSource` must be one of `explicit_record_tag`, `query_core_tag`, `derived_candidate`, `fixture_expected`, or `operator_reviewed`.
- `confidenceScore` must be finite and within `0` through `1`.
- `confidenceBucket` must be derived from `confidenceScore`; recommended thresholds are `low < 0.5`, `medium >= 0.5 and < 0.8`, and `high >= 0.8`.
- `mutated` must remain `false` for deterministic extraction contract tests.
- `providerCalls` must remain `0`.
- `publicMcpExpansion` must remain `0`.

## Deterministic Normalization Rules

The future deterministic extractor should normalize tag labels before deduplication:

1. Trim leading and trailing whitespace.
2. Collapse repeated internal whitespace to one space.
3. Lowercase ASCII letters.
4. Convert underscores and hyphens used as separators to spaces.
5. Remove leading marker characters used only for list formatting.
6. Reject empty labels after normalization.
7. Reject labels that contain path-like, provider/API-like, bearer-token-like, raw-audit-like, or raw-store-like content.

The normalized label is the canonical comparison key. Display labels may later use a title-case presentation layer, but that presentation must not change the deterministic comparison key.

## Duplicate Tag Handling

Duplicate handling must be deterministic:

- Tags with the same normalized `tagLabel` and `memoryId` collapse into one tag.
- If duplicate candidates have different `tagSource` values, retain the highest-trust source by this order: `explicit_record_tag`, `operator_reviewed`, `fixture_expected`, `query_core_tag`, `derived_candidate`.
- If duplicate candidates have different `confidenceScore` values, retain the highest score after applying the source rule.
- Sort final tags by normalized label, then by `tagSource`, then by `tagId`.
- Do not preserve input order as a hidden ranking signal.

## Stable Id Rules

`tagId` and `evidenceSourceId` must be stable without leaking raw/private material.

Recommended contract:

```text
tagId = tag:<normalized-label-slug>:<bounded-stable-suffix>
evidenceSourceId = evidence:<memoryId-safe-fragment>:<sourceKind>
```

The stable suffix may be derived from bounded ids, normalized label, and tag source. It must not include raw memory text, raw content snippets, local paths, token material, provider/API details, raw audit ids, raw store offsets, or private lifecycle state.

## Confidence Score Rule

The contract should avoid model confidence and provider confidence in this deterministic lane.

Recommended deterministic source tiers:

| Source | Default Score | Bucket |
|---|---:|---|
| `explicit_record_tag` | 0.95 | high |
| `operator_reviewed` | 0.9 | high |
| `fixture_expected` | 0.85 | high |
| `query_core_tag` | 0.75 | medium |
| `derived_candidate` | 0.65 | medium |

Any later implementation may refine these values only in a separate approved source/test slice. CM-1551 records the contract; it does not implement scoring.

## Rejection And Empty-Input Behavior

The future contract tests should require fail-closed behavior:

- Missing `memoryId` returns an empty tag list with a low-disclosure rejection reason.
- Empty bounded text and empty metadata return an empty tag list, not an error that exposes private state.
- Unsupported `sourceKind` returns an empty tag list or validation failure with low-disclosure wording.
- Forbidden raw/private fields cause rejection before candidate extraction.
- Token-like, bearer-like, provider/API-like, path-like, raw-audit-like, raw-store-like, or lifecycle-like values are rejected.
- Rejection evidence must not echo the offending raw value.

## Bounded Projection Compatibility

Internal fixture outputs may include `memoryId`, `confidenceScore`, and `evidenceSourceId` when bounded.

Public or no-token projection should expose only:

```text
schemaVersion
tagId
tagLabel
tagSource
confidenceBucket
memoryLinkagePresent
rankingCompatible
```

Public projection must not expose bounded memory text, exact evidence ids unless separately proven safe, raw/private fields, provider/API details, bearer-token material, path-like values, raw audit data, raw store data, lifecycle state, or hidden ranking internals.

## Fixture Plan

Recommended next testable slice:

```text
CM-1552 tag extraction deterministic contract fixture/test coverage
```

Fixture acceptance should cover:

1. Identical bounded inputs produce identical tag arrays.
2. Normalization collapses whitespace, case, underscore, and hyphen variants.
3. Duplicate labels collapse deterministically.
4. Confidence scores and buckets follow the documented source tiers.
5. Empty input returns an empty tag list without private detail.
6. Forbidden raw/private fields fail closed.
7. Path-like, provider/API-like, token-like, bearer-like, raw-audit-like, and raw-store-like values are rejected without echoing values.
8. Bounded public projection excludes forbidden fields.
9. Public MCP surface remains unchanged.

## Boundary Confirmation

```text
tag extraction implementation: NOT_STARTED
deterministic contract only: YES
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
live proof: NOT_RUN
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_PERFORMED
second effective record_memory write: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```
