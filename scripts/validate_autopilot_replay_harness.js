#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_FAIL_CLOSED_REASONS,
  REQUIRED_REPLAY_SCENARIOS,
  collectAutopilotReplayHarness
} = require("../src/core/AutopilotReplayHarness");

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

const schema = readText("schemas/autopilot_replay_harness.schema.yaml");
const docs = readText("docs/AUTOPILOT_CHECKPOINT_RESUME_REPLAY_HARNESS.md");
const example = readJson("tests/schema_examples/autopilot_replay_harness.example.json");

for (const item of REQUIRED_REPLAY_SCENARIOS) {
  if (!schema.includes(item)) failures.push(`schema missing scenario ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing scenario ${item}`);
}
for (const item of REQUIRED_FAIL_CLOSED_REASONS) {
  if (!schema.includes(item)) failures.push(`schema missing fail-closed reason ${item}`);
  if (!docs.includes(item)) failures.push(`docs missing fail-closed reason ${item}`);
}
for (const requiredText of [
  "NOT_READY_BLOCKED",
  "readiness_claim_allowed=false",
  "does not replay real actions",
  "must not"
]) {
  if (!docs.includes(requiredText)) failures.push(`docs missing required text: ${requiredText}`);
}

if (example) {
  const harness = example.replay_harness || {};
  if (harness.read_only !== true) failures.push("read_only must be true");
  if (harness.replays_real_actions !== false) failures.push("replays_real_actions must be false");
  if (harness.writes_state !== false) failures.push("writes_state must be false");
  if (harness.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");
  const scenarioIds = new Set((harness.replay_scenarios || []).map((item) => item.scenario_id));
  for (const item of REQUIRED_REPLAY_SCENARIOS) {
    if (!scenarioIds.has(item)) failures.push(`example missing scenario ${item}`);
  }
  const failClosedReasons = new Set((harness.replay_scenarios || []).map((item) => item.fail_closed_reason).filter(Boolean));
  for (const item of REQUIRED_FAIL_CLOSED_REASONS) {
    if (!failClosedReasons.has(item)) failures.push(`example missing fail-closed reason ${item}`);
  }
  for (const item of harness.replay_scenarios || []) {
    for (const field of [
      "scenario_id",
      "input_surface",
      "replay_mode",
      "expected_result",
      "resume_token",
      "fail_closed_reason",
      "mutated",
      "readiness_claim_allowed"
    ]) {
      if (!(field in item)) failures.push(`${item.scenario_id || "<unknown>"} missing ${field}`);
    }
    if (item.mutated !== false) failures.push(`${item.scenario_id} mutated must be false`);
    if (item.readiness_claim_allowed !== false) failures.push(`${item.scenario_id} readiness_claim_allowed must be false`);
  }
}

const summary = collectAutopilotReplayHarness({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`replay harness summary status must be ok, got ${summary.status}`);
if (summary.scenario_count < REQUIRED_REPLAY_SCENARIOS.length) failures.push("scenario_count too low");
if (summary.replays_real_actions !== false) failures.push("summary replays_real_actions must be false");
if (summary.writes_state !== false) failures.push("summary writes_state must be false");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");

if (failures.length > 0) {
  console.error("AUTOPILOT REPLAY HARNESS VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT REPLAY HARNESS VALIDATION PASSED");
console.log(`scenarios=${summary.scenario_count} fail_closed=${summary.fail_closed_scenario_count}`);
