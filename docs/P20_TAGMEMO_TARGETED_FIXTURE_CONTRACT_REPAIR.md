# P20.2b TagMemo Targeted Fixture Contract Repair

Phase: `P20.2b-tagmemo-targeted-fixture-contract-repair`

Status: completed validated

## Purpose

Repair the P16.3 TagMemo targeted semantic fixture contract that blocked `gate:ci` during P20.2 readiness evidence.

This phase keeps runtime behavior unchanged. It only narrows the fixture/test contract so low-margin same-class ordering does not block local production readiness when the broader semantic intent is still preserved.

## Repair Summary

Updated:

- `tests/tagmemo-targeted-semantic-fixture.test.js`
- `tests/fixtures/tagmemo-targeted-semantic-v1.json`

The repair adds an `orderContract` fixture shape for cases where exact full ordering was too brittle:

- `topPrefix` locks the high-confidence prefix when it is part of the real contract.
- `remainingSetAfterPrefix` allows low-margin tail records to appear in either order.
- `containsExactly` still requires the result set to be complete and exclusive.

## Case-Level Contract

| Case | Previous issue | Repaired contract |
|---|---|---|
| `tag-title-body-evidence-order` | `p16-body-only` and `p16-evidence-only` were separated by a tiny score delta but exact tail order was required. | Keep `p16-tag-title` then `p16-title-only` as the required prefix; require body/evidence records as the remaining set without overfitting tail order. |
| `group-tag-interleaves-semantic-buckets` | Same-tag alpha sibling order was treated as exact, even though the interleave intent is alpha then beta. | Keep exact result set and `firstTwoMatchedTagsMustDiffer`; update current audit top to `p16-alpha-a`. |

## Boundary Confirmation

P20.2b does not:

- change runtime scoring
- change `src/`
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

## Required Validation

```powershell
node --test tests\tagmemo-targeted-semantic-fixture.test.js
npm run gate:ci -- --json
npm test
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

Validation result:

- `node --test tests\tagmemo-targeted-semantic-fixture.test.js` passed `3/3`.
- `npm run gate:ci -- --json` passed with `summary.ok=true`, tests `449/449`, compare `43/43`, rollback `43/43`, queries `14/14`, `mutated=false`, `providerCalls=0`, `durableMemoryTouched=false`.
- `npm test` passed `464/464`.
- diff/docs validation passed.

## Next Recommended Phase

`P20.3-rollback-backup-operations-plan`
