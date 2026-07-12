# CM-2123-R1 Full-plan Status-sync Final Execution Release

Decision reference: `CM-2123-R1-STATUS-SYNC-FINAL-RELEASE-47CCF09A-F3DB5787`
Canonical payload SHA-256: `a747f0bdac1678e9a8537f5bf7475175316a78a237016886eb482f7db69a6b36`

Result: PASS_FINAL_EXECUTION_RELEASE_CONTENT_PREPARED_ONLY.

This exact decision releases one future CM-2122 claim and one detached
nine-path status-sync commit in a clean detached worktree. Preparing and
freezing these bytes does not run the executor, create a claim, patch files,
create a detached commit, or write execution/binding receipts.
Branch-ref CAS remains explicitly unauthorized and requires a later independent
decision after detached-commit binding review. No remote or readiness action
is authorized.

## Exact JSON mirror

```json
{
  "artifactType": "cm2123_r1_full_plan_status_sync_final_execution_release_v1",
  "canonicalPayloadSha256": "a747f0bdac1678e9a8537f5bf7475175316a78a237016886eb482f7db69a6b36",
  "payload": {
    "authorization": {
      "approvedAt": "2026-07-12T00:00:00+08:00",
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "automaticCleanupAllowed": false,
      "automaticRetryAllowed": false,
      "branchRefUpdateAuthorized": false,
      "detachedStatusCommitCreationAuthorized": true,
      "detachedWorktreeHeadUpdateAuthorized": true,
      "exactAction": "apply_exact_full_plan_status_sync_detached_commit",
      "executionReleaseAuthorized": true,
      "expiresAt": "2026-07-19T23:59:59+08:00",
      "postBindingBranchRefDecisionRequired": true,
      "remoteRefUpdateAuthorized": false,
      "statusSyncExecutionAuthorized": true
    },
    "contentDecision": {
      "canonicalPayloadSha256": "b3ef390494b9fd8a4f217f584abe93dfefc38e951cbe224d9c9a3600087b1112",
      "commit": "096eaf0c42f8e76180177eef7d16bf6edd605858",
      "json": {
        "blobOid": "7a3d9667b51220d2623658e2d673bd5fee88e09d",
        "bytes": 18815,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "a42fd82c5e78fbdac04a8a3f4847b95e3953d45ee233d8496d4eeaa8bff5775f",
        "sourceCommit": "096eaf0c42f8e76180177eef7d16bf6edd605858",
        "sourcePath": "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_content_decision.json",
        "sourceTree": "e4c81196919a949ae616f5caa7222ff7869e06a7"
      },
      "machineGitIntakeRequired": true,
      "markdown": {
        "blobOid": "277c023772ee0ffd5a0696a9b6a9516894e9059d",
        "bytes": 19459,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "eb7cd8f846f03f019eaf6266e1b79c7ca50cc10a71bd3673ad93d9ec538c3b87",
        "sourceCommit": "096eaf0c42f8e76180177eef7d16bf6edd605858",
        "sourcePath": "docs/near-model-memory-plan-pack/cm2121_exact_full_plan_status_sync_content_decision.md",
        "sourceTree": "e4c81196919a949ae616f5caa7222ff7869e06a7"
      },
      "parentCommit": "620cf6d3446d3af0de95a85ca2f6045bec2005d7",
      "parentTree": "0bf7b88e2c83b970112adfc6209446014bbe0871",
      "patchPayloadSha256": "2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92",
      "reference": "CM-2121-EXACT-STATUS-SYNC-CONTENT-DECISION-7C489A3A-2D4CBE41-43CDC772",
      "tree": "e4c81196919a949ae616f5caa7222ff7869e06a7"
    },
    "currentSideEffects": {
      "bindingReceipts": 0,
      "branchRefUpdates": 0,
      "claimCreates": 0,
      "detachedHeadUpdates": 0,
      "detachedStatusCommits": 0,
      "executionReceipts": 0,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0,
      "repositoryPatches": 0
    },
    "currentState": {
      "branchRefUpdated": false,
      "claimCreated": false,
      "currentBranchStatusSynchronized": false,
      "detachedStatusCommitBound": false,
      "detachedStatusCommitCreated": false,
      "fullPlanPackCompletedInBoundEvidence": true,
      "readinessClaimed": false,
      "statusSyncPerformed": false
    },
    "decisionReference": "CM-2123-R1-STATUS-SYNC-FINAL-RELEASE-47CCF09A-F3DB5787",
    "decisionType": "exact_one_shot_detached_status_commit_final_execution_release",
    "detachedCommitBoundary": {
      "branchRefUpdateAuthorized": false,
      "detachedCommitCreationMethod": "git_commit_tree_without_hooks",
      "detachedHeadExpectedOldMustEqualFinalReleaseCommit": true,
      "detachedHeadUpdateMethod": "git_update_ref_head_expected_old_cas",
      "detachedWorktreeHeadMayAdvance": true,
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
      "exactNineModifiedPathsOnly": true,
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
      "gitCommitSigningAllowed": false,
      "gitHooksAllowed": false,
      "parentMustBeFinalReleaseSourceCommit": true,
      "parentTreeMustBeFinalReleaseSourceTree": true,
      "patchPayloadSha256": "2d4cbe41b0747d9dac31a77a02f70e389356c72d5f9307ab415f9f1af893ef92",
      "receiptsIncludedInCommit": false,
      "remoteRefUpdateAuthorized": false,
      "targetBranchRef": "refs/heads/codex/near-model-memory-frozen-replay-v2",
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
    "executionPacket": {
      "canonicalPayloadSha256": "47ccf09a55ec65f291f6ad60171f18cfb374a0094841da4dc8be9799dd05d453",
      "commit": "f3db578742ce15599b86674a2476532c802eaa74",
      "json": {
        "blobOid": "ba24a8ee1e9b10d460119d0305611d68308bbb1e",
        "bytes": 20043,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "d96002c7e7fd07afbe1ad229ea83b6dd26d9497da0b67701e8954b3b1c76ccfa",
        "sourceCommit": "f3db578742ce15599b86674a2476532c802eaa74",
        "sourcePath": "docs/near-model-memory-plan-pack/cm2122_r1_full_plan_status_sync_execution_packet.json",
        "sourceTree": "e342e4a176a692a382a204257e53f163c95584cf"
      },
      "markdown": {
        "blobOid": "206c00583600991139c4e612a48022479e42e4db",
        "bytes": 20908,
        "gitMode": "100644",
        "gitObjectType": "blob",
        "sha256": "521521bf9be54664d52beefc822b54d8fda2c9cba86a6bbeb1ca71c111b744b1",
        "sourceCommit": "f3db578742ce15599b86674a2476532c802eaa74",
        "sourcePath": "docs/near-model-memory-plan-pack/cm2122_r1_full_plan_status_sync_execution_packet.md",
        "sourceTree": "e342e4a176a692a382a204257e53f163c95584cf"
      },
      "reference": "CM-2122-R1-STATUS-SYNC-EXECUTION-PACKET-B3EF3904-60761FF5",
      "tree": "e342e4a176a692a382a204257e53f163c95584cf"
    },
    "implementation": {
      "artifacts": [
        {
          "blobOid": "c20bc1a50189c1b7bebf9bb167c06da49dd284f2",
          "bytes": 5832,
          "path": "scripts/generate-cm2122-full-plan-status-sync-execution-packet.js",
          "sha256": "af1fccc75e873c407a20f1333ce6faa2cec8f82da1dbabbb656d4545f952ef8d"
        },
        {
          "blobOid": "3d41bfe1112ef194656ed199ea0f7f734d67727e",
          "bytes": 4889,
          "path": "scripts/generate-cm2123-full-plan-status-sync-final-release.js",
          "sha256": "d65efa136d2a5878ac543b58d7cbc06a5ab148cb905b27ace3af05d880b804ab"
        },
        {
          "blobOid": "6ae76fdac4be052ae18a610bd7ca6ca7cd77939a",
          "bytes": 2790,
          "path": "src/cli/cm2122-full-plan-status-sync.js",
          "sha256": "f4caca298cce912d8b8b3ba3464a5529b023faf67ef49643e2cdf043272ec404"
        },
        {
          "blobOid": "2c4e09e2d21f173e4589ee2ac89fd8741b486813",
          "bytes": 90151,
          "path": "src/core/Cm2122FullPlanStatusSyncExecution.js",
          "sha256": "010158bba5e1217743f9013003190dccf924298c886326e9d6f9dfa7569bf5ea"
        },
        {
          "blobOid": "a25758d42e01fad237586e641740e7165e5f0874",
          "bytes": 23780,
          "path": "tests/cm2122-full-plan-status-sync-execution.test.js",
          "sha256": "dc67ab0833165d4e61850ac5879cbd0cdb12c5c9be50780ad10b77e993450ca2"
        },
        {
          "blobOid": "d70756abdb8f37e6c47d67f59f66c09ca16a3d48",
          "bytes": 8455,
          "path": "package.json",
          "sha256": "65ac1f753846f365c5a00af72e002c09cd6c074a9a8f767fdb5eb2075a24c313"
        },
        {
          "blobOid": "2c699156388c0ec535e36ec7639394f199a95669",
          "bytes": 8232,
          "path": "scripts/freeze-cm2120-full-plan-application-receipts.js",
          "sha256": "188f072cd1ea5bdb2e324d7bf7643cf8a183d92e320a19a1a90a336ad0816478"
        },
        {
          "blobOid": "f740d7200e4a3aac7e7a103fe651d60ad317d2a8",
          "bytes": 4872,
          "path": "scripts/generate-cm2116-exact-full-plan-application-gate.js",
          "sha256": "c47616a8f9750f8097348b10f6681ca622a46a4e99b3501b807d3cf55ea321d6"
        },
        {
          "blobOid": "95c3c7412570966510a9e7b818a450f2be0b9924",
          "bytes": 31890,
          "path": "src/core/Cm2115CanonicalFullPlanEvidenceSnapshot.js",
          "sha256": "4aef08f3a5c26d6a588f2fbe242e0dcdcad57e2b13a387c0ee72277de9155009"
        },
        {
          "blobOid": "8e802faa46b2fc2dd0319a94808b13f3681edddb",
          "bytes": 25607,
          "path": "src/core/Cm2117ExactFullPlanApplicationDecision.js",
          "sha256": "e2aac90bee614fcef7b03e05a1d7ed8bf0ab7f938afe95841a0ff29d77ba51a4"
        },
        {
          "blobOid": "7350e152fee5e05c2823c3b203b211b892b77d7c",
          "bytes": 15660,
          "path": "src/core/Cm2120FullPlanApplicationReceiptReview.js",
          "sha256": "2b49914784a9c74aafc36591beb857deb3867da398dd70748c2322631a9617e5"
        },
        {
          "blobOid": "dac1e70f9fe182e4376bf15c4f21a315491a05f1",
          "bytes": 25247,
          "path": "src/core/Cm2121FullPlanStatusSyncApplication.js",
          "sha256": "42b161fd556d793ab29baf2672073739cc829281bd1c39de617e7a861823ee7c"
        },
        {
          "blobOid": "fb356bbde2ba5b65ae7810915c87226d9d111853",
          "bytes": 18123,
          "path": "src/core/Cm2121FullPlanStatusSyncContentDecision.js",
          "sha256": "a325506b750b0f4648e19b2f580dfff10dcff6013f7ef4e51aaf5b15bc0bb9e5"
        }
      ],
      "commit": "60761ff5b9fc81554f80b16d4597174f212c82b7",
      "diffEntries": [
        {
          "path": "scripts/generate-cm2122-full-plan-status-sync-execution-packet.js",
          "status": "M"
        },
        {
          "path": "scripts/generate-cm2123-full-plan-status-sync-final-release.js",
          "status": "M"
        },
        {
          "path": "src/cli/cm2122-full-plan-status-sync.js",
          "status": "M"
        },
        {
          "path": "src/core/Cm2122FullPlanStatusSyncExecution.js",
          "status": "M"
        },
        {
          "path": "tests/cm2122-full-plan-status-sync-execution.test.js",
          "status": "M"
        }
      ],
      "diffEntriesSha256": "9b7cb22b0840745fa87a11aa289feae729ae476c4a6beca9a396367350c7919a",
      "diffPaths": [
        "scripts/generate-cm2122-full-plan-status-sync-execution-packet.js",
        "scripts/generate-cm2123-full-plan-status-sync-final-release.js",
        "src/cli/cm2122-full-plan-status-sync.js",
        "src/core/Cm2122FullPlanStatusSyncExecution.js",
        "tests/cm2122-full-plan-status-sync-execution.test.js"
      ],
      "diffPathsSha256": "f8f87ae2c4f423e0ea2bed684c116b7167b2489ca8321e32c4e22050980aa678",
      "parentCommit": "fd435dc8c4f916e70a00d5a3c0a701e3e060411e",
      "parentTree": "d9b72b92b46040cab074da9280032e3cc8a6cd25",
      "tree": "aab4df9e445b2bac5ed0c4d14ecce5984c16d70c"
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
    "oneShotRegistry": {
      "alternateRootAllowed": false,
      "atomicExclusiveCreateRequired": true,
      "authorizationReplayAllowed": false,
      "authorizationUseCount": 1,
      "automaticCleanupAllowed": false,
      "automaticRetryAllowed": false,
      "claimIdDerivationExcludesBindingHash": true,
      "durableReentryRequired": true,
      "governanceRootAuthority": "git_common_dir_fixed_governance_root",
      "governanceRootIdentitySha256": "240fd4f7108637d57593ac22478316d84560cd49e8e6c16c2577a9c07cd2d5a0",
      "nonce": "cm2122-r1-full-plan-status-sync-001",
      "receiptId": "cm2122-r1-full-plan-status-sync-receipt-001",
      "registryReference": "cm2122-r1-full-plan-status-sync-registry-001"
    },
    "receiptBoundary": {
      "bindingReceiptFilename": "cm2122-r1-full-plan-status-sync-binding-receipt-001.json",
      "detachedCommitGitBindingRequired": true,
      "executionReceiptFilename": "cm2122-r1-full-plan-status-sync-execution-receipt-001.json",
      "postBindingBranchRefDecisionRequired": true,
      "receiptRootAuthority": "git_common_dir_fixed_governance_root",
      "receiptsStoredOutsideDetachedCommit": true,
      "upstreamGitRevalidationRequired": true
    },
    "sideEffectLimits": {
      "bindingReceipts": 1,
      "branchRefUpdates": 0,
      "claimCreates": 1,
      "detachedHeadUpdates": 1,
      "detachedStatusCommits": 1,
      "executionReceipts": 1,
      "nativeReads": 0,
      "nativeWrites": 0,
      "providerCalls": 0,
      "readinessClaims": 0,
      "realMemoryReads": 0,
      "remoteActions": 0,
      "repositoryPatches": 1
    },
    "supersedes": {
      "authorizationClaimed": false,
      "executionPacketCommit": "e071ed4fcb089b5896e0f25048aa1938b36f2edc",
      "executorRun": false,
      "finalReleaseCommit": "fd435dc8c4f916e70a00d5a3c0a701e3e060411e",
      "finalReleaseTree": "d9b72b92b46040cab074da9280032e3cc8a6cd25",
      "implementationCommit": "d3d230c41d924acdbd79a5975e057c4800b4e576",
      "reason": "superseded_before_execution_due_to_git_environment_isolation_repair"
    }
  },
  "schemaVersion": 1,
  "taskId": "CM-2123-R1"
}
```
