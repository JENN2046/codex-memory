# Phase E Error Diagnostics 01

## Summary

- Scope: `Phase E / P1`
- Goal: improve donor-style active-memory error diagnostics without changing the stable top-level error envelope
- Strategy: keep `status/error/result` unchanged and move richer troubleshooting context into `meta`

## Change

- Updated `src/cli/active-memory-cli-common.js`
  - error payload sanitization now preserves existing `error.meta`
  - CLI error meta merge now keeps earlier, richer values when the same error is enriched more than once
- Updated `src/cli/deepmemo.js`
  - adds CLI-side error meta for `invalid-json`
  - adds CLI-side error meta for `all-keywords-blocked`
- Updated `src/cli/topicmemo.js`
  - adds CLI-side error meta for command/maid/topic context on TopicMemo failures
- Updated `tests/vcp-active-memory-cli.test.js`
  - added regression coverage for invalid JSON diagnostics
  - added regression coverage for blocked-keyword diagnostics
  - added regression coverage for TopicMemo agent lookup diagnostics

## Why

- top-level donor compatibility was already in good shape
- the missing piece was fast operator-facing context when a CLI run fails
- putting diagnostics in `meta` avoids reopening the extended-drift problem while still making errors more actionable

## Validation

- `node --test .\tests\vcp-active-memory-cli.test.js`
- `npm test`

## Result

- `DeepMemo` error payloads now preserve `inputSource/rawInputPreview` for invalid JSON
- `DeepMemo` blocked-keyword errors now surface blocked/effective keyword diagnostics in `meta`
- `TopicMemo` agent lookup failures now surface command and target context in `meta`
- CLI regression baseline is now `5/5`
- full regression baseline is now `94/94`
