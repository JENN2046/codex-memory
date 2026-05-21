#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  collectAutopilotControllerSummary
} = require("../src/core/AutopilotControllerReadOnly");

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

requireIncludes("docs/AUTOPILOT_CONTROLLER_V0_READONLY.md", [
  "read-only / no-op controller",
  "readiness_claim_allowed=false",
  "read_only_noop_executor"
]);
requireIncludes("schemas/autopilot_controller_cycle.schema.yaml", [
  "goal_id",
  "controller_cycle_id",
  "lane_decision",
  "execution_boundary",
  "validation_plan",
  "receipt_requirement",
  "checkpoint_requirement",
  "red_gate_status",
  "readiness_claim_allowed"
]);

const example = readJson("tests/schema_examples/autopilot_controller_cycle.example.json");
if (example) {
  const cycle = example.controller_cycle || {};
  for (const field of [
    "goal_id",
    "controller_cycle_id",
    "current_state",
    "next_safe_task",
    "lane_decision",
    "execution_boundary",
    "validation_plan",
    "repair_once_available",
    "receipt_requirement",
    "checkpoint_requirement",
    "stop_reason",
    "red_gate_status",
    "readiness_claim_allowed"
  ]) {
    if (!(field in cycle)) failures.push(`controller example missing ${field}`);
  }
  if (cycle.readiness_claim_allowed !== false) failures.push("controller example must keep readiness_claim_allowed false");
  if (cycle.mutated !== false) failures.push("controller example must keep mutated false");
  if (cycle.execution_boundary && cycle.execution_boundary.executes_tasks !== false) failures.push("controller example must not execute tasks");
  if (cycle.execution_boundary && cycle.execution_boundary.writes_runtime_state !== false) failures.push("controller example must not write runtime state");
}

const summary = collectAutopilotControllerSummary({ workspaceRoot: root });
if (summary.decision !== "NOT_READY_BLOCKED") failures.push("controller summary decision must remain NOT_READY_BLOCKED");
if (summary.readiness_claim_allowed !== false) failures.push("controller summary readiness_claim_allowed must be false");
if (summary.execution_boundary.mode !== "read_only_noop_executor") failures.push("controller summary must be read_only_noop_executor");
if (summary.execution_boundary.executes_tasks !== false) failures.push("controller summary must not execute tasks");
if (summary.execution_boundary.writes_runtime_state !== false) failures.push("controller summary must not write runtime state");
if (summary.mutated !== false) failures.push("controller summary must keep mutated false");
if (summary.provider_calls_performed !== false) failures.push("controller summary must not record provider calls");
if (summary.mcp_calls_performed !== false) failures.push("controller summary must not record MCP calls");
if (summary.real_memory_access_performed !== false) failures.push("controller summary must not record real memory access");
if (summary.remote_actions_performed !== false) failures.push("controller summary must not record remote action");

if (failures.length > 0) {
  console.error("AUTOPILOT CONTROLLER VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT CONTROLLER VALIDATION PASSED");
console.log(`cycle=${summary.controller_cycle_id} state=${summary.current_state} next=${summary.next_safe_task}`);
