# P14.1 Donor Parity Fixture Inventory

Date: 2026-05-14

## Purpose

P14.1 inventories the current donor parity fixture and standard suite coverage before adding new parity tests or changing runtime behavior.

This phase is inventory and tests-design only:

- no runtime change
- no DeepMemo behavior change
- no TopicMemo behavior change
- no passive memory query behavior change
- no public MCP tool expansion
- no import/export or migration behavior change
- no real DB or memory write

## Current Suite Snapshot

Observed from `benchmarks/active-memory-suite/standard-suite.json`:

| Dimension | Count |
|---|---:|
| total cases | 43 |
| DeepMemo cases | 24 |
| TopicMemo cases | 19 |
| success cases | 24 |
| error cases | 19 |

Current category distribution:

| Category | Count |
|---|---:|
| agent-selection | 8 |
| fallback | 2 |
| filtering | 9 |
| input-validation | 9 |
| ordering | 4 |
| query-semantics | 2 |
| topic-navigation | 4 |
| topic-state | 5 |

Current fixture distribution:

| Fixture | Count |
|---|---:|
| vchat-fixture | 30 |
| vchat-fixture-history-read-error | 1 |
| vchat-fixture-multi-agent | 8 |
| vchat-fixture-multi-topic-large | 1 |
| vchat-fixture-no-settings | 1 |
| vchat-fixture-ranking | 1 |
| vchat-fixture-ranking-extended | 1 |

## Covered Donor Surfaces

Current standard suite coverage includes:

- DeepMemo invalid JSON and missing input validation.
- TopicMemo invalid JSON, unknown command, missing maid, and missing topic input validation.
- DeepMemo basic query and advanced syntax success paths.
- DeepMemo blocked keyword filtering, all-keywords-blocked, duplicate keyword, blocked config duplicate, and rerank fallback behavior.
- DeepMemo multi-agent selection, maid alias, default `exclude_latest`, and current topic exclusion behavior.
- DeepMemo ordering across multi-topic, single-topic window, three-window, and larger multi-topic fixtures.
- TopicMemo agent-not-found behavior for list and content paths.
- TopicMemo ListTopics and GetTopicContent success paths.
- TopicMemo multi-agent `agentId` alias paths.
- TopicMemo missing settings fallback to default user name.
- TopicMemo empty history, missing history, missing topic, topicId alias, and history-read-error behavior.
- Compare and rollback suite metadata categories, expectations, fixtures, tags, and category/fixture aggregates.

## Inventory Findings

- The suite already covers the core donor active-memory CLI surfaces for DeepMemo and TopicMemo.
- DeepMemo has stronger filtering and ranking coverage than TopicMemo.
- TopicMemo has stronger topic-state coverage than DeepMemo.
- Passive memory query behavior is not yet represented as a P14 donor parity fixture surface.
- Scope/filter parity currently depends on existing scope regression evidence, not a donor-specific P14 fixture inventory.
- Lifecycle/read-policy interaction parity is represented indirectly through P11/P13 evidence, not by donor-specific P14 fixtures.
- Object-model drift detection is planned through P13 fixtures and readiness docs, but no donor parity inventory currently marks drift cases explicitly.
- Known intentional differences do not yet have a dedicated allowlist document or suite category.
- `benchmarks/active-memory-suite/README.md` still describes `34` current standard cases, while the observed suite contains `43`; this is a documentation drift to fix in a later docs/suite metadata cleanup phase.

## Gap Register

| Gap | Why It Matters | Suggested Phase |
|---|---|---|
| passive memory query donor parity fixtures | P14 should cover passive memory query behavior, not only active-memory CLI behavior | P14.1 follow-up or P14.6 |
| known intentional differences allowlist | Avoid confusing deliberate differences with regressions | P14.4 or P14.6 |
| object-model drift marker cases | Make donor-exposed object model drift visible before runtime rewrites | P14.6 |
| TopicMemo ranking / ordering nuance | TopicMemo navigation is covered, but ordering-specific parity is less explicit | P14.3 |
| DeepMemo payload shape snapshots | DeepMemo behavior is covered, but payload shape parity should be named and inventoried | P14.2 |
| error/meta placement matrix | Error cases exist, but envelope/meta placement should become its own parity matrix | P14.4 |
| README suite count drift | Current README says 34 cases while suite has 43 | later docs/suite metadata cleanup |

## Recommended Next Fixture Priorities

P14.2 DeepMemo targeted parity fixtures should prioritize:

- payload shape parity for success envelopes
- blocked keyword `meta` placement
- advanced syntax payload stability
- ranking/tie-breaker expected order snapshots

P14.3 TopicMemo targeted parity fixtures should prioritize:

- ListTopics payload shape parity
- GetTopicContent payload shape parity
- missing topic/history error envelope details
- topic ordering and locked-topic display expectations

P14.4 error/meta parity tests should prioritize:

- shared donor error envelope fields
- error `meta` placement
- success `meta` placement where donor exposes diagnostics
- known intentional differences allowlist

## Validation Plan

P14.1 is docs-only:

```powershell
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Future fixture phases should use:

```powershell
node --test <targeted parity test>
npm run compare-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category <category> --json --require-match
npm run rollback-active-memory -- --suite .\benchmarks\active-memory-suite\standard-suite.json --category <category> --json --require-ready
npm test
git diff --check
```

## Non-Goals

- no runtime change
- no new tests in P14.1
- no new fixtures in P14.1
- no public MCP tools
- no MCP schema change
- no import/export or migration behavior change
- no SQLite migration
- no real DB or memory write
- no provider benchmark
- no P15 / P16 / P17 / V8 / UI

## Next Recommended Phase

`P14.2-DeepMemo-targeted-parity-fixtures`

P14.2 may add fixture/test coverage, but it should still avoid runtime behavior changes unless a later phase explicitly approves them.
