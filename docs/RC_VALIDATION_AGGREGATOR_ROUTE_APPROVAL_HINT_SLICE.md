# RC ValidationAggregator Route Approval Hint Slice

Date: 2026-06-03

Status: `SOURCE_TEST_SLICE_ACCEPTED_NOT_RC_READY`

## Scope

This slice adds approval-template hints to remaining-gap RC route rows in the
embedded RC-9 decision packet.

The hints identify which exact approval family is needed for the next route
step. They do not create approval, accept approval, run any command, or authorize
cutover.

## Implemented Behavior

Each remaining-gap route row now includes `rcRouteApprovalTemplateHint`.

Examples:

- `RC-5` -> `A5-GAP-1 governance readonly current-head sanitized report approval`
- `RC-6` -> `A5-GAP-2 bounded recall isolation no-mutation approval`
- `RC-7` -> `A5-GAP-3 migration fixture-only dry-run no-apply approval`
- `RC-4` -> `A5-GAP-4 live HTTP MCP no-write contract approval`
- `RC-2` -> `A5-GAP-5 cutover-context strict gate only approval`
- `RC-10` -> `RC-10 exact cutover approval with commit actions config rollback validation`

Local aggregator source/test rows report `none_local_source_test`. Unknown gaps
fail closed to `manual_review_required_before_approval_template`.

## Boundary

- No approval was generated or accepted.
- No runtime evidence was executed.
- No MCP tool or provider call occurred.
- No real memory, store, diary, vector, or audit data was scanned or mutated.
- No durable memory or audit write occurred.
- No config, watchdog, startup, dependency, push, tag, release, deploy, or
  cutover action occurred.
- No RC readiness claim was made.

## Validation

Targeted validation:

```powershell
node --check src\core\ValidationAggregatorService.js
node --check tests\v1-rc-validation-aggregator-implementation.test.js
node --check tests\v1-rc-validation-aggregator-cli.test.js
node --test tests\v1-rc-validation-aggregator-implementation.test.js
node --test tests\v1-rc-validation-aggregator-cli.test.js
```

Result:

- `tests\v1-rc-validation-aggregator-implementation.test.js` passed `27/27`.
- `tests\v1-rc-validation-aggregator-cli.test.js` passed `13/13`.

## Result

This advances the local source/test proof chain for
`validation_aggregator_full_implementation_incomplete`.

It does not close full RC readiness. RC-10 cutover remains a Red Lane action and
is not executed.
