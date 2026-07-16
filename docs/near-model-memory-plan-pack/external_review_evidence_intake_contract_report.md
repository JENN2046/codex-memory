# External Review Evidence Intake Contract Report

Task id: `CM-2026`
Validation id: `CMV-2127`
Date: `2026-07-10`

## Result

`CM-2026` adds a local Phase 9 / Phase 10 external review evidence intake
preflight contract.

The contract connects the CM-2015 default runtime policy gate and CM-2016
release tag readiness policy gate to the CM-2017 completion-audit review
evidence requirements without accepting review evidence, expanding the default
runtime, accepting a tag approval packet, creating tags, publishing releases,
or claiming readiness.

## Added Contract

Source:

```text
src/core/PlanPackExternalReviewEvidenceIntakeContract.js
```

Test:

```text
tests/plan-pack-external-review-evidence-intake-contract.test.js
```

## Intake Rules

The preflight requires:

- CM-2015 default runtime policy gate implemented;
- CM-2016 release tag readiness policy gate implemented;
- CM-2017 completion audit requiring review evidence;
- CM-2024 trace matrix requiring external-review evidence;
- default runtime still held to read/context/proposal;
- tag/release action still requiring separate approval.

It accepts only proposed review evidence markers:

```text
requires_future_observation_or_dogfood_review
requires_future_external_review
requires_future_tag_approval_packet
```

for these completion-audit fields:

- `phase9ObservationOrDogfoodReviewPassed`;
- `phase9ExternalReviewPassed`;
- `phase10ExternalReviewPassed`;
- `phase10TagApprovalPacketPassed`.

Those markers are not accepted as completion evidence now. Local policy gates
cannot satisfy external review or tag approval packet evidence by themselves.

## Boundary

CM-2026 performs:

```text
observation windows accepted: 0
external reviews accepted: 0
tag approval packets accepted: 0
completion audit patch applications: 0
runtime calls: 0
live VCPToolBox calls: 0
default runtime expansions: 0
provider/API calls: 0
native read attempts: 0
native write attempts: 0
memory reads: 0
real memory reads: 0
raw private reads: 0
durable mutations: 0
public MCP expansions: 0
tag create actions: 0
tag push actions: 0
release publish actions: 0
deploy actions: 0
cutover actions: 0
readiness claims: 0
```

## Tests

Focused tests cover:

- accepted external review evidence intake preflight without accepting review
  evidence;
- missing prerequisite gate-chain evidence blocks intake;
- local policy gates or booleans masquerading as review evidence are rejected;
- local gate substitution, default expansion, tag approval, tag/release, and
  readiness counters stop L4;
- raw secret runtime fields are rejected by path only without value echo.

## Non-Claims

CM-2026 does not:

- complete an observation window or dogfood review;
- accept external review;
- accept a tag approval packet;
- apply a completion-audit patch;
- expand the default runtime;
- accept approval;
- generate, disclose, store, or submit approval-line material;
- call VCPToolBox runtime;
- call a provider/API;
- perform native read, native write, or durable mutation;
- read real/private memory;
- read raw private state;
- expand public MCP;
- create or push tags;
- publish a release;
- deploy or cut over;
- claim full plan-pack completion;
- claim production, release, deploy, cutover, or `RC_READY` readiness.

## Next Gate

Phase 9 and Phase 10 still require separate observation or equivalent dogfood
review, external review, and tag approval packet evidence before any
completion-audit patch, default-runtime policy reconsideration, tag, release,
deploy, cutover, or readiness claim can be considered.
