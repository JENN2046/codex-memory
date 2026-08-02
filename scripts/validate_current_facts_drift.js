#!/usr/bin/env node
"use strict";

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");
const {
  ACTIVE_ROW_CANDIDATE_RE,
  COMPLETED_RESULT,
  TABLE_HEADERS,
  containsExactIdToken,
  hasNonEmptyReceipt,
  hasExactTableShape,
  isCanonicalCompletedResult,
  parseMarkdownTable
} = require("./validate_autopilot_ledger_consistency");

const ACTIVE_START = "<!-- CURRENT-FACTS-ACTIVE-START -->";
const ACTIVE_END = "<!-- CURRENT-FACTS-ACTIVE-END -->";
const FACTS_PATH = ".agent_board/CURRENT_FACTS.json";
const SCHEMA_VERSION = 5;
const FACTS_MODE = "committed_status_snapshot";
const HISTORY_BASELINE_COMMIT = "ef62d4819ece3d93cb90e2d55fa84973cf43b7d1";
const SHA40_RE = /^[0-9a-f]{40}$/;
const CM_RE = /^CM-\d{4}$/;
const CMV_RE = /^CMV-\d{4}$/;
const ACTIVE_PHASE_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const BLOCKER_ID_RE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;
const BLOCKER_STATUS_RE = /^[a-z][a-z0-9_]*$/;

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

const PURE_POINTER_TEMPLATES = Object.freeze({
  "STATUS.md": [
    "# Status",
    "",
    "> Non-authoritative pointer. Start and resume work only from",
    "> `CURRENT_STATE.md`.",
    "",
    "## Pointer",
    "",
    "- Current authority: `CURRENT_STATE.md`",
    "- Machine companion: `.agent_board/CURRENT_FACTS.json`",
    "- Live Git, GitHub, CI, and runtime facts must be collected fresh under their",
    "  applicable authority boundaries.",
    "- Historical recovery:",
    "  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`",
    ""
  ].join("\n"),
  ".agent_board/RUN_STATE.md": [
    "# RUN_STATE.md - codex-memory",
    "",
    "> Non-authoritative pointer. Start and resume work only from",
    "> `CURRENT_STATE.md`.",
    "",
    "- Machine companion: `.agent_board/CURRENT_FACTS.json`",
    "- Live Git, GitHub, CI, and runtime facts are not stored here.",
    "- Historical recovery:",
    "  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`",
    ""
  ].join("\n"),
  ".agent_board/HANDOFF.md": [
    "# HANDOFF.md - codex-memory",
    "",
    "> Non-authoritative pointer. A receiving agent starts and resumes work only",
    "> from `CURRENT_STATE.md`.",
    "",
    "- Machine companion: `.agent_board/CURRENT_FACTS.json`",
    "- Do not infer a task, phase, blocker, receipt, or action from this file.",
    "- Collect live Git, GitHub, CI, and runtime facts fresh under the applicable",
    "  authority boundaries.",
    "- Historical recovery:",
    "  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`",
    ""
  ].join("\n"),
  ".agent_board/CHECKPOINT.md": [
    "# CHECKPOINT.md - codex-memory",
    "",
    "> Non-authoritative pointer. Start and resume work only from",
    "> `CURRENT_STATE.md`.",
    "",
    "- Machine companion: `.agent_board/CURRENT_FACTS.json`",
    "- This file owns no task, phase, receipt, blocker, or execution instruction.",
    "- Live Git, GitHub, CI, and runtime facts must be collected fresh.",
    "- Historical recovery:",
    "  `docs/archive/CM2155_GOVERNANCE_SURFACE_RESET_HISTORY_INDEX.md`",
    ""
  ].join("\n")
});
const PURE_POINTER_FILES = Object.freeze(Object.keys(PURE_POINTER_TEMPLATES));

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
const STALE_ACTIVE_PHRASES = Object.freeze([
  "CI must rerun",
  "merge remains separate",
  "next exact-head CI pending"
]);
const BRANCH_AUTHORITY_PREDICATE_SOURCE = String.raw`is|was|remains?|has|records?|contains?|holds?|owns?|tracks?|stores?|persists?|keeps?|represents?|identifies?|points?\s+to|serves?\s+as|acts?\s+as|functions?\s+as|provides?|supplies?|defines?|declares?|establishes?|determines?|governs?|controls?|authorizes?`;
const STALE_ACTIVE_ASSERTIONS = Object.freeze([
  Object.freeze({
    phrase: "current task branch",
    pattern: new RegExp(
      String.raw`\bcurrent task branch\s+(?:(?:currently|now)\s+)?(${BRANCH_AUTHORITY_PREDICATE_SOURCE})\b`,
      "gi"
    )
  })
]);
const NEGATED_REPORTING_PREFIX_RE = /\b(?:(?:(?:do|does|did|has|have|had|is|are|was|were|will|would|can|could|may|might|must|need|shall|should)\s+(?:not|no\s+longer))|(?:don't|doesn't|didn't|hasn't|haven't|hadn't|isn't|aren't|wasn't|weren't|won't|wouldn't|can't|couldn't|mightn't|mustn't|needn't|shan't|shouldn't)|never|cannot|no\s+longer|ought(?:\s+not|n't)\s+to)\s+(?:(?:explicitly|falsely|incorrectly|wrongly|ever)\s+){0,2}(?:claims?|claimed|claiming|states?|stated|stating|asserts?|asserted|asserting|says?|said|saying|reports?|reported|reporting)\s*(?::\s*(?:the\s+)?|\s+(?:(?:that\s+)?(?:the\s+)?|the\s+following\s*:\s*(?:the\s+)?))$/i;
const NEGATED_AUTHORITY_PREFIX_RE = /\b(?:(?:(?:do|does|did|has|have|had|is|are|was|were|will|would|can|could|may|might|must|need|shall|should)\s+(?:not|no\s+longer))|(?:don't|doesn't|didn't|hasn't|haven't|hadn't|isn't|aren't|wasn't|weren't|won't|wouldn't|can't|couldn't|mightn't|mustn't|needn't|shan't|shouldn't)|never|cannot|no\s+longer|ought(?:\s+not|n't)\s+to)\s+(?:(?:actually|currently|directly|ever|explicitly|falsely|incorrectly|wrongly)\s+){0,2}$/i;
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

function sameObjectKeys(actual, expected) {
  return actual && typeof actual === "object" && !Array.isArray(actual) &&
    sameStringSet(Object.keys(actual), expected);
}

function blockerFingerprint(blocker) {
  return JSON.stringify([
    blocker && blocker.id,
    blocker && blocker.status,
    blocker && blocker.summary
  ]);
}

function extractHeadingSection(text, heading, nextHeading) {
  const startMarker = `## ${heading}`;
  const endMarker = `## ${nextHeading}`;
  const start = String(text).indexOf(startMarker);
  const end = String(text).indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0 || end <= start) return "";
  return String(text).slice(start + startMarker.length, end).trim();
}

function stripInlineCode(value) {
  return String(value || "").replace(/^`|`$/g, "").trim();
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
    const attempt = loadModuleFresh(path.join(
      root,
      "packages/chatgpt-r4-contracts/governed-read-attempt.js"
    ));
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
      chatgptEdgeDataResponseSchemaVersion:
        edge.CHATGPT_EDGE_DATA_SCHEMA_VERSION,
      chatgptEdgeRequestEnvelopeSchemaVersion:
        edge.EDGE_REQUEST_SCHEMA_VERSION,
      chatgptEdgeResponseEnvelopeSchemaVersion:
        edge.EDGE_RESPONSE_SCHEMA_VERSION,
      governedReadAttemptProtocol:
        attempt.GOVERNED_READ_ATTEMPT_PROTOCOL,
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
  if (!sameObjectKeys(baseline, ["prNumber", "reviewedHead", "mergeCommit", "ciRunId"])) {
    failures.push("acceptedProductBaseline must contain exactly prNumber, reviewedHead, mergeCommit, and ciRunId");
  } else {
    if (!Number.isInteger(baseline.prNumber) || baseline.prNumber <= 0) {
      failures.push("acceptedProductBaseline.prNumber must be a positive integer");
    }
    if (!SHA40_RE.test(String(baseline.reviewedHead || "")) ||
        !SHA40_RE.test(String(baseline.mergeCommit || ""))) {
      failures.push("accepted product baseline commit anchors must be 40-char lowercase SHAs");
    }
    if (!/^\d+$/.test(String(baseline.ciRunId || ""))) {
      failures.push("acceptedProductBaseline.ciRunId must contain decimal digits");
    }
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

  const edgeResponse = facts.contracts &&
    facts.contracts.chatgptEdgeDataResponse;
  const expectedEdgeResponse = {
    dataResponseSchemaVersion: 2,
    requestEnvelopeSchemaVersion: 2,
    responseEnvelopeSchemaVersion: 2,
    governedReadAttemptProtocol: "governed_read_attempt.v1",
    legacyV1Accepted: false
  };
  if (!sameObjectKeys(
    edgeResponse,
    Object.keys(expectedEdgeResponse)
  )) {
    failures.push(
      "contracts.chatgptEdgeDataResponse must contain the exact v2 contract dimensions"
    );
  } else {
    for (const [key, value] of Object.entries(expectedEdgeResponse)) {
      if (edgeResponse[key] !== value) {
        failures.push(
          `contracts.chatgptEdgeDataResponse.${key} must equal ${value}`
        );
      }
    }
  }
  if (source && (
    source.chatgptEdgeDataResponseSchemaVersion !==
      edgeResponse?.dataResponseSchemaVersion ||
    source.chatgptEdgeRequestEnvelopeSchemaVersion !==
      edgeResponse?.requestEnvelopeSchemaVersion ||
    source.chatgptEdgeResponseEnvelopeSchemaVersion !==
      edgeResponse?.responseEnvelopeSchemaVersion ||
    source.governedReadAttemptProtocol !==
      edgeResponse?.governedReadAttemptProtocol
  )) {
    failures.push(
      "source ChatGPT Edge v2 dimensions must match CURRENT_FACTS"
    );
  }

  if (!Array.isArray(facts.blockers) || facts.blockers.length > 30) {
    failures.push("blockers must be an array with at most 30 current entries");
  } else {
    const blockerIds = new Set();
    for (const blocker of facts.blockers) {
      if (!sameObjectKeys(blocker, ["id", "status", "summary"]) ||
          !BLOCKER_ID_RE.test(String(blocker && blocker.id || "")) ||
          !BLOCKER_STATUS_RE.test(String(blocker && blocker.status || "")) ||
          typeof blocker.summary !== "string" ||
          !blocker.summary.trim()) {
        failures.push("every blocker must contain a valid id, status, and non-empty summary");
        continue;
      }
      if (blockerIds.has(blocker.id)) {
        failures.push(`blocker ids must be unique: ${blocker.id}`);
      } else {
        blockerIds.add(blocker.id);
      }
    }
  }

  const history = facts.history;
  if (!history || history.baselineCommit !== HISTORY_BASELINE_COMMIT ||
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

  const stateTaskDeclarationLines = active
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      !line.startsWith("<!--") && /\bactiveTask\s*:/i.test(line)
    );
  const stateTaskMatch = stateTaskDeclarationLines.length === 1
    ? stateTaskDeclarationLines[0].match(/^(`?)activeTask:\s*(null|CM-\d{4})\1$/)
    : null;
  const stateActiveTask = stateTaskMatch && stateTaskMatch[2] !== "null"
    ? stateTaskMatch[2]
    : null;
  if (!stateTaskMatch) {
    failures.push("CURRENT_STATE must declare exactly one canonical activeTask");
  }
  if (stateTaskMatch && stateActiveTask !== facts.activeTask) {
    failures.push("CURRENT_STATE activeTask must match CURRENT_FACTS.activeTask");
  }

  const statePhaseDeclarationLines = active
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      !line.startsWith("<!--") && /\bactivePhase\s*:/i.test(line)
    );
  const statePhaseMatch = statePhaseDeclarationLines.length === 1
    ? statePhaseDeclarationLines[0].match(
      /^(`?)activePhase:\s*(null|[a-z][a-z0-9]*(?:_[a-z0-9]+)*)\1$/
    )
    : null;
  const stateActivePhase = statePhaseMatch && statePhaseMatch[2] !== "null"
    ? statePhaseMatch[2]
    : null;
  if (!statePhaseMatch ||
      (stateActivePhase !== null && !ACTIVE_PHASE_RE.test(stateActivePhase))) {
    failures.push("CURRENT_STATE must declare exactly one canonical activePhase");
  } else if (facts.activeTask === null && stateActivePhase !== null) {
    failures.push("CURRENT_STATE activePhase must be null when activeTask is null");
  } else if (facts.activeTask !== null && stateActivePhase === null) {
    failures.push("CURRENT_STATE activePhase must be non-null when activeTask is selected");
  }

  const stateCloseoutDeclarationLines = active
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) =>
      !line.startsWith("<!--") && /\bLast completed\s*:/i.test(line)
    );
  const stateCloseoutMatch = stateCloseoutDeclarationLines.length === 1
    ? stateCloseoutDeclarationLines[0].match(
      /^Last completed:\s*(`?)(CM-\d{4})\s*\/\s*(CMV-\d{4})\1\.$/
    )
    : null;
  if (!stateCloseoutMatch) {
    failures.push("CURRENT_STATE must declare exactly one canonical last completed CM / CMV pair");
  } else if (!facts.lastCompleted ||
      stateCloseoutMatch[2] !== facts.lastCompleted.taskId ||
      stateCloseoutMatch[3] !== facts.lastCompleted.validationId) {
    failures.push("CURRENT_STATE last completed pair must match CURRENT_FACTS.lastCompleted");
  }

  const baselineSection = extractHeadingSection(
    active,
    "Last Accepted Product Baseline",
    "Open Blockers"
  );
  const malformedBaselineRows = [];
  const baselineDiagnostics = {};
  const baselineRows = parseMarkdownTable(baselineSection, {
    diagnostics: baselineDiagnostics,
    malformedRows: malformedBaselineRows,
    trackBeforeHeader: false,
    trackedRowPattern: /^\|/
  });
  const baselineFields = new Map(
    baselineRows.map((row) => [stripInlineCode(row.Field), stripInlineCode(row["Accepted value"])])
  );
  const baseline = facts.acceptedProductBaseline || {};
  const observationVersion = facts.contracts &&
    facts.contracts.dogfoodObservation &&
    facts.contracts.dogfoodObservation.schemaVersion;
  const expectedBaselineFields = new Map([
    ["Pull request", `#${baseline.prNumber}`],
    ["Reviewed head", String(baseline.reviewedHead || "")],
    ["Merge commit", String(baseline.mergeCommit || "")],
    ["Main CI run", String(baseline.ciRunId || "")],
    ["Private dogfood observation schema", String(observationVersion || "")]
  ]);
  if (!hasExactTableShape(baselineDiagnostics, ["Field", "Accepted value"]) ||
      malformedBaselineRows.length > 0 ||
      baselineRows.length !== expectedBaselineFields.size ||
      baselineFields.size !== expectedBaselineFields.size ||
      [...expectedBaselineFields].some(([field, expected]) => baselineFields.get(field) !== expected)) {
    failures.push("CURRENT_STATE accepted product baseline must match CURRENT_FACTS and observation schema");
  }

  const blockersSection = extractHeadingSection(active, "Open Blockers", "Next Safe Action");
  const blockerLines = blockersSection.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const stateBlockers = [];
  let malformedBlockerLine = false;
  for (const line of blockerLines) {
    if (line === "No current blockers.") continue;
    const match = line.match(/^- `([^`]+)` \[([a-z][a-z0-9_]*)\]: (.+)$/);
    if (!match) {
      malformedBlockerLine = true;
      continue;
    }
    stateBlockers.push({ id: match[1], status: match[2], summary: match[3] });
  }
  const factsBlockers = Array.isArray(facts.blockers) ? facts.blockers : [];
  const emptyBlockerDeclarationInvalid = factsBlockers.length === 0
    ? blockerLines.length !== 1 || blockerLines[0] !== "No current blockers."
    : blockerLines.includes("No current blockers.");
  if (malformedBlockerLine ||
      emptyBlockerDeclarationInvalid ||
      !sameStringSet(
        stateBlockers.map(blockerFingerprint),
        factsBlockers.map(blockerFingerprint)
      )) {
    failures.push("CURRENT_STATE blockers must exactly match CURRENT_FACTS.blockers");
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

  for (const relativePath of PURE_POINTER_FILES) {
    const text = readText(root, relativePath, failures);
    if (text !== PURE_POINTER_TEMPLATES[relativePath]) {
      failures.push(`${relativePath} must match its canonical pure-pointer template`);
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
  const malformedQueueRows = [];
  const malformedValidationRows = [];
  const malformedLedgerRows = [];
  const queueDiagnostics = {};
  const validationDiagnostics = {};
  const ledgerDiagnostics = {};
  const queueRows = parseMarkdownTable(queueText, {
    diagnostics: queueDiagnostics,
    malformedRows: malformedQueueRows,
    trackedRowPattern: ACTIVE_ROW_CANDIDATE_RE
  });
  const validationRows = parseMarkdownTable(validationText, {
    diagnostics: validationDiagnostics,
    malformedRows: malformedValidationRows,
    trackedRowPattern: ACTIVE_ROW_CANDIDATE_RE
  });
  const ledgerRows = parseMarkdownTable(ledgerText, {
    diagnostics: ledgerDiagnostics,
    malformedRows: malformedLedgerRows,
    trackedRowPattern: ACTIVE_ROW_CANDIDATE_RE
  });

  if (queueRows.length > 30) failures.push("TASK_QUEUE active row budget exceeded");
  for (const [name, diagnostics, expectedHeader] of [
    ["TASK_QUEUE", queueDiagnostics, TABLE_HEADERS.taskQueue],
    ["VALIDATION_LOG", validationDiagnostics, TABLE_HEADERS.validationLog],
    ["AUTOPILOT_LEDGER", ledgerDiagnostics, TABLE_HEADERS.ledger]
  ]) {
    if (!hasExactTableShape(diagnostics, expectedHeader)) {
      failures.push(`${name} must retain its exact table header and separator`);
    }
  }
  if (malformedQueueRows.length > 0) {
    failures.push("TASK_QUEUE must not contain malformed CM data rows");
  }
  if (malformedValidationRows.length > 0) {
    failures.push("VALIDATION_LOG must not contain malformed CM/CMV data rows");
  }
  if (malformedLedgerRows.length > 0) {
    failures.push("AUTOPILOT_LEDGER must not contain malformed CM/CMV data rows");
  }
  const doneRows = queueRows.filter((row) => String(row.Status || "").trim().toLowerCase() === "done");
  if (doneRows.length > 0) failures.push("TASK_QUEUE must not contain done rows");
  if (queueText.includes("CM-1422")) failures.push("TASK_QUEUE must not restore stale CM-1422");

  const allowedActiveStatuses = new Set(["todo", "in_progress"]);
  const invalidStatusRows = queueRows.filter((row) =>
    !allowedActiveStatuses.has(String(row.Status || "").trim())
  );
  if (invalidStatusRows.length > 0) {
    failures.push("TASK_QUEUE rows must use only todo or in_progress status");
  }
  if (queueRows.some((row) => !CM_RE.test(String(row.ID || "").trim()))) {
    failures.push("TASK_QUEUE IDs must use raw canonical CM format");
  }
  if (validationRows.some((row) => !CMV_RE.test(String(row.ID || "").trim()))) {
    failures.push("VALIDATION_LOG IDs must use raw canonical CMV format");
  }
  if (ledgerRows.some((row) => !CM_RE.test(String(row.ID || "").trim()))) {
    failures.push("AUTOPILOT_LEDGER IDs must use raw canonical CM format");
  }
  const activeRows = queueRows.filter((row) =>
    allowedActiveStatuses.has(String(row.Status || "").trim())
  );
  const activeIds = activeRows.map((row) => String(row.ID || "").trim());
  if (facts.activeTask === null && queueRows.length !== 0) {
    failures.push("CURRENT_FACTS activeTask null requires an empty active queue");
  } else if (typeof facts.activeTask === "string" &&
      (queueRows.length !== 1 || activeIds.length !== 1 || activeIds[0] !== facts.activeTask)) {
    failures.push("CURRENT_FACTS activeTask must match the single active queue row");
  }

  const expectedTask = facts.lastCompleted && facts.lastCompleted.taskId;
  const expectedValidation = facts.lastCompleted && facts.lastCompleted.validationId;
  const validationMatches = validationRows.filter((row) =>
    String(row.ID || "").trim() === expectedValidation
  );
  const ledgerMatches = ledgerRows.filter((row) =>
    String(row.ID || "").trim() === expectedTask
  );
  if (validationRows.length !== 1 || validationMatches.length !== 1 ||
      !containsExactIdToken(validationMatches[0] && validationMatches[0].Scope, expectedTask)) {
    failures.push(`${expectedTask} / ${expectedValidation} must have one bound VALIDATION_LOG row`);
  }
  if (validationMatches.length === 1 &&
      !isCanonicalCompletedResult(validationMatches[0].Result)) {
    failures.push(`${expectedValidation} result must be exactly ${COMPLETED_RESULT}`);
  }
  if (ledgerRows.length !== 1 || ledgerMatches.length !== 1 ||
      !containsExactIdToken(ledgerMatches[0] && ledgerMatches[0].Validation, expectedValidation)) {
    failures.push(`${expectedTask} / ${expectedValidation} must have one bound AUTOPILOT_LEDGER receipt`);
  }
  if (ledgerMatches.length === 1 && !hasNonEmptyReceipt(ledgerMatches[0].Receipt)) {
    failures.push(`${expectedTask} ledger receipt must be non-empty`);
  }
  if (ledgerMatches.length === 1 &&
      !isCanonicalCompletedResult(ledgerMatches[0].Result)) {
    failures.push(`${expectedTask} ledger result must be exactly ${COMPLETED_RESULT}`);
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

function isInsideQuotedSegment(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const lineEndCandidate = text.indexOf("\n", index);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  const before = text.slice(lineStart, index);
  const after = text.slice(index, lineEnd);
  const insideSymmetricQuote = ["\"", "`"].some(delimiter =>
    before.split(delimiter).length % 2 === 0 && after.includes(delimiter)
  );
  if (insideSymmetricQuote) return true;
  const isWordCharacter = value => typeof value === "string" && /[\p{L}\p{N}_]/u.test(value);
  const singleQuoteDelimiters = value => {
    const characters = [...value];
    return characters.reduce((count, character, characterIndex) => {
      if (character !== "'") return count;
      const previous = characters[characterIndex - 1];
      const next = characters[characterIndex + 1];
      return isWordCharacter(previous) && isWordCharacter(next) ? count : count + 1;
    }, 0);
  };
  if (singleQuoteDelimiters(before) % 2 === 1 && singleQuoteDelimiters(after) > 0) {
    return true;
  }
  return [["“", "”"], ["‘", "’"]].some(([open, close]) =>
    before.lastIndexOf(open) > before.lastIndexOf(close) && after.includes(close)
  );
}

function isInsideMarkdownFence(text, index) {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const precedingLines = text.slice(0, lineStart).split("\n");
  let fence = null;
  for (const line of precedingLines) {
    if (!fence) {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
        fence = { character: opening[1][0], length: opening[1].length };
      }
      continue;
    }
    const marker = fence.character.repeat(fence.length);
    const closing = new RegExp(`^ {0,3}${marker}${fence.character}*\\s*$`);
    if (closing.test(line)) fence = null;
  }
  return fence !== null;
}

function firstUnquotedClauseTerminator(text, startIndex) {
  const lineEndCandidate = text.indexOf("\n", startIndex);
  const lineEnd = lineEndCandidate === -1 ? text.length : lineEndCandidate;
  for (let index = startIndex; index < lineEnd; index += 1) {
    if (".!?;".includes(text[index]) && !isInsideQuotedSegment(text, index)) {
      return text[index];
    }
  }
  return null;
}

function continuationSubjectIsBranchBound(prefix, previousSubjectIsBranchBound = null) {
  const leadingCoordination = /^\s*(?:and|but|yet)\b/i.test(prefix);
  const withoutTransition = prefix.replace(
    /^\s*(?:but|yet|although|however|and)\b\s*,?\s*/i,
    ""
  );
  const withoutParenthetical = withoutTransition.replace(
    /^\s*(?:(?:according\s+to|per|as\s+(?:documented|noted|reported)\s+by)\b[^,\n]{1,80},\s*)+/i,
    ""
  );
  const coordination = withoutParenthetical.match(/\b(?:and|but|yet)\b([^.!?;]*)$/i);
  const subjectWindow = coordination ? coordination[1] : withoutParenthetical;
  const modifiers = String.raw`(?:(?:actually|currently|directly|ever|explicitly|falsely|incorrectly|now|still|wrongly)\s+){0,2}`;
  const auxiliary = String.raw`(?:(?:do|does|did|has|have|had|is|are|was|were|will|would|can|could|may|might|must|need|shall|should)(?:\s+(?:not|no\s+longer))?|(?:don't|doesn't|didn't|hasn't|haven't|hadn't|isn't|aren't|wasn't|weren't|won't|wouldn't|can't|couldn't|mightn't|mustn't|needn't|shan't|shouldn't)|never|cannot|no\s+longer|ought(?:\s+not|n't)\s+to)`;
  const functionWordsOnly = new RegExp(`^\\s*${modifiers}(?:${auxiliary}\\s+${modifiers})?$`, "i");
  const branchSubject = new RegExp(
    `(?:\\b(?:it|(?:the\\s+)?current\\s+task\\s+branch|this\\s+branch|that\\s+branch)\\b)\\s+${modifiers}(?:${auxiliary}\\s+${modifiers})?$`,
    "i"
  );
  if (branchSubject.test(subjectWindow)) return true;
  if (functionWordsOnly.test(subjectWindow)) {
    if ((coordination || leadingCoordination) && previousSubjectIsBranchBound !== null) {
      return previousSubjectIsBranchBound;
    }
    if (coordination) {
      const leadingClause = withoutParenthetical.slice(0, coordination.index);
      const explicitForeignSubject = /^(?!\s*(?:[Ii]t|(?:(?:[Tt]he|[Aa]n?|[Tt]his|[Tt]hat)\s+)?(?:[Cc]urrent\s+[Tt]ask\s+)?[Bb]ranch)\b)\s*(?:`?[\p{L}\p{N}_/-]+\.[\p{L}\p{N}_.-]+`?\b|[\p{Lu}][\p{L}\p{N}_-]*\b|(?:[Tt]he|[Aa]n?|[Tt]his|[Tt]hat)\s+)/u;
      return !explicitForeignSubject.test(leadingClause);
    }
    return true;
  }
  return false;
}

function containsAffirmativeAuthorityContinuation(text, suffix, suffixStart) {
  const lineEnd = suffix.indexOf("\n");
  const lineSuffix = lineEnd === -1 ? suffix : suffix.slice(0, lineEnd);
  const transition = lineSuffix.match(
    /\b(?:but|yet|although|however|and)\b(?:[^.!?;]|\.(?=[\p{L}\p{N}_]))*/iu
  );
  if (transition) {
    const predicatePattern = new RegExp(`\\b(${BRANCH_AUTHORITY_PREDICATE_SOURCE})\\b`, "gi");
    let previousPredicateEnd = 0;
    let previousSubjectIsBranchBound = null;
    for (const predicate of transition[0].matchAll(predicatePattern)) {
      const predicateIndex = transition.index + predicate.index;
      if (isInsideQuotedSegment(text, suffixStart + predicateIndex)) continue;
      const prefix = transition[0].slice(0, predicate.index);
      const subjectPrefix = transition[0].slice(previousPredicateEnd, predicate.index);
      const predicateSuffix = transition[0].slice(predicate.index + predicate[0].length);
      const subjectIsBranchBound = continuationSubjectIsBranchBound(
        subjectPrefix,
        previousSubjectIsBranchBound
      );
      previousPredicateEnd = predicate.index + predicate[0].length;
      previousSubjectIsBranchBound = subjectIsBranchBound;
      const negatedPrefix = NEGATED_AUTHORITY_PREFIX_RE.test(prefix);
      const queriedPrefix = /\b(?:whether|if)\b[^.!?;]*$/i.test(prefix);
      const negatedSuffix = /^\s+(?:not(?!\s+only\b)|never|no longer|no|neither)\b/i.test(predicateSuffix);
      if (subjectIsBranchBound && !negatedPrefix && !queriedPrefix && !negatedSuffix) return true;
    }
  }
  return false;
}

function containsStaleAssertion(text, assertion) {
  for (const match of text.matchAll(assertion.pattern)) {
    if (isInsideMarkdownFence(text, match.index) || isInsideQuotedSegment(text, match.index)) {
      continue;
    }
    const clauseStart = Math.max(
      text.lastIndexOf("\n", match.index - 1),
      text.lastIndexOf(".", match.index - 1),
      text.lastIndexOf(";", match.index - 1),
      text.lastIndexOf("!", match.index - 1),
      text.lastIndexOf("?", match.index - 1)
    ) + 1;
    const prefix = text.slice(clauseStart, match.index);
    const suffixStart = match.index + match[0].length;
    const suffix = text.slice(suffixStart);
    if (firstUnquotedClauseTerminator(text, suffixStart) === "?") continue;
    if (NEGATED_REPORTING_PREFIX_RE.test(prefix)) {
      continue;
    }
    if (/\b(?:whether|if)\s+(?:the\s+)?$/i.test(prefix)) continue;
    if (/^(?:is|was|remains?)$/i.test(match[1]) &&
        /^\s+(?:(?:currently|still)\s+)?(?:unknown|unavailable|unverified|undetermined|unresolved|unspecified|not known|yet to be (?:determined|queried|verified))\b/i.test(suffix) &&
        !containsAffirmativeAuthorityContinuation(text, suffix, suffixStart)) {
      continue;
    }
    if (/^\s+(?:not(?!\s+only\b)|never|no longer|no|neither)\b/i.test(suffix)) continue;
    return true;
  }
  return false;
}

function validateStalePhrases(root, failures) {
  for (const relativePath of ACTIVE_SURFACE_FILES) {
    const text = readText(root, relativePath, failures);
    for (const phrase of STALE_ACTIVE_PHRASES) {
      if (text.toLowerCase().includes(phrase.toLowerCase())) {
        failures.push(`${relativePath} contains stale active phrase: ${phrase}`);
      }
    }
    for (const assertion of STALE_ACTIVE_ASSERTIONS) {
      if (containsStaleAssertion(text, assertion)) {
        failures.push(`${relativePath} contains stale active phrase: ${assertion.phrase}`);
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

function readableBaseBranchRefs(root, baseBranch, gitRunner) {
  const remoteResult = gitRunner(root, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/remotes"
  ]);
  if (!remoteResult || remoteResult.status !== 0) {
    return {
      lookupOk: false,
      refs: []
    };
  }
  const escapedBaseBranch = String(baseBranch || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const remoteBranchRefPattern = new RegExp(
    `^refs/remotes/[^/]+/${escapedBaseBranch}$`
  );
  const remoteCandidates = String(remoteResult.stdout || "")
    .split(/\r?\n/)
    .map((ref) => ref.trim())
    .filter((ref) => remoteBranchRefPattern.test(ref));
  const readableRemoteRefs = [...new Set(remoteCandidates)].filter((ref) => {
    const result = gitRunner(root, ["cat-file", "-e", `${ref}^{commit}`]);
    return result && result.status === 0;
  });
  if (remoteCandidates.length > 0) {
    return {
      lookupOk: true,
      refs: readableRemoteRefs
    };
  }

  const localRef = `refs/heads/${baseBranch}`;
  const localResult = gitRunner(root, ["cat-file", "-e", `${localRef}^{commit}`]);
  return {
    lookupOk: true,
    refs: localResult && localResult.status === 0 ? [localRef] : []
  };
}

function validateHistory(root, facts, failures, options) {
  const index = readText(root, HISTORY_INDEX_PATH, failures);
  if (!index.includes(HISTORY_BASELINE_COMMIT) ||
      !index.includes(`Governance reset task: \`${HISTORY_RESET_CLOSEOUT.taskId}\``) ||
      !index.includes(`Governance reset validation: \`${HISTORY_RESET_CLOSEOUT.validationId}\``) ||
      !index.includes(`git show ${HISTORY_BASELINE_COMMIT}:CURRENT_STATE.md`) ||
      !index.includes("git log --follow") ||
      !index.includes("git blame")) {
    failures.push("history index must contain the fixed reset closeout, baseline, and recovery commands");
  }

  const gitRunner = options.gitRunner || defaultGitRunner;
  const inside = gitRunner(root, ["rev-parse", "--is-inside-work-tree"]);
  if (inside && inside.status === 0 && String(inside.stdout || "").trim() === "true") {
    const productBaseline = facts.acceptedProductBaseline || {};
    const baseBranchResolution = readableBaseBranchRefs(
      root,
      facts.baseBranch,
      gitRunner
    );
    const baseBranchRefs = baseBranchResolution.refs;
    if (!baseBranchResolution.lookupOk) {
      failures.push(`unable to enumerate Git refs for baseBranch ${facts.baseBranch}`);
    } else if (baseBranchRefs.length === 0) {
      failures.push(`no readable Git ref found for baseBranch ${facts.baseBranch}`);
    }
    const checks = [
      `${HISTORY_BASELINE_COMMIT}^{commit}`,
      `${productBaseline.reviewedHead}^{commit}`,
      `${productBaseline.mergeCommit}^{commit}`,
      ...HISTORY_RECOVERY_PATHS.map((relativePath) =>
        `${HISTORY_BASELINE_COMMIT}:${relativePath}`
      )
    ];
    for (const objectName of checks) {
      const result = gitRunner(root, ["cat-file", "-e", objectName]);
      if (!result || result.status !== 0) {
        failures.push(`required Git object is not readable: ${objectName}`);
      }
    }
    for (const [ancestor, descendant, label] of [
      [
        HISTORY_BASELINE_COMMIT,
        productBaseline.mergeCommit,
        "accepted product merge must descend from the pre-compaction history baseline"
      ],
      [
        productBaseline.reviewedHead,
        productBaseline.mergeCommit,
        "accepted product reviewed head must be an ancestor of its merge commit"
      ]
    ]) {
      const result = gitRunner(root, ["merge-base", "--is-ancestor", ancestor, descendant]);
      if (!result || result.status !== 0) failures.push(label);
    }
    if (baseBranchRefs.length > 0) {
      const acceptedOnBase = baseBranchRefs.some((baseBranchRef) => {
        const result = gitRunner(root, [
          "merge-base",
          "--is-ancestor",
          productBaseline.mergeCommit,
          baseBranchRef
        ]);
        return result && result.status === 0;
      });
      if (!acceptedOnBase) {
        failures.push(
          `accepted product merge must already be an ancestor of a current ${facts.baseBranch} ref`
        );
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
  ACTIVE_END,
  ACTIVE_START,
  ACTIVE_SURFACE_FILES,
  EXPECTED_TOP_LEVEL_KEYS,
  FACTS_PATH,
  HISTORY_BASELINE_COMMIT,
  HISTORY_INDEX_PATH,
  HISTORY_RECOVERY_PATHS,
  HISTORY_RESET_CLOSEOUT,
  POINTER_FILES,
  PURE_POINTER_FILES,
  PURE_POINTER_TEMPLATES,
  REQUIRED_ACTIVE_FILES,
  REQUIRED_DOC_REFERENCES,
  SIZE_BUDGETS,
  extractActiveBlock,
  validateCurrentFactsDrift
};
