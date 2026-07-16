# Machine Evidence Frozen Replay Report

Tasks: `CM-2077`, `CM-2078`, `CM-2079`

Result: `CLEAN_FROZEN_RUNTIME_MATCHED_REPLAY_PASSED_EXTERNAL_REVIEW_REQUIRED`

## Frozen Baseline

```text
sourceCommit=1822d7e8492424cd4b8849d544df087cf9c8edad
sourceTree=bac696fac692509572ecd1ab889a5b3aedc4b9a6
worktreeClean=true
loadedRuntimeHead=1822d7e8492424cd4b8849d544df087cf9c8edad
runtimeHeadMatchesSourceCommit=true
```

The reusable generator executed from that clean commit and delayed all tracked
artifact writes until runtime and validation checks had completed. The earlier
dirty/mismatched CM-2077/2078 artifact versions are superseded.

## Phase 2 Machine Evidence

The generator started a disposable VCPToolBox native shim, used a fixture
embedding provider and isolated derived store, and executed exactly:

```text
search_memory
memory_overview
audit_memory
```

Observed aggregate:

```text
native read attempts/successes: 3/3
provider calls: 3
memory reads: 3
isolated derived-index writes: 3
local audit appends: 3
primary memory-store writes: 0
native memory writes: 0
fallback uses: 0
raw/private returns: 0
readiness claims: 0
```

Both `cmd.exe` and `powershell.exe` Windows/WSL bridge checks passed with output
suppressed. The Phase 2 machine contract derives:

```text
phase2MachineExecutionEvidenceManifestPassed=true
completionEligible=true
replayRequired=false
```

This is validation-fixture proof, not production-provider proof and not Phase 8
native-write proof.

## Phase 9 Machine Observation

An actual stdio `initialize` plus `tools/list` against the frozen checkout
returned exactly:

```text
audit_memory
memory_overview
prepare_memory_context
propose_memory_delta
search_memory
```

The default policy gate accepted the read/context/proposal hold. Public
`commit_memory_delta`, default write, default expansion, provider use by the
policy gate, and readiness claims remained false.

Validation records:

```text
test:all: 5091/5091 + 94/94 + 6/6, exit zero
gate:ci -- --json: PASS, fixtureOnly=true, noNetwork=true, noProvider=true
```

The Phase 9 machine contract derives:

```text
phase9MachineObservationArtifactPassed=true
completionEligible=true
replayRequired=false
```

## Canonical Review Bundle

```text
canonicalPayloadSha256=2215bb33de9eb58cb3fb4c9d04ba57c77bd6794aeae9e1d73966477a6f8622f2
```

Evidence hashes:

```text
phase2_machine_execution_evidence_manifest.json=9697fec7e60ac3a51f9339e1dd4694075f818940007cbc653c89f5ca01ce0e03
windows_wsl_machine_smoke_receipt.json=60b38d4025d567aa8ac7b839b00aa3539884d67450647157cbe22b9c2363718d
phase9_machine_observation_artifact.json=138ad75ed7d41d88c689544cac217ddfa6ef751f2fe586c997fa37163f18968d
external_review_conflict_resolution_report.md=0e6c6f285c0f8f6caec80c46588ce78ae51829d5bdaa2498882b0fae42a96014
```

## Effective Decisions

```yaml
externalReviewPassed: false
externalReviewEvidenceBundleAppliedToCompletionAudit: false
tagApprovalPacketPassed: false
phase8NativeWriteAuthorizationGranted: false
```

The replay repairs the lineage, clean-checkout, runtime-head, Windows/WSL, and
actual-observation findings. It does not self-accept external review, apply the
Completion Audit patch, approve a Tag Approval Packet, authorize Phase 8, push,
tag, release, deploy, cut over, or establish readiness.
