# CM-2128 Branch CAS Receipt Freeze Manifest

Freeze reference: `CM-2128-BRANCH-CAS-RECEIPT-FREEZE-907A2BEA-0EF4EF2B`
Canonical payload SHA-256: `bc74e513c4ad7d82376cdd96e1d8fadc2d53d79830dd3bb962844da6768b6a37`

This manifest freezes the exact low-disclosure one-shot claim envelope and
Branch CAS execution receipt after the single approved local update. It does
not replay the authorization, update another ref, perform a remote action,
or claim production/release/deploy/cutover/readiness.

## Exact JSON mirror

```json
{
  "artifactType": "cm2128_branch_cas_receipt_freeze_manifest_v1",
  "canonicalPayloadSha256": "bc74e513c4ad7d82376cdd96e1d8fadc2d53d79830dd3bb962844da6768b6a37",
  "payload": {
    "bindingHash": "dd8c178b6ce6989b16c898bd69f902201c15ef719192b401c13f3fe695a04fd7",
    "claimProjection": {
      "authorizationConsumed": true,
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "bindingHash": "dd8c178b6ce6989b16c898bd69f902201c15ef719192b401c13f3fe695a04fd7",
      "branchCasInvocationCount": 1,
      "branchRefCasAttempts": 1,
      "branchRefUpdates": 1,
      "claimId": "adbb450151ee077a4fb19ea6c81b967af7512340d44a6c6ecef55d96fc6df494",
      "executionReceiptSha256": "907a2bead5b71d138b9dd521f99b1fe996aed30351f003abf11ab6dd0ff30c5a",
      "executionReceiptWriteAttempts": 1,
      "executionReceiptWrites": 1,
      "finalState": "CONSUMED_SUCCESS_BRANCH_CAS_AND_WORKTREE_SYNCHRONIZED_AWAITING_RECEIPT_REVIEW",
      "reconciliationRequired": false,
      "targetFileSyncAttempts": 1,
      "targetFileSynchronizations": 9,
      "targetFileWriteSlotsConsumed": 9,
      "targetFilesMatchedCount": 9,
      "targetIndexSyncAttempts": 1,
      "targetIndexSynchronizations": 1,
      "terminalStateDurablyRecorded": true,
      "verificationAttempts": 1
    },
    "claimReceipt": {
      "artifactType": "cm2126_exact_branch_cas_claim_envelope_v1",
      "blobOid": "4c1428f83d8c8f701a54ee931f305b8a43e833de",
      "bytes": 1645,
      "canonicalPayloadSha256": null,
      "gitMode": "100644",
      "outputPath": "docs/near-model-memory-plan-pack/cm2128_branch_cas_claim_receipt.json",
      "sha256": "0ef4ef2bffdf7216f63578e3c793c562dfc59f43c36e654f60902d61bd1b813e",
      "sourceFilename": ".cm2125-exact-branch-cas-claim-adbb450151ee077a4fb19ea6c81b967af7512340d44a6c6ecef55d96fc6df494.json"
    },
    "contentDecisionCommit": "c4ff57c645a04f484f55a16efdd62bd40b4dc576",
    "currentBoundary": {
      "additionalBranchRefUpdates": 0,
      "additionalExecutionAttempts": 0,
      "authorizationReplayAllowed": false,
      "branchRefUpdated": true,
      "currentBranchStatusSynchronized": true,
      "fullPlanPackCompleted": true,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaimed": false,
      "realMemoryReads": 0,
      "remoteActions": 0,
      "targetWorktreeFilesSynchronized": true,
      "targetWorktreeIndexSynchronized": true
    },
    "executionPacketCommit": "448d2a7193a5d1087d1da4c870103cae6ee9de14",
    "executionProjection": {
      "otherRefUpdates": 0,
      "otherRefsSnapshotAfterSha256": "612ac98d49695e13673f3a99de6451f32644bde4be80628aacd9cfc14d7a0e32",
      "otherRefsSnapshotBeforeSha256": "612ac98d49695e13673f3a99de6451f32644bde4be80628aacd9cfc14d7a0e32",
      "prohibitedSideEffects": {
        "branchPushes": 0,
        "cutoverActions": 0,
        "deployActions": 0,
        "nativeReads": 0,
        "nativeWrites": 0,
        "providerCalls": 0,
        "readinessClaims": 0,
        "realMemoryReads": 0,
        "releaseActions": 0,
        "remoteActions": 0,
        "tagActions": 0
      },
      "readiness": {
        "completeRealtimeMemory": false,
        "completeRealtimeMemoryClaimed": false,
        "completeV8": false,
        "completeV8Claimed": false,
        "cutoverReady": false,
        "cutoverReadyClaimed": false,
        "deployReady": false,
        "deployReadyClaimed": false,
        "fullBridgeCompletion": false,
        "fullBridgeCompletionClaimed": false,
        "fullPlanPackCompletedClaimed": false,
        "fullRealtimeMemory": false,
        "fullRealtimeMemoryClaimed": false,
        "modelMemoryComplete": false,
        "modelMemoryCompleteClaimed": false,
        "productionReady": false,
        "productionReadyClaimed": false,
        "rcReady": false,
        "rcReadyClaimed": false,
        "readinessClaimed": false,
        "releaseReady": false,
        "releaseReadyClaimed": false
      }
    },
    "executionReceipt": {
      "artifactType": "cm2126_exact_branch_cas_execution_receipt_v1",
      "blobOid": "dedc8d4650522d37c65f93436bd6905c8c5de2a3",
      "bytes": 25430,
      "canonicalPayloadSha256": "0ecb12e9bc141ae51180cba57e2c30066979e0a1e92d70a786a24e9d3a1af641",
      "gitMode": "100644",
      "outputPath": "docs/near-model-memory-plan-pack/cm2128_branch_cas_execution_receipt.json",
      "sha256": "907a2bead5b71d138b9dd521f99b1fe996aed30351f003abf11ab6dd0ff30c5a",
      "sourceFilename": "cm2125-exact-branch-cas-execution-receipt-001.json"
    },
    "finalReleaseCommit": "043f31df0cfee4e11ed1afa0de86d496da5bfb05",
    "freezeImplementationArtifacts": [
      {
        "blobOid": "fc063846fc4ad8dea05fd72818c399ccac14eb23",
        "bytes": 16510,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "d5dc48ebdf9c5689b9e5ffc2331d524f2aa6122a747d29c4938c6611ac4ed377",
        "sourceCommit": "8890609ea950a9a7bb0bfedf4231414fbcf9f36f",
        "sourcePath": "scripts/freeze-cm2128-branch-cas-receipts.js",
        "sourceTree": "e41c6c1389b9ca679d70fe0e6e525cfc8e76b213"
      },
      {
        "blobOid": "32f1d59b15f174ef7acb4a373ce71b23c45341f3",
        "bytes": 15686,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "fc185feeace80972361ba6f352c7d0fb2ee6f492fd98ab1ad9c2f551ea09b63d",
        "sourceCommit": "8890609ea950a9a7bb0bfedf4231414fbcf9f36f",
        "sourcePath": "scripts/review-cm2129-branch-cas-receipts.js",
        "sourceTree": "e41c6c1389b9ca679d70fe0e6e525cfc8e76b213"
      },
      {
        "blobOid": "0799f3babceabe9f7ed9779a12cd420ea3005190",
        "bytes": 9520,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "a861ff2855b44bdf5dff45da21c61626560575db3678b911f315dc917d162e59",
        "sourceCommit": "8890609ea950a9a7bb0bfedf4231414fbcf9f36f",
        "sourcePath": "tests/cm2128-cm2129-branch-cas-receipts.test.js",
        "sourceTree": "e41c6c1389b9ca679d70fe0e6e525cfc8e76b213"
      }
    ],
    "freezeImplementationCommit": "8890609ea950a9a7bb0bfedf4231414fbcf9f36f",
    "freezeImplementationDiffEntries": [
      {
        "path": "scripts/freeze-cm2128-branch-cas-receipts.js",
        "status": "A"
      },
      {
        "path": "scripts/review-cm2129-branch-cas-receipts.js",
        "status": "A"
      },
      {
        "path": "tests/cm2128-cm2129-branch-cas-receipts.test.js",
        "status": "A"
      }
    ],
    "freezeImplementationDiffPaths": [
      "scripts/freeze-cm2128-branch-cas-receipts.js",
      "scripts/review-cm2129-branch-cas-receipts.js",
      "tests/cm2128-cm2129-branch-cas-receipts.test.js"
    ],
    "freezeImplementationParent": "043f31df0cfee4e11ed1afa0de86d496da5bfb05",
    "freezeImplementationTree": "e41c6c1389b9ca679d70fe0e6e525cfc8e76b213",
    "freezeReference": "CM-2128-BRANCH-CAS-RECEIPT-FREEZE-907A2BEA-0EF4EF2B",
    "targetCommit": "eb016872c834a8a8b36ed8edd8ce1aeb0db599c8",
    "targetRef": "refs/heads/codex/near-model-memory-frozen-replay-v2",
    "targetTree": "c129ecfaa134a47f30ed98f17d74151989c1a547",
    "verification": {
      "claimMachineBindingAccepted": true,
      "contentGitIntakeAccepted": true,
      "durableExecutionAccepted": true,
      "exactTargetPostconditionsAccepted": true,
      "executionReceiptAccepted": true,
      "finalReleaseGitIntakeAccepted": true,
      "lowDisclosureBoundaryAccepted": true,
      "packetGitIntakeAccepted": true,
      "receiptHashMatchesClaim": true
    }
  },
  "schemaVersion": 1,
  "taskId": "CM-2128"
}
```
