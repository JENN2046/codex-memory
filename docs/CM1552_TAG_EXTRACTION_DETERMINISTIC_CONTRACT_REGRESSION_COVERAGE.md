# CM-1552 Tag Extraction Deterministic Contract Fixture/Test Coverage

## Scope

CM-1552 adds fixture/test-only coverage for the deterministic tag extraction contract recorded in CM-1551.

This is synthetic fixture and local `node:test` coverage only. It does not implement tag extraction in runtime source, change recall ranking, call providers or APIs, use bearer-token paths, run live proof, perform raw scans, execute confirmed mutation, expand public MCP tools, perform another effective `record_memory` write, release, tag, deploy, cut over, claim production/release/cutover readiness, or claim complete V8 readiness.

## Coverage Result

```text
CM-1552_RESULT: TAG_EXTRACTION_DETERMINISTIC_CONTRACT_FIXTURE_COVERAGE_ADDED
fixture: tests/fixtures/tag-extraction-deterministic-contract-cm1552-v1.json
test: tests/tag-extraction-deterministic-contract-fixture.test.js
tag extraction implementation: NOT_STARTED
deterministic contract coverage: FIXTURE_TEST_ONLY
complete V8: NOT_CLAIMED
production ready: NO
release ready: NO
cutover ready: NO
public MCP surface expanded: NO
targeted validation: PASSED_7_OF_7
```

## Evidence Added

| Evidence | Purpose |
|---|---|
| `tests/fixtures/tag-extraction-deterministic-contract-cm1552-v1.json` | Synthetic bounded input/output fixture for deterministic tag extraction contract. |
| `tests/tag-extraction-deterministic-contract-fixture.test.js` | Local fixture test validating contract shape, normalization, deduplication, confidence, rejection, projection, and seven-tool public surface. |

## Contract Boundaries Covered

The fixture/test-only coverage validates:

- inputs use bounded `memoryId`, `boundedMemoryText`, and `metadataProjection` only;
- outputs remain compatible with `tagmemo-minimal-tag-v1`;
- `tagLabel` normalization is deterministic for whitespace, case, underscore, hyphen, and leading marker variants;
- duplicate tag labels collapse reproducibly with source trust ordering;
- `confidenceScore` remains finite and within `0` through `1`;
- `confidenceBucket` is derived from deterministic source tiers;
- empty input and rejected input return low-disclosure output without echoing offending raw/private values;
- forbidden raw/private fields do not enter generated output or public projection;
- generated `tagSource` values do not contain provider/API/token/bearer/raw/scan-shaped content;
- bounded public projection excludes memory text, exact evidence id, exact score, raw/private fields, and hidden ranking internals;
- public MCP surface remains exactly seven tools.

## Not Implemented

```text
runtime tag extraction
complex V8 algorithms
runtime ranking changes
provider/API validation
bearer-token path validation
raw audit / broad scan
confirmed mutation apply
public MCP expansion
additional effective record_memory writes
release/tag/deploy
production readiness
release readiness
cutover readiness
complete V8 readiness
```

## Validation

Required validation for CM-1552:

```powershell
node --test tests\tag-extraction-deterministic-contract-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS_JSON_OK')"
```

Targeted fixture validation passed:

```text
node --test tests\tag-extraction-deterministic-contract-fixture.test.js
tests: 7
pass: 7
fail: 0
```

## Boundary Confirmation

```text
tag extraction implementation: NOT_STARTED
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
