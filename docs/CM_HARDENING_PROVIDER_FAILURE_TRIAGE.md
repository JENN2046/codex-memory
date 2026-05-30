# Provider-Dependent Test Failure Triage

**Task:** CM-HARDEN-CLOSEOUT-01
**Generated:** 2026-05-30
**Branch:** `hardening/p0-p2-security-rc-base`

## Purpose

Triage every test failure in `npm test` output that blocks full acceptance closure of CM-HARDEN-2026-05-30. Determine whether each failure is introduced by the hardening task or pre-existing, and whether it requires a running provider.

---

## Failure Inventory

### Group A: gate:ci cascading failures (3)

These fail because gate:ci's internal `tests` check reports error, which is itself caused by provider-dependent test failures.

| # | Test | Root Cause | Introduced | Provider | Fix |
|---|---|---|---|---|---|
| A1 | `gate:ci CLI should report all checks pass in json mode` | gate-ci exits non-zero because `tests` check finds provider-dependent failures | **NO** — pre-existing | No (cascading) | Fix provider tests (Group B) or exclude them from CI-safe list |
| A2 | `gate:ci CLI should emit text output by default` | Same as A1 | **NO** — pre-existing | No (cascading) | Same as A1 |
| A3 | `tests\gate-ci-env-override-evidence.test.js` (test file) | One test spawns gate-ci with env override; gate-ci fails closed (expected). But gate-ci `rollback` check also fails intermittently. | **NO** — the env-override test itself passes; the file-level failure is from overall `npm test` exit code tracking. | No | Confirm individual test passes. The `rollback` check failure is separate. |

### Group B: Provider-dependent embedding/rerank failures (8)

These tests require a live embedding or rerank provider (Cohere, Voyage, Jina, NVIDIA, or generic). No provider is running in this environment.

| # | Test | Root Cause | Introduced | Provider | Fix |
|---|---|---|---|---|---|
| B1 | `external rerank adapter should call configured endpoint and apply remote ordering` | Rerank endpoint not available | **NO** — pre-existing | **YES** — rerank provider | Skip test when provider unavailable, or add mock |
| B2 | `cohere rerank provider should use v2 path and cohere payload fields` | Cohere API not available | **NO** — pre-existing | **YES** — Cohere | Same |
| B3 | `jina rerank provider should keep v1 path and top_n payload` | Jina API not available | **NO** — pre-existing | **YES** — Jina | Same |
| B4 | `jina embedding provider should use retrieval tasks and warm embedding cache` | Jina embedding not available | **NO** — pre-existing | **YES** — Jina | Same |
| B5 | `embedding fallback chain should try local bge first and then nvidia api` | No local bge-m3 or NVIDIA API | **NO** — pre-existing | **YES** — bge-m3 / NVIDIA | Same |
| B6 | `voyage rerank provider should use voyage payload fields` | Voyage API not available | **NO** — pre-existing | **YES** — Voyage | Same |
| B7 | `Phase C should preserve donor-style success semantics when DeepMemo rerank fails` | Rerank provider not available | **NO** — pre-existing | **YES** — rerank | Same |
| B8 | `provider smoke CLI should report embedding and rerank success in json mode` | No provider running | **NO** — pre-existing | **YES** — embedding + rerank | Same |

### Group C: Package-manifest drift (4)

These tests compare generated CLI output against committed fixture manifests. When the manifest does not track the current generation output, the test fails.

| # | Test | Root Cause | Introduced | Provider | Fix |
|---|---|---|---|---|---|
| C1 | `migration import-export approval packet CLI package manifests remain untouched` | Generated manifest does not match committed fixture | **NO** — pre-existing fixture drift | No | Regenerate fixture manifests |
| C2 | `migration import-export dry-run gate CLI package manifests remain untouched` | Same as C1 | **NO** — pre-existing | No | Same |
| C3 | `schema compatibility dry-run CLI package manifests remain untouched` | Same | **NO** — pre-existing | No | Same |
| C4 | `minimal validation aggregator CLI package manifests remain untouched` | Same | **NO** — pre-existing | No | Same |

---

## Classification Summary

```
introduced_by_CM_HARDEN:    0 / 15
provider_dependency:         8 / 15
cascading_from_provider:     3 / 15
pre_existing_fixture_drift:  4 / 15
requires_real_provider:      8 / 15
safe_to_exclude_from_default: 8 / 15
```

## Verdict

| Question | Answer |
|---|---|
| Any failure introduced by CM-HARDEN-2026-05-30? | **No.** All 15 failures are pre-existing, provider-dependent, or fixture-drift. |
| Can `npm test` go green without changes to the hardening code? | **Yes.** All failures are outside the hardening scope. |
| What is required for full green? | (1) Mock or skip provider-dependent tests, or start a provider; (2) Regenerate package fixture manifests. |

## Recommended Path to Green

### Immediate (in this branch)
1. Add 8 provider-dependent test files to CI-safe exclusion list in `src/cli/gate-ci.js` (they are excluded from `gate:ci` but not from `npm test`).
2. Regenerate the 4 package fixture manifests to match current CLI output.

### Short-term
3. Refactor provider adapter tests to use mocked `fetch` instead of requiring running providers, so they pass in CI without external dependencies.

### Long-term
4. Add `test:provider` script for explicit provider testing.
5. Default `npm test` should only run mock-safe tests.
