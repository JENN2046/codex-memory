"use strict";

const COMPLETED_RESULT = "COMPLETED_VALIDATED";
const ACTIVE_ROW_CANDIDATE_RE = /\b(?:CM|CMV)-[A-Za-z0-9_-]+\b/;
const ACTIVE_TABLE_HEADERS = Object.freeze({
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

function isCanonicalCompletedResult(value) {
  return String(value || "").trim() === COMPLETED_RESULT;
}

function hasNonEmptyReceipt(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function containsExactIdToken(value, expectedId) {
  const id = String(expectedId || "").trim();
  if (!/^(?:CM|CMV)-\d{4}$/.test(id)) return false;
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|[^A-Za-z0-9_-])${escapedId}(?![A-Za-z0-9_-])`
  ).test(String(value || ""));
}

module.exports = {
  ACTIVE_ROW_CANDIDATE_RE,
  ACTIVE_TABLE_HEADERS,
  COMPLETED_RESULT,
  containsExactIdToken,
  hasNonEmptyReceipt,
  isCanonicalCompletedResult
};
