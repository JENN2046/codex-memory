#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_ALLOWED_WRITE_OPERATIONS,
  REQUIRED_EXECUTION_CYCLE,
  REQUIRED_FAIL_CLOSED_CASES,
  REQUIRED_POST_WRITE_GATES,
  REQUIRED_PREFLIGHT_GATES,
  REQUIRED_TASK_FIELDS,
  collectAutopilotGreenFileWriteExecutorContract,
  evaluateAutopilotGreenFileWritePreflight
} = require("../src/core/AutopilotGreenFileWriteExecutorContract");

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

const schema = readText("schemas/autopilot_green_file_write_executor_contract.schema.yaml");
const docs = readText("docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md");
const example = readJson("tests/schema_examples/autopilot_green_file_write_executor_contract.example.json");

for (const item of REQUIRED_EXECUTION_CYCLE) {
  if (!schema.includes(item)) failures.push(`schema missing execution cycle ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing execution cycle ${item}`);
}
for (const item of REQUIRED_TASK_FIELDS) {
  if (!schema.includes(item)) failures.push(`schema missing task field ${item}`);
}
for (const item of REQUIRED_ALLOWED_WRITE_OPERATIONS) {
  if (!schema.includes(item)) failures.push(`schema missing write operation ${item}`);
}
for (const item of REQUIRED_PREFLIGHT_GATES) {
  if (!schema.includes(item)) failures.push(`schema missing preflight gate ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing preflight gate ${item}`);
}
for (const item of REQUIRED_POST_WRITE_GATES) {
  if (!schema.includes(item)) failures.push(`schema missing post-write gate ${item}`);
}
for (const item of REQUIRED_FAIL_CLOSED_CASES) {
  if (!schema.includes(item)) failures.push(`schema missing fail-closed case ${item}`);
}
for (const text of [
  "GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED",
  "readiness_claim_allowed=false",
  "does not implement an executor",
  "does not write files"
]) {
  if (!docs.includes(text)) failures.push(`docs missing required text: ${text}`);
}

if (example) {
  const contract = example.green_file_write_executor_contract || {};
  if (contract.contract_decision !== "GREEN_FILE_WRITE_EXECUTOR_CONTRACT_READY_IMPLEMENTATION_BLOCKED") failures.push("contract decision mismatch");
  if (contract.implementation_allowed !== false) failures.push("implementation_allowed must be false");
  if (contract.executor_activation_allowed !== false) failures.push("executor_activation_allowed must be false");
  if (contract.real_writes_allowed !== false) failures.push("real_writes_allowed must be false");
  if (contract.read_only !== true) failures.push("read_only must be true");
  if (contract.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");
}

const summary = collectAutopilotGreenFileWriteExecutorContract({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`summary status must be ok, got ${summary.status}`);
if (summary.implementation_allowed !== false) failures.push("summary implementation_allowed must be false");
if (summary.executor_activation_allowed !== false) failures.push("summary executor_activation_allowed must be false");
if (summary.real_writes_allowed !== false) failures.push("summary real_writes_allowed must be false");
if (summary.writes_files !== false) failures.push("summary writes_files must be false");
if (summary.executes_tasks !== false) failures.push("summary executes_tasks must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");

const validPreflightTask = {
  task_id: "CM-0703-preflight-valid-docs",
  goal_id: "CM-0703",
  lane: "Green",
  task_kind: "docs_update_fixture",
  scope: "docs_only_preflight",
  allowed_files_or_systems: ["docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md"],
  forbidden_files_or_systems: ["package.json", "package-lock.json", ".env*", "data/**", "runs/**", "reports/**", "production/**"],
  explicit_write_set: [{ path: "docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md", operation: "update_existing_text_file" }],
  expected_write_count: 1,
  max_write_files: 1,
  overwrite_existing_files_allowed: false,
  validation_required: true,
  validation_plan: ["node --test tests/autopilot-green-file-write-executor-preflight.test.js"],
  receipt_required: true,
  receipt_plan_present: true,
  checkpoint_required: true,
  checkpoint_plan_present: true,
  rollback_or_cleanup_plan: "revert explicit write set only",
  repair_attempt_count: 0,
  stop_conditions: ["validation_failure_requiring_judgment"],
  pre_write_snapshot_available: true
};
const preflightSummary = evaluateAutopilotGreenFileWritePreflight({
  task: validPreflightTask,
  fileLocks: ["docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md"]
});
if (preflightSummary.preflight_status !== "PREFLIGHT_ACCEPTED_NO_WRITE") failures.push("valid preflight task must be accepted as no-write preflight");
if (preflightSummary.writes_files !== false) failures.push("valid preflight must not write files");
for (const [field, value, expectedCase] of [
  ["lane", "Amber", "amber_lane_task"],
  ["lane", "Red", "red_lane_task"],
  ["explicit_write_set", [], "missing_explicit_write_set"],
  ["max_write_files", 0, "write_count_exceeds_budget"],
  ["pre_write_snapshot_available", false, "pre_write_snapshot_missing"],
  ["validation_plan", [], "validation_plan_missing"],
  ["receipt_plan_present", false, "receipt_plan_missing"],
  ["checkpoint_plan_present", false, "checkpoint_plan_missing"],
  ["rollback_or_cleanup_plan", "", "rollback_plan_missing"],
  ["repair_attempt_count", 2, "second_repair_attempt"],
  ["external_side_effect_requested", true, "external_side_effect_requested"],
  ["readiness_claim_requested", true, "readiness_claim_requested"]
]) {
  const task = { ...validPreflightTask, [field]: value };
  const result = evaluateAutopilotGreenFileWritePreflight({
    task,
    fileLocks: ["docs/AUTOPILOT_GREEN_FILE_WRITE_EXECUTOR_CONTRACT.md"]
  });
  if (result.rejection_case !== expectedCase) failures.push(`preflight case ${field} expected ${expectedCase}, got ${result.rejection_case}`);
  if (result.writes_files !== false) failures.push(`preflight case ${field} must not write files`);
}

if (failures.length > 0) {
  console.error("AUTOPILOT GREEN FILE WRITE EXECUTOR CONTRACT VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT GREEN FILE WRITE EXECUTOR CONTRACT VALIDATION PASSED");
console.log(`cycle=${summary.execution_cycle_count} preflight=${summary.preflight_gate_count} post_write=${summary.post_write_gate_count} fail_closed=${summary.fail_closed_case_count}`);
