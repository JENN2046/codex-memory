#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_EVAL_CASES,
  REQUIRED_OPERATOR_SURFACES,
  collectAutopilotOperatorConsole
} = require("../src/core/AutopilotOperatorConsole");

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

const schema = readText("schemas/autopilot_operator_console.schema.yaml");
const docs = readText("docs/AUTOPILOT_OPERATOR_CONSOLE_EVAL_MATRIX.md");
const example = readJson("tests/schema_examples/autopilot_operator_console.example.json");

for (const item of REQUIRED_OPERATOR_SURFACES) {
  if (!schema.includes(item)) failures.push(`schema missing operator surface ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing operator surface ${item}`);
}
for (const item of REQUIRED_EVAL_CASES) {
  if (!schema.includes(item)) failures.push(`schema missing eval case ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing eval case ${item}`);
}
for (const requiredText of [
  "NOT_READY_BLOCKED",
  "readiness_claim_allowed=false",
  "does not run evals",
  "does not execute live eval cases"
]) {
  if (!docs.includes(requiredText)) failures.push(`docs missing required text: ${requiredText}`);
}

if (example) {
  const consoleSurface = example.operator_console || {};
  if (consoleSurface.read_only !== true) failures.push("operator console read_only must be true");
  if (consoleSurface.executes_eval !== false) failures.push("operator console executes_eval must be false");
  if (consoleSurface.writes_state !== false) failures.push("operator console writes_state must be false");
  if (consoleSurface.readiness_claim_allowed !== false) failures.push("operator console readiness_claim_allowed must be false");
  const surfaceIds = new Set((consoleSurface.surfaces || []).map((item) => item.surface_id));
  for (const item of REQUIRED_OPERATOR_SURFACES) {
    if (!surfaceIds.has(item)) failures.push(`example missing operator surface ${item}`);
  }
  const evalIds = new Set((consoleSurface.eval_matrix || []).map((item) => item.case_id));
  for (const item of REQUIRED_EVAL_CASES) {
    if (!evalIds.has(item)) failures.push(`example missing eval case ${item}`);
  }
  for (const item of consoleSurface.surfaces || []) {
    if (item.read_only !== true) failures.push(`${item.surface_id} read_only must be true`);
    if (item.mutated !== false) failures.push(`${item.surface_id} mutated must be false`);
    if (item.readiness_claim_allowed !== false) failures.push(`${item.surface_id} readiness_claim_allowed must be false`);
  }
  for (const item of consoleSurface.eval_matrix || []) {
    if (item.executes_live_action !== false) failures.push(`${item.case_id} executes_live_action must be false`);
    if (item.readiness_claim_allowed !== false) failures.push(`${item.case_id} readiness_claim_allowed must be false`);
  }
}

const summary = collectAutopilotOperatorConsole({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`operator console summary status must be ok, got ${summary.status}`);
if (summary.surface_count !== REQUIRED_OPERATOR_SURFACES.length) failures.push("surface_count mismatch");
if (summary.eval_case_count !== REQUIRED_EVAL_CASES.length) failures.push("eval_case_count mismatch");
if (summary.executes_eval !== false) failures.push("summary executes_eval must be false");
if (summary.writes_state !== false) failures.push("summary writes_state must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");

if (failures.length > 0) {
  console.error("AUTOPILOT OPERATOR CONSOLE VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT OPERATOR CONSOLE VALIDATION PASSED");
console.log(`surfaces=${summary.surface_count} eval_cases=${summary.eval_case_count}`);
