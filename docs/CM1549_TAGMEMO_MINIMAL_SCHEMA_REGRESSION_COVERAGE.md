# CM-1549 TagMemo Minimal Schema Regression Coverage

## Scope

CM-1549 adds fixture/test-only coverage for the CM-1548 TagMemo minimal schema preflight.

This change does not implement tag extraction, change recall ranking, call providers or APIs, use bearer-token paths, run live proof, perform raw scans, execute confirmed mutation, expand public MCP tools, perform another effective `record_memory` write, release, tag, deploy, cut over, claim production/release/cutover readiness, or claim complete V8 readiness.

## Files

- `tests/fixtures/tagmemo-minimal-schema-cm1549-v1.json`
- `tests/tagmemo-minimal-schema-fixture.test.js`

## Coverage

The fixture and test verify:

- `tagId`, `tagLabel`, `tagSource`, `confidenceScore`, `evidenceSourceId`, and `memoryId` are present and controlled for valid minimal tag records.
- `confidenceScore` must be finite and within `0..1`, with the expected `low` / `medium` / `high` bucket.
- `memoryId` linkage uses bounded ids and does not expose raw/private content.
- bounded public projection excludes forbidden raw/private keys and values.
- `tagSource` cannot use provider/API/token/bearer/raw/scan-shaped source labels.
- ranking compatibility metadata cannot enable runtime weight tuning.
- the public MCP surface remains exactly seven tools.
- the fixture declares no mutation, provider/API, bearer-token path, raw scan, confirmed mutation, public MCP expansion, release/tag/deploy, production/release/cutover readiness, or complete V8 claim.

## Validation

```powershell
node --test tests\tagmemo-minimal-schema-fixture.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS_JSON_OK')"
```

## Result

```text
CM-1549_RESULT: TAGMEMO_MINIMAL_SCHEMA_FIXTURE_COVERAGE_ADDED
fixture_test_only: YES
tag_extraction_implemented: NO
runtime_ranking_changed: NO
provider_api_calls: 0
bearer_token_use: 0
raw_scan: 0
live_proof: 0
confirmed_mutation: 0
public_mcp_expansion: 0
effective_record_memory_writes: 0
production ready: NO
release ready: NO
cutover ready: NO
complete V8 ready: NO
```
