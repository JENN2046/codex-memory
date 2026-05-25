# CM1089 v1.1 Evidence Packet Runner

Status: `V1_1_EVIDENCE_PACKET_ACCEPTED_NOT_EXECUTED_NOT_READY`

Date: 2026-05-25

## Scope

CM1089 adds a pure local evidence packet runner at `src/core/V11HardeningEvidencePacketRunner.js`.

It consumes explicit sanitized local slice reports for CM1081 through CM1088, checks their sealed v1.0 RC commit and current-head binding, and builds the exact CM1082/CM1083/CM1084/CM1085/CM1087 input shape expected by the v1.1 `ValidationAggregator`.

The runner does not read files, inspect raw memory, execute commands, call providers, call MCP tools, write memory, write audit, apply tombstones, apply cleanup/rollback, migrate schema, enable startup workers, expand public MCP, commit, push, tag, release, deploy, or claim readiness/reliability.

## Boundary

CM1089 is review-only and explicit-input only.

Accepted input must use:

- `mode=v1_1_evidence_packet_runner_review_only`
- `sourceMode=explicit_sanitized_local_reports_only`
- sealed v1.0 RC commit `f4549b4a1a9265bdc867c35b72f66d8d1a1a66a9`
- exact `currentHeadCommit`
- fresh `observedAt` timestamps
- zero packet-level side-effect counters
- complete CM1081 through CM1088 slice reports

Accepted output keeps:

- `evidencePacketAccepted=true`
- `validationAggregatorInputBuilt=true`
- `providerCalls=0`
- `apiCalls=0`
- `mcpToolCalls=0`
- `trueRecordMemoryCalls=0`
- `trueSearchMemoryCalls=0`
- `rawMemoryReads=0`
- `rawJsonlReads=0`
- `rawAuditReads=0`
- `durableMemoryWrites=0`
- `durableAuditWrites=0`
- `tombstoneApplyRuns=0`
- `cleanupApplyRuns=0`
- `rollbackApplyRuns=0`
- `schemaMigrationApplies=0`
- `startupWorkerEnablements=0`
- `publicMcpExpansions=0`
- `pushRuns=0`
- `tagReleaseDeployRuns=0`
- `readinessClaims=0`
- `reliabilityClaims=0`
- `readinessClaimed=false`
- `reliabilityClaimed=false`

## Acceptance

CM1089 accepts only when:

- all required slice reports are present
- every slice task id and status matches the expected CM1081-CM1088 local hardening status
- every required accepted flag is true
- every slice is bound to the same sealed v1.0 RC commit and current head
- every slice timestamp is fresh and not after packet `asOf`
- no slice reports blockers
- no packet-level side-effect counter is nonzero
- no nested evidence includes forbidden apply/write/read/provider/public-MCP/startup/config/dependency/remote/release/readiness/reliability claims
- no sensitive-looking fragment appears in the serialized sanitized packet

CM1089 then returns `validationAggregatorInput.evidenceById` with exactly the CM1082, CM1083, CM1084, CM1085, and CM1087 records needed by `evaluateV11HardeningValidationAggregator(...)`.

## Validation

Targeted validation for CM1089:

```powershell
node --check .\src\core\V11HardeningEvidencePacketRunner.js
node --check .\tests\v1-1-hardening-evidence-packet-runner.test.js
node --test .\tests\v1-1-hardening-evidence-packet-runner.test.js
node --test .\tests\v1-1-hardening-validation-aggregator.test.js .\tests\v1-1-hardening-staged-closeout.test.js .\tests\v1-1-hardening-evidence-packet-runner.test.js
git diff --check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-local.ps1 -Area docs
```

CM1089 is not a runtime evidence claim, not a release gate, not a deployment gate, not write-governance execution, and not a reliability/readiness proof.
