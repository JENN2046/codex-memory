# Phase E Ordering Tiebreaker 04

## Summary

- Scope: `Phase E / P1-2`
- Goal: make the cross-topic tie-break precedence explicit when compactness and freshness disagree
- Strategy: keep implementation unchanged and lock the current priority order in regression tests

## Change

- Added a dedicated `compact-vs-fresh` fixture in `tests/phase-c-active-recall.test.js`
- added a new regression:
  - `Phase C should keep compactness ahead of freshness when cross-topic DeepMemo tie-breakers conflict`

## Why

- after the previous cuts, the remaining ambiguity was no longer “what rule exists”, but “which rule wins first”
- current behavior already prefers compactness before freshness for cross-topic equal-score results
- this test freezes that order so later donor-feel tuning cannot silently swap it

## Validation

- `node --test .\tests\phase-c-active-recall.test.js`
- `npm test`

## Result

- conflict fixture now proves `topic_compact_older` stays ahead of `topic_fresh_wider`
- phase-c ordering suite baseline is now `20/20`
- full regression baseline is now `91/91`
