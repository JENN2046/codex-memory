# CM-1558 TagMemo Runtime No-Op Projection

## Scope

CM-1558 implements the first runtime integration slice for deterministic TagMemo tag extraction as an internal no-op projection.

This slice calls the CM-1555 deterministic tag extraction core through a bounded runtime projection adapter, but it does not persist generated tags, does not return generated tags in public MCP responses, does not change `record_memory` write semantics, and does not expand the public MCP surface.

## Implemented Surfaces

| Surface | Change |
|---|---|
| `src/tagmemo/runtime-noop-projection.js` | Added internal runtime no-op projection adapter. It builds bounded extraction input from a memory record, calls `extractDeterministicTags(...)`, returns TagMemo minimal schema compatible tags, and marks the projection as `persisted=false`, `publicResponse=false`, and `mutated=false`. |
| `src/core/MemoryWriteService.js` | Calls the no-op projection after constructing the normalized internal record and before durable store writes. The projection result is not attached to `record`, not attached to the public result, and failures are caught as low-disclosure no-op projection failures. |
| `tests/tagmemo-runtime-noop-projection.test.js` | Added source-level tests for deterministic projection, bounded input, forbidden raw/private stripping, low-disclosure empty/rejected output, no persistence side effect, no public response exposure, projection failure no-op behavior, and unchanged seven-tool public MCP surface. |

## Runtime Boundary

```text
runtime no-op projection: IMPLEMENTED
persistent tag enrichment: NOT_STARTED
public MCP integration: NOT_STARTED
public MCP surface: STILL_7_TOOLS
provider/API: NOT_USED
bearer token: NOT_USED
raw scan: NOT_RUN
live proof: NOT_RUN
confirmed mutation: NOT_EXECUTED
second effective record_memory write: NOT_EXECUTED
complete V8: NOT_CLAIMED
production/release/cutover ready: NO
```

CM-1558 does not perform a live `record_memory` call. The `MemoryWriteService.record(...)` coverage is source-level unit testing with mocked local stores only.

## Projection Contract

The runtime adapter accepts an internal record and constructs only this bounded extraction input:

- `schemaVersion`;
- safe bounded `memoryId`;
- bounded memory text from normalized `record.content`;
- bounded metadata projection with `title`, `summary`, `explicitTags`, empty `queryCoreTags`, and `sourceKind=selected_projection`.

The adapter does not pass through raw/private fields such as:

- raw text/content/body fields;
- file paths or source files;
- raw audit / raw JSONL / raw SQLite rows;
- vector payloads or candidate cache payloads;
- provider/API/token/bearer/authorization fields;
- private lifecycle state.

The adapter output remains an internal projection:

```text
schemaVersion: tagmemo-runtime-noop-projection-v1
projectionMode: runtime_noop
tags: TagMemo minimal schema compatible
persisted: false
publicResponse: false
mutated: false
providerCalls: 0
publicMcpExpansion: 0
```

## Write Path Compatibility

`MemoryWriteService.record(...)` now invokes the projection against a shallow copy of the constructed internal record.

The projection does not modify:

- `record.tags`;
- diary write payload;
- SQLite shadow write payload;
- vector index write payload;
- chunk index write payload;
- audit write payload;
- public `record_memory` result;
- canonical hash or idempotency key calculation.

Projection failure is caught and reduced to an internal low-disclosure no-op projection failure. It does not reject or alter an otherwise valid `record_memory` main path.

## Validation

Targeted validation passed:

```powershell
node --test tests\tagmemo-runtime-noop-projection.test.js
node --test tests\tagmemo-tag-extraction.test.js
node --test tests\tag-extraction-deterministic-contract-fixture.test.js
node --test tests\memory-write-preflight-runtime-integration.test.js
npm test
```

Results:

```text
tests\tagmemo-runtime-noop-projection.test.js: PASS_7_OF_7
tests\tagmemo-tag-extraction.test.js: PASS_7_OF_7
tests\tag-extraction-deterministic-contract-fixture.test.js: PASS_7_OF_7
tests\memory-write-preflight-runtime-integration.test.js: PASS_12_OF_12
npm test: PASS_3115_OF_3115
```

## Boundary Confirmation

```text
generated tags persisted: NO
generated tags returned in public MCP response: NO
record_memory write semantics changed: NO
public MCP expansion: NO
provider/API calls: 0
bearer token use: 0
raw scans: 0
live proof: 0
confirmed mutation: 0
second effective record_memory writes: 0
release/tag/deploy: 0
production/release/cutover ready claim: NO
complete V8 ready claim: NO
```

## Rollback

Rollback is a normal source/test/docs revert of:

- `src/tagmemo/runtime-noop-projection.js`;
- the `MemoryWriteService` no-op projection hook;
- `tests/tagmemo-runtime-noop-projection.test.js`;
- this evidence/status entry.

Because CM-1558 persists no generated tags, exposes no public response fields, and performs no durable live memory mutation, rollback requires no storage cleanup, migration, raw scan, provider cleanup, public MCP schema rollback, or memory mutation.

## Next Route

The next safe route should be an independent source audit of the no-op projection changed scope before any persistent enrichment or public response exposure:

```text
CM-1559 deterministic TagMemo runtime no-op projection source audit
```
