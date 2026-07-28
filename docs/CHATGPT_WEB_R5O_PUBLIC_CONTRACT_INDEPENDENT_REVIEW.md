# ChatGPT Web R5-O Public Contract Independent Review

## Review Identity And Scope

This is an independent agent review of PR #61's public-contract and Relay
completion changes. It is not a human approval and does not authorize merge,
runtime activation, provider calls, private configuration access, or memory
reads/writes.

Post-review source follow-up: CM-2157 later wires the observer into canonical
Relay source and adds an owner-only, read-only snapshot UDS. That later change
is outside this historical PR #61 review and has not configured or verified a
real private runtime. See
`docs/CM2157_CANONICAL_RELAY_OBSERVER_WIRING.md`.

Reviewed range and state:

- base: `13f167358e4ce154e2af0248a396de3215adefaf`;
- original remote head:
  `8c6b5d193d30688b851444390f4740ca8c4e2a1e`;
- first remediation head:
  `56bca4221b036965aa2a04f39b997cb20bd9deaf`;
- current terminal-guidance remediation worktree before delivery.

## Verdict

`PASS_SOURCE / DELIVERY_PENDING`

No source-level blocker remains after the original and incremental independent
reviews. The first remediation was pushed, its exact-head CI passed, PR
metadata was corrected, and the two original review threads received truthful
dispositions. Exact-head automated review then identified one search
terminal-guidance mismatch; the current worktree fixes it and independent
incremental review returns `PASS`. Delivery still requires commit/push,
exact-head CI, and disposition of the current review threads, including the
observation-schema compatibility finding. Merge is a separate Jenn decision.
The final observation-compatibility incremental review returns `PASS` with
both version-relation blockers closed and no remaining source finding.

## Closed Findings

### Public request contract

- `requested_visibility` is required by the public descriptor, signed request
  schema, and runtime validator.
- The resolve digest transition is explicit:
  `sha256:323d0cdcd4ca76d41b0af27ce514c0446e30bd5ba87da8d172f024c69626bbb6`
  to
  `sha256:fe92ada83513b769a01d241fe1df483fcf3b9b0330b253cfa4c8a343b3093faf`.
- Omission fails before context issuance or a governed result receipt.
- This is an intentional breaking accepted-set change inside signed
  `schema_version: 1`, not descriptor-only metadata.
- Rollout is Edge first/Relay last; rollback is Relay first/Edge last.
- There is no default, inferred visibility, or dual-acceptance window.

### Capability-true routing

- Only `search_memory` promises stored content.
- `memory_overview`, `audit_memory`, and `prepare_memory_context` promise only
  fields present in their bounded status schemas: `status`, `kind`, and
  response `item_count`.
- `search_memory` terminal guidance preserves `result_count` and explicitly
  authorizes the returned `results[].summary` and `results[].relevance` for the
  answer, while continuing to forbid reporting or dereferencing `result_ref`
  and any follow-up read.
- Tests assert both descriptor text and code-level structured projections.

### Relay completion

- Response expiry uses the accepted request's remaining lifetime and cannot
  exceed request expiry.
- A request that expires during processing becomes terminal `expired`; it
  does not terminate the daemon.
- Incomplete UDS input keeps the daemon available/backing off but does not
  replay the acknowledged one-read request.
- A complete-call timeout is local completion uncertainty, not proof that the
  Edge rejected the response.

### Low-disclosure observer

- Latest request progress, success, failure, cancellation, and expiry override
  stale cumulative history in `completion_state`.
- Mixed success/failure/success and in-flight cancellation/expiry sequences
  are covered.
- Request identifiers, response bodies, raw memory, and secrets are not
  retained.
- At the reviewed PR #61 head, the observer was an injectable library only and
  the canonical executable did not wire or expose operational telemetry.

### Receipt validator maintenance

- The redundant monolithic `nativeEvidence()` revalidation block was removed.
- Named fail-closed receipt classifiers remain authoritative.

### Private observation schema compatibility

- The owner-only dogfood observation exact key set moves from v2 to v3 when
  `last_session.error_detail_code` becomes required.
- The current CLI validates v2 without that field and v3 with that field,
  preserving exact-key fail-closed behavior in both versions.
- A new runtime projects observation v2 for control-schema-2 clients and
  requires observation v3 for control-schema-3 clients; a stale v2 producer
  on the new schema-3 server path fails closed.
- A new CLI accepts observation v2 from a prior runtime; an older schema-2 CLI
  receives no unexpected v3-only field from the new runtime.
- Response/observation versions accept only `2 -> 2`, `3 -> 2`, and `3 -> 3`;
  the impossible `2 -> 3` combination fails closed.
- The compatibility projection carries no raw details and changes no public
  MCP name, schema, or digest.

## Validation Observed

- `git diff --check`: pass.
- R5-O: `6/6`.
- R5-K current-contract tests: `9/9`.
- all R5 files: `7/7`.
- R5 plus synthetic E2E: `8/8` file-level pass.
- selected Relay remaining-TTL, expiry-race, observer, and availability
  tests: pass.
- changed JavaScript syntax checks: pass.
- docs, current-facts drift, and ledger consistency gates: pass.
- first-remediation exact-head GitHub Actions run `30236898520`: pass on
  `56bca4221b036965aa2a04f39b997cb20bd9deaf`.
- terminal-guidance targeted regression: `12/12`.
- post-fix all R5 plus synthetic E2E: `48/48`; base R4 contracts: `9/9`.
- incremental independent review: `PASS`, no blocking finding.
- observation-v2/v3 compatibility and adjacent control/runtime tests:
  `16/16`.
- final observation-version independent incremental review: `PASS`, including
  accepted `2 -> 2`, `3 -> 2`, `3 -> 3`, rejected `2 -> 3`, and schema-3
  server rejection of a stale v2 producer.

The restricted local sandbox rejects listener creation with `EPERM`, so the
full listener-dependent Relay and HTTP cases require exact-head GitHub CI.

## Initial Delivery Blockers Closed On First Remediation

1. The first remediation was committed and pushed.
2. The stale PR title/body and false no-schema-change/same-request-retry claims
   were corrected.
3. Exact-head CI passed on
   `56bca4221b036965aa2a04f39b997cb20bd9deaf`.
4. The latest-event observer and injectable-only/non-operational telemetry
   threads were answered and resolved truthfully.

## Current Delivery Gates

1. Commit and push the independently reviewed compatibility fix.
2. Obtain terminal-success CI and current-head automated review.
3. Reply to and truthfully resolve the observation-schema review thread.
4. Merge only under Jenn's current explicit decision and after all gates pass.

## Accepted Residuals

- `SCHEMA_VERSION=1` remains an explicit compatibility exception whose safe
  delivery depends on the documented rollout/rollback order.
- The reviewed PR #61 head provided no operational observer telemetry in the
  canonical service; CM-2157 is a later source-only follow-up.
- An acknowledged request with incomplete UDS input is not replayed.
- Non-session mode cannot prove that a visibility value originated from an
  explicitly labelled user utterance; it retains the existing model-guidance
  plus registry-allowlist posture. No automatic-selection or user-intent
  provenance guarantee is claimed.
- Empty-search and MCP-handler terminal-text integration coverage remain
  non-blocking future test-depth improvements; the core found-result regression
  and all three shared bounded-status behaviors were independently reviewed.
