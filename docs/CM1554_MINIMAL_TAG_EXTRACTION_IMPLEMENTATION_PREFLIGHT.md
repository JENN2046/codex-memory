# CM-1554 Minimal Deterministic Tag Extraction Source Implementation Preflight

## Scope

CM-1554 prepares the source implementation boundary for a future minimal deterministic tag extraction runtime slice.

This is docs/status/board preflight only. It does not implement runtime tag extraction, change recall ranking, call providers or APIs, use bearer-token paths, run live proof, perform raw scans, execute confirmed mutation, expand public MCP tools, perform another effective `record_memory` write, release, tag, deploy, cut over, claim production/release/cutover readiness, or claim complete V8 readiness.

## Preflight Result

```text
CM-1554_RESULT: MINIMAL_TAG_EXTRACTION_SOURCE_IMPLEMENTATION_PREFLIGHT_RECORDED
runtime implementation: NOT_STARTED
runtime tag extraction implementation: NOT_STARTED
deterministic only: YES
complete V8: NOT_CLAIMED
production ready: NO
release ready: NO
cutover ready: NO
public MCP expansion: NO
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
```

## Existing Source Context

Relevant current source surfaces:

| Surface | Current role | Preflight reading |
|---|---|---|
| `src/recall/TagMemoEngine.js` | Query-side TagMemo analysis and record scoring. | Existing TagMemo recall layer; avoid mixing write-time extraction into query scoring. |
| `src/recall/text.js` | Token/compact text helpers used by recall components. | Future implementation may reuse deterministic token/compact helpers if they fit the contract. |
| `tests/tag-extraction-deterministic-contract-fixture.test.js` | Fixture-only contract simulator for CM-1552. | Future source tests should port this behavior to production source without importing fixture-only helper logic blindly. |
| `tests/fixtures/tag-extraction-deterministic-contract-cm1552-v1.json` | Synthetic bounded contract baseline. | Future tests should keep this fixture as contract evidence and may add implementation-specific cases. |

No runtime source is changed in CM-1554.

## Candidate File Placement

Considered options:

| Option | Fit | Risk |
|---|---|---|
| `src/recall/TagExtraction.js` | Best fit with current four-layer architecture and existing `src/recall/TagMemoEngine.js`. | Keeps extraction near recall/tag semantics while remaining internal. |
| `src/tagmemo/tag-extraction.js` | Clear domain name, but introduces a new top-level source area. | Higher structure churn for a minimal slice. |
| `src/memory/tag-extraction.js` | Names write-time memory concern, but no existing `src/memory` layer is present. | Conflicts with current `src/core` / `src/storage` / `src/recall` / `src/adapters` map. |

Selected future candidate:

```text
src/recall/TagExtraction.js
```

This should remain an internal pure function module. It must not register a public MCP tool, mutate storage, call providers, or read raw stores.

## Proposed Module Contract

Future module export:

```js
function extractDeterministicTags(input, options = {}) {}

module.exports = {
  extractDeterministicTags
};
```

Input:

```js
{
  schemaVersion: 'tagmemo-deterministic-extraction-input-v1',
  memoryId: 'memory:<bounded-id>',
  boundedMemoryText: 'bounded selected or fixture text',
  metadataProjection: {
    title: 'bounded title',
    summary: 'bounded summary',
    explicitTags: ['existing tag'],
    queryCoreTags: ['query tag'],
    sourceKind: 'selected_projection'
  }
}
```

Output:

```js
{
  schemaVersion: 'tagmemo-deterministic-extraction-output-v1',
  memoryId: 'memory:<bounded-id>',
  tags: [
    {
      schemaVersion: 'tagmemo-minimal-tag-v1',
      tagId: 'tag:<stable-local-id>',
      tagLabel: 'normalized label',
      tagSource: 'derived_candidate',
      confidenceScore: 0.65,
      confidenceBucket: 'medium',
      evidenceSourceId: 'evidence:<bounded-id>',
      memoryId: 'memory:<bounded-id>',
      rankingCompatibility: {
        mayContributeToTagMemoScore: true,
        mayContributeToStructuralSignal: true,
        runtimeWeightTuningApproved: false
      }
    }
  ],
  rejected: false,
  lowDisclosure: true,
  mutated: false,
  providerCalls: 0,
  publicMcpExpansion: 0
}
```

## Deterministic Rules To Implement Later

Future implementation should satisfy the CM-1551 / CM-1552 baseline:

- accept only bounded memory text and bounded metadata projection;
- reject forbidden raw/private fields before candidate extraction;
- normalize tag labels deterministically by trimming, removing list markers, replacing separators, collapsing spaces, and lowercasing;
- merge duplicate normalized labels deterministically;
- use bounded stable ids that do not include raw text, paths, provider/API details, token material, raw audit ids, or raw store offsets;
- keep `confidenceScore` finite and within `0` through `1`;
- derive `confidenceBucket` from score thresholds;
- return empty-input and rejected-input results as low-disclosure outputs;
- strip or reject forbidden raw/private fields and unsafe values;
- keep `mutated=false`, `providerCalls=0`, and `publicMcpExpansion=0`.

## Test Plan For Future Implementation Slice

Recommended future test file:

```text
tests/tag-extraction-implementation.test.js
```

Minimum test cases:

1. deterministic output is stable for identical bounded input;
2. normalization collapses whitespace, case, underscores, hyphens, and list markers;
3. duplicate candidates merge by deterministic source-trust and score rules;
4. `confidenceScore` and `confidenceBucket` remain bounded and deterministic;
5. empty bounded input returns `tags=[]` with low-disclosure status;
6. missing or invalid `memoryId` fails closed without raw echo;
7. forbidden raw/private fields are rejected before extraction;
8. provider/API/token/bearer/path/raw-audit/raw-store-shaped values are rejected without echo;
9. output tags are compatible with `tagmemo-minimal-tag-v1`;
10. output reports no provider/API, no mutation, and no public MCP expansion.

Optional compatibility test:

```text
node --test tests\tag-extraction-deterministic-contract-fixture.test.js tests\tag-extraction-implementation.test.js
```

## Rollback Plan

For the future implementation slice:

- revert `src/recall/TagExtraction.js`;
- revert `tests/tag-extraction-implementation.test.js`;
- revert any docs/status/board updates for that implementation slice;
- do not delete or alter CM-1551 / CM-1552 / CM-1553 baseline evidence unless separately selected;
- do not touch runtime data, audit logs, memory stores, provider config, MCP registration, startup/watchdog settings, or release artifacts.

CM-1554 itself is docs/status/board-only and rolls back by reverting this document plus status/board/current-facts edits.

## Hard Stops For Future Slice

Do not cross these boundaries without separate exact approval:

```text
provider/API
bearer token
raw scan
live proof
confirmed mutation
public MCP expansion
second effective record_memory write
release/tag/deploy
production/release/cutover ready claim
complete V8 ready claim
runtime ranking tuning
storage mutation
startup/watchdog/config change
```

## Boundary Confirmation

```text
runtime implementation: NOT_STARTED
runtime tag extraction implementation: NOT_STARTED
deterministic only: YES
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
live proof: NOT_RUN
confirmed mutation: NOT_EXECUTED
public MCP expansion: NOT_PERFORMED
second effective record_memory write: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```
