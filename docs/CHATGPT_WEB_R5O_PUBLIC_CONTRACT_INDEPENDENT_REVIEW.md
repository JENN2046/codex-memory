# ChatGPT Web R5-O Public Contract Independent Review

## Review Identity And Scope

This is an independent agent review of PR #61's public-contract and Relay
completion changes. It is not a human approval and does not authorize merge,
runtime activation, provider calls, private configuration access, or memory
reads/writes.

Reviewed range and state:

- base: `13f167358e4ce154e2af0248a396de3215adefaf`;
- original remote head:
  `8c6b5d193d30688b851444390f4740ca8c4e2a1e`;
- current remediation worktree before delivery.

## Verdict

`CONDITIONAL_PASS_SOURCE / BLOCKED_DELIVERY`

No source-level blocker remains after remediation. Delivery remains blocked
until the remediation commit is pushed, PR metadata is corrected, exact-head
CI passes, and the two review threads receive truthful dispositions. Merge is
a separate Jenn decision.

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
- The observer is an injectable library only. The canonical executable does
  not wire or expose operational telemetry; documentation no longer claims
  otherwise.

### Receipt validator maintenance

- The redundant monolithic `nativeEvidence()` revalidation block was removed.
- Named fail-closed receipt classifiers remain authoritative.

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

The restricted local sandbox rejects listener creation with `EPERM`, so the
full listener-dependent Relay and HTTP cases require exact-head GitHub CI.

## Delivery Blockers At Review Completion

1. Commit and push the remediation.
2. Replace the stale PR title/body, including the false no-schema-change and
   same-request-retry claims.
3. Obtain terminal-success CI for the new head.
4. Reply to and truthfully resolve or retain both review threads:
   latest-event observer correctness, and the decision to keep observer
   telemetry injectable-only/non-operational.
5. Do not merge without Jenn's separate current decision.

## Accepted Residuals

- `SCHEMA_VERSION=1` remains an explicit compatibility exception whose safe
  delivery depends on the documented rollout/rollback order.
- The observer provides no operational telemetry in the canonical service.
- An acknowledged request with incomplete UDS input is not replayed.
- Non-session mode cannot prove that a visibility value originated from an
  explicitly labelled user utterance; it retains the existing model-guidance
  plus registry-allowlist posture. No automatic-selection or user-intent
  provenance guarantee is claimed.
