#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_ADAPTER_KINDS,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_TASK_KINDS,
  collectAutopilotFixtureGreenExecutor
} = require("../src/core/AutopilotFixtureGreenExecutor");

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

const schema = readText("schemas/autopilot_fixture_green_executor.schema.yaml");
const docs = readText("docs/AUTOPILOT_FIXTURE_BACKED_GREEN_EXECUTOR_SKELETON.md");
const example = readJson("tests/schema_examples/autopilot_fixture_green_executor.example.json");

for (const item of REQUIRED_TASK_KINDS) {
  if (!schema.includes(item)) failures.push(`schema missing task kind ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing task kind ${item}`);
}
for (const item of REQUIRED_ADAPTER_KINDS) {
  if (!schema.includes(item)) failures.push(`schema missing adapter kind ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing adapter kind ${item}`);
}
for (const item of REQUIRED_FAIL_CLOSED_CASES) {
  if (!schema.includes(item)) failures.push(`schema missing fail-closed case ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing fail-closed case ${item}`);
}
for (const requiredText of [
  "NOT_READY_BLOCKED",
  "readiness_claim_allowed=false",
  "GREEN_EXECUTOR_SKELETON_NOOP_READY",
  "does not write files",
  "does not mean the executor is activated"
]) {
  if (!docs.includes(requiredText)) failures.push(`docs missing required text: ${requiredText}`);
}

if (example) {
  const executor = example.fixture_green_executor || {};
  if (executor.skeleton_decision !== "GREEN_EXECUTOR_SKELETON_NOOP_READY") failures.push("skeleton_decision must be GREEN_EXECUTOR_SKELETON_NOOP_READY");
  if (executor.fixture_backed !== true) failures.push("fixture_backed must be true");
  if (executor.noop_only !== true) failures.push("noop_only must be true");
  if (executor.executor_activated !== false) failures.push("executor_activated must be false");
  if (executor.executes_tasks !== false) failures.push("executes_tasks must be false");
  if (executor.writes_files !== false) failures.push("writes_files must be false");
  if (executor.writes_runtime_state !== false) failures.push("writes_runtime_state must be false");
  if (executor.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");
  const taskKinds = new Set(executor.allowed_task_kinds || []);
  for (const item of REQUIRED_TASK_KINDS) {
    if (!taskKinds.has(item)) failures.push(`example missing task kind ${item}`);
  }
  const adapterKinds = new Set(executor.allowed_adapter_kinds || []);
  for (const item of REQUIRED_ADAPTER_KINDS) {
    if (!adapterKinds.has(item)) failures.push(`example missing adapter kind ${item}`);
  }
  for (const task of executor.executable_task_fixtures || []) {
    if (task.lane !== "Green") failures.push(`${task.task_id} lane must be Green`);
    if (!REQUIRED_TASK_KINDS.includes(task.task_kind)) failures.push(`${task.task_id} uses unknown task kind ${task.task_kind}`);
    if (!Array.isArray(task.target_files) || task.target_files.length === 0) failures.push(`${task.task_id} target_files missing`);
    if (!Array.isArray(task.validation_plan) || task.validation_plan.length === 0) failures.push(`${task.task_id} validation_plan missing`);
    if (task.checkpoint_required !== true) failures.push(`${task.task_id} checkpoint_required must be true`);
    if (task.expected_noop_result !== "NOOP_EXECUTION_PLAN_READY") failures.push(`${task.task_id} expected_noop_result mismatch`);
  }
  const failClosed = new Set((executor.fail_closed_fixtures || []).map((item) => item.case_id));
  for (const item of REQUIRED_FAIL_CLOSED_CASES) {
    if (!failClosed.has(item)) failures.push(`example missing fail-closed case ${item}`);
  }
  for (const item of executor.fail_closed_fixtures || []) {
    if (item.expected_result !== "REJECTED_FAIL_CLOSED") failures.push(`${item.case_id} expected_result must be REJECTED_FAIL_CLOSED`);
    if (item.mutated !== false) failures.push(`${item.case_id} mutated must be false`);
  }
}

const summary = collectAutopilotFixtureGreenExecutor({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`fixture Green executor summary status must be ok, got ${summary.status}`);
if (summary.executor_activated !== false) failures.push("summary executor_activated must be false");
if (summary.executes_tasks !== false) failures.push("summary executes_tasks must be false");
if (summary.writes_files !== false) failures.push("summary writes_files must be false");
if (summary.writes_runtime_state !== false) failures.push("summary writes_runtime_state must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");
if (summary.noop_execution_plan_count !== summary.executable_task_fixture_count) failures.push("noop execution plan count mismatch");
if (summary.fail_closed_fixture_count !== REQUIRED_FAIL_CLOSED_CASES.length) failures.push("fail-closed fixture count mismatch");

if (failures.length > 0) {
  console.error("AUTOPILOT FIXTURE GREEN EXECUTOR VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT FIXTURE GREEN EXECUTOR VALIDATION PASSED");
console.log(`task_kinds=${summary.allowed_task_kind_count} noop_plans=${summary.noop_execution_plan_count} fail_closed=${summary.fail_closed_fixture_count}`);
