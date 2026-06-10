# CM-1557 TagMemo Runtime Integration Preflight

## Scope

CM-1557 prepares the runtime integration preflight for the deterministic TagMemo tag extraction core added in CM-1555 and audited in CM-1556.

This is docs/status/board preflight only. It does not wire `extractDeterministicTags(...)` into the write pipeline, recall pipeline, public MCP response, storage path, HTTP path, provider path, or any live proof path.

## Current Status

```text
runtime integration: NOT_STARTED
tag extraction core: IMPLEMENTED_AND_AUDITED
public MCP surface: STILL_7_TOOLS
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
second effective record_memory write: NOT_EXECUTED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```

## Source Context

| Surface | Current behavior | Integration note |
|---|---|---|
| `src/tagmemo/tag-extraction.js` | Internal pure-function module exporting `extractDeterministicTags(...)` and `normalizeTagLabel(...)`; accepts bounded memory text and bounded metadata projection only. | Implemented and audited. No runtime import or call site exists yet. |
| `src/core/MemoryWriteService.js` | Normalizes `record_memory` payload, validates authority/target/schema/secrets/sensitivity/process rules, runs write preflight, computes canonical hash/idempotency, applies proof policy, then persists `record.tags`. | Primary future write-pipeline candidate, but first integration should be no-op/dry-run projection only. |
| `src/storage/DiaryStore.js` | Writes existing `record.tags` to diary text when present. | Persisted generated tags would affect diary output; not approved in CM-1557. |
| `src/storage/SqliteShadowStore.js` | Stores `record.tags` as `tags_json` and projects tags into chunk records. | Persisted generated tags would affect storage and recall metadata; not approved in CM-1557. |
| `src/storage/VectorIndexStore.js` | Includes `record.tags` in embedding text and stored vector metadata. | Persisted generated tags could affect vector text and recall; not approved in CM-1557. |
| `src/recall/CandidateGenerator.js` / `src/recall/TagMemoEngine.js` | Consume stored chunk/record tags for scoring. | No initial recall-side extraction call should be added; recall should keep consuming stored tags. |
| Public MCP tool definitions and responses | Seven public tools remain the current public surface. | No new public tool, schema field, or response exposure is approved. |

## Proposed Call-Site Routes

### Route A - Recommended First Slice

`MemoryWriteService.record(...)` may later construct an internal dry-run projection after payload normalization and validation, but before any generated tag is persisted or returned.

The future projection should be derived only from:

- normalized `title`;
- normalized `content`, reduced to bounded memory text;
- normalized `evidence`, reduced to bounded metadata summary if used;
- normalized explicit `tags`;
- bounded scope identifiers needed to produce a safe `memoryId`-like test id or post-record id in a no-op path.

The first source/test slice should keep the result no-op:

```text
generated tags are computed: maybe
generated tags are persisted: NO
generated tags are returned in public MCP response: NO
generated tags affect canonical hash/idempotency: NO
generated tags affect diary/vector/chunk/recall: NO
record_memory main path failure impact: NO
```

This route can prove projection construction, fail-closed/no-op behavior, and public-surface non-expansion before any persistence decision.

### Route B - Later Persistent Write Enrichment

A later dedicated source/test phase may decide to merge generated tags into `record.tags` before persistence.

That route is not approved in CM-1557 because it would require explicit decisions for:

- whether generated tags participate in canonical hash and idempotency;
- how generated tags merge with operator-supplied tags;
- whether diary, SQLite, vector text, chunk metadata, and recall scores are intentionally changed;
- how rollback removes or ignores generated tags;
- whether additional compatibility fixtures are required for `record_memory`.

### Route C - Later Post-Commit Enrichment

A post-commit enrichment path is not recommended as the first runtime route. It would create secondary mutation/reconcile complexity and could resemble a second write unless tightly scoped and separately approved.

## Runtime Boundary

Future runtime integration must preserve:

- deterministic-only extraction;
- bounded memory text / bounded metadata projection as the only input;
- low-disclosure empty and rejected results;
- forbidden raw/private fields stripped before extraction;
- safe `tagSource` values that exclude provider/API/token/bearer/raw-scan information;
- no provider/API calls;
- no bearer-token dependency;
- no raw diary, raw audit, raw SQLite row, vector payload, or candidate cache scan;
- no public MCP expansion;
- no second effective `record_memory` write;
- no production/release/cutover readiness claim;
- no complete V8 claim.

## `record_memory` Compatibility

The public `record_memory` request contract remains unchanged.

The public `record_memory` response should not include generated TagMemo tags unless a later dedicated approval explicitly changes the public response contract.

If the future no-op projection fails, times out, or rejects input, `record_memory` should continue on the existing main path unless the failure indicates a pre-existing write rejection such as authority, schema, secret, sensitivity, or target semantic validation.

If a later persistent enrichment route is selected, canonical hash and idempotency behavior must be decided before implementation. Generated tags should not silently change replay semantics.

## Bounded Projection Rules

Future projection builder acceptance:

- top-level projection contains only safe bounded fields;
- `boundedMemoryText` is truncated or otherwise bounded by the source/test contract;
- metadata projection contains only `title`, `summary`, `explicitTags`, `queryCoreTags`, and `sourceKind`-compatible data;
- projection excludes raw content fields, raw paths, raw audit rows, raw JSONL, raw SQLite rows, vector payloads, candidate cache payloads, provider details, authorization values, bearer tokens, and private lifecycle state;
- projection is deterministic for the same normalized write input.

Future projection builder rejection:

- unsupported projection fields;
- raw/private fields;
- provider/API/token/bearer/raw-scan shaped values;
- unbounded content;
- malformed metadata arrays;
- unsafe identifiers or path-like values.

## Failure Policy

Future runtime integration should fail closed at the extraction boundary and no-op at the write path boundary:

- extraction rejection returns low-disclosure result;
- projection construction failure does not expose raw data;
- extraction failure does not fail an otherwise valid `record_memory` write in the no-op phase;
- generated tags are not persisted or returned during no-op phase;
- all failures are locally testable without provider/API, live proof, raw scan, or durable memory mutation.

## Test Plan

CM-1557 validation is docs/status/board only:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
node -e "JSON.parse(require('fs').readFileSync('.agent_board/CURRENT_FACTS.json','utf8')); console.log('CURRENT_FACTS_JSON_OK')"
```

Future Route A source/test validation should include:

- no-op projection unit tests for bounded `MemoryWriteService` input;
- public `record_memory` response tests proving generated tags are not exposed;
- storage tests or spies proving generated tags are not persisted in no-op phase;
- canonical hash/idempotency tests proving no-op extraction does not alter replay keys;
- failure tests proving extraction rejection remains low-disclosure and does not break the main write path;
- public MCP surface test proving the tool list remains seven tools;
- existing `tests\tagmemo-tag-extraction.test.js`;
- existing `tests\tag-extraction-deterministic-contract-fixture.test.js`.

## Rollback Plan

CM-1557 rollback is docs/status/board only: revert this document and the associated status/board entries.

Future Route A rollback should be a source/test revert of the projection call site and tests. Because the recommended first slice persists no generated tags and exposes no public response fields, rollback should not require storage cleanup, migration, raw scan, public MCP schema rollback, provider cleanup, or memory mutation.

## Boundary Confirmation

```text
docs preflight only: YES
runtime integration: NOT_STARTED
tag extraction core: IMPLEMENTED_AND_AUDITED
runtime write/recall wiring: NOT_PRESENT
public MCP expansion: NOT_PERFORMED
public MCP surface: STILL_7_TOOLS
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
live proof: NOT_RUN
confirmed mutation: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
release/tag/deploy: NOT_EXECUTED
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Next Route

Recommended next route after CM-1557 is a separate source/test slice for internal no-op projection, not direct persistent runtime enrichment:

```text
CM-1558 deterministic TagMemo runtime no-op projection source/test
```

CM-1558, if selected, should still keep generated tags out of public MCP responses and out of persisted record tags unless a later phase separately authorizes persistent enrichment.
