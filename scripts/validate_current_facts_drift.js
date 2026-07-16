#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseMarkdownTable } = require("./validate_autopilot_ledger_consistency");

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA40_SCAN_RE = /\b[0-9a-f]{40}\b/gi;
const CM_RE = /^CM-\d{4}$/;
const CMV_RE = /^CMV-\d{4}$/;
const SCHEMA_VERSION = 3;
const FACTS_MODE = "committed_status_snapshot";
const GIT_FACTS_SOURCE = "fresh_git_commands";
const ACTIVE_START = "<!-- CURRENT-FACTS-ACTIVE-START -->";
const ACTIVE_END = "<!-- CURRENT-FACTS-ACTIVE-END -->";
const FACTS_PATH = ".agent_board/CURRENT_FACTS.json";

const REQUIRED_ACTIVE_FILES = [
  "STATUS.md",
  ".agent_board/RUN_STATE.md",
  ".agent_board/HANDOFF.md",
  ".agent_board/CHECKPOINT.md",
  ".agent_board/TASK_QUEUE.md",
  ".agent_board/VALIDATION_LOG.md",
  ".agent_board/AUTOPILOT_LEDGER.md"
];

const REQUIRED_DOC_REFERENCES = [
  "README.md",
  "DOCS_GOVERNANCE.md"
];

function readText(root, relativePath, failures) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(root, relativePath, failures) {
  const text = readText(root, relativePath, failures);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function extractActiveBlock(text, relativePath, failures) {
  const start = text.indexOf(ACTIVE_START);
  const end = text.indexOf(ACTIVE_END);
  if (start === -1 || end === -1 || end < start) {
    failures.push(`${relativePath} missing CURRENT-FACTS active markers`);
    return "";
  }
  return text.slice(start + ACTIVE_START.length, end);
}

function cmId(value) {
  const match = String(value || "").match(/\bCM-\d{4}\b/);
  return match ? match[0] : null;
}

function cmNumber(value) {
  const id = cmId(value);
  return id ? Number(id.slice(3)) : null;
}

function latestByCm(rows, fieldName, filter) {
  return rows
    .filter(filter)
    .map((row) => ({ row, id: cmId(row[fieldName]), number: cmNumber(row[fieldName]) }))
    .filter((item) => item.id && Number.isFinite(item.number))
    .sort((left, right) => right.number - left.number)[0] || null;
}

function validateCurrentFactsSchema(facts, failures) {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    failures.push(`${FACTS_PATH} must contain a JSON object`);
    return;
  }

  if (facts.schemaVersion !== SCHEMA_VERSION) failures.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (facts.factsMode !== FACTS_MODE) failures.push(`factsMode must be ${FACTS_MODE}`);
  if (facts.gitFactsSource !== GIT_FACTS_SOURCE) failures.push(`gitFactsSource must be ${GIT_FACTS_SOURCE}`);
  if (facts.liveGitFactsCommitted !== false) failures.push("liveGitFactsCommitted must be false");
  if (Object.prototype.hasOwnProperty.call(facts, "localHead")) {
    failures.push("schema v3 must not commit localHead; collect live git facts with fresh git commands");
  }
  if (Object.prototype.hasOwnProperty.call(facts, "originHead")) {
    failures.push("schema v3 must not commit originHead; collect live git facts with fresh git commands");
  }
  const liveGitFactsPolicy = facts.liveGitFactsPolicy;
  if (!liveGitFactsPolicy || typeof liveGitFactsPolicy !== "object" || Array.isArray(liveGitFactsPolicy)) {
    failures.push("liveGitFactsPolicy object is required");
  } else {
    if (liveGitFactsPolicy.currentHeadCommitted !== false) failures.push("liveGitFactsPolicy.currentHeadCommitted must be false");
    if (liveGitFactsPolicy.originHeadCommitted !== false) failures.push("liveGitFactsPolicy.originHeadCommitted must be false");
    if (liveGitFactsPolicy.freshGitRequiredBeforeRemoteAction !== true) {
      failures.push("liveGitFactsPolicy.freshGitRequiredBeforeRemoteAction must be true");
    }
    if (liveGitFactsPolicy.freshGitRequiredBeforeRuntimeAction !== true) {
      failures.push("liveGitFactsPolicy.freshGitRequiredBeforeRuntimeAction must be true");
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(facts.updatedAt || ""))) {
    failures.push("updatedAt must use YYYY-MM-DD");
  }
  if (!CM_RE.test(String(facts.taskId || ""))) failures.push("taskId must look like CM-0000");
  if (!CMV_RE.test(String(facts.validationId || ""))) failures.push("validationId must look like CMV-0000");
  if (Object.prototype.hasOwnProperty.call(facts, "branch")) {
    failures.push("schema v3 must not use top-level branch for historical evidence");
  }
  const repositoryObservation = facts.repositoryObservation;
  if (!repositoryObservation || typeof repositoryObservation !== "object" || Array.isArray(repositoryObservation)) {
    failures.push("repositoryObservation object is required");
  } else {
    for (const field of [
      "observedAtCommitted",
      "observedBranchCommitted",
      "observedHeadCommitted",
      "worktreeStateCommitted"
    ]) {
      if (repositoryObservation[field] !== false) {
        failures.push(`repositoryObservation.${field} must be false`);
      }
    }
    if (repositoryObservation.freshGitRequiredBeforeBranchSensitiveAction !== true) {
      failures.push("repositoryObservation.freshGitRequiredBeforeBranchSensitiveAction must be true");
    }
  }
  if (!facts.evidenceBaseline || typeof facts.evidenceBaseline.snapshotBranch !== "string") {
    failures.push("evidenceBaseline.snapshotBranch is required");
  }
  const governanceState = facts.governanceState;
  if (!governanceState || typeof governanceState !== "object" || Array.isArray(governanceState)) {
    failures.push("governanceState object is required");
  } else {
    if (governanceState.evidenceRevalidated !== true) {
      failures.push("governanceState.evidenceRevalidated must be true");
    }
    for (const field of [
      "freshNativeContextProofPerformed",
      "planPackCompleted",
      "readinessClaimed",
      "statusSyncPerformed"
    ]) {
      if (governanceState[field] !== false) {
        failures.push(`governanceState.${field} must be false`);
      }
    }
  }
  if (!facts.baseBranch || typeof facts.baseBranch !== "string") failures.push("baseBranch is required");

  const projectStatus = facts.status && facts.status.project;
  const rcStatus = facts.status && facts.status.rc;
  if (!["NOT_READY_BLOCKED", "READY", "BLOCKED"].includes(projectStatus)) {
    failures.push("status.project must be NOT_READY_BLOCKED, READY, or BLOCKED");
  }
  if (!["RC_NOT_READY_BLOCKED", "RC_READY", "RC_BLOCKED"].includes(rcStatus)) {
    failures.push("status.rc must be RC_NOT_READY_BLOCKED, RC_READY, or RC_BLOCKED");
  }

  const pr = facts.pr;
  if (!pr || typeof pr !== "object" || Array.isArray(pr)) failures.push("pr object is required");
  const reviewed = facts.reviewedObject;
  if (!reviewed || typeof reviewed !== "object" || Array.isArray(reviewed)) {
    failures.push("reviewedObject object is required");
  } else {
    if (reviewed.commit !== null && !SHA40_RE.test(String(reviewed.commit || ""))) {
      failures.push("reviewedObject.commit must be a 40-char lowercase SHA or null");
    }
    if (reviewed.parent !== null && !SHA40_RE.test(String(reviewed.parent || ""))) {
      failures.push("reviewedObject.parent must be a 40-char lowercase SHA or null");
    }
    if (
      reviewed.commit &&
      reviewed.presentInLocalCheckout === false &&
      reviewed.source === "local_git"
    ) {
      failures.push("reviewedObject absent from checkout cannot use source=local_git");
    }
  }

  if (!Array.isArray(facts.validationSummary)) failures.push("validationSummary must be an array");
  if (!Array.isArray(facts.notValidated)) failures.push("notValidated must be an array");
  if (!facts.constraints || typeof facts.constraints !== "object" || Array.isArray(facts.constraints)) {
    failures.push("constraints object is required");
  }
}

function validateActiveBlocks(root, failures) {
  for (const relativePath of REQUIRED_ACTIVE_FILES) {
    const text = readText(root, relativePath, failures);
    const active = extractActiveBlock(text, relativePath, failures);
    if (!active) continue;
    if (!active.includes(FACTS_PATH)) {
      failures.push(`${relativePath} active block must reference ${FACTS_PATH}`);
    }
    const matches = active.match(SHA40_SCAN_RE) || [];
    if (matches.length > 0) {
      failures.push(`${relativePath} active block contains full 40-char SHA: ${matches[0]}`);
    }
  }
}

function validateActiveBlockBindings(root, facts, failures) {
  for (const relativePath of REQUIRED_ACTIVE_FILES) {
    const text = readText(root, relativePath, failures);
    const active = extractActiveBlock(text, relativePath, failures);
    if (!active) continue;
    if (!active.includes(facts.taskId)) {
      failures.push(`${relativePath} active block must include current facts taskId ${facts.taskId}`);
    }
    if (!active.includes(facts.validationId)) {
      failures.push(`${relativePath} active block must include current facts validationId ${facts.validationId}`);
    }
  }
}

function validateLatestIds(root, facts, failures) {
  const taskQueue = parseMarkdownTable(readText(root, ".agent_board/TASK_QUEUE.md", failures));
  const validationLog = parseMarkdownTable(readText(root, ".agent_board/VALIDATION_LOG.md", failures));

  const latestDoneTask = latestByCm(
    taskQueue,
    "ID",
    (row) => String(row.Status || "").toLowerCase() === "done"
  );
  const latestValidation = latestByCm(
    validationLog,
    "Scope",
    (row) => String(row.Result || "").toUpperCase().startsWith("COMPLETED")
  );

  if (!latestDoneTask) failures.push("No completed CM task found in .agent_board/TASK_QUEUE.md");
  if (!latestValidation) failures.push("No completed CM validation scope found in .agent_board/VALIDATION_LOG.md");
  if (latestDoneTask && latestDoneTask.id !== facts.taskId) {
    failures.push(`latest done task ${latestDoneTask.id} does not match current facts taskId ${facts.taskId}`);
  }
  if (latestValidation && latestValidation.id !== facts.taskId) {
    failures.push(`latest validation scope ${latestValidation.id} does not match current facts taskId ${facts.taskId}`);
  }

  const validationIds = new Set(validationLog.map((row) => String(row.ID || "").replace(/`/g, "").trim()));
  if (!validationIds.has(facts.validationId)) {
    failures.push(`current facts validationId ${facts.validationId} is missing from VALIDATION_LOG`);
  }
}

function validateReferenceDocs(root, failures) {
  for (const relativePath of REQUIRED_DOC_REFERENCES) {
    const text = readText(root, relativePath, failures);
    if (!text.includes(FACTS_PATH)) {
      failures.push(`${relativePath} must reference ${FACTS_PATH}`);
    }
  }
}

function validateCurrentFactsDrift(root = process.cwd()) {
  const failures = [];
  const facts = readJson(root, FACTS_PATH, failures);
  validateCurrentFactsSchema(facts, failures);
  if (facts) {
    validateActiveBlocks(root, failures);
    validateActiveBlockBindings(root, facts, failures);
    validateLatestIds(root, facts, failures);
    validateReferenceDocs(root, failures);
  }
  return { ok: failures.length === 0, failures, facts };
}

if (require.main === module) {
  const result = validateCurrentFactsDrift();
  if (!result.ok) {
    console.error("CURRENT FACTS DRIFT VALIDATION FAILED");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("CURRENT FACTS DRIFT VALIDATION PASSED");
  console.log(`task=${result.facts.taskId} validation=${result.facts.validationId} facts=${FACTS_PATH}`);
}

module.exports = {
  ACTIVE_END,
  ACTIVE_START,
  FACTS_PATH,
  REQUIRED_DOC_REFERENCES,
  REQUIRED_ACTIVE_FILES,
  extractActiveBlock,
  validateCurrentFactsDrift
};
