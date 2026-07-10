# Phase 10 Release Tag Readiness Policy Gate Report

Task id: `CM-2016`
Validation id: `CMV-2117`
Date: `2026-07-10`

## CM-2083 Real Packet Update

CM-2083 prepares a real, frozen Tag Approval Packet for candidate
`v0.2.0-readonly-context-rc`, targeting commit `170ee339…221b` and tree
`c3e12feb…3b33`. The recursively canonicalized packet payload SHA-256 is
`c06836b4c9de74f8031cf665f050b9e1c668edfd2a1584a26713c28263c6aa43`.
Release-note non-claims SHA-256 is `e429fe2a…5d90e`.

The local policy shape passes, but `tagApprovalPacketPassed` remains false until
an independent decision accepts the exact packet. Packet approval still would
not authorize `git tag`, tag push, release, deploy, cutover, or readiness claims.

## Result

`CM-2016` adds a local Phase 10 release tag readiness policy gate.

The gate covers:

- `P10-T1` milestone naming review;
- `P10-T2` release note non-claims review;
- `P10-T3` tag approval packet evaluation.

It does not create a tag, push a tag, create a GitHub release, deploy, cut over,
or claim readiness.

## Allowed Candidate Names

Allowed candidate families:

```text
v<major>.<minor>.<patch>-readonly-context-rc
v<major>.<minor>.<patch>-operator-full-surface-rc
v<major>.<minor>.<patch>-native-write-proof-rc
```

Plan-pack example:

```text
v0.2.0-readonly-context-rc
```

## Forbidden Candidate Names

Forbidden fragments include:

```text
full-vcp-memory
full-memory
full-capability
complete-realtime-memory
complete-memory
model-memory-complete
production-write
production-ready
release-ready
deploy-ready
cutover-ready
rc-ready
rc_ready
```

## Evidence Gates

For `readonly_context`, the gate requires:

- Phase 1 blockers fixed;
- `test:all` evidence;
- `gate:ci` evidence;
- default read-only surface evidence;
- native read proof evidence;
- fallback distinction evidence;
- `prepare_memory_context` MVP evidence;
- recall quality baseline evidence;
- README non-claims evidence;
- release note non-claims review;
- external review evidence intake local contract evidence;
- external review evidence bundle local contract evidence;
- external review patch hardened bundle binding local contract evidence;
- external review application patch preflight local contract evidence;
- external review evidence.

For higher milestones, it requires their matching operator or native-write proof
evidence, and still requires release note non-claims review plus the hardened
external-review chain and external review.

CM-2048 update: the gate now exposes
`externalReviewEvidenceChain.requiredEvidence` and rejects tag approval packet
preflight when the hardened external-review intake / bundle / patch chain is
missing or stale. This prevents `externalReviewPassed` from bypassing the
CM-2033 / CM-2047 review-bundle preflight chain. It still does not accept
review evidence, accept tag approval, create or push tags, publish releases,
deploy, cut over, or claim readiness.

## Non-Claims

This gate is not:

- an actual Git tag;
- a tag push;
- a GitHub release;
- release publication;
- deployment;
- cutover;
- production readiness;
- release readiness;
- `RC_READY`;
- full capability;
- model memory completion;
- native write production proof.

## Evidence

Targeted tests:

```text
node --test tests/release-tag-readiness-policy-gate.test.js
```

Covered paths:

- accepts `v0.2.0-readonly-context-rc` only with complete evidence;
- rejects missing external review / gate evidence;
- rejects missing hardened external-review chain evidence before tag approval
  packet acceptance;
- rejects forbidden full/production tag names;
- rejects release note full-capability / production-write claims;
- requires release note non-claims review;
- supports operator/native milestone naming without readiness claims;
- stops L4 when actual tag/release/deploy/readiness action is claimed;
- rejects raw/secret-shaped evidence by path only, without value echo.

## Next Gate

Any real tag, release, push, deploy, cutover, or readiness claim still requires
a separate exact operator approval boundary and fresh validation evidence.
