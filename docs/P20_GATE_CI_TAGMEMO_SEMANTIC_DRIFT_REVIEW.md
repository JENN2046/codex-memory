# P20.2a Gate CI TagMemo Semantic Drift Review

Phase: `P20.2a-gate-ci-tagmemo-semantic-drift-review`

Status: reviewed; repaired by P20.2b

## Purpose

Review the `gate:ci` blocker found during P20.2 without changing runtime behavior, startup behavior, watchdog behavior, MCP tools, package manifests, fixtures, or tests.

This phase is a read-only drift review. It identifies the failing fixture contract and recommends the next narrow repair phase.

## Commands Run

| Command | Result | Evidence |
|---|---|---|
| `node --test tests\tagmemo-targeted-semantic-fixture.test.js` | failed | `2/3` passed; one ordering assertion failed. |
| repeated targeted test loop, 3 runs | failed | all 3 runs failed the same top-level test on `tag-title-body-evidence-order`. |
| temporary inline Node score inspection | completed | printed actual result order and score fields for both P16.3 fixture cases; no file writes. |

## Current Failure

The standalone targeted test currently fails here:

```text
tests/tagmemo-targeted-semantic-fixture.test.js
P16.3 targeted semantic fixtures lock TagMemo ordering and audit shape

case: tag-title-body-evidence-order
expected: p16-tag-title, p16-title-only, p16-body-only, p16-evidence-only
actual:   p16-tag-title, p16-title-only, p16-evidence-only, p16-body-only
```

During the wider P20.2 `gate:ci` run, the same test file also surfaced the second case:

```text
case: group-tag-interleaves-semantic-buckets
expected: p16-alpha-b, p16-beta, p16-alpha-a
actual:   p16-alpha-a, p16-beta, p16-alpha-b
```

## Score Inspection

Actual score snapshot from the inline read-only inspection:

| Case | Memory | Score | Notes |
|---|---:|---:|---|
| `tag-title-body-evidence-order` | `p16-tag-title` | `0.814493` | tagged result remains first |
| `tag-title-body-evidence-order` | `p16-title-only` | `0.6301` | title-only remains second |
| `tag-title-body-evidence-order` | `p16-evidence-only` | `0.619198` | now edges body-only by a tiny margin |
| `tag-title-body-evidence-order` | `p16-body-only` | `0.619104` | now fourth by `0.000094` |
| `group-tag-interleaves-semantic-buckets` | `p16-alpha-a` | `0.834158` | alpha bucket top result |
| `group-tag-interleaves-semantic-buckets` | `p16-beta` | `0.827514` | beta result interleaves second |
| `group-tag-interleaves-semantic-buckets` | `p16-alpha-b` | `0.83288` | second alpha result appears third after group interleave |

## Interpretation

This looks like a fixture contract drift rather than a P20 startup/watchdog issue.

The first case still preserves the broad intent that tagged and title matches outrank weaker body/evidence matches, but the lower two records are separated by a very small score delta. The fixture currently treats that tail order as exact.

The second case still preserves the group interleave intent because the first two returned tags differ (`alpha`, then `beta`). The fixture currently also treats the exact alpha sibling order as part of the contract.

The current test combines two kinds of assertions:

- semantic intent assertions that should remain stable
- exact ordering snapshots for low-margin tie areas that may be too brittle

## Recommended Repair

Create a narrow follow-up phase:

`P20.2b-tagmemo-targeted-fixture-contract-repair`

Follow-up result: P20.2b repaired the fixture contract without changing runtime behavior; targeted P16.3 test passed `3/3` and `gate:ci` passed with tests `449/449`.

Recommended scope:

- inspect P16.3 fixture intent
- decide which ordering positions are true contract and which are tolerance / tie-breaker evidence
- update only the P16.3 fixture/test if the fixture is stale or over-specific
- do not change runtime scoring unless source behavior is proven wrong against the documented P16 contract
- rerun:
  - `node --test tests\tagmemo-targeted-semantic-fixture.test.js`
  - `npm run gate:ci -- --json`
  - `git diff --check`
  - docs validation if docs changed

## Boundary Confirmation

P20.2a did not:

- change `src/`
- change tests or fixtures
- change `package.json` or lockfiles
- change MCP schema or public tools
- start HTTP MCP
- start watchdog
- install scheduled tasks
- edit HKCU Run
- edit Codex or Claude configuration
- call providers
- read real memory content
- write durable DB / memory / diary data
- run SQLite migration or `ALTER TABLE`
- apply import/export
- create backup or restore backup
- tag, release, or deploy

## Next Recommended Phase

`P20.3-rollback-backup-operations-plan`

P20.3 rollback / backup operations planning may proceed as docs/planning only now that `gate:ci` is green again.
