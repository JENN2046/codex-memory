# Codebase Deep Audit - 2026-07-06

Status: `FINDINGS_ONLY`
Date: 2026-07-06
Branch: `main`
Baseline: `6c4ceb22e8f1bb4a11b3d19ba9b49a26d80f314f`
Scope: source/test/docs static review plus targeted local validation

## Purpose

This report records a cold external-style review of the current `codex-memory`
codebase. The review intentionally prioritizes source behavior, tests, and local
command evidence over project vision documents, status narratives, or roadmap
claims.

This is an audit report only. It does not change runtime behavior, public MCP
tools, schemas, storage, providers, config, startup/watchdog state, memory
content, durable memory/audit state, release state, or deployment state.

## Method

Reviewed surfaces:

- MCP and HTTP adapters
- memory write path and reconciliation path
- diary, SQLite, vector index, candidate cache, and audit storage
- search and ranking pipeline
- security profile and provider configuration defaults
- default, hardening, provider, quality, HTTP, and fixture drift test surfaces

No secret files, `.env` values, private state, raw private memory, raw logs, or
provider credentials were read.

## Executive Judgment

`codex-memory` is a substantial local-first memory runtime, not a scaffold. It
has real MCP entrypoints, HTTP hardening, diary and SQLite persistence, vector
and chunk indexes, audit logs, write manifests, recovery/reconcile paths,
controlled mutation tools, and multiple local validation gates.

The main weakness is not lack of code. The main weakness is evidence quality:
the project has a large governance and validation layer, but some important
claims are only fixture-backed, skipped by default, or contradicted by excluded
fixture drift. The repository can look greener than it really is.

The system should be treated as a trusted local memory runtime with bounded HTTP
projections, not as a generally safe exposed memory service, not as a proven
large-scale recall platform, and not as a proven complete erase/governance
runtime.

## Findings

### F1 - Default tests hide public MCP contract drift

Severity: `high`

The default-safe test runner excludes four `fixture_drift` files:

- `tests/migration-import-export-approval-packet-cli.test.js`
- `tests/migration-import-export-dry-run-gate-cli.test.js`
- `tests/schema-compatibility-dry-run-cli.test.js`
- `tests/v1-rc-validation-aggregator-cli.test.js`

Evidence:

- `src/cli/run-default-tests.js` records these as fixture drift exclusions.
- `tests/mcp-contract.test.js` asserts the current public MCP surface is seven
  tools: `record_memory`, `search_memory`, `memory_overview`, `audit_memory`,
  `validate_memory`, `tombstone_memory`, and `supersede_memory`.
- Excluded migration/import-export tests still assert a "public MCP three-tool
  freeze" expectation.

Targeted validation:

```text
node --test tests/migration-import-export-approval-packet-cli.test.js \
  tests/migration-import-export-dry-run-gate-cli.test.js \
  tests/schema-compatibility-dry-run-cli.test.js \
  tests/v1-rc-validation-aggregator-cli.test.js
```

Result:

```text
50 tests total
46 pass
4 fail
```

Impact:

Default `npm test` can pass while governance fixtures still encode stale public
MCP assumptions. This weakens confidence in public-contract freeze claims,
approval packet consistency, and migration/import-export readiness evidence.

Recommended fix:

Rebaseline or repair the four fixture drift tests against the current seven-tool
surface, then decide whether they should return to default-safe coverage or stay
as a separate explicit fixture-drift gate with visible failure status.

Post-audit remediation:

`F1_REMEDIATED_LOCALLY` on 2026-07-06. The migration/import-export CLI public
tool constants were reconnected to the current MCP tool definitions, stale
"three-tool freeze" test names were updated to the current bounded public MCP
surface, and the active fixture-drift exclusion list was cleared so these tests
return to default-safe coverage. This remediation does not expand the public MCP
surface and does not claim readiness.

### F2 - Search timeout is cooperative, not a hard runtime cutoff

Severity: `high`

`search_memory` is wrapped by `runSearchMemoryWithTimeout()`, which uses
`Promise.race()` and `AbortController`. That protects async paths that yield to
the event loop.

The hot search path still includes synchronous or full-scan work:

- `CandidateGenerator.generate()` calls `shadowStore.listChunks()`.
- `SqliteShadowStore.listChunks()` executes `DatabaseSync.prepare(...).all()`.
- `CandidateGenerator.rankChunks()` scores, sorts, and slices candidates in JS.
- `SqliteShadowStore.listChunksByTimeRanges()` fetches chunks first, then filters
  by time in JS.

Impact:

Large stores or expensive queries can block before timeout is observed. The
timeout is a useful guard for async stalls, but it is not a service-grade
cancellation or resource limit for synchronous SQLite scans and in-memory
ranking.

Recommended fix:

Add DB-side candidate limiting and filtering, use FTS or indexed lexical
prefiltering, avoid all-row chunk scans for normal recall, and consider moving
large ranking work into an abortable worker/thread boundary or an async storage
layer with hard query budgets.

Post-audit evidence hardening:

`F2_EVIDENCE_ADDED_LOCALLY` on 2026-07-06. Synthetic tests now document that
`runSearchMemoryWithTimeout()` cannot preempt synchronous event-loop blocking
and that `CandidateGenerator` currently consumes the full supplied chunk set
before semantic pool slicing. This is evidence hardening only; it does not claim
that the scale/timeout risk is fixed.

### F3 - Memory privacy and deletion risk are multiplied by storage fan-out

Severity: `high`

Local follow-up: F3_CONTRACT_ADDED_LOCALLY in commit-pending work adds
`MemoryLifecycleProjectionCleanupContract` and fixture tests that require every
governance lifecycle family to declare diary, SQLite record/chunk, vector,
embedding cache, candidate cache, audit, reconcile queue, and degraded payload
cleanup or suppression handling before any runtime apply can be considered.
This is contract evidence only, not a real cleanup execution or readiness
claim.

Local follow-up: F3_RUNTIME_PROOF_ADDED_LOCALLY in commit-pending work adds a
fixture-backed runtime proof helper and tests. The proof seeds all derived
projection families with synthetic data, executes lifecycle cleanup/suppression
against that fixture, and asserts before/after results for diary, SQLite
record/chunks, vector index, embedding cache, candidate cache, write audit,
recall audit, reconcile queue, and degraded payload. This remains fixture-only
evidence, not real private memory cleanup and not readiness.

Accepted memory content is intentionally persisted to multiple projections:

- diary files include `Memory-ID`, `Content`, and `Evidence`
- SQLite `memory_records` stores `content`, `evidence`, `raw_text`, paths, and
  scope fields
- chunk records and vector index projections derive recall candidates
- candidate cache entries persist result values
- write and recall audits persist JSONL events
- reconcile payloads can contain record payloads after degraded writes

Candidate objects include `memoryId`, `title`, `text`, `sourceFile`, and
`fullPath`, and the candidate cache stores the candidate value.

Impact:

Writing is robust, but forgetting, tombstoning, superseding, redacting, or
proving private data absence is much harder than a single-store design. A
governance mutation that changes canonical SQLite state does not automatically
prove all derived stores, caches, audits, and degraded reconcile payloads are
clean.

Recommended fix:

Define an explicit all-projection cleanup contract for each memory lifecycle
operation. Include diary, SQLite records, chunks, vector index, embedding cache,
candidate cache, audit summaries, reconcile queue, and any temporary degraded
payload. Add tests that seed every projection and prove the intended cleanup or
suppression result.

### F4 - Default security profile is local-trusted, not hardened

Severity: `medium-high`

The default `securityProfile` is `local`. Tests confirm that local profile does
not enable soft read policy, lifecycle read policy, or write preflight by
default. Hardened mode enables them.

Impact:

The default is suitable for a local trusted operator, but it is not a hardened
governance posture. Any documentation or delivery claim that says the runtime is
safe by default needs to distinguish "external provider disabled by default"
from "memory governance policies enabled by default."

Recommended fix:

Either make hardened profile the documented recommended mode for HTTP/client
integration, or print and test a startup/overview warning when running in local
profile with trusted full-access behavior.

### F5 - Trusted MCP and bounded HTTP projection are different products

Severity: `medium-high`

Local follow-up: F5_VISIBILITY_ADDED_LOCALLY in commit-pending work adds a
low-disclosure `runtimePosture` overview summary. It distinguishes trusted/full,
public selected, and authenticated bounded overview projections; exposes
security-profile and policy booleans; and states that overview itself did not
make external model calls. It does not expose endpoints, tokens, raw provider
payloads, paths, fingerprints, raw memory, or readiness evidence.

The MCP server formats successful tool payloads both as `structuredContent` and
as JSON text. The full trusted MCP path can return sensitive operational fields,
including `memoryId`, `filePath`, paths, recent files, memory links, and content
depending on tool arguments.

HTTP hardening is stronger:

- no-token write-like tools are blocked
- no-token `search_memory` is blocked
- no-token `memory_overview` returns selected low-disclosure projection
- authenticated HTTP `memory_overview` returns bounded projection by default
- non-loopback HTTP without bearer token is rejected

Impact:

This project is not uniformly low-disclosure. It is a trusted local MCP service
with selected HTTP low-disclosure projections. Integrators can misconfigure or
misunderstand this boundary if they treat every MCP transport as public-safe.

Recommended fix:

Make the trusted/full-access path and bounded/public projection path visibly
separate in docs, tests, and CLI output. Consider distinct mode labels in
`tools/list` instructions or startup banners.

### F6 - Provider-backed recall quality is not proven by default

Severity: `medium`

External embedding providers are disabled by default, which is a good safety
default. But when external provider support is enabled:

- provider embedding failures silently fall back to local hash embedding
- dimension mismatches are normalized by slicing or padding vectors
- provider-dependent tests skip with exit code 0 unless both provider env gates
  are explicitly enabled

Targeted validation:

```text
npm run test:provider -- --json
```

Result:

```text
status: skipped
note: skipped, not passed
```

Impact:

Default validation does not prove provider integration, provider quality,
dimension correctness, or quality stability across fallback. Silent fallback can
turn a provider outage or misconfiguration into a lower-quality recall profile
without failing loudly.

Recommended fix:

Record provider fallback events in health output and audit summaries. Treat
dimension mismatch as a profile-health failure unless explicitly allowed by a
migration profile. Keep `test:provider` classified as caution/blocked unless
provider gates and non-secret test endpoints are explicitly configured.

### F7 - Query quality gate is useful but synthetic

Severity: `medium`

`query:quality:temp-db` runs against a synthetic temporary SQLite app, with
external providers disabled and no real memory reads or writes. It is valuable
regression coverage, but it is not live recall proof.

Targeted validation:

```text
npm run query:quality:temp-db -- --json
```

Result:

```text
QUERY_QUALITY_TEMP_DB_GATE_PASSED_NOT_LIVE_NOT_READY
5 cases passed
providerCalls: 0
realMemoryReads: 0
realMemoryWrites: 0
readinessClaimed: false
```

Impact:

The quality gate prevents obvious synthetic regressions, but it cannot prove
large-corpus precision, provider-backed ranking, latency, real historical memory
behavior, or real private-scope behavior.

Recommended fix:

Keep the synthetic gate, but add a separate opt-in benchmark tier for controlled
large fixture corpora and another exact-approved real-store read-only tier when
the project needs runtime recall evidence.

### F8 - Tool argument validation is intentionally narrow

Severity: `medium`

The project uses a custom `ToolArgumentValidator` that supports core constraints:
`type`, `required`, `enum`, numeric bounds, `oneOf`, string length, arrays, and
`additionalProperties=false`.

Impact:

This is adequate for the current simple schemas, but it is not a complete JSON
Schema implementation. Future schema complexity could create validation gaps if
the project starts relying on unsupported keywords or nested semantic rules.

Recommended fix:

Keep schemas simple or add tests that fail when unsupported schema keywords are
introduced. If schema complexity grows, adopt a real JSON Schema validator or
generate validation code from a constrained schema subset.

## Strengths Confirmed

- HTTP no-token and bounded projection tests are meaningful and currently pass.
- Write path engineering is stronger than a simple local notes bridge:
  manifest, idempotency, SQLite authority, diary degradation, and reconcile
  paths exist.
- Controlled mutation public tools are registered with dry-run/public rejection
  semantics in current contract tests.
- Default provider-disabled behavior is safe from accidental external provider
  calls.
- The project is careful about avoiding readiness overclaims in many validation
  reports and gate outputs.

## Non-Claims

This audit does not claim:

- production readiness
- release readiness
- deploy readiness
- cutover readiness
- `RC_READY`
- complete V8
- full bridge completion
- live real-store recall reliability
- provider-backed quality
- complete private-memory erasure
- public-safe MCP exposure
- VCPToolBox parity

## Validation Performed

```text
npm run query:quality:temp-db -- --json
```

Result: `PASS`, synthetic temp DB only, status
`QUERY_QUALITY_TEMP_DB_GATE_PASSED_NOT_LIVE_NOT_READY`.

```text
npm run test:provider -- --json
```

Result: `SKIPPED`, not passed. Provider gates were not enabled.

```text
node --test tests/search-memory-timeout-policy.test.js tests/security-profile-config.test.js
```

Result: `PASS`, 22/22.

```text
node --test tests/migration-import-export-approval-packet-cli.test.js \
  tests/migration-import-export-dry-run-gate-cli.test.js \
  tests/schema-compatibility-dry-run-cli.test.js \
  tests/v1-rc-validation-aggregator-cli.test.js
```

Result: `FAIL`, 46/50 pass, 4 fail. Failures are stale public MCP freeze
expectations in excluded fixture drift tests.

## Recommended Next Fix Order

1. Repair or consciously rebaseline the excluded fixture drift tests around the
   current seven-tool public MCP surface.
2. Add a visible validation status that distinguishes default-safe pass from
   known excluded governance drift.
3. Add all-projection cleanup/suppression tests for lifecycle mutations and
   candidate cache payloads.
4. Add large synthetic corpus search tests that expose all-row scan and timeout
   behavior without reading real memory.
5. Make local-vs-hardened profile state and trusted-vs-bounded transport state
   visible in startup/overview output.
6. Make provider fallback and vector dimension mismatch visible as health or
   profile gate signals.

## Closeout

Result: `FINDINGS_ONLY`

The codebase is materially useful and locally functional, but its current green
signals are narrower than they look. The project should first close contract
drift and evidence-gap issues before adding more live/runtime capability.
