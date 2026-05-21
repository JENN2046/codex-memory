#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_ADAPTERS,
  REQUIRED_FAIL_CLOSED_FIXTURES,
  collectAutopilotActionAdapterContract
} = require("../src/core/AutopilotActionAdapterContract");

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

const schema = readText("schemas/autopilot_action_adapter_contract.schema.yaml");
const docs = readText("docs/AUTOPILOT_ACTION_ADAPTER_CONTRACT.md");
const example = readJson("tests/schema_examples/autopilot_action_adapter_contract.example.json");

for (const adapter of REQUIRED_ADAPTERS) {
  if (!schema.includes(adapter)) failures.push(`schema missing adapter ${adapter}`);
  if (!docs.includes(adapter)) failures.push(`docs missing adapter ${adapter}`);
}
for (const fixture of REQUIRED_FAIL_CLOSED_FIXTURES) {
  if (!schema.includes(fixture)) failures.push(`schema missing fail-closed fixture ${fixture}`);
  if (!docs.includes(fixture)) failures.push(`docs missing fail-closed fixture ${fixture}`);
}
for (const requiredText of [
  "NOT_READY_BLOCKED",
  "readiness_claim_allowed=false",
  "must not",
  "execute adapters",
  "claim runtime readiness"
]) {
  if (!docs.includes(requiredText)) failures.push(`docs missing required text: ${requiredText}`);
}

if (example) {
  const contract = example.action_adapter_contract || {};
  if (contract.runtime_actions_connected !== false) failures.push("runtime_actions_connected must be false");
  if (contract.provider_calls_connected !== false) failures.push("provider_calls_connected must be false");
  if (contract.mcp_calls_connected !== false) failures.push("mcp_calls_connected must be false");
  if (contract.readiness_claim_allowed !== false) failures.push("readiness_claim_allowed must be false");

  const adapters = Array.isArray(contract.adapters) ? contract.adapters : [];
  const adapterIds = new Set(adapters.map((adapter) => adapter.adapter_id));
  for (const adapter of REQUIRED_ADAPTERS) {
    if (!adapterIds.has(adapter)) failures.push(`example missing adapter ${adapter}`);
  }
  for (const adapter of adapters) {
    for (const field of [
      "preflight",
      "lane_allowed",
      "budget_required",
      "budget_debit",
      "receipt_required",
      "rollback_or_cleanup",
      "red_gate_conditions",
      "forbidden_without_explicit_approval",
      "validation_required",
      "stop_reason"
    ]) {
      if (!(field in adapter)) failures.push(`${adapter.adapter_id || "<unknown>"} missing ${field}`);
    }
    if (adapter.readiness_claim_allowed !== false) failures.push(`${adapter.adapter_id} readiness_claim_allowed must be false`);
    if (!Array.isArray(adapter.red_gate_conditions) || adapter.red_gate_conditions.length === 0) {
      failures.push(`${adapter.adapter_id} must define red_gate_conditions`);
    }
  }

  const fixtures = Array.isArray(contract.fail_closed_fixtures) ? contract.fail_closed_fixtures : [];
  const fixtureIds = new Set(fixtures.map((fixture) => fixture.fixture_id));
  for (const fixture of REQUIRED_FAIL_CLOSED_FIXTURES) {
    if (!fixtureIds.has(fixture)) failures.push(`example missing fail-closed fixture ${fixture}`);
  }
  for (const fixture of fixtures) {
    if (fixture.expected_decision !== "BLOCKED_RED_OR_FAIL_CLOSED") failures.push(`${fixture.fixture_id} expected_decision must block`);
    if (fixture.mutated !== false) failures.push(`${fixture.fixture_id} mutated must be false`);
  }
}

const summary = collectAutopilotActionAdapterContract({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`adapter contract summary status must be ok, got ${summary.status}`);
if (summary.adapter_count !== REQUIRED_ADAPTERS.length) failures.push("adapter_count mismatch");
if (summary.fail_closed_fixture_count !== REQUIRED_FAIL_CLOSED_FIXTURES.length) failures.push("fail_closed_fixture_count mismatch");
if (summary.readiness_claim_allowed !== false) failures.push("summary readiness_claim_allowed must be false");
if (summary.executes_adapters !== false) failures.push("summary executes_adapters must be false");
if (summary.provider_calls_connected !== false) failures.push("summary provider_calls_connected must be false");
if (summary.mcp_calls_connected !== false) failures.push("summary mcp_calls_connected must be false");

if (failures.length > 0) {
  console.error("AUTOPILOT ACTION ADAPTER CONTRACT VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT ACTION ADAPTER CONTRACT VALIDATION PASSED");
console.log(`adapters=${summary.adapter_count} fail_closed=${summary.fail_closed_fixture_count}`);
