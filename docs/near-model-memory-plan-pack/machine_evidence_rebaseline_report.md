# Machine Evidence Rebaseline Report

Tasks: `CM-2077`, `CM-2078`

Result: `MACHINE_EVIDENCE_CAPTURED_FROZEN_REPLAY_REQUIRED`

## Why the Earlier Completion Claim Was Withdrawn

The external-review input contained conflicting decisions. The stricter and
later review identified that the CM-2073 through CM-2075 evidence was
hash-bound but not independently replayable: the working tree was dirty and the
loaded runtime HEAD did not match the reviewed checkout.

The new machine artifacts therefore fail closed. They accept the low-disclosure
evidence shape but do not satisfy Phase 2 or Phase 9 completion:

```text
sourceCommit=ddfc67d2f227d3e726ce5f1829751c783eccddc8
loadedRuntimeHead=2537f31e178e5a61059cca2505bb5d4f01e498ec
worktreeClean=false
runtimeHeadMatchesSourceCommit=false
```

## Phase 2 Machine Evidence

Artifacts:

- `phase2_machine_execution_evidence_manifest.json`
- `windows_wsl_machine_smoke_receipt.json`

The manifest was produced from a fresh bounded execution of:

```text
search_memory
memory_overview
audit_memory
```

Each call contains a safe call reference and SHA-256 over its complete
low-disclosure receipt projection. The manifest records three native reads,
three provider calls, three local audit appends, three isolated derived-index
writes, and zero memory writes, primary-store writes, fallback uses, raw/private
returns, or readiness claims.

The contract derives:

```text
phase2MachineExecutionEvidenceManifestPassed=false
completionEligible=false
replayRequired=true
```

This is stronger than the earlier caller-supplied boolean contract because the
call projections and their hashes are machine-verifiable. It also prevents the
current mismatched runtime evidence from completing Phase 2.

## Phase 9 Machine Observation

Artifact:

- `phase9_machine_observation_artifact.json`

It binds:

- the actual five-tool public surface and its SHA-256;
- the actual `DefaultRuntimePolicyObservationGate` output summary and SHA-256;
- the Phase 2 machine manifest file hash and three safe call references;
- actual `test:all` and `gate:ci` execution records with low-disclosure
  timestamp/category references.

The current command records pass (`5082/5082`, `94/94`, `6/6`, and
`gate:ci` ok), but the artifact still derives:

```text
phase9MachineObservationArtifactPassed=false
completionEligible=false
replayRequired=true
```

Command success cannot override the dirty checkout or loaded-runtime HEAD
mismatch. The same commands must be regenerated from the eventual frozen,
runtime-matched checkout.

## Canonical Review Bundle

Artifacts:

- `external_review_handoff_bundle_v2.json`
- `external_review_handoff_bundle_canonical.md`

The v2 bundle binds the Phase 2 manifest, Windows/WSL receipt, Phase 9
artifact, and fail-closed conflict resolution by SHA-256. Its payload is
recursively key-sorted, rendered verbatim into Markdown, and carries its own
SHA-256. All four independent decisions remain false.

## Required Frozen Replay

Before Phase 2 or Phase 9 can be accepted again:

1. Freeze the intended evidence checkout in a clean local commit.
2. Ensure the loaded runtime HEAD equals that commit.
3. Re-run the three native read calls and Windows/WSL smoke.
4. Re-run `test:all` and `gate:ci` from the same clean checkout.
5. Regenerate the machine artifacts and canonical review bundle.
6. Obtain a new non-conflicting external review decision.

The application sequence is now non-circular: external review evidence is
applied to the Completion Audit first; a Tag Approval Packet is reviewed only
afterward and remains required for Phase 10/tag action.

No Phase 8 write, tag, release, push, deploy, cutover, or readiness action is
authorized or performed by this rebaseline.
