#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const FACTS_PATH = ".agent_board/CURRENT_FACTS.json";
const SCHEMA_VERSION = 5;
const COMPLETED_RESULT_RE = /^completed/i;
const TABLE_HEADERS = Object.freeze({
  taskQueue: Object.freeze([
    "ID",
    "Priority",
    "Status",
    "Area",
    "Risk",
    "Target Files",
    "Task",
    "Required Validation",
    "Rollback Check",
    "Gate Required",
    "Notes"
  ]),
  validationLog: Object.freeze([
    "ID",
    "Command / Check",
    "Area",
    "Scope",
    "Result",
    "Summary",
    "Follow-up",
    "Date"
  ]),
  ledger: Object.freeze([
    "ID",
    "Goal",
    "Lane",
    "Envelope",
    "Action",
    "Receipt",
    "Validation",
    "Budget Used",
    "Red Stops",
    "Result",
    "Date"
  ])
});

function readText(root, relativePath, failures) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readFacts(root, failures) {
  const text = readText(root, FACTS_PATH, failures);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    failures.push(`${FACTS_PATH} must contain valid JSON`);
    return null;
  }
}

function parseMarkdownTable(text, options = {}) {
  const lines = String(text).split(/\r?\n/);
  const malformedRows = Array.isArray(options.malformedRows) ? options.malformedRows : null;
  const trackedRowPattern = options.trackedRowPattern instanceof RegExp
    ? options.trackedRowPattern
    : null;
  const diagnostics = options.diagnostics &&
    typeof options.diagnostics === "object" &&
    !Array.isArray(options.diagnostics)
    ? options.diagnostics
    : null;
  let header = null;
  const rows = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex].trim();
    let acceptedDataRow = false;
    let trackedLine = false;
    if (trackedRowPattern) {
      trackedRowPattern.lastIndex = 0;
      trackedLine = trackedRowPattern.test(line);
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const body = line.slice(1, -1);
      const cells = [];
      let current = "";
      let inCode = false;
      for (let index = 0; index < body.length; index += 1) {
        const char = body[index];
        if (char === "`") {
          inCode = !inCode;
          current += char;
          continue;
        }
        if (char === "|" && !inCode && body[index - 1] !== "\\") {
          cells.push(current.trim());
          current = "";
          continue;
        }
        current += char;
      }
      cells.push(current.trim());

      if (!header) {
        if (malformedRows && trackedLine && options.trackBeforeHeader !== false) {
          malformedRows.push({ line: lineIndex + 1 });
          continue;
        }
        header = cells;
        if (diagnostics) diagnostics.header = [...cells];
        continue;
      }
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        if (diagnostics) diagnostics.separatorFound = cells.length === header.length;
        continue;
      }
      if (diagnostics && diagnostics.separatorFound !== true) {
        if (malformedRows && trackedLine) malformedRows.push({ line: lineIndex + 1 });
        continue;
      }
      if (cells.length === header.length) {
        rows.push(Object.fromEntries(header.map((name, index) => [name, cells[index]])));
        acceptedDataRow = true;
      }
    }

    if (!acceptedDataRow && malformedRows && trackedLine) {
      malformedRows.push({ line: lineIndex + 1 });
    }
  }

  return rows;
}

function hasExactTableShape(diagnostics, expectedHeader) {
  return diagnostics &&
    diagnostics.separatorFound === true &&
    Array.isArray(diagnostics.header) &&
    diagnostics.header.length === expectedHeader.length &&
    diagnostics.header.every((cell, index) => cell === expectedHeader[index]);
}

function normalizedId(value) {
  return String(value || "").replace(/`/g, "").trim();
}

function containsExactIdToken(value, expectedId) {
  const tokens = String(value || "").match(/\b(?:CM|CMV)-\d{4}\b/g) || [];
  return tokens.includes(expectedId);
}

function validateAutopilotLedgerConsistency(root = process.cwd()) {
  const failures = [];
  const facts = readFacts(root, failures);
  const malformedTaskRows = [];
  const malformedValidationRows = [];
  const malformedLedgerRows = [];
  const taskQueueDiagnostics = {};
  const validationLogDiagnostics = {};
  const ledgerDiagnostics = {};
  const taskQueue = parseMarkdownTable(
    readText(root, ".agent_board/TASK_QUEUE.md", failures),
    {
      diagnostics: taskQueueDiagnostics,
      malformedRows: malformedTaskRows,
      trackedRowPattern: /\bCM-\d{4}\b/
    }
  );
  const validationLog = parseMarkdownTable(
    readText(root, ".agent_board/VALIDATION_LOG.md", failures),
    {
      diagnostics: validationLogDiagnostics,
      malformedRows: malformedValidationRows,
      trackedRowPattern: /\b(?:CMV|CM)-\d{4}\b/
    }
  );
  const ledger = parseMarkdownTable(
    readText(root, ".agent_board/AUTOPILOT_LEDGER.md", failures),
    {
      diagnostics: ledgerDiagnostics,
      malformedRows: malformedLedgerRows,
      trackedRowPattern: /\b(?:CMV|CM)-\d{4}\b/
    }
  );

  if (!facts || facts.schemaVersion !== SCHEMA_VERSION) {
    failures.push(`CURRENT_FACTS schemaVersion must be ${SCHEMA_VERSION}`);
  }
  for (const [name, diagnostics, expectedHeader] of [
    ["TASK_QUEUE", taskQueueDiagnostics, TABLE_HEADERS.taskQueue],
    ["VALIDATION_LOG", validationLogDiagnostics, TABLE_HEADERS.validationLog],
    ["AUTOPILOT_LEDGER", ledgerDiagnostics, TABLE_HEADERS.ledger]
  ]) {
    if (!hasExactTableShape(diagnostics, expectedHeader)) {
      failures.push(`${name} must retain its exact table header and separator`);
    }
  }

  const lastCompleted = facts && facts.lastCompleted;
  const taskId = normalizedId(lastCompleted && lastCompleted.taskId);
  const validationId = normalizedId(lastCompleted && lastCompleted.validationId);
  if (!/^CM-\d{4}$/.test(taskId)) {
    failures.push("CURRENT_FACTS.lastCompleted.taskId must be a CM id");
  }
  if (!/^CMV-\d{4}$/.test(validationId)) {
    failures.push("CURRENT_FACTS.lastCompleted.validationId must be a CMV id");
  }

  const doneRows = taskQueue.filter((row) => String(row.Status || "").trim().toLowerCase() === "done");
  if (doneRows.length > 0) {
    failures.push("TASK_QUEUE must not contain historical done rows");
  }
  if (malformedTaskRows.length > 0) {
    failures.push("TASK_QUEUE must not contain malformed CM data rows");
  }
  if (malformedValidationRows.length > 0) {
    failures.push("VALIDATION_LOG must not contain malformed CM/CMV data rows");
  }
  if (malformedLedgerRows.length > 0) {
    failures.push("AUTOPILOT_LEDGER must not contain malformed CM/CMV data rows");
  }
  const allowedActiveStatuses = new Set(["todo", "in_progress"]);
  const invalidStatusRows = taskQueue.filter((row) =>
    !allowedActiveStatuses.has(String(row.Status || "").trim().toLowerCase())
  );
  if (invalidStatusRows.length > 0) {
    failures.push("TASK_QUEUE rows must use only todo or in_progress status");
  }

  const currentValidationRows = validationLog.filter((row) => normalizedId(row.ID) === validationId);
  const currentLedgerRows = ledger.filter((row) => normalizedId(row.ID) === taskId);
  if (currentValidationRows.length !== 1) {
    failures.push(`VALIDATION_LOG must contain exactly one ${validationId} row`);
  }
  if (currentLedgerRows.length !== 1) {
    failures.push(`AUTOPILOT_LEDGER must contain exactly one ${taskId} receipt row`);
  }
  if (validationLog.length !== 1) {
    failures.push("VALIDATION_LOG must retain only the current lastCompleted validation row");
  }
  if (ledger.length !== 1) {
    failures.push("AUTOPILOT_LEDGER must retain only the current lastCompleted receipt row");
  }

  const validationRow = currentValidationRows[0];
  if (validationRow) {
    if (!containsExactIdToken(validationRow.Scope, taskId)) {
      failures.push(`${validationId} scope must bind ${taskId}`);
    }
    if (!COMPLETED_RESULT_RE.test(String(validationRow.Result || ""))) {
      failures.push(`${validationId} result must be completed`);
    }
  }

  const ledgerRow = currentLedgerRows[0];
  if (ledgerRow) {
    if (!containsExactIdToken(ledgerRow.Validation, validationId)) {
      failures.push(`${taskId} ledger receipt must reference ${validationId}`);
    }
    if (!COMPLETED_RESULT_RE.test(String(ledgerRow.Result || ""))) {
      failures.push(`${taskId} ledger result must be completed`);
    }
  }

  const activeQueueRows = taskQueue.filter((row) =>
    allowedActiveStatuses.has(String(row.Status || "").trim().toLowerCase())
  );
  const activeTask = facts && facts.activeTask;
  const validActiveTask = activeTask === null ||
    (typeof activeTask === "string" && /^CM-\d{4}$/.test(activeTask));
  if (!validActiveTask) {
    failures.push("CURRENT_FACTS.activeTask must be null or a CM id");
  } else if (activeTask === null && taskQueue.length !== 0) {
    failures.push("activeTask null requires an empty active queue");
  } else if (activeTask !== null) {
    const activeIds = activeQueueRows.map((row) => normalizedId(row.ID));
    if (taskQueue.length !== 1 || activeIds.length !== 1 || activeIds[0] !== activeTask) {
      failures.push("CURRENT_FACTS.activeTask must match the single active queue row");
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    activeTask: activeTask === undefined ? null : activeTask,
    activeQueueCount: activeQueueRows.length,
    lastCompletedTask: taskId || null,
    lastCompletedValidation: validationId || null,
    validationRowCount: validationLog.length,
    ledgerRowCount: ledger.length
  };
}

if (require.main === module) {
  const result = validateAutopilotLedgerConsistency();
  if (!result.ok) {
    console.error("AUTOPILOT LEDGER CONSISTENCY VALIDATION FAILED");
    for (const failure of result.failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log("AUTOPILOT LEDGER CONSISTENCY VALIDATION PASSED");
  console.log(
    `last_completed_task=${result.lastCompletedTask} ` +
    `last_completed_validation=${result.lastCompletedValidation} ` +
    `active_queue=${result.activeQueueCount}`
  );
}

module.exports = {
  FACTS_PATH,
  TABLE_HEADERS,
  containsExactIdToken,
  hasExactTableShape,
  parseMarkdownTable,
  validateAutopilotLedgerConsistency
};
