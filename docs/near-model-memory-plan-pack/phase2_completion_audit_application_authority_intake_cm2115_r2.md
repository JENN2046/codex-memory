# CM-2115-R2 Direct Authority Intake

This low-disclosure intake records Jenn’s direct authorization for the exact
repository evidence application repair. It stores no raw authority text and
authorizes no runtime, native memory, provider, real-memory, remote, full-plan,
or readiness action.

## Exact JSON mirror

```json
{
  "canonicalPayloadSha256": "6c0273ab663c4f04841faa3a2fe8ad8058afb1efdeb885bece23706e9434a6ef",
  "intakeType": "direct_user_authority_intake_v1",
  "payload": {
    "allowedAction": "apply_cm2080_phase2_machine_evidence_to_completion_audit_exact_patch",
    "allowedEffects": {
      "bindingReceiptPreparations": 1,
      "completionAuditPatchApplications": 1,
      "durableClaimCreates": 1
    },
    "authorityReference": "JENN-CM2115-R2-20260712",
    "authoritySourceCategory": "current_user_direct_instruction",
    "authorizationReplayAllowed": false,
    "authorizationUseCount": 1,
    "forbiddenEffects": {
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0
    },
    "rawAuthorityMaterialStored": false,
    "requiredControls": {
      "applicationCommitBindingReceipt": true,
      "durableOneShotClaim": true,
      "exactBeforeAfterPatchBinding": true,
      "fixedOutputPathsOnly": true,
      "receiptTimeUpstreamGitRevalidation": true
    },
    "requiredState": {
      "fullPlanPackCompleted": false,
      "independentReviewPassed": false,
      "readinessClaimed": false
    }
  },
  "schemaVersion": 1,
  "taskId": "CM-2115-R2"
}
```
