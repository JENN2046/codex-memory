# P66.43 ValidationAggregator Recall Isolation Runtime Proof Fixture Tests

Status: `FIXTURE_TESTS_ONLY`

Decision: `NOT_READY_BLOCKED`

## Purpose

P66.43 defines detailed local fixture/test acceptance criteria for the P66.42 recall isolation runtime proof gap:

```text
recall_isolation_runtime_proof_not_executed
```

This phase turns the P66.42 planning contract into a stricter machine-readable acceptance fixture. It does not execute recall, scan real memory, read diary/SQLite/vector/candidate/recall-audit runtime stores, execute a runtime proof, produce a contamination report from real data, write durable memory or audit records, expand public MCP tools, or claim readiness.

## Scope

P66.43 adds:

- `tests/fixtures/p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1.json`
- `tests/p66-validation-aggregator-recall-isolation-runtime-proof-fixture.test.js`

The fixture locks:

- selected gap identity and priority
- P66.42 source-plan binding
- isolated record-family acceptance cases
- proof-surface acceptance cases
- control-case expectations
- required runtime evidence groups
- fail-closed cases
- disallowed work
- safety flags
- forbidden readiness claims

## Acceptance Cases

Each isolated record family must eventually be proven excluded from every normal recall surface:

```text
normal_recall_namespace
vector_index
candidate_cache
ranking
projection
user_visible_audit_summary
recall_audit_summary
```

In P66.43 these acceptance cases are defined but not executed. Any contamination, missing evidence, unsupported source, real memory scan claim, runtime-store scan claim, durable write claim, public MCP expansion claim, or readiness claim must fail closed.

## Controls

The fixture requires both:

- a positive control for active in-scope user memory that may enter normal recall surfaces
- negative controls for isolated record families that must not enter normal recall surfaces

P66.43 only defines the control contract. It does not run controls against real memory or runtime stores.

## Boundaries

P66.43 does not:

- scan real memory
- read diary data
- read SQLite rows
- read vector index data
- read candidate cache data
- read recall audit data
- execute recall
- execute runtime proof
- produce a contamination report from real data
- write durable memory records
- write durable audit records
- execute commands, gates, or runners
- start services
- call providers
- mutate config
- perform startup/watchdog operations
- apply migration/import-export/backup-restore
- expand public MCP tools
- expose `validate_memory` publicly
- push, tag, release, or deploy

## Readiness

P66.43 preserves:

- `validationAggregatorFullImplementation=false`
- `recallIsolationRuntimeProofReady=false`
- `recallIsolationRuntimeProofExecuted=false`
- `contaminationReportReady=false`
- `realMemoryScanned=false`
- `runtimeStoreScanned=false`
- `runtimeReady=false`
- `finalRcMatrixReady=false`
- `v1RcReady=false`
- `rcReady=false`
- `cutoverReady=false`

The release state remains `NOT_READY_BLOCKED`.

## Validation

Required validation:

```text
node --check tests\p66-validation-aggregator-recall-isolation-runtime-proof-fixture.test.js
node -e "JSON.parse(require('fs').readFileSync('tests/fixtures/p66-validation-aggregator-recall-isolation-runtime-proof-fixture-v1.json','utf8'))"
node --test tests\p66-validation-aggregator-recall-isolation-runtime-proof-fixture.test.js
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

## Result

Result: `RECALL_ISOLATION_RUNTIME_PROOF_ACCEPTANCE_FIXTURE_DEFINED`

P66.43 is a docs/fixture/test acceptance phase only. It strengthens local proof requirements for recall isolation without executing runtime behavior, scanning real memory, reading runtime stores, writing durable state, or claiming readiness.
