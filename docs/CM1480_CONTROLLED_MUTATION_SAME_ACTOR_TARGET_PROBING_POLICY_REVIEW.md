# CM-1480 Controlled Mutation Same-Actor Target Probing Policy Review

Date: 2026-06-09

Status: `COMPLETED_VALIDATED_POLICY_REVIEW_NO_RUNTIME_CHANGE`

Project status remains: `NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED`

## Goal

Decide whether public controlled mutation dry-run may expose `accepted`, `fromStatus`, `toStatus`, `newFromStatus`, or `newToStatus` when the target belongs to the same context-bound actor.

This review is docs-only. It does not execute confirmed mutation, does not execute `dry_run=false`, does not execute `confirm=true`, does not call provider/API, does not use bearer token material, does not perform raw scan, and does not claim readiness or `RC_READY`.

## Decision

`NO_GO_FOR_EXPOSING_ACCEPTED_AND_STATUS_TRANSITIONS_ON_PUBLIC_SAME_ACTOR_DRY_RUN`

`GO_FOR_FUTURE_UNIFIED_LOW_DISCLOSURE_PUBLIC_DRY_RUN_PROJECTION`

`NO_RUNTIME_CHANGE_IN_CM_1480`

Public controlled mutation dry-run should not expose a distinguishable successful same-actor target probe through `accepted=true`, `decision=dry-run`, `fromStatus`, `toStatus`, `newFromStatus`, or `newToStatus`.

The same-actor check is necessary, but it is not sufficient as a public disclosure boundary. The public MCP surface can still be used as a target probing oracle if a caller can guess or obtain candidate target ids. A same-actor eligible target currently produces a different projection than missing, private, cross-client, or policy-rejected targets. The lifecycle transition fields also reveal target metadata even when memory content, raw ids beyond the submitted target id, paths, titles, snippets, and raw store fields remain absent.

## Source Risk Table

| Source surface | Current CM-1479 behavior reviewed | Risk | Policy decision |
|---|---|---|---|
| Context-bound actor | Public path ignores `args.actor_client_id` and derives actor from `requestContext.executionContext` | Mitigates actor spoofing | Keep |
| Missing context actor | Public path rejects when request context cannot bind an actor | Mitigates anonymous public dry-run probing | Keep |
| Private/cross-client target | Public projection masks private/cross-client rejection behind a low-disclosure privacy-gate reason | Mitigates cross-client and private target disclosure | Keep and preserve |
| Same-actor existing target | Public projection can expose `accepted=true` and `decision=dry-run` for an eligible target | Existence and eligibility oracle for guessed target ids | No-go; future public projection should be unified low disclosure |
| Same-actor lifecycle transition | Public projection can expose `fromStatus` and `toStatus` | Reveals lifecycle metadata for a guessed target id | No-go; future public projection should suppress transition fields |
| Supersede pair transition | Public projection can expose `newFromStatus` and `newToStatus` | Pair-probing oracle across target/replacement relationships | No-go; future public projection should suppress pair transition fields |
| `dry_run=false` flag | Public path rejects before service call when `dry_run=false` appears | Mitigates accidental or adversarial confirmed mutation | Keep |
| `confirm=true` flag | Public path rejects before service call when `confirm=true` appears | Mitigates accidental or adversarial confirmed mutation | Keep |

## Tests Gap List

The CM-1479 tests cover actor binding, existing same-client allowed dry-run, cross-client low-disclosure rejection, and independent fail-closed handling for `dry_run=false` and `confirm=true`.

Policy gaps for a future source/test hardening slice:

- Add a public same-actor existing-record test requiring no `accepted=true` disclosure.
- Add a public same-actor existing-record test requiring no `fromStatus`, `toStatus`, `newFromStatus`, or `newToStatus` keys.
- Add an indistinguishability test for same-actor existing target versus missing or unauthorized target under the public projection.
- Add a `supersede_memory` pair-probing test proving public projection does not expose pair lifecycle status.
- Add an MCP `tools/call` context-bound same-actor test proving the public surface returns the same low-disclosure projection shape.
- Preserve independent fail-closed tests for `dry_run=false` and `confirm=true`.

## Future Low-Disclosure Contract

A future source/test task should make public controlled mutation dry-run return a uniform bounded projection that does not reveal target existence, eligibility, or lifecycle transition metadata.

Allowed public fields should stay limited to policy-gate metadata such as:

- `dryRun=true`
- `mutated=false`
- low-disclosure access mode
- stable policy/review-needed status
- stable low-disclosure reason

Disallowed public fields for the same-actor public projection:

- `accepted=true`
- `decision=dry-run` when it distinguishes target existence or eligibility
- `fromStatus`
- `toStatus`
- `newFromStatus`
- `newToStatus`
- raw memory, raw audit, content, title, snippet, path, provider, token, or store material

Internal/private exact approval flows may still need detailed dry-run transition evidence, but that must be separated from the public MCP dry-run projection and explicitly authorized.

## Go / No-Go

| Question | Decision | Reason |
|---|---|---|
| May same-actor public dry-run expose `accepted=true`? | No-go | It distinguishes an eligible existing target from missing or rejected targets. |
| May same-actor public dry-run expose lifecycle transition fields? | No-go | Status transitions are target metadata and can be probed. |
| Is CM-1479 actor binding still accepted? | Go | It removes trust in caller-provided actor id and should remain. |
| Is cross-client/private low-disclosure rejection still accepted? | Go | It is the safer public projection pattern. |
| Should CM-1480 change runtime source? | No-go in this task | CM-1480 is a policy review only. |
| Should a future source/test slice harden same-actor projection? | Go | The review identifies an open public probing risk. |

## Rollback / Evidence Checklist

For this docs-only review:

- Rollback: revert this document and matching status / board updates by Git.
- Evidence: diff review, docs validation, and status ledger entries.
- No runtime rollback is needed because no runtime code changed.

For a future source/test hardening slice:

- Preserve context-bound actor derivation.
- Preserve fail-closed `dry_run=false` and `confirm=true` behavior.
- Preserve private/cross-client low-disclosure rejection.
- Remove public same-actor target existence and lifecycle transition disclosure.
- Add targeted tests for same-actor existing target, missing target, cross-client target, supersede pair probing, and independent fail-closed flags.

## Explicit Non-Claims

CM-1480 does not:

- execute confirmed mutation
- execute `dry_run=false`
- execute `confirm=true`
- perform real mutation
- perform raw scan
- call provider/API
- use bearer token material
- claim readiness or `RC_READY`
- release, tag, deploy, or push
