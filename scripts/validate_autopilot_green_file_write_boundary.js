#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_ALLOWED_PATH_CLASSES,
  REQUIRED_DESIGN_GATES,
  REQUIRED_HARD_STOPS,
  collectAutopilotGreenFileWriteBoundary
} = require("../src/core/AutopilotGreenFileWriteBoundary");

const root = process.cwd();
const failures = [];

function readText(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function readJson(relativePath) {
  const text = readText(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    failures.push(`Invalid JSON: ${relativePath}: ${error.message}`);
    return null;
  }
}

const schema = readText("schemas/autopilot_green_file_write_boundary.schema.yaml");
const docs = readText("docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_BOUNDARY.md");
const example = readJson("tests/schema_examples/autopilot_green_file_write_boundary.example.json");

for (const item of REQUIRED_DESIGN_GATES) {
  if (!schema.includes(item)) failures.push(`schema missing design gate ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing design gate ${item}`);
}
for (const item of REQUIRED_ALLOWED_PATH_CLASSES) {
  if (!schema.includes(item)) failures.push(`schema missing allowed path class ${item}`);
}
for (const item of REQUIRED_HARD_STOPS) {
  if (!schema.includes(item)) failures.push(`schema missing hard stop ${item}`);
}
for (const text of [
  "GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED",
  "readiness_claim_allowed=false",
  "implementation is not authorized",
  "does not implement a file-write executor"
]) {
  if (!docs.includes(text)) failures.push(`docs missing required text: ${text}`);
}

if (example) {
  const boundary = example.green_file_write_boundary || {};
  if (boundary.boundary_decision !== "GREEN_FILE_WRITE_EXECUTOR_DESIGN_ALLOWED_IMPLEMENTATION_BLOCKED") failures.push("boundary decision mismatch");
  if (boundary.design_allowed !== true) failures.push("design_allowed must be true");
  if (boundary.implementation_allowed !== false) failures.push("implementation_allowed must be false");
  if (boundary.executor_activation_allowed !== false) failures.push("executor_activation_allowed must be false");
  if (boundary.read_only !== true) failures.push("read_only must be true");
  if (boundary.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");
}

const summary = collectAutopilotGreenFileWriteBoundary({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`summary status must be ok, got ${summary.status}`);
if (summary.design_allowed !== true) failures.push("summary design_allowed must be true");
if (summary.implementation_allowed !== false) failures.push("summary implementation_allowed must be false");
if (summary.executor_activation_allowed !== false) failures.push("summary executor_activation_allowed must be false");
if (summary.writes_files !== false) failures.push("summary writes_files must be false");
if (summary.executes_tasks !== false) failures.push("summary executes_tasks must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");

if (failures.length > 0) {
  console.error("AUTOPILOT GREEN FILE WRITE BOUNDARY VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT GREEN FILE WRITE BOUNDARY VALIDATION PASSED");
console.log(`design_gates=${summary.required_design_gate_count} allowed_paths=${summary.allowed_path_class_count} hard_stops=${summary.hard_stop_count}`);
