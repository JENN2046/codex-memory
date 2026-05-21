#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_REPAIR_RULES,
  REQUIRED_VALIDATION_CASES,
  collectAutopilotValidationPlanner
} = require("../src/core/AutopilotValidationPlanner");

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

const schema = readText("schemas/autopilot_validation_planner.schema.yaml");
const docs = readText("docs/AUTOPILOT_VALIDATION_PLANNER_REPAIR_ONCE.md");
const example = readJson("tests/schema_examples/autopilot_validation_planner.example.json");

for (const item of REQUIRED_VALIDATION_CASES) {
  if (!schema.includes(item)) failures.push(`schema missing validation case ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing validation case ${item}`);
}
for (const item of REQUIRED_REPAIR_RULES) {
  if (!schema.includes(item)) failures.push(`schema missing repair rule ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing repair rule ${item}`);
}
for (const requiredText of [
  "NOT_READY_BLOCKED",
  "readiness_claim_allowed=false",
  "does not run validation",
  "does not apply repairs",
  "must not"
]) {
  if (!docs.includes(requiredText)) failures.push(`docs missing required text: ${requiredText}`);
}

if (example) {
  const planner = example.validation_planner || {};
  if (planner.executes_validation !== false) failures.push("executes_validation must be false");
  if (planner.applies_repair !== false) failures.push("applies_repair must be false");
  if (planner.repair_attempt_limit !== 1) failures.push("repair_attempt_limit must be 1");
  if (planner.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");
  const caseIds = new Set((planner.validation_cases || []).map((item) => item.case_id));
  for (const item of REQUIRED_VALIDATION_CASES) {
    if (!caseIds.has(item)) failures.push(`example missing validation case ${item}`);
  }
  for (const item of planner.validation_cases || []) {
    for (const field of [
      "task_area",
      "changed_path_class",
      "risk",
      "lane",
      "adapter_type",
      "minimum_validation",
      "escalate_when",
      "expected_decision",
      "readiness_claim_allowed"
    ]) {
      if (!(field in item)) failures.push(`${item.case_id || "<unknown>"} missing ${field}`);
    }
    if (item.readiness_claim_allowed !== false) failures.push(`${item.case_id} readiness_claim_allowed must be false`);
  }
  const ruleIds = new Set((planner.repair_once_rules || []).map((item) => item.rule_id));
  for (const item of REQUIRED_REPAIR_RULES) {
    if (!ruleIds.has(item)) failures.push(`example missing repair rule ${item}`);
  }
  for (const item of planner.repair_once_rules || []) {
    if (item.repair_attempt_limit !== 1) failures.push(`${item.rule_id} repair_attempt_limit must be 1`);
    if (item.auto_apply_repair !== false) failures.push(`${item.rule_id} auto_apply_repair must be false`);
    if (item.readiness_claim_allowed !== false) failures.push(`${item.rule_id} readiness_claim_allowed must be false`);
  }
}

const summary = collectAutopilotValidationPlanner({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`validation planner summary status must be ok, got ${summary.status}`);
if (summary.validation_case_count !== REQUIRED_VALIDATION_CASES.length) failures.push("validation_case_count mismatch");
if (summary.repair_rule_count !== REQUIRED_REPAIR_RULES.length) failures.push("repair_rule_count mismatch");
if (summary.executes_validation !== false) failures.push("summary executes_validation must be false");
if (summary.applies_repair !== false) failures.push("summary applies_repair must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");

if (failures.length > 0) {
  console.error("AUTOPILOT VALIDATION PLANNER VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT VALIDATION PLANNER VALIDATION PASSED");
console.log(`validation_cases=${summary.validation_case_count} repair_rules=${summary.repair_rule_count}`);
