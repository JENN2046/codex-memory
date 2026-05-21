#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_ADMISSION_CONDITIONS,
  REQUIRED_ALLOWED_SCOPE,
  REQUIRED_STOP_REASONS,
  collectAutopilotControlledGreenExecutorEntry
} = require("../src/core/AutopilotControlledGreenExecutorEntry");

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

const schema = readText("schemas/autopilot_controlled_green_executor_entry.schema.yaml");
const docs = readText("docs/AUTOPILOT_CONTROLLED_GREEN_EXECUTOR_ENTRY_PACKET.md");
const example = readJson("tests/schema_examples/autopilot_controlled_green_executor_entry.example.json");

for (const item of REQUIRED_ADMISSION_CONDITIONS) {
  if (!schema.includes(item)) failures.push(`schema missing admission condition ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing admission condition ${item}`);
}
for (const item of REQUIRED_ALLOWED_SCOPE) {
  if (!schema.includes(item)) failures.push(`schema missing allowed scope ${item}`);
}
for (const item of REQUIRED_STOP_REASONS) {
  if (!schema.includes(item)) failures.push(`schema missing stop reason ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing stop reason ${item}`);
}
for (const requiredText of [
  "NOT_READY_BLOCKED",
  "readiness_claim_allowed=false",
  "GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED",
  "does not activate an executor",
  "This packet is not activation"
]) {
  if (!docs.includes(requiredText)) failures.push(`docs missing required text: ${requiredText}`);
}

if (example) {
  const entry = example.controlled_green_executor_entry || {};
  if (entry.entry_decision !== "GREEN_EXECUTOR_ENTRY_PACKET_PREPARED_NOT_ACTIVATED") failures.push("entry_decision must remain prepared-not-activated");
  if (entry.read_only !== true) failures.push("entry read_only must be true");
  if (entry.executor_activated !== false) failures.push("executor_activated must be false");
  if (entry.executes_tasks !== false) failures.push("executes_tasks must be false");
  if (entry.writes_runtime_state !== false) failures.push("writes_runtime_state must be false");
  if (entry.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");
  const conditionIds = new Set((entry.admission_conditions || []).map((item) => item.condition_id));
  for (const item of REQUIRED_ADMISSION_CONDITIONS) {
    if (!conditionIds.has(item)) failures.push(`example missing admission condition ${item}`);
  }
  for (const item of entry.admission_conditions || []) {
    if (item.status !== "met") failures.push(`${item.condition_id} status must be met in the fixture entry packet`);
    if (!item.evidence) failures.push(`${item.condition_id} evidence must be recorded`);
  }
  const allowedScope = new Set(entry.allowed_scope || []);
  for (const item of REQUIRED_ALLOWED_SCOPE) {
    if (!allowedScope.has(item)) failures.push(`example missing allowed scope ${item}`);
  }
  const stopReasons = new Set(entry.fail_closed_stop_reasons || []);
  for (const item of REQUIRED_STOP_REASONS) {
    if (!stopReasons.has(item)) failures.push(`example missing stop reason ${item}`);
  }
}

const summary = collectAutopilotControlledGreenExecutorEntry({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`controlled Green entry summary status must be ok, got ${summary.status}`);
if (summary.executor_activated !== false) failures.push("summary executor_activated must be false");
if (summary.executes_tasks !== false) failures.push("summary executes_tasks must be false");
if (summary.writes_runtime_state !== false) failures.push("summary writes_runtime_state must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");
if (summary.met_admission_condition_count !== REQUIRED_ADMISSION_CONDITIONS.length) failures.push("met admission condition count mismatch");
if (summary.allowed_scope_count !== REQUIRED_ALLOWED_SCOPE.length) failures.push("allowed scope count mismatch");
if (summary.fail_closed_stop_reason_count !== REQUIRED_STOP_REASONS.length) failures.push("stop reason count mismatch");

if (failures.length > 0) {
  console.error("AUTOPILOT CONTROLLED GREEN EXECUTOR ENTRY VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT CONTROLLED GREEN EXECUTOR ENTRY VALIDATION PASSED");
console.log(`conditions=${summary.met_admission_condition_count} allowed_scope=${summary.allowed_scope_count} stop_reasons=${summary.fail_closed_stop_reason_count}`);
