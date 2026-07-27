#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  containsExactIdToken,
  parseMarkdownTable
} = require("./validate_autopilot_ledger_consistency");

const ACTIVE_START = "<!-- CURRENT-FACTS-ACTIVE-START -->";
const ACTIVE_END = "<!-- CURRENT-FACTS-ACTIVE-END -->";
const FACTS_PATH = ".agent_board/CURRENT_FACTS.json";
const SCHEMA_VERSION = 5;
const FACTS_MODE = "committed_status_snapshot";
const ACCEPTED_BASELINE = Object.freeze({
  prNumber: 61,
  reviewedHead: "4680b4c198a71bb9e61d7bc1f21c0b77a1769fd9",
  mergeCommit: "ef62d4819ece3d93cb90e2d55fa84973cf43b7d1",
  ciRunId: "30238902177"
});
const SHA40_RE = /^[0-9a-f]{40}$/;
const CM_RE = /^CM-\d{4}$/;
const CMV_RE = /^CMV-\d{4}$/;

const EXPECTED_TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "factsMode",
  "updatedAt",
  "baseBranch",
  "status",
  "activeTask",
  "lastCompleted",
  "acceptedProductBaseline",
  "contracts",
  "blockers",
  "history",
  "liveGitFactsPolicy"
]);

const POINTER_FILES = Object.freeze([
  "STATUS.md",
  ".agent_board/RUN_STATE.md",
  ".agent_board/HANDOFF.md",
  ".agent_board/CHECKPOINT.md",
  ".agent_board/TASK_QUEUE.md",
  ".agent_board/VALIDATION_LOG.md",
  ".agent_board/AUTOPILOT_LEDGER.md",
  "ROADMAP.md",
  "CODEX_MEMORY_NEXT_PHASE_PLAN.md"
]);

const ACTIVE_SURFACE_FILES = Object.freeze([
  "CURRENT_STATE.md",
  "STATUS.md",
  ".agent_board/RUN_STATE.md",
  ".agent_board/HANDOFF.md",
  ".agent_board/CHECKPOINT.md",
  ".agent_board/TASK_QUEUE.md",
  ".agent_board/VALIDATION_LOG.md",
  ".agent_board/AUTOPILOT_LEDGER.md"
]);

const REQUIRED_DOC_REFERENCES = Object.freeze([
  "README.md",
  "AGENTS.md",
  "docs/CONTEXT_INTAKE_CONTRACT.md"
]);

const REQUIRED_ACTIVE_FILES = ACTIVE_SURFACE_FILES;
const HISTORY_INDEX_PATH = "docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md";
const HISTORY_RESET_CLOSEOUT = Object.freeze({
  taskId: "CM-2155",
  validationId: "CMV-2240"
});
const HISTORY_RECOVERY_PATHS = Object.freeze([
  "CURRENT_STATE.md",
  ".agent_board/TASK_QUEUE.md",
  ".agent_board/CURRENT_FACTS.json",
  "STATUS.md"
]);
const REQUIRED_BLOCKERS = Object.freeze([
  "canonical_observer_not_wired",
  "r5_h_matrix_incomplete",
  "r5_o_private_exact_head_runtime_unverified",
  "fresh_non_empty_task_context_relevance_unproven"
]);
const STALE_ACTIVE_PHRASES = Object.freeze([
  "CI must rerun",
  "merge remains separate",
  "next exact-head CI pending"
]);
const POINTER_SELF_AUTHORITY_RE =
  /\b(?:this (?:file|document|surface|pointer) (?:is|serves as) (?:the )?(?:sole |only )?current(?: work)? authority|current authority\s*:\s*(?:this (?:file|document|surface|pointer)|self))\b/i;
const SIZE_BUDGETS = Object.freeze({
  "CURRENT_STATE.md": { kind: "lines", maximum: 120 },
  [FACTS_PATH]: { kind: "bytes", maximum: 20 * 1024 },
  ".agent_board/HANDOFF.md": { kind: "lines", maximum: 200 },
  ".agent_board/CHECKPOINT.md": { kind: "lines", maximum: 200 },
  "STATUS.md": { kind: "lines", maximum: 120 },
  ".agent_board/RUN_STATE.md": { kind: "lines", maximum: 80 },
  [HISTORY_INDEX_PATH]: { kind: "lines", maximum: 120 }
});

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
  } catch {
    failures.push(`Invalid JSON in ${relativePath}`);
    return null;
  }
}

function countOccurrences(text, needle) {
  return String(text).split(needle).length - 1;
}

function lineCount(text) {
  const normalized = String(text).endsWith("\n") ? String(text).slice(0, -1) : String(text);
  return normalized ? normalized.split(/\r?\n/).length : 0;
}

function extractActiveBlock(text, relativePath, failures) {
  if (countOccurrences(text, ACTIVE_START) !== 1 || countOccurrences(text, ACTIVE_END) !== 1) {
    failures.push(`${relativePath} must contain exactly one current-facts active block`);
    return "";
  }
  const start = text.indexOf(ACTIVE_START);
  const end = text.indexOf(ACTIVE_END);
  if (end < start) {
    failures.push(`${relativePath} current-facts active block markers are reversed`);
    return "";
  }
  return text.slice(start + ACTIVE_START.length, end);
}

function sameStringSet(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    [...actual].sort().join("\n") === [...expected].sort().join("\n");
}

function loadModuleFresh(modulePath) {
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function loadSourceContractFacts(root, failures) {
  try {
    const core = loadModuleFresh(path.join(root, "src/core/constants.js"));
    const server = loadModuleFresh(path.join(root, "src/adapters/codex-mcp/server.js"));
    const edge = loadModuleFresh(path.join(root, "packages/chatgpt-r4-contracts/constants.js"));
    const observer = loadModuleFresh(path.join(root, "src/runtime/chatgpt-r4/private-dogfood-observer.js"));
    return {
      vcpCodexMemoryCore: Array.isArray(core.TOOL_DEFINITIONS) ? core.TOOL_DEFINITIONS.length : null,
      codexDefaultExposed: typeof server.getPublicToolDefinitions === "function"
        ? server.getPublicToolDefinitions({}).length
        : null,
      chatgptEdge: (
        Array.isArray(edge.DATA_TOOL_NAMES) && Array.isArray(edge.RENDER_TOOL_NAMES)
          ? edge.DATA_TOOL_NAMES.length + edge.RENDER_TOOL_NAMES.length
          : null
      ),
      dogfoodObservationSchemaVersion: observer.DOGFOOD_OBSERVATION_SCHEMA_VERSION
    };
  } catch {
    failures.push("Unable to load canonical source contract facts");
    return null;
  }
}

function validateCurrentFactsSchema(facts, root, failures) {
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) {
    failures.push(`${FACTS_PATH} must contain a JSON object`);
    return;
  }

  if (!sameStringSet(Object.keys(facts), EXPECTED_TOP_LEVEL_KEYS)) {
    failures.push(`schema v5 top-level keys must be exactly: ${EXPECTED_TOP_LEVEL_KEYS.join(", ")}`);
  }
  if (facts.schemaVersion !== SCHEMA_VERSION) failures.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (facts.factsMode !== FACTS_MODE) failures.push(`factsMode must be ${FACTS_MODE}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(facts.updatedAt || ""))) {
    failures.push("updatedAt must use YYYY-MM-DD");
  }
  if (facts.baseBranch !== "main") failures.push("baseBranch must be main");

  const status = facts.status;
  if (!status || status.project !== "NOT_READY_BLOCKED" || status.rc !== "RC_NOT_READY_BLOCKED") {
    failures.push("status must remain NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED");
  } else {
    for (const field of [
      "productionReady",
      "releaseReady",
      "deployReady",
      "cutoverReady",
      "completeV8Claimed"
    ]) {
      if (status[field] !== false) failures.push(`status.${field} must be false`);
    }
  }

  if (facts.activeTask !== null && !CM_RE.test(String(facts.activeTask || ""))) {
    failures.push("activeTask must be null or a CM id");
  }

  const lastCompleted = facts.lastCompleted;
  if (!lastCompleted || typeof lastCompleted !== "object" || Array.isArray(lastCompleted)) {
    failures.push("lastCompleted must be an object");
  } else {
    if (!CM_RE.test(String(lastCompleted.taskId || ""))) {
      failures.push("lastCompleted.taskId must be a CM id");
    }
    if (!CMV_RE.test(String(lastCompleted.validationId || ""))) {
      failures.push("lastCompleted.validationId must be a CMV id");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(lastCompleted.completedAt || ""))) {
      failures.push("lastCompleted.completedAt must use YYYY-MM-DD");
    }
    if (typeof lastCompleted.scope !== "string" || !lastCompleted.scope.trim()) {
      failures.push("lastCompleted.scope must be a non-empty string");
    }
  }

  const baseline = facts.acceptedProductBaseline;
  for (const [field, expected] of Object.entries(ACCEPTED_BASELINE)) {
    if (!baseline || baseline[field] !== expected) {
      failures.push(`acceptedProductBaseline.${field} must equal the accepted PR #61 baseline`);
    }
  }
  if (baseline && (!SHA40_RE.test(String(baseline.reviewedHead || "")) ||
      !SHA40_RE.test(String(baseline.mergeCommit || "")))) {
    failures.push("accepted product baseline commit anchors must be 40-char lowercase SHAs");
  }

  const source = loadSourceContractFacts(root, failures);
  const toolSurfaces = facts.contracts && facts.contracts.toolSurfaces;
  const expectedSurfaces = {
    vcpCodexMemoryCore: {
      name: "vcp_codex_memory core tool definitions",
      count: 9
    },
    codexDefaultExposed: {
      name: "Codex default exposed tools",
      count: 5
    },
    chatgptEdge: {
      name: "ChatGPT Edge tools",
      count: 6
    }
  };
  for (const [key, expected] of Object.entries(expectedSurfaces)) {
    const actual = toolSurfaces && toolSurfaces[key];
    if (!actual || actual.name !== expected.name || actual.count !== expected.count) {
      failures.push(`contracts.toolSurfaces.${key} must be named exactly and count ${expected.count}`);
    }
    if (source && source[key] !== expected.count) {
      failures.push(`canonical source ${key} count must be ${expected.count}`);
    }
    if (source && actual && actual.count !== source[key]) {
      failures.push(`snapshot ${key} count must match canonical source`);
    }
  }

  const observationVersion = facts.contracts &&
    facts.contracts.dogfoodObservation &&
    facts.contracts.dogfoodObservation.schemaVersion;
  if (observationVersion !== 3) {
    failures.push("contracts.dogfoodObservation.schemaVersion must be 3");
  }
  if (source && source.dogfoodObservationSchemaVersion !== observationVersion) {
    failures.push("source dogfood observation schema version must match CURRENT_FACTS");
  }

  if (!Array.isArray(facts.blockers) || facts.blockers.length !== REQUIRED_BLOCKERS.length) {
    failures.push("blockers must contain exactly the four open product blockers");
  } else {
    const blockerIds = facts.blockers.map((item) => item && item.id);
    if (!sameStringSet(blockerIds, REQUIRED_BLOCKERS)) {
      failures.push("blocker ids do not match the required open blocker set");
    }
    for (const blocker of facts.blockers) {
      if (!blocker || blocker.status !== "open" || typeof blocker.summary !== "string" || !blocker.summary) {
        failures.push("every blocker must be open and include a summary");
      }
    }
  }

  const history = facts.history;
  if (!history || history.baselineCommit !== ACCEPTED_BASELINE.mergeCommit ||
      history.indexPath !== HISTORY_INDEX_PATH ||
      !sameStringSet(history.recoverablePaths, HISTORY_RECOVERY_PATHS)) {
    failures.push("history must bind the fixed baseline, index, and recoverable paths");
  }

  const livePolicy = facts.liveGitFactsPolicy;
  if (!livePolicy || livePolicy.freshQueryRequired !== true) {
    failures.push("liveGitFactsPolicy.freshQueryRequired must be true");
  } else {
    for (const field of [
      "currentBranchCommitted",
      "currentHeadCommitted",
      "aheadBehindCommitted",
      "currentPullRequestCommitted",
      "currentCiCommitted"
    ]) {
      if (livePolicy[field] !== false) failures.push(`liveGitFactsPolicy.${field} must be false`);
    }
  }
}

function validateAuthoritySurfaces(root, facts, failures) {
  const currentState = readText(root, "CURRENT_STATE.md", failures);
  const active = extractActiveBlock(currentState, "CURRENT_STATE.md", failures);
  for (const heading of [
    "Project Status",
    "Active Work",
    "Last Accepted Product Baseline",
    "Open Blockers",
    "Next Safe Action",
    "Authority Boundaries",
    "Evidence And History"
  ]) {
    if (!active.includes(`## ${heading}`)) failures.push(`CURRENT_STATE missing ${heading}`);
  }
  if (!active.includes("NOT_READY_BLOCKED / RC_NOT_READY_BLOCKED")) {
    failures.push("CURRENT_STATE status must match CURRENT_FACTS");
  }

  const stateTaskMatch = active.match(/activeTask:\s*`?(null|CM-\d{4})/);
  const stateActiveTask = stateTaskMatch && stateTaskMatch[1] !== "null" ? stateTaskMatch[1] : null;
  if (!stateTaskMatch) failures.push("CURRENT_STATE must declare activeTask");
  if (stateTaskMatch && stateActiveTask !== facts.activeTask) {
    failures.push("CURRENT_STATE activeTask must match CURRENT_FACTS.activeTask");
  }

  const stateCloseoutMatch = active.match(
    /Last completed:\s*`?(CM-\d{4})\s*\/\s*(CMV-\d{4})`?(?:[.\s]|$)/
  );
  if (!stateCloseoutMatch) {
    failures.push("CURRENT_STATE must declare the last completed CM / CMV pair");
  } else if (!facts.lastCompleted ||
      stateCloseoutMatch[1] !== facts.lastCompleted.taskId ||
      stateCloseoutMatch[2] !== facts.lastCompleted.validationId) {
    failures.push("CURRENT_STATE last completed pair must match CURRENT_FACTS.lastCompleted");
  }

  for (const relativePath of POINTER_FILES) {
    const text = readText(root, relativePath, failures);
    if (!text.includes("CURRENT_STATE.md")) {
      failures.push(`${relativePath} must point to CURRENT_STATE.md`);
    }
    if (!/(Non-authoritative|非权威|不具当前权威)/i.test(text)) {
      failures.push(`${relativePath} must declare itself non-authoritative`);
    }
    if (POINTER_SELF_AUTHORITY_RE.test(text)) {
      failures.push(`${relativePath} must not claim independent current authority`);
    }
    if (text.includes(ACTIVE_START) || text.includes(ACTIVE_END)) {
      failures.push(`${relativePath} must not own a current-facts active block`);
    }
  }

  for (const relativePath of REQUIRED_DOC_REFERENCES) {
    const text = readText(root, relativePath, failures);
    if (!text.includes("CURRENT_STATE.md") || !/\b(only|sole)\b/i.test(text)) {
      failures.push(`${relativePath} must declare CURRENT_STATE.md as the only default work entry`);
    }
  }
}

function validateQueueAndReceipts(root, facts, failures) {
  const queueText = readText(root, ".agent_board/TASK_QUEUE.md", failures);
  const validationText = readText(root, ".agent_board/VALIDATION_LOG.md", failures);
  const ledgerText = readText(root, ".agent_board/AUTOPILOT_LEDGER.md", failures);
  const queueRows = parseMarkdownTable(queueText);
  const validationRows = parseMarkdownTable(validationText);
  const ledgerRows = parseMarkdownTable(ledgerText);

  if (queueRows.length > 30) failures.push("TASK_QUEUE active row budget exceeded");
  const doneRows = queueRows.filter((row) => String(row.Status || "").trim().toLowerCase() === "done");
  if (doneRows.length > 0) failures.push("TASK_QUEUE must not contain done rows");
  if (queueText.includes("CM-1422")) failures.push("TASK_QUEUE must not restore stale CM-1422");

  const allowedActiveStatuses = new Set(["todo", "in_progress"]);
  const invalidStatusRows = queueRows.filter((row) =>
    !allowedActiveStatuses.has(String(row.Status || "").trim().toLowerCase())
  );
  if (invalidStatusRows.length > 0) {
    failures.push("TASK_QUEUE rows must use only todo or in_progress status");
  }
  const activeRows = queueRows.filter((row) =>
    allowedActiveStatuses.has(String(row.Status || "").trim().toLowerCase())
  );
  const activeIds = activeRows.map((row) => String(row.ID || "").replace(/`/g, "").trim());
  if (facts.activeTask === null && queueRows.length !== 0) {
    failures.push("CURRENT_FACTS activeTask null requires an empty active queue");
  } else if (typeof facts.activeTask === "string" &&
      (queueRows.length !== 1 || activeIds.length !== 1 || activeIds[0] !== facts.activeTask)) {
    failures.push("CURRENT_FACTS activeTask must match the single active queue row");
  }

  const expectedTask = facts.lastCompleted && facts.lastCompleted.taskId;
  const expectedValidation = facts.lastCompleted && facts.lastCompleted.validationId;
  const validationMatches = validationRows.filter((row) =>
    String(row.ID || "").replace(/`/g, "").trim() === expectedValidation
  );
  const ledgerMatches = ledgerRows.filter((row) =>
    String(row.ID || "").replace(/`/g, "").trim() === expectedTask
  );
  if (validationRows.length !== 1 || validationMatches.length !== 1 ||
      !containsExactIdToken(validationMatches[0] && validationMatches[0].Scope, expectedTask)) {
    failures.push(`${expectedTask} / ${expectedValidation} must have one bound VALIDATION_LOG row`);
  }
  if (ledgerRows.length !== 1 || ledgerMatches.length !== 1 ||
      !containsExactIdToken(ledgerMatches[0] && ledgerMatches[0].Validation, expectedValidation)) {
    failures.push(`${expectedTask} / ${expectedValidation} must have one bound AUTOPILOT_LEDGER receipt`);
  }
}

function validateSizeBudgets(root, failures) {
  for (const [relativePath, budget] of Object.entries(SIZE_BUDGETS)) {
    const text = readText(root, relativePath, failures);
    const actual = budget.kind === "bytes" ? Buffer.byteLength(text, "utf8") : lineCount(text);
    if (actual > budget.maximum) {
      failures.push(`${relativePath} exceeds ${budget.maximum} ${budget.kind}`);
    }
  }
}

function validateStalePhrases(root, failures) {
  for (const relativePath of ACTIVE_SURFACE_FILES) {
    const text = readText(root, relativePath, failures);
    for (const phrase of STALE_ACTIVE_PHRASES) {
      if (text.toLowerCase().includes(phrase.toLowerCase())) {
        failures.push(`${relativePath} contains stale active phrase: ${phrase}`);
      }
    }
  }
}

function defaultGitRunner(root, args) {
  return childProcess.spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024
  });
}

function validateHistory(root, facts, failures, options) {
  const index = readText(root, HISTORY_INDEX_PATH, failures);
  if (!index.includes(ACCEPTED_BASELINE.mergeCommit) ||
      !index.includes(`Governance reset task: \`${HISTORY_RESET_CLOSEOUT.taskId}\``) ||
      !index.includes(`Governance reset validation: \`${HISTORY_RESET_CLOSEOUT.validationId}\``) ||
      !index.includes(`git show ${ACCEPTED_BASELINE.mergeCommit}:CURRENT_STATE.md`) ||
      !index.includes("git log --follow") ||
      !index.includes("git blame")) {
    failures.push("history index must contain the fixed reset closeout, baseline, and recovery commands");
  }

  const gitRunner = options.gitRunner || defaultGitRunner;
  const inside = gitRunner(root, ["rev-parse", "--is-inside-work-tree"]);
  if (inside && inside.status === 0 && String(inside.stdout || "").trim() === "true") {
    const baseline = facts.history && facts.history.baselineCommit;
    const checks = [
      `${baseline}^{commit}`,
      `${ACCEPTED_BASELINE.reviewedHead}^{commit}`,
      ...HISTORY_RECOVERY_PATHS.map((relativePath) => `${baseline}:${relativePath}`)
    ];
    for (const objectName of checks) {
      const result = gitRunner(root, ["cat-file", "-e", objectName]);
      if (!result || result.status !== 0) {
        failures.push(`history baseline object is not readable: ${objectName}`);
      }
    }
  }
}

function validateCurrentFactsDrift(root = process.cwd(), options = {}) {
  const failures = [];
  const facts = readJson(root, FACTS_PATH, failures);
  validateCurrentFactsSchema(facts, root, failures);
  if (facts) {
    validateAuthoritySurfaces(root, facts, failures);
    validateQueueAndReceipts(root, facts, failures);
    validateSizeBudgets(root, failures);
    validateStalePhrases(root, failures);
    validateHistory(root, facts, failures, options);
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
  console.log(
    `active_task=${result.facts.activeTask === null ? "null" : result.facts.activeTask} ` +
    `last_completed=${result.facts.lastCompleted.taskId}/${result.facts.lastCompleted.validationId} ` +
    `facts=${FACTS_PATH}`
  );
}

module.exports = {
  ACCEPTED_BASELINE,
  ACTIVE_END,
  ACTIVE_START,
  ACTIVE_SURFACE_FILES,
  EXPECTED_TOP_LEVEL_KEYS,
  FACTS_PATH,
  HISTORY_INDEX_PATH,
  HISTORY_RECOVERY_PATHS,
  HISTORY_RESET_CLOSEOUT,
  POINTER_FILES,
  REQUIRED_ACTIVE_FILES,
  REQUIRED_DOC_REFERENCES,
  SIZE_BUDGETS,
  extractActiveBlock,
  validateCurrentFactsDrift
};
