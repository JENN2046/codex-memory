#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  FAILURE_TYPES,
  LOOP_STATES,
  collectAutopilotClosedLoopSummary
} = require("../src/core/AutopilotClosedLoopDryRun");

const root = process.cwd();
const failures = [];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    failures.push(`Invalid JSON: ${relativePath}: ${error.message}`);
    return null;
  }
}

function requireIncludes(relativePath, needles) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  for (const needle of needles) {
    if (!text.includes(needle)) failures.push(`${relativePath} missing required text: ${needle}`);
  }
}

const closedLoop = readJson("tests/schema_examples/autopilot_closed_loop_state.example.json");
const recovery = readJson("tests/schema_examples/autopilot_failure_recovery_matrix.example.json");

requireIncludes("docs/AUTOPILOT_CLOSED_LOOP_STATE_MACHINE.md", LOOP_STATES);
requireIncludes("docs/AUTOPILOT_FAILURE_RECOVERY_MATRIX.md", FAILURE_TYPES);
requireIncludes("src/cli/autopilot-closed-loop-dry-run.js", [
  "does not write files",
  "readiness"
]);

if (closedLoop) {
  const machine = closedLoop.closed_loop_state_machine || {};
  const stateIds = (machine.states || []).map((state) => state.id);
  for (const state of LOOP_STATES) {
    if (!stateIds.includes(state)) failures.push(`closed loop example missing state ${state}`);
  }
  if (machine.readiness_claim_allowed !== false) failures.push("closed loop example must block readiness claims");
}

if (recovery) {
  const matrix = recovery.failure_recovery_matrix || {};
  const failureTypes = (matrix.failures || []).map((item) => item.failure_type);
  if (matrix.repair_attempt_limit !== 1) failures.push("repair_attempt_limit must be 1");
  for (const type of FAILURE_TYPES) {
    if (!failureTypes.includes(type)) failures.push(`failure recovery example missing ${type}`);
  }
  for (const item of matrix.failures || []) {
    if (!item.stop_reason || !item.safe_state || !item.next_after_approval) {
      failures.push(`failure recovery item ${item.failure_type || "<unknown>"} is incomplete`);
    }
  }
}

const summary = collectAutopilotClosedLoopSummary({ workspaceRoot: root });
if (summary.decision !== "NOT_READY_BLOCKED") failures.push("dry-run summary decision must remain NOT_READY_BLOCKED");
if (summary.readiness_claim_allowed !== false) failures.push("dry-run summary must keep readiness_claim_allowed false");
if (summary.dry_run_only !== true) failures.push("dry-run summary must be dry_run_only");
if (summary.writes_performed !== false) failures.push("dry-run summary must not record writes");
if (summary.provider_calls_performed !== false) failures.push("dry-run summary must not record provider calls");
if (summary.mcp_calls_performed !== false) failures.push("dry-run summary must not record MCP calls");
if (summary.dependency_changes_performed !== false) failures.push("dry-run summary must not record dependency changes");

if (failures.length > 0) {
  console.error("AUTOPILOT CLOSED LOOP VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT CLOSED LOOP VALIDATION PASSED");
console.log(`states=${LOOP_STATES.length} failure_types=${FAILURE_TYPES.length}`);
