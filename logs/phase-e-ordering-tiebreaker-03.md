# Phase E Ordering Tiebreaker 03

## Summary

- Scope: `Phase E / P1-2`
- Goal: add one more donor-feel tie-breaker without breaking the two ordering edges already locked in
- Strategy: prefer the more compact hit window only for cross-topic equal-score DeepMemo results

## Change

- Updated `src/storage/ChatHistoryIndexStore.js`
- `ChatHistoryIndexStore.search()` now distinguishes two cases after `matchedClauseCount / keywordMatchCount / score` tie:
  - same topic: still prefer the later `hitMessageIndex`
  - different topics: prefer the smaller hit window span before falling back to freshness and index
- added a dedicated compact-window fixture regression in `tests/phase-c-active-recall.test.js`

## Why

- the first attempt surfaced a useful constraint: compact-window preference should not override the same-topic “newer hit window wins” behavior
- donor feel is better when cross-topic equal-score results reward tighter evidence windows
- the final shape keeps both rules narrow and non-conflicting

## Validation

- `node --test .\tests\phase-c-active-recall.test.js`
- `npm test`

## Result

- new regression passes with expected topic order `['topic_compact_window', 'topic_wide_window']`
- same-topic equal-score regression remains green with `hitMessageIndex = [4, 2, 0]`
- full regression baseline is now `90/90`
