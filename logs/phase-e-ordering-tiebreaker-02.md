# Phase E Ordering Tiebreaker 02

## Summary

- Scope: `Phase E / P1-2`
- Goal: keep donor ordering feel closer on cross-topic equal-score DeepMemo results without widening behavior risk
- Strategy: add an explicit global result tie-break that only activates after `matchedClauseCount / keywordMatchCount / score` all tie

## Change

- Updated `src/storage/ChatHistoryIndexStore.js`
- `ChatHistoryIndexStore.search()` now applies a final global sort before slicing:
  - `matchedClauseCount` desc
  - `keywordMatchCount` desc
  - `score` desc
  - `updatedAt` desc
  - `hitMessageIndex` desc
  - `topicId` lexical fallback
- added a dedicated cross-topic equal-score fixture regression in `tests/phase-c-active-recall.test.js`

## Why

- previously, cross-topic equal-score ordering could still inherit implicit conversation traversal order
- donor feel is closer when the fresher topic wins after the score-level fields tie
- this keeps the change narrow: no recall expansion, no query syntax change, no adapter contract change

## Validation

- `node --test .\tests\phase-c-active-recall.test.js`
- `node --test .\tests\compare-vcp-active-memory-cli.test.js .\tests\rollback-active-memory-cli.test.js`
- `npm test`

## Result

- new regression passes with expected topic order `['topic_beta_equal', 'topic_alpha_equal']`
- compare/rollback standard suite remains green
- full regression baseline is now `89/89`
