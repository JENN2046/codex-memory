#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  ACTIVE_ROW_CANDIDATE_RE,
  ACTIVE_TABLE_HEADERS: TABLE_HEADERS,
  COMPLETED_RESULT,
  containsExactIdToken,
  hasNonEmptyReceipt,
  isCanonicalCompletedResult
} = require("../src/core/AutopilotCloseoutContract");

const FACTS_PATH = ".agent_board/CURRENT_FACTS.json";
const SCHEMA_VERSION = 5;

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
        if (diagnostics) {
          diagnostics.header = [...cells];
          diagnostics.headerLine = lineIndex + 1;
        }
        continue;
      }
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) {
        if (diagnostics) {
          diagnostics.separatorCount = (diagnostics.separatorCount || 0) + 1;
          diagnostics.separatorFound = cells.length === header.length;
          diagnostics.separatorImmediatelyAfterHeader =
            diagnostics.headerLine === lineIndex;
        }
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
    diagnostics.separatorCount === 1 &&
    diagnostics.separatorImmediatelyAfterHeader === true &&
    Array.isArray(diagnostics.header) &&
    diagnostics.header.length === expectedHeader.length &&
    diagnostics.header.every((cell, index) => cell === expectedHeader[index]);
}

function rawId(value) {
  return String(value || "").trim();
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
      trackedRowPattern: ACTIVE_ROW_CANDIDATE_RE
    }
  );
  const validationLog = parseMarkdownTable(
    readText(root, ".agent_board/VALIDATION_LOG.md", failures),
    {
      diagnostics: validationLogDiagnostics,
      malformedRows: malformedValidationRows,
      trackedRowPattern: ACTIVE_ROW_CANDIDATE_RE
    }
  );
  const ledger = parseMarkdownTable(
    readText(root, ".agent_board/AUTOPILOT_LEDGER.md", failures),
    {
      diagnostics: ledgerDiagnostics,
      malformedRows: malformedLedgerRows,
      trackedRowPattern: ACTIVE_ROW_CANDIDATE_RE
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
  const taskId = rawId(lastCompleted && lastCompleted.taskId);
  const validationId = rawId(lastCompleted && lastCompleted.validationId);
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
    !allowedActiveStatuses.has(String(row.Status || "").trim())
  );
  if (invalidStatusRows.length > 0) {
    failures.push("TASK_QUEUE rows must use only todo or in_progress status");
  }
  if (taskQueue.some((row) => !/^CM-\d{4}$/.test(rawId(row.ID)))) {
    failures.push("TASK_QUEUE IDs must use raw canonical CM format");
  }
  if (validationLog.some((row) => !/^CMV-\d{4}$/.test(rawId(row.ID)))) {
    failures.push("VALIDATION_LOG IDs must use raw canonical CMV format");
  }
  if (ledger.some((row) => !/^CM-\d{4}$/.test(rawId(row.ID)))) {
    failures.push("AUTOPILOT_LEDGER IDs must use raw canonical CM format");
  }

  const currentValidationRows = validationLog.filter((row) => rawId(row.ID) === validationId);
  const currentLedgerRows = ledger.filter((row) => rawId(row.ID) === taskId);
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
    if (!isCanonicalCompletedResult(validationRow.Result)) {
      failures.push(`${validationId} result must be exactly ${COMPLETED_RESULT}`);
    }
  }

  const ledgerRow = currentLedgerRows[0];
  if (ledgerRow) {
    if (!containsExactIdToken(ledgerRow.Validation, validationId)) {
      failures.push(`${taskId} ledger receipt must reference ${validationId}`);
    }
    if (!hasNonEmptyReceipt(ledgerRow.Receipt)) {
      failures.push(`${taskId} ledger receipt must be non-empty`);
    }
    if (!isCanonicalCompletedResult(ledgerRow.Result)) {
      failures.push(`${taskId} ledger result must be exactly ${COMPLETED_RESULT}`);
    }
  }

  const activeQueueRows = taskQueue.filter((row) =>
    allowedActiveStatuses.has(String(row.Status || "").trim())
  );
  const activeTask = facts && facts.activeTask;
  const validActiveTask = activeTask === null ||
    (typeof activeTask === "string" && /^CM-\d{4}$/.test(activeTask));
  if (!validActiveTask) {
    failures.push("CURRENT_FACTS.activeTask must be null or a CM id");
  } else if (activeTask === null && taskQueue.length !== 0) {
    failures.push("activeTask null requires an empty active queue");
  } else if (activeTask !== null) {
    const activeIds = activeQueueRows.map((row) => rawId(row.ID));
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
  ACTIVE_ROW_CANDIDATE_RE,
  COMPLETED_RESULT,
  FACTS_PATH,
  TABLE_HEADERS,
  containsExactIdToken,
  hasNonEmptyReceipt,
  hasExactTableShape,
  isCanonicalCompletedResult,
  parseMarkdownTable,
  validateAutopilotLedgerConsistency
};
