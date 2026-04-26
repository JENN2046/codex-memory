# Phase E Ordering Tiebreaker 05

## Summary

- Scope: `Phase E / P1-2`
- Goal: lock the final fallback ordering when every higher-priority DeepMemo tie-breaker is exhausted
- Strategy: add a regression where score, compactness, and freshness all tie, so the last lexical `topicId` fallback is the only deciding factor

## Change

- Added a dedicated `topicid-fallback` fixture in `tests/phase-c-active-recall.test.js`
- added a new regression:
  - `Phase C should fall back to lexical topicId order when cross-topic DeepMemo tie-breakers fully tie`

## Why

- after the previous four cuts, the remaining unstable edge was the very last comparator branch
- current implementation already falls back to lexical `topicId`
- this test turns that implementation detail into an explicit compatibility contract

## Validation

- `node --test .\tests\phase-c-active-recall.test.js`
- `npm test`

## Result

- fallback fixture now proves `topic_alpha_fallback` stays ahead of `topic_beta_fallback`
- phase-c ordering suite baseline is now `21/21`
- full regression baseline is now `92/92`
