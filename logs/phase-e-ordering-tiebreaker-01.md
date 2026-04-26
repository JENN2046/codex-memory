# Phase E Ordering Tiebreaker 01

## Summary

- Scope: `Phase E / P1-2`
- Goal: make active-memory ordering feel a bit closer to donor without disturbing the stable compare/rollback contract
- Strategy: only change the same-score tie-breaker inside a single conversation

## Change

- Updated `src/storage/ChatHistoryIndexStore.js`
- when `matchedClauseCount`, `keywordMatchCount`, and `score` are all equal, `DeepMemo` now prefers the later `messageIndex`
- added a dedicated equal-score fixture regression in `tests/phase-c-active-recall.test.js`

## Why

- this is a low-risk way to bias toward the newer hit window
- it does not change recall coverage
- it does not disturb standard active-memory compare/rollback suite behavior

## Validation

- `node --test .\tests\phase-c-active-recall.test.js`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
- `npm test`

## Result

- new regression passes with expected order `hitMessageIndex = [4, 2, 0]`
- compare/rollback standard suite remains green
- full regression baseline is now `88/88`
