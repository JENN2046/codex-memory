# Recall Precision Hardening Plan

Date: 2026-05-22

Task: `CM-0807`

Validation: `CMV-0926`

Inputs:

- `docs/CM0774_SECOND_NEGATIVE_CONTROL_FAILURE_REVIEW.md`
- `docs/CM0774_SECOND_NEGATIVE_CONTROL_PROOF_EXECUTION.md`
- `docs/CM0774_TRUE_LIVE_REAL_STORE_PROOF_EXECUTION.md`
- `docs/CURRENT_RUNTIME_GAP_TRUTH_TABLE.md`
- `src/recall/*`
- `src/app.js`

Result: `RECALL_PRECISION_HARDENING_PLAN_COMPLETED_SYNCED_NOT_READY`

Controlling state: `RC_NOT_READY_BLOCKED`

## Scope

This is a planning-only hardening packet for the CM-0806 negative-control suppression failure. It does not execute a new true live `search_memory`, does not execute `record_memory`, does not read raw memory content, does not read `.jsonl` or durable memory content, does not call providers/models/APIs, does not write durable memory/audit state, does not expand public MCP, does not change package/config/watchdog/startup state, does not apply rollback/migration/import/export/backup/restore, does not tag/release/deploy/cutover, and does not make any readiness or reliability claim.

## Source Observations

Read-only source review found these current precision-relevant surfaces:

- `src/recall/CandidateGenerator.js` ranks chunks and currently keeps candidates with `candidate.score > 0`.
- `CandidateGenerator.scoreChunk()` combines vector, lexical, TagMemo, structural, context, diary, and source-bias scores.
- `src/recall/KnowledgeBaseRecallPipeline.js` finalizes chunk candidates, aggregates by memory id/source, and can return sanitized metadata while `includeContent=false`.
- `src/core/RecallEnhancer.js` deduplicates, optionally reranks/groups, sorts, and slices results, but does not currently impose an explicit low-confidence no-result gate.
- `src/app.js` runs `search_memory` through `passiveRecallService.search()` with `readOnly=true` under no-token proof mode, avoiding audit writes, but the read-only path still uses the same precision behavior.

This explains the CM-0806 finding: the runner/adapter boundary can be clean while low-confidence or broad-match candidates still appear for irrelevant negative-control strings.

## Hardening Strategy

### Retrieval Threshold Strategy

Introduce a bounded precision policy at the recall pipeline or candidate-finalization boundary, not as a public MCP schema expansion.

Plan:

- Define a local policy object for proof/internal read-only contexts first, for example `recallPrecisionPolicy`.
- Require a minimum accepted score for negative-control or low-confidence proof contexts.
- Require at least one stronger positive signal for ordinary acceptance, such as lexical/token overlap, matched core tags, title/tag/content hits, or an approved high score.
- Keep default public behavior unchanged until fixture evidence proves the policy does not regress expected recall.
- Expose policy decisions only as sanitized metadata in tests/docs, not raw content.

### Negative-Control Gating

Add a deterministic negative-control gate for proof contexts.

Plan:

- Treat query families marked as `stricter_negative_control` or equivalent internal proof context as no-result expected slots.
- If a negative-control slot has no lexical/tag/core overlap and candidate scores remain below the approved threshold, return an empty result set.
- If candidates exceed a future approved threshold, fail the proof review path rather than claiming reliability.
- Ensure the gate is internal to proof/bounded tests first and does not silently hide general user search behavior.

### Minimum Score Policy

Use CM-0805 sanitized scores as initial planning evidence only, not final thresholds:

- NC1 top score: `0.098152`
- NC2 top score: `0.018801`
- NC3 top score: `0.058401`
- NC4 top score: `0.075486`

Plan:

- Start with fixture tests proving that irrelevant synthetic queries below a chosen minimum score return no results.
- Require expected-recall fixture queries to remain above threshold and still return the intended records.
- Review score components with sanitized fields only: final `score`, `baseScore`, `rerankScore`, and metadata key names.
- Do not use live raw memory or `.jsonl` to tune thresholds.

### Sanitized Score Distribution Review

Before any new live proof, collect score distribution evidence only from synthetic fixture/temp/local bounded tests.

Allowed evidence shape:

- query family
- result count
- min/max/top score
- score bucket counts
- accepted/rejected candidate counts
- metadata key names
- booleans for raw content absence and side-effect counters

Forbidden evidence shape:

- raw content
- raw title
- raw snippet
- raw text
- raw file path
- direct `.jsonl` location
- durable memory payload

### No-Result Mode

Define an explicit no-result mode for internal proof contexts.

Plan:

- `proofNoResultMode=true` should be allowed only for internal runner/adapter or targeted fixture tests.
- In no-result mode, a negative-control slot passes only when the policy returns an empty result set and boundary counters remain complete zero.
- Any returned candidate is `FAILED_NOT_READY`, not reliability evidence.
- Missing policy decision metadata in tests should fail closed.

### Stricter Filter / Exact Negative-Control Reject Policy

Plan:

- Reject negative-control candidates when all of these are true: score below threshold, no lexical overlap, no matched tags/core tags, no title/content/evidence hits, and no approved high-confidence signal.
- Reject candidate sets if every candidate is below the proof threshold even when vector similarity is positive.
- Preserve a separate path for expected-recall queries so the hardening does not become a blanket empty-result hack.
- Add exact policy labels such as `accepted_expected_recall`, `rejected_negative_control_low_confidence`, `failed_negative_control_candidate_above_threshold`, and `blocked_policy_metadata_missing`.

## Fixture / Temp / Local Bounded Test Plan

These can be validated before any future exact-approved live proof:

- Unit-test the precision policy with synthetic candidate objects and sanitized score components.
- Candidate-generator fixture test: irrelevant synthetic query returns only below-threshold candidates and gets rejected.
- Pipeline fixture test: expected query still returns the known synthetic record while negative-control query returns zero.
- RecallEnhancer fixture test: dedup/rerank cannot reintroduce below-threshold rejected candidates.
- Internal runner fixture test: `stricter_negative_control` slots fail closed if policy metadata is missing or malformed.
- Temp/local bounded recall test: isolated temp records, exact synthetic seeds, no provider, no `.jsonl`, no durable write, sanitized distribution summary only.

## Future Exact-Approved Live Proof Requirement

A future live proof is required only after local bounded hardening passes.

Future live proof must be separately exact-approved and must preserve:

- exactly four negative-control queries or a separately approved revised fixed set
- sanitized output only
- complete zero side-effect counters
- no raw memory
- no direct `.jsonl`
- no provider/model/API call
- no durable memory/audit write
- no readiness or reliability claim

Passing a future live proof still only means `PASSED_NOT_READY` until a separate proof review and truth-table update are performed.

## Why Third Live Query Is Blocked Now

Direct third-round live query is not the next safe step because CM-0805 and the exact rerun both produced the same sanitized failure shape: every negative-control slot returned nonzero results while the boundary remained clean.

Another live query before hardening would likely measure the same uncorrected precision behavior, consume exact approval budget, and create more evidence without closing the blocker. The safe next move is local precision hardening design and fixture proof first.

## Pass / Fail Labels

Allowed future implementation/test labels:

- `RECALL_PRECISION_HARDENING_PLAN_COMPLETED_SYNCED_NOT_READY`: this planning packet is complete and synced.
- `RECALL_PRECISION_HARDENING_IMPLEMENTED_BOUNDED_NOT_READY`: code/test hardening is implemented with fixture/temp/local bounded evidence only.
- `RECALL_PRECISION_HARDENING_NEEDS_PATCH`: targeted tests or review find gaps in threshold/gating/no-result policy.
- `RECALL_PRECISION_LIVE_PROOF_READY_FOR_EXACT_APPROVAL`: bounded hardening evidence is sufficient to request a future exact-approved live proof.
- `RECALL_PRECISION_LIVE_PROOF_PASSED_NOT_READY`: future exact-approved live proof returns zero negative-control results with clean counters.
- `RECALL_PRECISION_LIVE_PROOF_FAILED_NOT_READY`: future exact-approved live proof returns any nonzero negative-control result or boundary failure.

## No-Readiness Wording

This plan does not prove `memory recall reliable`.

The truth table remains `bounded evidence only` and `complete? = no`.

`RC_NOT_READY_BLOCKED` remains.

Do not describe fixture pass, bounded local pass, or future live proof pass as runtime ready, RC ready, production ready, release ready, cutover ready, or memory recall reliable.

## Decision

`RECALL_PRECISION_HARDENING_PLAN_COMPLETED_SYNCED_NOT_READY`

The next safe scope is a bounded implementation/test hardening batch, not another true live negative-control query.
