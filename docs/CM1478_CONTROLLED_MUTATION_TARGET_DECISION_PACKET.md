# CM-1478 Controlled Mutation Target Decision Packet

Date: 2026-06-09

## Purpose

This packet records the exact decision surface for an operator-provided controlled mutation target and mutation type.

It does not select a target id.

It does not look up a target id.

It does not execute mutation.

It does not authorize `dry_run=false` or `confirm=true`.

Project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`.

## Operator Decision State

```text
operator_exact_target_id_provided: false
operator_mutation_type_provided: false
agent_selected_target_id: false
confirmed_mutation_authorized: false
```

CM-1478 records the required decision shape only. No actual target id or mutation type value is selected in this packet.

## Required Operator Fields

A future operator target decision must provide exactly these fields:

```yaml
decision_id: CM1478-CONTROLLED-MUTATION-TARGET-DECISION-<date>
operator_provided_target:
  memory_id: <OPERATOR_PROVIDED_EXACT_TARGET_ID>
  source: operator_provided
  agent_selected: false
  content_print_allowed: false
mutation_type: validate_memory | tombstone_memory | supersede_memory
decision_scope:
  target_selection_only: true
  dry_run_projection_authorized: false
  confirmed_apply_authorized: false
required_before_apply:
  - bounded_dry_run_projection_packet
  - selected_low_disclosure_audit_evidence
  - rollback_readiness_checklist
  - post_apply_evidence_checklist
  - separate_confirmed_apply_approval
forbidden:
  - agent_selected_target_id
  - dry_run_false
  - confirm_true
  - real_mutation
  - raw_scan
  - provider_api_call
  - bearer_token_use
  - readiness_claim
  - rc_ready_claim
```

## Mutation Type Constraint

The future operator decision must choose exactly one mutation type:

| Mutation Type | Allowed In Target Decision Packet | Executes Mutation Here |
|---|---:|---:|
| `validate_memory` | yes | no |
| `tombstone_memory` | yes | no |
| `supersede_memory` | yes | no |

If zero or more than one mutation type is provided, the decision fails closed.

## Target Id Constraint

The future target id must be:

- provided directly by the operator
- exact and singular
- represented as a value for `<OPERATOR_PROVIDED_EXACT_TARGET_ID>`
- not inferred by the agent
- not discovered by raw scan, search, provider/API call, bearer-token path, broad memory read, raw audit read, JSONL read, SQLite scan, vector scan, or cache scan

If the target id is missing, ambiguous, agent-selected, or discovered through a forbidden path, the decision fails closed.

## Rollback Checklist

A future operator-provided target decision must keep rollback blocked until all items are later recorded:

- exact target id is operator-provided
- exactly one mutation type is selected
- pre-apply lifecycle state is available from low-disclosure selected evidence
- inverse controlled mutation path is identified
- rollback approval remains separate from target decision and apply approval
- rollback evidence does not require raw memory content
- target audit trail is preserved
- project status remains `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Evidence Checklist

A target decision closeout must record:

- decision id
- operator provided target id presence only
- mutation type selected from the three allowed values
- agent-selected target id status `false`
- raw scan count `0`
- provider/API call count `0`
- bearer-token use count `0`
- mutation call count `0`
- `dry_run=false` use count `0`
- `confirm=true` use count `0`
- readiness claim status `false`
- `RC_READY` claim status `false`

## Explicit Non-Claims

CM-1478 does not provide a real live target id.

CM-1478 does not choose a mutation type.

CM-1478 does not execute `dry_run=false`.

CM-1478 does not execute `confirm=true`.

CM-1478 does not execute real mutation.

CM-1478 does not scan raw memory, raw audit, raw JSONL, SQLite, vector, or cache stores.

CM-1478 does not call provider/API.

CM-1478 does not use bearer token.

CM-1478 does not claim readiness.

CM-1478 does not claim `RC_READY`.

CM-1478 does not release, tag, deploy, or push.

## Boundary Receipt

This packet is docs/status/board only.

No target memory content was read or printed.

No target id was looked up or selected by the agent.

No controlled mutation apply occurred.

No `dry_run=false` or `confirm=true` call occurred.

No real mutation, raw scan, provider/API call, bearer-token use, readiness claim, `RC_READY` claim, release/tag/deploy, remote action, or push occurred.
