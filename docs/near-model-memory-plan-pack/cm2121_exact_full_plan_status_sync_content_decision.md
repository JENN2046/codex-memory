# CM-2121 Exact Full-plan Status-sync Content Decision

Decision reference: `CM-2121-EXACT-STATUS-SYNC-CONTENT-DECISION-7C489A3A-2D4CBE41-43CDC772`
Canonical payload SHA-256: `b3ef390494b9fd8a4f217f584abe93dfefc38e951cbe224d9c9a3600087b1112`
Patch payload SHA-256: `2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92`

This decision approves only the exact nine-path status-sync content.
It does not authorize execution, detached commit creation, branch ref
update, final release, remote action, or any readiness claim.
Final execution release and post-binding branch CAS remain separate gates.

## Exact JSON mirror

```json
{
  "artifactType": "cm2121_exact_full_plan_status_sync_content_decision_v1",
  "canonicalPayloadSha256": "b3ef390494b9fd8a4f217f584abe93dfefc38e951cbe224d9c9a3600087b1112",
  "payload": {
    "application": {
      "canonicalPayloadSha256": "7c489a3ada1d16d5ee1a188c056935980ed2a8843ec60001a72242155d946d8d",
      "commit": "43cdc772ecc7e96b542c68a096a1674ba11462d0",
      "diffEntries": [
        {
          "path": "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.json",
          "status": "A"
        },
        {
          "path": "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.md",
          "status": "A"
        }
      ],
      "diffEntriesSha256": "c025dd01d8055c05b1e6f4c430f47d6b2a68cd2fb01e9b31a3a84616cd9fb634",
      "diffPaths": [
        "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.json",
        "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.md"
      ],
      "diffPathsSha256": "96886790b1e5b355aed8059a44e96eefbced74dbaab69531bb83f2b8c93a968b",
      "json": {
        "blobOid": "80dd5716f51275443d713730006d17f5f9002faf",
        "bytes": 11801,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "bdd651a9676e916c07088ebfbe6ca42f92451825bbabd049998b073a198d336e",
        "sourceCommit": "43cdc772ecc7e96b542c68a096a1674ba11462d0",
        "sourcePath": "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.json",
        "sourceTree": "f54318eefd43922ff7fb403d734a647426c47755"
      },
      "markdown": {
        "blobOid": "d021f62eca929e956c1138d62500da31f5346c87",
        "bytes": 12533,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "5407fc6c9e249d51f00b722cd8c854130a5ede3fe566e5c9cdcba16cfbce49d1",
        "sourceCommit": "43cdc772ecc7e96b542c68a096a1674ba11462d0",
        "sourcePath": "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_application.md",
        "sourceTree": "f54318eefd43922ff7fb403d734a647426c47755"
      },
      "parentCommit": "89a962a0e4b62b897c38b8438ac305222d34c092",
      "parentTree": "49a848d99c13666ba6190b90c14490cc6d5d5f66",
      "patchPayloadSha256": "2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92",
      "tree": "f54318eefd43922ff7fb403d734a647426c47755"
    },
    "authorizationContent": {
      "alternateOutputPathAllowed": false,
      "applicationCommitCreationAuthorized": false,
      "authorizationContentApproved": true,
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "automaticCleanupAllowed": false,
      "automaticRetryAllowed": false,
      "branchRefUpdateAuthorized": false,
      "branchRefUpdateDecisionPresent": false,
      "callerSuppliedAcceptedBooleanAllowed": false,
      "exactAction": "apply_exact_full_plan_status_sync_content",
      "finalExecutionReleaseAuthorized": false,
      "finalExecutionReleasePresent": false,
      "nonce": "cm2121-full-plan-status-sync-001",
      "receiptId": "cm2121-full-plan-status-sync-receipt-001",
      "registryReference": "cm2121-full-plan-status-sync-registry-001",
      "remoteActionAuthorized": false,
      "statusSyncExecutionAuthorized": false
    },
    "currentSideEffects": {
      "branchRefUpdates": 0,
      "claimCreates": 0,
      "detachedApplicationCommits": 0,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0,
      "repositoryPatches": 0
    },
    "currentState": {
      "applicationPrepared": true,
      "authorizationContentApproved": true,
      "branchRefUpdateAuthorized": false,
      "branchRefUpdated": false,
      "claimCreated": false,
      "contentDecisionGitIntakeCompleted": false,
      "contentDecisionPrepared": true,
      "currentBranchStatusSynchronized": false,
      "detachedStatusCommitBound": false,
      "detachedStatusCommitCreated": false,
      "finalExecutionReleasePresent": false,
      "fullPlanPackCompletedInBoundEvidence": true,
      "readinessClaimed": false,
      "statusSyncExecutionAuthorized": false,
      "statusSyncPerformed": false
    },
    "decisionImplementation": {
      "artifacts": [
        {
          "blobOid": "8ba015da43321a4c49e606d2053229986c1cc8b0",
          "bytes": 4886,
          "path": "scripts/generate-cm2121-full-plan-status-sync-content-decision.js",
          "sha256": "d478358f027d38f49ec912efe8cbffc68b1fe1ebf478096d2e8c792d7be30db4"
        },
        {
          "blobOid": "fb356bbde2ba5b65ae7810915c87226d9d111853",
          "bytes": 18123,
          "path": "src/core/Cm2121FullPlanStatusSyncContentDecision.js",
          "sha256": "a325506b750b0f4648e19b2f580dfff10dcff6013f7ef4e51aaf5b15bc0bb9e5"
        },
        {
          "blobOid": "d8aac105a4f96b8fc2cbd124c9950611b7e25461",
          "bytes": 5715,
          "path": "tests/cm2121-full-plan-status-sync-content-decision.test.js",
          "sha256": "d3c0fb633cdcd6d890a4a43f25b734150b2a4a38495872ffe52edf3b0f609bbc"
        }
      ],
      "commit": "620cf6d3446d3af0de95a85ca2f6045bec2005d7",
      "diffEntries": [
        {
          "path": "package.json",
          "status": "M"
        },
        {
          "path": "scripts/generate-cm2121-full-plan-status-sync-content-decision.js",
          "status": "A"
        },
        {
          "path": "src/core/Cm2121FullPlanStatusSyncContentDecision.js",
          "status": "A"
        },
        {
          "path": "tests/cm2121-full-plan-status-sync-content-decision.test.js",
          "status": "A"
        }
      ],
      "diffEntriesSha256": "cf856f870a014d3812ae75ee90385ca7a28d609c389a1c2c2c8a963b978e3eb8",
      "diffPaths": [
        "package.json",
        "scripts/generate-cm2121-full-plan-status-sync-content-decision.js",
        "src/core/Cm2121FullPlanStatusSyncContentDecision.js",
        "tests/cm2121-full-plan-status-sync-content-decision.test.js"
      ],
      "diffPathsSha256": "45a38156e00c7b2501bd3880ee0cc07e5d9855dc5843399c30c3ce1d17a8c258",
      "parentCommit": "43cdc772ecc7e96b542c68a096a1674ba11462d0",
      "parentTree": "f54318eefd43922ff7fb403d734a647426c47755",
      "tree": "0bf7b88e2c83b970112adfc6209446014bbe0871"
    },
    "decisionReference": "CM-2121-EXACT-STATUS-SYNC-CONTENT-DECISION-7C489A3A-2D4CBE41-43CDC772",
    "decisionType": "exact_full_plan_status_sync_content_decision",
    "desiredStateAfterAllFutureGates": {
      "currentBranchStatusSynchronized": true,
      "fullPlanPackCompleted": true,
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
      },
      "statusSyncPerformed": true
    },
    "exactContent": {
      "baselineCommit": "521348cff0f0aea6afbc2a5dbde67cf096e708a7",
      "baselineTree": "63f85c927d686a443edba8d32db38f3078c1ec5c",
      "exactEntries": [
        {
          "path": ".agent_board/AUTOPILOT_LEDGER.md",
          "status": "M"
        },
        {
          "path": ".agent_board/CHECKPOINT.md",
          "status": "M"
        },
        {
          "path": ".agent_board/CURRENT_FACTS.json",
          "status": "M"
        },
        {
          "path": ".agent_board/HANDOFF.md",
          "status": "M"
        },
        {
          "path": ".agent_board/RUN_STATE.md",
          "status": "M"
        },
        {
          "path": ".agent_board/TASK_QUEUE.md",
          "status": "M"
        },
        {
          "path": ".agent_board/VALIDATION_LOG.md",
          "status": "M"
        },
        {
          "path": "CURRENT_STATE.md",
          "status": "M"
        },
        {
          "path": "STATUS.md",
          "status": "M"
        }
      ],
      "exactPaths": [
        ".agent_board/AUTOPILOT_LEDGER.md",
        ".agent_board/CHECKPOINT.md",
        ".agent_board/CURRENT_FACTS.json",
        ".agent_board/HANDOFF.md",
        ".agent_board/RUN_STATE.md",
        ".agent_board/TASK_QUEUE.md",
        ".agent_board/VALIDATION_LOG.md",
        "CURRENT_STATE.md",
        "STATUS.md"
      ],
      "onlyAuthoritativeTransition": {
        "after": true,
        "before": false,
        "field": "fullPlanPackCompleted"
      },
      "patchPayloadSha256": "2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92",
      "readinessFieldsForcedFalse": [
        "completeRealtimeMemory",
        "completeRealtimeMemoryClaimed",
        "completeV8",
        "completeV8Claimed",
        "cutoverReady",
        "cutoverReadyClaimed",
        "deployReady",
        "deployReadyClaimed",
        "fullBridgeCompletion",
        "fullBridgeCompletionClaimed",
        "fullPlanPackCompletedClaimed",
        "fullRealtimeMemory",
        "fullRealtimeMemoryClaimed",
        "modelMemoryComplete",
        "modelMemoryCompleteClaimed",
        "productionReady",
        "productionReadyClaimed",
        "rcReady",
        "rcReadyClaimed",
        "readinessClaimed",
        "releaseReady",
        "releaseReadyClaimed"
      ],
      "statusSyncCommitMustContainNoOtherPath": true,
      "statusSyncCommitMustUseExactProjectedBlobs": true,
      "targetCount": 9,
      "targets": [
        {
          "after": {
            "blobOid": "8491c252aee4fe5e6d213e4fe055fcd1ea20161a",
            "bytes": 1743479,
            "gitMode": "100644",
            "sha256": "3cf6d5871f5d3a6d3b9c233ae7e1ef79a00e8f5753f4cc36d86ec350f0917009"
          },
          "before": {
            "blobOid": "ed2f84db73a5323da62fc69492dfd57d4390cdfd",
            "bytes": 1742487,
            "gitMode": "100644",
            "sha256": "bde6d583f3360adf0e9effa693b0270d749e942dc5be137daf99ecff91aa8127"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/AUTOPILOT_LEDGER.md"
        },
        {
          "after": {
            "blobOid": "0aa6ca6e12cf602156795c26a9364f127215fa07",
            "bytes": 941200,
            "gitMode": "100644",
            "sha256": "d9ed7e6e1ab6984a3689804ca6652f51608ebec43b279fac77fd0e15247e4474"
          },
          "before": {
            "blobOid": "73f919063b64dbf0e5e951dd2e2f6d66d95a76c7",
            "bytes": 940202,
            "gitMode": "100644",
            "sha256": "c4f2ba6ab2c9ca551b97087aa89ad4b9ce7055548ef2711013c2c920af38d74b"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/CHECKPOINT.md"
        },
        {
          "after": {
            "blobOid": "70b2dc8f1aa03ffb319338abba213d912767cb2f",
            "bytes": 200532,
            "gitMode": "100644",
            "sha256": "bdf3f9f3bf6dc4279e5da1a3fa63da5e9d1b030cb1eaa776551155fbe5e1d2f1"
          },
          "before": {
            "blobOid": "4dc9b5672679fe69e265523ddc39af95425824e5",
            "bytes": 198010,
            "gitMode": "100644",
            "sha256": "219bc8740d7d6aa349e1ada45e52e9c3cd92a7372836c130d5cca9aad4d1b001"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/CURRENT_FACTS.json"
        },
        {
          "after": {
            "blobOid": "ff448595a6d3450ef5496634ac46577266106e03",
            "bytes": 251386,
            "gitMode": "100644",
            "sha256": "0c00c7716b2b4110be8937463703b0cb7f808d1fd8fa3ff26c717e283e67e694"
          },
          "before": {
            "blobOid": "fb4c08b3636f602fda0aaba8e09560b8ae10c0d2",
            "bytes": 250632,
            "gitMode": "100644",
            "sha256": "fcf396951c0a028821855894b884e34b14255f566443728434b17955166d21e2"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/HANDOFF.md"
        },
        {
          "after": {
            "blobOid": "37ae648e7f9fa66a0cc2f57332907cdc50a487a4",
            "bytes": 22070,
            "gitMode": "100644",
            "sha256": "2ba1c9ce6f5867e3501711a1011ff1e99bfe64be526e22cc53ec711b1b76c007"
          },
          "before": {
            "blobOid": "43a44f6a87db218459bf6c015b703fbbe1cae13d",
            "bytes": 21999,
            "gitMode": "100644",
            "sha256": "cd5183973aa4302ac86a75c4c6616980d971cfc47232af07a070b3e3589ac81a"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/RUN_STATE.md"
        },
        {
          "after": {
            "blobOid": "fd6f656a1d6dbc564b659e7650d54db25f7af5d3",
            "bytes": 929797,
            "gitMode": "100644",
            "sha256": "63ba8c45ff073d92a5a23a25587c63644bef2b14d6067b39792ef9e8f262d916"
          },
          "before": {
            "blobOid": "b555a1b4a0626f944a43dfeb6d1091f3e8efbec3",
            "bytes": 928913,
            "gitMode": "100644",
            "sha256": "49e8a9b59a8f9449a6ab7b73463b18f8cb8acbc9fd478bad3ed2438b1c4ab509"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/TASK_QUEUE.md"
        },
        {
          "after": {
            "blobOid": "e926142c602e4b327b3bdea06f87b6518682d3dc",
            "bytes": 1039790,
            "gitMode": "100644",
            "sha256": "1184e3e7f88042c09907fea4bc5b6e58c01f716ad12219dd50dc0c5f611e7c8b"
          },
          "before": {
            "blobOid": "adc89da59095cdeda7984cf01ebce0bf0bcd2586",
            "bytes": 1038780,
            "gitMode": "100644",
            "sha256": "a7b1cd3831f476090dd59a22738f2853a5fb1b4e385adcc68f0d2497b6bca714"
          },
          "operation": "modify",
          "sourcePath": ".agent_board/VALIDATION_LOG.md"
        },
        {
          "after": {
            "blobOid": "3d9cc10dd031d55c3d690fa465d3ea0e9abb3f99",
            "bytes": 663011,
            "gitMode": "100644",
            "sha256": "8f6d18cee35004e94255066b9798d5f1f4fb40b55a17b8b38c8d3bbc4e7098f8"
          },
          "before": {
            "blobOid": "a266dc2d0c769f0487bf9fae72878c6a8d1d487c",
            "bytes": 662506,
            "gitMode": "100644",
            "sha256": "55f2756f72b33bfc012004abf155f305cc269abd90a73bcbd95a92e677d30481"
          },
          "operation": "modify",
          "sourcePath": "CURRENT_STATE.md"
        },
        {
          "after": {
            "blobOid": "fbeb8f56cac42242f358491373f095510a8ac707",
            "bytes": 897134,
            "gitMode": "100644",
            "sha256": "985196040269a8a5c2e429002cb203562a801c47e00ba93ff6c6d51ff9a3731a"
          },
          "before": {
            "blobOid": "8d3761576fc3e26fe1b47bcf7d9b81f86054ad79",
            "bytes": 896851,
            "gitMode": "100644",
            "sha256": "b1ae06349aaf57fba84288d3f3d7b3f5622be2df55535e32980c66e01eb7a5ad"
          },
          "operation": "modify",
          "sourcePath": "STATUS.md"
        }
      ]
    },
    "futureExecutionBoundary": {
      "automaticCleanupAllowed": false,
      "automaticRetryAllowed": false,
      "branchRefUpdateMayNotBeInferredFromContentOrFinalRelease": true,
      "deleteBranchRefAllowed": false,
      "detachedStatusCommitMustBeDirectChildOfFinalReleaseSourceCommit": true,
      "detachedStatusCommitParentTreeMustEqualFinalReleaseSourceTree": true,
      "detachedStatusCommitReceiptReviewRequired": true,
      "finalReleaseMayAuthorizeAtMostOneDetachedStatusCommit": true,
      "finalReleaseMayNotAuthorizeBranchRefUpdate": true,
      "forceBranchRefUpdateAllowed": false,
      "futureBranchRef": "refs/heads/codex/near-model-memory-frozen-replay-v2",
      "futureBranchRefMaximumUpdates": 1,
      "futureBranchRefUpdateMustUseCompareAndSwap": true,
      "otherBranchRefAllowed": false,
      "remoteBranchRefAllowed": false,
      "separateExecutionPacketRequired": true,
      "separateFinalExecutionReleaseRequired": true,
      "separateFrozenExecutorRequired": true,
      "separatePostBindingBranchRefDecisionRequired": true,
      "statusSyncIsNotCurrentBranchFactUntilBranchRefUpdateSucceeds": true
    },
    "nonClaims": {
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
    },
    "receiptReview": {
      "commit": "521348cff0f0aea6afbc2a5dbde67cf096e708a7",
      "json": {
        "blobOid": "b16aecc7df1b88ab6b6414be6684200fed465151",
        "bytes": 7546,
        "path": "docs/near-model-memory-plan-pack/cm2120_full_plan_application_receipt_review_decision.json",
        "sha256": "00981d8f143639a49dfb22f2526756245fee830777d6340a2dc4f989c2cc316f"
      },
      "markdown": {
        "blobOid": "9cc1add38925eaf0d12a36ecf703ac37e5f579f5",
        "bytes": 8079,
        "path": "docs/near-model-memory-plan-pack/cm2120_full_plan_application_receipt_review_decision.md",
        "sha256": "d24c69f03bcd6f96a5080067c4f362850baa6002b45c4482985d4239dab71724"
      },
      "payloadSha256": "0c237372eb2c1ad91f26e84812601cb598c59f5230cd2774afd5fddf40fc6e90",
      "receiptReviewPassed": true,
      "reference": "CM-2120-INTERNAL-RECEIPT-REVIEW-PASS-C6BCA575-D5E61022",
      "tree": "63f85c927d686a443edba8d32db38f3078c1ec5c"
    },
    "sideEffectLimits": {
      "authorizationContentWrites": 1,
      "branchRefUpdates": 1,
      "detachedApplicationCommits": 1,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0,
      "repositoryPatches": 1
    }
  },
  "schemaVersion": 1,
  "taskId": "CM-2121"
}
```
