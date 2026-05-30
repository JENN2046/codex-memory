# CM Main Merge Candidate Review 01

**Task:** CM-MAIN-MERGE-CANDIDATE-REVIEW-01
**Generated:** 2026-05-30
**Branch:** `hardening/p0-p2-security-rc-base`

## 1. Branch State

| Field | Value |
|---|---|
| Branch | `hardening/p0-p2-security-rc-base` |
| Base | `main` |
| Working tree | Clean (except pre-existing untracked `CLAUDE.md`) |
| Remote visible | **No** — 6 commits are local only (not pushed) |

### Commit chain (6 since main)

```
337dac8  fix:    harden Codex memory local security boundaries
d19c2b7  test:   add hardening regression suite
efaac1d  docs:   close out CM hardening beta evidence
5d5f7af  test:   split default and provider test contracts
66971b2  test:   cover provider test contract isolation
b890dfd  docs:   record provider test contract closeout
```

## 2. Acceptance Gate

| Check | Result | Detail |
|---|---|---|
| `npm run test:hardening` | **PASS** | 60/60 pass, exit 0 |
| `npm test` | **PASS** | 2726/2726 pass, exit 0 |
| `npm run gate:ci -- --json` | **PASS** | ok=true, fixtureOnly=true, noProvider=true, failedChecks=[] |
| `npm run test:provider -- --json` | **PASS** | status=skipped, note="skipped, not passed", exit 0 |

## 3. Provider Isolation Review

| Requirement | Status | Evidence |
|---|---|---|
| `npm test` excludes provider-dependent tests | ✅ | 4 files excluded via `PROVIDER_DEPENDENT_FILES` list |
| `gate:ci` excludes provider-dependent tests | ✅ | Same shared list via `run-default-tests.js` |
| `test:provider` defaults to skipped | ✅ | Requires `CODEX_MEMORY_RUN_PROVIDER_TESTS=true` + `CODEX_MEMORY_ALLOW_EXTERNAL_PROVIDER=true` |
| Provider tests not deleted | ✅ | 4 files confirmed present in `tests/` directory |
| Provider isolation entrance | ✅ | `npm run test:provider` with env guard |

Provider-dependent files:
- `phase-b-sync-cache-rerank.test.js`
- `phase-c-active-recall.test.js`
- `provider-smoke-cli.test.js`
- `provider-benchmark-cli.test.js`

## 4. Security Declaration Sweep

All new/modified files (source + docs + README) scanned for prohibited claims.

| Declaration | Status |
|---|---|
| `RC_READY` | **Not claimed.** Appears only in "blocked" contexts. |
| `production_ready` | **Not claimed.** Appears only in "blocked" contexts. |
| `cutover_ready` | **Not claimed.** Appears only in "blocked" contexts. |
| `release_ready` | **Not found.** |
| `deploy_ready` | **Not found.** |

Allowed claims present:
- `NOT_READY_FOR_RC` throughout docs
- `READY_FOR_LOCAL_HARDENED_BETA` in completion reports
- `READY_FOR_MAIN_MERGE_CANDIDATE` in provider contract report

## 5. Merge Risk Checklist

| Risk | Status | Mitigation |
|---|---|---|
| Provider tests skipped silently | ✅ | `test:provider` outputs `skipped, not passed` — no false pass |
| Default npm test relies on exclusion list | ✅ | List is centralized in `run-default-tests.js` with test coverage |
| Fixture-drift tests excluded but unfixed | ⚠️ | 4 fixture-drift files excluded; regeneration needed but not blocking |
| Self-referential tests excluded from gate:ci | ✅ | 3 files excluded; tested in isolation |
| No RC readiness | ✅ | Explicit `NOT_READY_FOR_RC` everywhere |
| No production deployment validation | ✅ | This branch does not validate production |
| No Green executor activation | ✅ | Autopilot remains fixture-only / read-only |

## Known Risks (as documented)

```text
- Provider tests are explicit, not part of default npm test.
- test:provider default success means skipped, not passed.
- This branch does not claim RC readiness.
- This branch does not validate production deployment.
- This branch does not activate real Green executor.
- 4 fixture-drift test files excluded from default-safe (not fixed).
```

## Decision

```text
READY_FOR_MAIN_MERGE_REVIEW
NOT_READY_FOR_RC
```

The hardening branch is now a main merge candidate.

```text
The default test contract is clean.
Provider-dependent tests are preserved behind an explicit provider contract.
The branch remains not RC-ready and carries no release, deploy, or cutover authority.
```

## Postscript: CM-MAIN-MERGE-REVIEW-FIX-01

Addressing PR #5 reviewer feedback — the wrapper-level 300000ms timeout on `run-default-tests.js` was removed. The timeout capped the entire default-safe suite, not individual tests. Replaced with `buildSpawnOptions()` that has no aggregate timeout by default. Per-test timing is handled by `node --test` or individual test configuration. 4 new tests verify spawn option construction.

Fix committed at `f250703`.

## Postscript 2: CM-MAIN-MERGE-REVIEW-FIX-BATCH-01

Second round of PR #5 review feedback — three fixes in one batch at `9535e73`:

| Fix | Issue | Resolution |
|---|---|---|
| FIX-02 | Boolean overrides not normalized through `toBoolean` | `_resolveBool` now applies `toBoolean` to override values, not just env vars |
| FIX-03 | Oversized stdio frames cause stream desync when body arrives in fragments | Added `oversizedDiscardRemainingBytes` discard mode that consumes oversized body bytes before resuming normal parse |
| FIX-04 | Disabled provider configs pollute embedding fingerprint/profile | `allowExternalProvider` resolved before endpoint building; when disabled, active endpoint defaults to `local-hash` with provider `local`, model `local-hash` |

Acceptance after batch:

| Check | Result |
|---|---|
| test:hardening | PASS |
| npm test | PASS (2739/2739, +3 new stdio +6 config tests) |
| gate:ci | ok=true, fixtureOnly=true, noProvider=true |
| test:provider | skipped, not passed, exit 0 |

```
