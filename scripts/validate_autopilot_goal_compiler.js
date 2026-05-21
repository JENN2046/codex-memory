#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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

function requireNonEmptyArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) failures.push(`${label} must be a non-empty array`);
}

const goalDoc = readJson("tests/schema_examples/autopilot_goal.example.json");
const routeDoc = readJson("tests/schema_examples/autopilot_route_plan.example.json");
const queueDoc = readJson("tests/schema_examples/autopilot_task_queue.example.json");

const goal = goalDoc && goalDoc.goal;
const routePlan = routeDoc && routeDoc.route_plan;
const taskQueue = queueDoc && queueDoc.task_queue;

if (goal) {
  if (!goal.id) failures.push("goal.id is required");
  if (!goal.objective) failures.push("goal.objective is required");
  requireNonEmptyArray(goal.scope && goal.scope.allowed_areas, "goal.scope.allowed_areas");
  requireNonEmptyArray(goal.scope && goal.scope.forbidden_areas, "goal.scope.forbidden_areas");
  requireNonEmptyArray(goal.success_criteria, "goal.success_criteria");
  requireNonEmptyArray(goal.validation_required, "goal.validation_required");
  requireNonEmptyArray(goal.stop_conditions, "goal.stop_conditions");
}

if (goal && routePlan) {
  if (routePlan.goal_id !== goal.id) failures.push("route_plan.goal_id must match goal.id");
  requireNonEmptyArray(routePlan.route_steps, "route_plan.route_steps");
}

if (goal && taskQueue) {
  if (taskQueue.goal_id !== goal.id) failures.push("task_queue.goal_id must match goal.id");
  requireNonEmptyArray(taskQueue.executable_tasks, "task_queue.executable_tasks");
  requireNonEmptyArray(taskQueue.blocked_red_items, "task_queue.blocked_red_items");
  if (!taskQueue.next_safe_task) failures.push("task_queue.next_safe_task is required");
}

const routeSteps = routePlan ? routePlan.route_steps || [] : [];
const executableTasks = taskQueue ? taskQueue.executable_tasks || [] : [];
const blockedRedItems = taskQueue ? taskQueue.blocked_red_items || [] : [];
const routeStepById = new Map(routeSteps.map((step) => [step.id, step]));
const executableIds = new Set(executableTasks.map((task) => task.id));
const blockedIds = new Set(blockedRedItems.map((item) => item.id));

for (const step of routeSteps) {
  if (!["Green", "Amber", "Red"].includes(step.lane)) failures.push(`route step ${step.id} has invalid lane`);
  requireNonEmptyArray(step.target_files_or_systems, `route step ${step.id}.target_files_or_systems`);
  requireNonEmptyArray(step.validation, `route step ${step.id}.validation`);
  requireNonEmptyArray(step.stop_conditions, `route step ${step.id}.stop_conditions`);
  if (step.lane === "Red" && executableIds.has(step.id)) failures.push(`Red route step ${step.id} must not be executable`);
  if (step.lane === "Red" && !blockedIds.has(step.id)) failures.push(`Red route step ${step.id} must be recorded as blocked`);
}

for (const task of executableTasks) {
  if (!["Green", "Amber"].includes(task.lane)) failures.push(`executable task ${task.id} must be Green or Amber`);
  if (!routeStepById.has(task.id)) failures.push(`executable task ${task.id} must map to a route step`);
  requireNonEmptyArray(task.allowed_files_or_systems, `task ${task.id}.allowed_files_or_systems`);
  requireNonEmptyArray(task.forbidden_files_or_systems, `task ${task.id}.forbidden_files_or_systems`);
  requireNonEmptyArray(task.allowed_commands_or_operations, `task ${task.id}.allowed_commands_or_operations`);
  requireNonEmptyArray(task.validation, `task ${task.id}.validation`);
  if (!task.scope) failures.push(`task ${task.id}.scope is required`);
  if (!task.budget_expected) failures.push(`task ${task.id}.budget_expected is required`);
  requireNonEmptyArray(task.stop_conditions, `task ${task.id}.stop_conditions`);
  if (task.lane === "Amber" && task.receipt_required !== true) failures.push(`Amber task ${task.id} requires a receipt`);
}

if (taskQueue && taskQueue.next_safe_task) {
  const next = executableTasks.find((task) => task.id === taskQueue.next_safe_task);
  if (!next) {
    failures.push("next_safe_task must reference an executable task");
  } else if (!["Green", "Amber"].includes(next.lane)) {
    failures.push("next_safe_task must be Green or valid Amber");
  }
}

for (const item of blockedRedItems) {
  if (!item.id) failures.push("blocked_red_items item id is required");
  if (!item.reason) failures.push(`blocked_red_items ${item.id || "<unknown>"} reason is required`);
  if (executableIds.has(item.id)) failures.push(`blocked Red item ${item.id} must not be executable`);
}

if (failures.length > 0) {
  console.error("AUTOPILOT GOAL COMPILER VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT GOAL COMPILER VALIDATION PASSED");
console.log(`goal=${goal.id} route_steps=${routeSteps.length} executable_tasks=${executableTasks.length} blocked_red_items=${blockedRedItems.length}`);
