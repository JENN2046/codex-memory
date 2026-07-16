"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  ACTIVE_END,
  ACTIVE_START,
  FACTS_PATH,
  REQUIRED_DOC_REFERENCES,
  REQUIRED_ACTIVE_FILES,
  validateCurrentFactsDrift
} = require("../scripts/validate_current_facts_drift");

const SHA = "28353d83884483b989d0d5631091b7e777cc7ccf";
const TREE = "930d182ce34a99ff4851e4671c705526cd51cc3d";

function writeFile(root, relativePath, text) {
  const fullPath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, text);
}

function activeDoc(name = "active") {
  return [
    `# ${name}`,
    "",
    ACTIVE_START,
    "",
    `Current facts snapshot: \`${FACTS_PATH}\`.`,
    "Current task: `CM-1403 current facts schema v2 snapshot semantics`.",
    "Current validation: `CMV-1521`.",
    "Live Git facts require fresh Git commands.",
    "",
    ACTIVE_END,
    "",
    "Historical text may include fde340796255505602eeca856785c6398fd805bf."
  ].join("\n");
}

function taskQueue() {
  return [
    activeDoc("TASK_QUEUE"),
    "",
    "| ID | Priority | Status | Area | Risk | Target Files | Task | Required Validation | Rollback Check | Gate Required | Notes |",
    "|---|---:|---|---|---|---|---|---|---|---|---|",
    "| CM-1403 | 1403 | done | P6-docs-drift | Green | `.agent_board/CURRENT_FACTS.json` | Current facts schema v2 snapshot semantics | docs validation | none | no | done |",
    "| CM-1390 | 1390 | done | P6-docs-drift | Green | `.agent_board/CURRENT_FACTS.json` | Current facts active surface binding | docs validation | none | no | done |",
    "| CM-1389 | 1389 | done | P6-docs-drift | Green | `.agent_board/CURRENT_FACTS.json` | Current facts single source | docs validation | none | no | done |",
    "| CM-1388 | 1388 | done | P6-docs-drift | Green | `STATUS.md` | Older task | docs validation | none | no | done |"
  ].join("\n");
}

function validationLog() {
  return [
    activeDoc("VALIDATION_LOG"),
    "",
    "| ID | Command / Check | Area | Scope | Result | Summary | Follow-up | Date |",
    "|---|---|---|---|---|---|---|---|",
    "| CMV-1521 | docs validation | P6-docs-drift | CM-1403 current facts schema v2 snapshot semantics | COMPLETED_VALIDATED_CM1403 | ok | none | 2026-06-03 |",
    "| CMV-1508 | docs validation | P6-docs-drift | CM-1390 current facts active surface binding | COMPLETED_VALIDATED_CM1390 | ok | none | 2026-06-02 |",
    "| CMV-1507 | docs validation | P6-docs-drift | CM-1389 current facts single source | COMPLETED_VALIDATED_CM1389 | ok | none | 2026-06-02 |",
    "| CMV-1506 | docs validation | P6-docs-drift | CM-1388 older task | COMPLETED_VALIDATED_CM1388 | ok | none | 2026-06-02 |"
  ].join("\n");
}

function facts() {
  return {
    schemaVersion: 4,
    factsMode: "committed_status_snapshot",
    gitFactsSource: "fresh_git_commands",
    liveGitFactsCommitted: false,
    liveGitFactsPolicy: {
      currentHeadCommitted: false,
      originHeadCommitted: false,
      freshGitRequiredBeforeRemoteAction: true,
      freshGitRequiredBeforeRuntimeAction: true
    },
    updatedAt: "2026-06-03",
    taskId: "CM-1403",
    validationId: "CMV-1521",
    baseBranch: "main",
    repositoryObservation: {
      baselineObservation: {
        baselineBranch: "main",
        baselineCommit: SHA,
        baselineTree: TREE,
        baselineWorktreeClean: true,
        mainCiHeadCommit: SHA,
        mainCiPassed: true,
        mainCiRunId: "29507304212",
        mergeTreeMatchesPrHeadTree: true,
        observedAt: "2026-07-16",
        prHeadCommit: SHA,
        prHeadTree: TREE,
        prNumber: 21,
        source: "fresh_git_commands_and_github_actions"
      },
      observedAtCommitted: false,
      observedBranchCommitted: false,
      observedHeadCommitted: false,
      worktreeStateCommitted: false,
      freshGitRequiredBeforeBranchSensitiveAction: true
    },
    evidenceBaseline: {
      snapshotBranch: "docs/current-facts-active-slimdown"
    },
    governanceState: {
      evidenceRevalidated: true,
      freshNativeContextProofHead: SHA,
      freshNativeContextProofPassed: true,
      freshNativeContextProofPerformed: true,
      freshNativeContextProofSourceRuntime: "vcp_native",
      freshNativeContextProofCallCounts: {
        governedBridgeAuditReceipt: 1,
        initialize: 1,
        nativeSearch: 1,
        prepareMemoryContext: 1,
        providerRequest: 1,
        toolsList: 1
      },
      freshNativeContextProofDerivedIndexWritePerformed: true,
      freshNativeContextProofFallbackUsed: false,
      freshNativeContextProofMemoryWritePerformed: false,
      freshNativeContextProofPrimaryMemoryStoreWritePerformed: false,
      freshNativeContextProofRawDisclosure: false,
      freshNativeContextProofResultItemCount: 0,
      nativeFirstPathProven: true,
      nonEmptyRecallProven: false,
      planPackCompleted: false,
      recallRelevanceProven: false,
      readinessClaimed: false,
      statusSyncPerformed: true
    },
    pr: {
      number: null,
      head: null,
      base: "main",
      url: null
    },
    reviewedObject: {
      commit: null,
      parent: null,
      source: "none",
      presentInLocalCheckout: null
    },
    status: {
      project: "NOT_READY_BLOCKED",
      rc: "RC_NOT_READY_BLOCKED"
    },
    validationSummary: [],
    notValidated: [],
    constraints: {
      claudeMdUntrackedUntouched: true,
      noProviderCalls: true,
      noRealMemoryCalls: true,
      noPushWithoutExplicitAuthorization: true
    }
  };
}

function workspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "current-facts-"));
  writeFile(root, FACTS_PATH, `${JSON.stringify(facts(), null, 2)}\n`);
  for (const relativePath of REQUIRED_ACTIVE_FILES) {
    if (relativePath === ".agent_board/TASK_QUEUE.md") {
      writeFile(root, relativePath, taskQueue());
    } else if (relativePath === ".agent_board/VALIDATION_LOG.md") {
      writeFile(root, relativePath, validationLog());
    } else {
      writeFile(root, relativePath, activeDoc(relativePath));
    }
  }
  for (const relativePath of REQUIRED_DOC_REFERENCES) {
    writeFile(root, relativePath, `# ${relativePath}\n\nCurrent facts snapshot: \`${FACTS_PATH}\`.\n`);
  }
  return root;
}

test("current facts validator accepts schema v4 frozen baseline observation and governed proof state", () => {
  const root = workspace();
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects schema v4 committed live git head fields", () => {
  const root = workspace();
  const changedFacts = facts();
  changedFacts.localHead = SHA;
  changedFacts.originHead = SHA;
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /schema v4 must not commit localHead/);
  assert.match(result.failures.join("\n"), /schema v4 must not commit originHead/);
});

test("current facts validator rejects a historical branch at the live top level", () => {
  const root = workspace();
  const changedFacts = facts();
  changedFacts.branch = "historical-evidence-branch";
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /must not use top-level branch/);
});

test("current facts validator rejects stale live git policy", () => {
  const root = workspace();
  const changedFacts = facts();
  changedFacts.liveGitFactsCommitted = true;
  changedFacts.liveGitFactsPolicy.currentHeadCommitted = true;
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /liveGitFactsCommitted must be false/);
  assert.match(result.failures.join("\n"), /liveGitFactsPolicy\.currentHeadCommitted must be false/);
});

test("current facts validator rejects baseline and PR head tree mismatch", () => {
  const root = workspace();
  const changedFacts = facts();
  changedFacts.repositoryObservation.baselineObservation.prHeadTree = SHA;
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /baseline tree must match the PR head tree/);
});

test("current facts validator rejects relevance claims from an empty proof", () => {
  const root = workspace();
  const changedFacts = facts();
  changedFacts.governanceState.recallRelevanceProven = true;
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /cannot prove non-empty recall or relevance/);
});

test("current facts validator rejects full SHA in active markdown blocks", () => {
  const root = workspace();
  writeFile(
    root,
    "STATUS.md",
    [
      "# status",
      ACTIVE_START,
      `Current facts snapshot: \`${FACTS_PATH}\`.`,
      SHA,
      ACTIVE_END
    ].join("\n")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /active block contains full 40-char SHA/);
});

test("current facts validator rejects latest task drift", () => {
  const root = workspace();
  const changedFacts = facts();
  changedFacts.taskId = "CM-1390";
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /latest done task CM-1403/);
});

test("current facts validator rejects active block task binding drift", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/RUN_STATE.md",
    [
      "# run state",
      ACTIVE_START,
      `Current facts snapshot: \`${FACTS_PATH}\`.`,
      "Current task: `CM-1389 current facts single source`.",
      "Current validation: `CMV-1521`.",
      ACTIVE_END
    ].join("\n")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /active block must include current facts taskId CM-1403/);
});

test("current facts validator rejects missing reference doc entry", () => {
  const root = workspace();
  writeFile(root, "DOCS_GOVERNANCE.md", "# Docs Governance\n\nNo current facts entry here.\n");
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /DOCS_GOVERNANCE\.md must reference \.agent_board\/CURRENT_FACTS\.json/);
});
