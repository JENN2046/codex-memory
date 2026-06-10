# CM-1548 TagMemo Minimal Schema / Tag Extraction Preflight

## Scope

CM-1548 prepares a minimal governable TagMemo / tag extraction schema proposal after the V8 deep recall lane activation.

This is docs/status/board preflight only. It does not implement tag extraction, change recall ranking, call providers or APIs, use bearer-token paths, run raw scans, execute confirmed mutation, expand public MCP tools, perform another effective `record_memory` write, release, tag, deploy, cut over, claim production/release/cutover readiness, or claim complete V8 implementation.

## Preflight Result

```text
CM-1548_RESULT: TAGMEMO_MINIMAL_SCHEMA_PREFLIGHT_RECORDED_DOCS_ONLY
schema_status: PROPOSED_NOT_IMPLEMENTED
tag_extraction_status: NOT_IMPLEMENTED
ranking_runtime_change: NO
provider_api_calls: 0
bearer_token_use: 0
raw_scan: 0
public_mcp_expansion: 0
confirmed_mutation: 0
production ready: NO
release ready: NO
cutover ready: NO
complete V8 implemented: NO
```

## Minimal Tag Record Proposal

The smallest useful TagMemo tag record should be stable enough for fixtures and future ranking compatibility without requiring runtime implementation now.

```json
{
  "schemaVersion": "tagmemo-minimal-tag-v1",
  "tagId": "tag:<stable-local-id>",
  "tagLabel": "normalized label",
  "tagSource": "explicit_record_tag",
  "confidenceScore": 0.75,
  "confidenceBucket": "medium",
  "evidenceSourceId": "evidence:<bounded-id>",
  "memoryId": "memory:<bounded-id>",
  "rankingCompatibility": {
    "mayContributeToTagMemoScore": true,
    "mayContributeToStructuralSignal": true,
    "runtimeWeightTuningApproved": false
  }
}
```

### Field Rules

| Field | Required | Rule |
|---|---:|---|
| `schemaVersion` | yes | Fixed to `tagmemo-minimal-tag-v1` for this proposal. |
| `tagId` | yes | Stable local identifier derived from bounded inputs; must not contain raw memory text, local paths, token material, provider/API details, or private audit data. |
| `tagLabel` | yes | Normalized human-readable label; trim whitespace, collapse repeated spaces, preserve meaning, and avoid embedding raw/private text. |
| `tagSource` | yes | One of `explicit_record_tag`, `query_core_tag`, `derived_candidate`, `fixture_expected`, or `operator_reviewed`. |
| `confidenceScore` | yes | Number from `0` to `1`; fixture validation should reject non-finite, negative, or above-one scores. |
| `confidenceBucket` | yes | Derived display bucket: `low`, `medium`, or `high`; public projection may expose bucket instead of exact score. |
| `evidenceSourceId` | yes | Bounded evidence reference id; must not be a filesystem path, raw audit id with private detail, raw content offset, provider id, or token-bearing value. |
| `memoryId` | yes | Bounded memory linkage id for authorized internal/fixture evaluation; public projection must follow selected projection rules before exposing it. |
| `rankingCompatibility` | yes | Future compatibility metadata only; it must not change ranking weights or runtime behavior in CM-1548. |

## Tag Extraction Input Contract

Allowed future fixture inputs:

- normalized fixture memory id
- sanitized title or bounded summary
- explicit tag list
- bounded query core tags
- selected projection metadata already allowed by existing tests
- source type label such as `title`, `explicit_tag`, `query_core`, or `bounded_summary`

Forbidden future fixture inputs:

```text
raw memory body
raw chat transcript
raw audit entry
raw JSONL record
SQLite row dump
local filesystem path
provider name or endpoint
API key or token material
Authorization or bearer header
private lifecycle detail
unbounded source text
```

## Tag Extraction Output Contract

The extractor output, when implemented in a later approved slice, should be a bounded array of proposed tag records:

```json
{
  "schemaVersion": "tagmemo-minimal-extraction-v1",
  "memoryId": "memory:<bounded-id>",
  "tags": [
    {
      "tagId": "tag:<stable-local-id>",
      "tagLabel": "normalized label",
      "tagSource": "derived_candidate",
      "confidenceScore": 0.82,
      "confidenceBucket": "high",
      "evidenceSourceId": "evidence:<bounded-id>",
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

CM-1548 does not implement this output. It records the target contract for fixture planning.

## Bounded Public Projection

Public or no-token projection must stay smaller than the internal fixture record.

Allowed public projection fields:

```text
schemaVersion
tagId
tagLabel
tagSource
confidenceBucket
memoryLinkagePresent
rankingCompatible
```

Conditional fields:

- `memoryId` may appear only when an existing selected projection and caller boundary already permits that linkage.
- `confidenceScore` should be rounded or bucketed unless a future test proves exact score disclosure is safe.
- `evidenceSourceId` should be omitted from public projection unless it is a synthetic bounded id with no path, audit, provider, token, or raw-content semantics.

Forbidden public projection fields:

```text
rawText
rawContent
content
snippet
sourceFile
fullPath
filePath
relativePath
provider
apiKey
token
authorization
bearer
rawAudit
rawJsonl
sqliteRow
vectorPayload
privateLifecycleState
```

## Future Ranking Compatibility

The minimal schema is designed to be compatible with future ranking without changing ranking now.

Future ranking may review:

- `tagLabel` overlap with query core tags
- `tagSource` trust tier
- `confidenceBucket` or rounded `confidenceScore`
- explicit vs derived tag distinction
- bounded evidence-source type
- memory linkage availability

Future ranking must not be changed until a separate source/test implementation task explicitly approves it. CM-1548 makes no runtime scoring or ordering change.

## Evidence / Fixture Plan

Recommended next testable slice:

```text
CM-1549 TagMemo minimal schema fixture contract
```

Fixture acceptance should cover:

1. Valid minimal tag records pass schema validation.
2. Invalid `tagId`, empty `tagLabel`, unsupported `tagSource`, and out-of-range `confidenceScore` fail closed.
3. Bounded public projection excludes forbidden raw/private fields.
4. Memory id linkage is present internally but only conditionally visible publicly.
5. Evidence source id rejects path-like, token-like, provider/API-like, raw-audit-like, and raw-content-like values.
6. Ranking compatibility metadata is recorded but cannot tune runtime weights.
7. Public MCP surface remains unchanged.

## Boundary Confirmation

```text
provider/API introduced: NO
bearer token introduced: NO
raw scan performed: NO
public MCP expansion: NO
confirmed mutation: NO
complex V8 algorithm implemented: NO
production/release/cutover ready claim: NO
complete V8 claim: NO
```
