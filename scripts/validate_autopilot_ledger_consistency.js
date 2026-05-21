#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

function readText(root, relativePath, failures) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function parseMarkdownTable(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  let header = null;
  const rows = [];

  for (const line of lines) {
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

    if (!header) {
      header = cells;
      continue;
    }

    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (cells.length !== header.length) continue;

    const row = {};
    for (let index = 0; index < header.length; index += 1) {
      row[header[index]] = cells[index];
    }
    rows.push(row);
  }

  return rows;
}

function cmNumber(id) {
  const match = String(id || "").match(/\bCM-(\d{4})\b/);
  return match ? Number(match[1]) : null;
}

function cmId(id) {
  const match = String(id || "").match(/\bCM-\d{4}\b/);
  return match ? match[0] : null;
}

function cmvId(text) {
  const match = String(text || "").match(/\bCMV-\d{4}\b/);
  return match ? match[0] : null;
}

function latestByCmNumber(rows, fieldName, filter = () => true) {
  return rows
    .filter(filter)
    .map((row) => ({ row, id: cmId(row[fieldName]), number: cmNumber(row[fieldName]) }))
    .filter((item) => item.id && Number.isFinite(item.number))
    .sort((left, right) => right.number - left.number)[0] || null;
}

function validateAutopilotLedgerConsistency(root = process.cwd()) {
  const failures = [];
  const taskQueue = parseMarkdownTable(readText(root, ".agent_board/TASK_QUEUE.md", failures));
  const validationLog = parseMarkdownTable(readText(root, ".agent_board/VALIDATION_LOG.md", failures));
  const ledger = parseMarkdownTable(readText(root, ".agent_board/AUTOPILOT_LEDGER.md", failures));

  const latestDoneTask = latestByCmNumber(
    taskQueue,
    "ID",
    (row) => String(row.Status || "").toLowerCase() === "done"
  );
  const latestValidationScope = latestByCmNumber(
    validationLog,
    "Scope",
    (row) => String(row.Result || "").toUpperCase().startsWith("COMPLETED")
  );
  const latestLedger = latestByCmNumber(
    ledger,
    "ID",
    (row) => String(row.Result || "").toLowerCase().startsWith("completed")
  );

  if (!latestDoneTask) failures.push("No completed CM task found in .agent_board/TASK_QUEUE.md");
  if (!latestValidationScope) failures.push("No completed CM validation scope found in .agent_board/VALIDATION_LOG.md");
  if (!latestLedger) failures.push("No completed CM ledger row found in .agent_board/AUTOPILOT_LEDGER.md");

  const expectedLatest = latestDoneTask && latestDoneTask.id;
  if (expectedLatest && latestValidationScope && latestValidationScope.id !== expectedLatest) {
    failures.push(`Latest validation scope ${latestValidationScope.id} does not match latest done task ${expectedLatest}`);
  }
  if (expectedLatest && latestLedger && latestLedger.id !== expectedLatest) {
    failures.push(`Latest ledger row ${latestLedger.id} does not match latest done task ${expectedLatest}`);
  }

  const validationIds = new Set(validationLog.map((row) => String(row.ID || "").replace(/`/g, "").trim()));
  for (const row of ledger) {
    const id = cmId(row.ID);
    const validationId = cmvId(row.Validation);
    if (!id || !validationId) continue;
    if (!validationIds.has(validationId)) {
      failures.push(`Ledger row ${id} references missing validation log row ${validationId}`);
    }
  }

  const latestLedgerValidationId = latestLedger ? cmvId(latestLedger.row.Validation) : null;
  if (latestLedger && !latestLedgerValidationId) {
    failures.push(`Latest ledger row ${latestLedger.id} does not reference a CMV validation id`);
  }

  return {
    ok: failures.length === 0,
    failures,
    latestTask: latestDoneTask ? latestDoneTask.id : null,
    latestValidationScope: latestValidationScope ? latestValidationScope.id : null,
    latestLedger: latestLedger ? latestLedger.id : null,
    latestLedgerValidationId
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
  console.log(`latest_task=${result.latestTask} latest_ledger=${result.latestLedger} latest_validation=${result.latestLedgerValidationId}`);
}

module.exports = {
  parseMarkdownTable,
  validateAutopilotLedgerConsistency
};
