# CM-1555 Deterministic TagMemo Tag Extraction Core

## Scope

CM-1555 adds the minimal deterministic TagMemo tag extraction internal pure-function module and source-level unit tests.

This is source/test implementation only. It does not register or call a public MCP tool, connect runtime write or recall flows, mutate storage, call providers or APIs, use bearer-token paths, run live proof, perform raw scans, execute confirmed mutation, perform another effective `record_memory` write, release, tag, deploy, cut over, claim production/release/cutover readiness, or claim complete V8 readiness.

## Implementation Result

```text
CM-1555_RESULT: DETERMINISTIC_TAGMEMO_TAG_EXTRACTION_CORE_ADDED
module: src/tagmemo/tag-extraction.js
test: tests/tagmemo-tag-extraction.test.js
runtime integration: NOT_STARTED
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

## Route Adjustment

CM-1554 selected `src/recall/TagExtraction.js` as the future candidate. CM-1555 uses the current operator-selected recommendation:

```text
src/tagmemo/tag-extraction.js
```

The adjustment keeps the module internal, deterministic, and pure, and avoids changing existing recall runtime behavior or public MCP registration.

## Source Contract

The module exports:

```js
extractDeterministicTags(input, options = {})
normalizeTagLabel(value)
```

Accepted input is limited to bounded memory text and bounded metadata projection:

```js
{
  schemaVersion: 'tagmemo-deterministic-extraction-input-v1',
  memoryId: 'memory:<bounded-id>',
  boundedMemoryText: 'bounded selected text',
  metadataProjection: {
    title: 'bounded title',
    summary: 'bounded summary',
    explicitTags: ['existing tag'],
    queryCoreTags: ['query tag'],
    sourceKind: 'selected_projection'
  }
}
```

Output remains compatible with the TagMemo minimal schema:

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
      evidenceSourceId: 'evidence:<bounded-id>',
      memoryId: 'memory:<bounded-id>'
    }
  ],
  rejected: false,
  lowDisclosure: true,
  mutated: false,
  providerCalls: 0,
  publicMcpExpansion: 0
}
```

## Behaviors Covered

- deterministic normalization for case, whitespace, separators, and leading list markers;
- deterministic duplicate tag merge by source trust and confidence score;
- finite `confidenceScore` bounded within `0` through `1`;
- low-disclosure empty input result;
- low-disclosure rejected input result without echoing forbidden values;
- forbidden raw/private top-level and metadata fields rejected before extraction;
- provider/API/token/bearer/raw/scan-shaped values rejected without echo;
- `tagSource` constrained to bounded deterministic source labels;
- no mutation, no provider/API call counter, and no public MCP expansion;
- public MCP surface remains seven tools.

## Validation

Required targeted validation passed:

```text
node --test tests\tagmemo-tag-extraction.test.js
tests: 7
pass: 7
fail: 0

node --test tests\tag-extraction-deterministic-contract-fixture.test.js
tests: 7
pass: 7
fail: 0
```

Additional repository validation for CM-1555:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS_JSON_OK')"
```

## Boundary Confirmation

```text
runtime implementation: INTERNAL_PURE_FUNCTION_ONLY
runtime integration: NOT_STARTED
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
