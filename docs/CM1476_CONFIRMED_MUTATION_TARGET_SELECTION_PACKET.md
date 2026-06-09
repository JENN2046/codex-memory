# CM-1476 Confirmed Mutation Target Selection Packet

Date: 2026-06-09

## Purpose

This packet defines the smallest safe target-selection path for a future confirmed controlled mutation.

It does not select a live memory row.

It does not execute mutation.

It does not authorize `dry_run=false` or `confirm=true`.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Target Selection Decision

Future confirmed mutation target selection must use one exact, operator-named candidate and must avoid broad discovery.

The minimum safe target class is:

```text
one synthetic, non-private, low-risk process memory that was created for governance testing or explicitly named by the operator
```

The future target must not be selected by scanning raw stores, browsing broad memory contents, reading raw audit rows, or inferring from private/client-specific memory.

## Candidate Requirements

A future candidate must satisfy all requirements:

- exactly one `memory_id`
- exact tool family selected: `validate_memory`, `tombstone_memory`, or `supersede_memory`
- target is synthetic, governance-safe, and non-secret-bearing
- target is not user-private or cross-client private
- target is not needed for rollback, audit, release, or operational continuity
- target has an explicit reason for mutation
- target has a bounded dry-run projection available before confirmed apply
- target has a rollback posture that does not require raw memory content
- target can be referenced without printing raw content, title, snippet, filesystem path, raw audit row, or token material

If any candidate requirement is unknown, the target selection must fail closed.

## Exact Target Approval Fields

Future target-selection approval must include:

```yaml
approval_id: CM1476-CONFIRMED-MUTATION-TARGET-SELECTION-<date>
selected_tool: validate_memory | tombstone_memory | supersede_memory
selected_target:
  memory_id: <EXACT_SINGLE_MEMORY_ID>
  target_class: synthetic_governance_safe_process_memory
  privacy_class: non_private
  content_print_allowed: false
selection_basis:
  source: operator_named_candidate | previously_sanitized_receipt
  raw_scan_used: false
  provider_api_used: false
  bearer_token_used: false
pre_apply_requirements:
  - dry_run_projection_required
  - selected_audit_evidence_required
  - rollback_checklist_required
  - post_mutation_evidence_checklist_required
forbidden:
  - dry_run_false
  - confirm_true
  - real_mutation
  - raw_scan
  - provider_api_call
  - bearer_token_use
  - readiness_claim
  - rc_ready_claim
operator_acknowledges:
  - target selection is not mutation approval
  - a later single-use confirmed apply approval is still required
```

This approval shape only selects a candidate target. It does not approve confirmed mutation execution.

## No-Apply Preflight Checklist

Before a future confirmed apply packet can be considered, the target-selection preflight must record:

- candidate `memory_id` is exact and singular
- target class is synthetic/governance-safe
- privacy class is non-private
- no raw content was printed
- no raw audit/store scan was used
- no provider/API call was used
- no bearer token was used
- no mutation call was made
- dry-run projection is still required
- rollback evidence is still required
- confirmed apply approval is still required

## Rollback Checklist

The future selected target must have a rollback checklist:

1. record the pre-apply lifecycle status from selected low-disclosure evidence only
2. record the intended lifecycle status transition without raw content
3. identify the inverse controlled mutation path
4. require a separate rollback approval before any rollback call
5. preserve the target's audit trail
6. preserve `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Evidence Checklist

A target-selection closeout must record:

- approval id
- selected tool
- selected target id presence, without content
- candidate requirement pass/fail summary
- raw scan count `0`
- provider/API call count `0`
- bearer-token use count `0`
- mutation call count `0`
- readiness claim status `false`
- `RC_READY` claim status `false`

## Explicit Non-Claims

CM-1476 does not choose a real live target id.

CM-1476 does not execute `dry_run=false`.

CM-1476 does not execute `confirm=true`.

CM-1476 does not execute real mutation.

CM-1476 does not scan raw memory, raw audit, raw JSONL, SQLite, vector, or cache stores.

CM-1476 does not call provider/API.

CM-1476 does not use bearer token.

CM-1476 does not claim readiness.

CM-1476 does not claim `RC_READY`.

## Boundary Receipt

This packet is docs/status/board only.

No target memory content was read or printed.

No controlled mutation apply occurred.

No `dry_run=false` or `confirm=true` call occurred.

No real mutation, raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push occurred.
