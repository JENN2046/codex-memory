#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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

function requireIncludes(relativePath, needles) {
  const text = readText(relativePath);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures.push(`${relativePath} missing required text: ${needle}`);
    }
  }
}

function requireFalse(value, label) {
  if (value !== false) failures.push(`${label} must be false`);
}

function requireTrue(value, label) {
  if (value !== true) failures.push(`${label} must be true`);
}

const schemaFiles = [
  "schemas/autopilot_autonomy_envelope.schema.yaml",
  "schemas/autopilot_execution_receipt.schema.yaml",
  "schemas/autopilot_receipt_registry.schema.yaml",
  "schemas/autopilot_goal.schema.yaml",
  "schemas/autopilot_route_plan.schema.yaml",
  "schemas/autopilot_task_queue.schema.yaml",
];

const exampleFiles = [
  "tests/schema_examples/autopilot_autonomy_envelope.example.json",
  "tests/schema_examples/autopilot_execution_receipt.example.json",
  "tests/schema_examples/autopilot_receipt_registry.example.json",
  "tests/schema_examples/autopilot_goal.example.json",
  "tests/schema_examples/autopilot_route_plan.example.json",
  "tests/schema_examples/autopilot_task_queue.example.json",
];

for (const file of schemaFiles) readText(file);
for (const file of exampleFiles) readJson(file);

requireIncludes("schemas/autopilot_autonomy_envelope.schema.yaml", [
  "max_provider_calls",
  "max_plugin_calls",
  "max_api_calls",
  "max_image_candidates",
  "max_external_read_files",
  "max_write_files",
  "max_dependency_actions",
  "max_runtime_probe_minutes",
  "max_retry_per_transient_failure",
  "max_cost_amount",
  "max_cost_currency",
  "cost_tracking_required",
  "cost_unknown_is_red",
  "push_allowed",
  "secret_value_read_allowed",
  "destructive_action_allowed",
]);

requireIncludes("schemas/autopilot_execution_receipt.schema.yaml", [
  "task_id",
  "lane",
  "envelope_id",
  "action_performed",
  "target_systems",
  "calls_used",
  "files_read",
  "files_written",
  "dependency_actions_used",
  "cost",
  "validation_run",
  "validation_result",
  "rollback_or_cleanup_available",
  "rollback_or_cleanup_plan",
  "irreversible_actions_performed",
  "next_auto_step_allowed",
  "stop_reason",
]);

const envelope = readJson("tests/schema_examples/autopilot_autonomy_envelope.example.json");
const receipt = readJson("tests/schema_examples/autopilot_execution_receipt.example.json");
const registry = readJson("tests/schema_examples/autopilot_receipt_registry.example.json");

if (envelope) {
  const budgets = envelope.budgets || {};
  const permissions = envelope.permissions || {};
  requireTrue(budgets.cost_tracking_required, "budgets.cost_tracking_required");
  requireTrue(budgets.cost_unknown_is_red, "budgets.cost_unknown_is_red");
  if (budgets.max_cost_amount !== 0) failures.push("budgets.max_cost_amount must be 0 for the local-only example");
  requireFalse(permissions.push_allowed, "permissions.push_allowed");
  requireFalse(permissions.secret_value_read_allowed, "permissions.secret_value_read_allowed");
  requireFalse(permissions.destructive_action_allowed, "permissions.destructive_action_allowed");
  requireFalse(permissions.tag_release_deploy_allowed, "permissions.tag_release_deploy_allowed");
}

if (receipt && envelope) {
  const budgets = envelope.budgets || {};
  const calls = receipt.calls_used || {};
  if ((calls.provider || 0) > budgets.max_provider_calls) failures.push("receipt provider calls exceed envelope budget");
  if ((calls.plugin || 0) > budgets.max_plugin_calls) failures.push("receipt plugin calls exceed envelope budget");
  if ((calls.api || 0) > budgets.max_api_calls) failures.push("receipt API calls exceed envelope budget");
  if ((receipt.files_written || []).length > budgets.max_write_files) failures.push("receipt files_written exceed envelope budget");
  if ((receipt.dependency_actions_used || 0) > budgets.max_dependency_actions) failures.push("receipt dependency actions exceed envelope budget");
  if (!receipt.cost || receipt.cost.amount !== 0 || receipt.cost.known !== true) failures.push("receipt cost must be known and zero");
  if (!receipt.rollback || receipt.rollback.rollback_or_cleanup_available !== true) failures.push("receipt rollback plan must be available");
  if (!receipt.rollback || !receipt.rollback.rollback_or_cleanup_plan) failures.push("receipt rollback plan text is required");
  if (receipt.rollback && receipt.rollback.irreversible_actions_performed !== false) failures.push("receipt must not record irreversible actions");
}

if (registry) {
  for (const item of registry.blocked_red_items || []) {
    if (item.lane !== "Red") failures.push(`blocked item ${item.id} must have lane Red`);
    if (item.executable !== false) failures.push(`blocked Red item ${item.id} must not be executable`);
  }
}

requireIncludes(".agent_board/AUTOPILOT_LEDGER.md", [
  "CM-0684",
  "Blocked Red Lane Items",
  "push / PR / tag / release / deploy",
]);

requireIncludes("AGENTS.md", [
  "Smart Standing Authorization v3",
  "Red Lane",
  "receipt",
]);

if (failures.length > 0) {
  console.error("AUTOPILOT GOVERNANCE KERNEL VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT GOVERNANCE KERNEL VALIDATION PASSED");
console.log(`schemas=${schemaFiles.length} examples=${exampleFiles.length}`);
