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
    `Current facts source: \`${FACTS_PATH}\`.`,
    "Current task: `CM-1390 current facts active surface binding`.",
    "Current validation: `CMV-1508`.",
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
    "| CMV-1508 | docs validation | P6-docs-drift | CM-1390 current facts active surface binding | COMPLETED_VALIDATED_CM1390 | ok | none | 2026-06-02 |",
    "| CMV-1507 | docs validation | P6-docs-drift | CM-1389 current facts single source | COMPLETED_VALIDATED_CM1389 | ok | none | 2026-06-02 |",
    "| CMV-1506 | docs validation | P6-docs-drift | CM-1388 older task | COMPLETED_VALIDATED_CM1388 | ok | none | 2026-06-02 |"
  ].join("\n");
}

function facts() {
  return {
    schemaVersion: 1,
    updatedAt: "2026-06-02",
    taskId: "CM-1390",
    validationId: "CMV-1508",
    branch: "docs/current-facts-active-slimdown",
    localHead: SHA,
    originHead: SHA,
    baseBranch: "main",
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
    writeFile(root, relativePath, `# ${relativePath}\n\nCurrent facts source: \`${FACTS_PATH}\`.\n`);
  }
  return root;
}

test("current facts validator accepts active blocks that reference the JSON source", () => {
  const root = workspace();
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, true, result.failures.join("\n"));
});

test("current facts validator rejects full SHA in active markdown blocks", () => {
  const root = workspace();
  writeFile(
    root,
    "STATUS.md",
    [
      "# status",
      ACTIVE_START,
      `Current facts source: \`${FACTS_PATH}\`.`,
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
  changedFacts.taskId = "CM-1388";
  writeFile(root, FACTS_PATH, `${JSON.stringify(changedFacts, null, 2)}\n`);
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /latest done task CM-1390/);
});

test("current facts validator rejects active block task binding drift", () => {
  const root = workspace();
  writeFile(
    root,
    ".agent_board/RUN_STATE.md",
    [
      "# run state",
      ACTIVE_START,
      `Current facts source: \`${FACTS_PATH}\`.`,
      "Current task: `CM-1389 current facts single source`.",
      "Current validation: `CMV-1508`.",
      ACTIVE_END
    ].join("\n")
  );
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /active block must include current facts taskId CM-1390/);
});

test("current facts validator rejects missing reference doc entry", () => {
  const root = workspace();
  writeFile(root, "DOCS_GOVERNANCE.md", "# Docs Governance\n\nNo current facts entry here.\n");
  const result = validateCurrentFactsDrift(root);
  assert.equal(result.ok, false);
  assert.match(result.failures.join("\n"), /DOCS_GOVERNANCE\.md must reference \.agent_board\/CURRENT_FACTS\.json/);
});
