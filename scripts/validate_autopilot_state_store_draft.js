#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  REQUIRED_RECORD_TYPES,
  collectAutopilotStateStoreDraft
} = require("../src/core/AutopilotStateStoreDraft");

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

const schema = readText("schemas/autopilot_structured_state_store.schema.yaml");
const example = readJson("tests/schema_examples/autopilot_structured_state_store.example.json");
readText("docs/AUTOPILOT_STRUCTURED_STATE_STORE_DRAFT.md");

for (const requiredType of REQUIRED_RECORD_TYPES) {
  if (!schema.includes(requiredType)) failures.push(`schema missing record type ${requiredType}`);
}

requireIncludes("docs/AUTOPILOT_STRUCTURED_STATE_STORE_DRAFT.md", [
  "NOT_READY_BLOCKED",
  "append-only",
  "not runtime readiness evidence",
  "readiness_claim_allowed=false",
  "must not"
]);

if (example) {
  const draft = example.structured_state_store_draft || {};
  if (draft.append_only !== true) failures.push("draft append_only must be true");
  if (draft.no_migration !== true) failures.push("draft no_migration must be true");
  if (draft.database_created !== false) failures.push("draft database_created must be false");
  if (draft.durable_write_enabled !== false) failures.push("draft durable_write_enabled must be false");
  if (draft.board_migration_performed !== false) failures.push("draft board_migration_performed must be false");
  if (draft.readiness_claim_allowed !== false) failures.push("draft readiness_claim_allowed must be false");

  const records = Array.isArray(draft.records) ? draft.records : [];
  const seen = new Set(records.map(record => record.record_type));
  for (const requiredType of REQUIRED_RECORD_TYPES) {
    if (!seen.has(requiredType)) failures.push(`example missing record type ${requiredType}`);
  }
  for (const record of records) {
    for (const field of [
      "id",
      "created_at",
      "record_type",
      "goal_id",
      "task_id",
      "source_surface",
      "evidence_class",
      "mutation_boundary",
      "readiness_claim_allowed"
    ]) {
      if (!(field in record)) failures.push(`record ${record.id || "<unknown>"} missing ${field}`);
    }
    if (record.readiness_claim_allowed !== false) {
      failures.push(`record ${record.id || "<unknown>"} readiness_claim_allowed must be false`);
    }
    if (!record.mutation_boundary || record.mutation_boundary.mutated !== false) {
      failures.push(`record ${record.id || "<unknown>"} mutation_boundary.mutated must be false`);
    }
  }
}

const summary = collectAutopilotStateStoreDraft({ workspaceRoot: root });
if (summary.status !== "ok") failures.push(`state store summary status must be ok, got ${summary.status}`);
if (summary.no_migration !== true) failures.push("state store summary no_migration must be true");
if (summary.record_type_count !== REQUIRED_RECORD_TYPES.length) failures.push("state store summary record_type_count mismatch");
if (summary.readiness_claim_allowed !== false) failures.push("state store summary readiness_claim_allowed must be false");
if (summary.mutated !== false) failures.push("state store summary mutated must be false");
if (summary.database_created !== false) failures.push("state store summary database_created must be false");
if (summary.durable_write_enabled !== false) failures.push("state store summary durable_write_enabled must be false");

if (failures.length > 0) {
  console.error("AUTOPILOT STATE STORE DRAFT VALIDATION FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AUTOPILOT STATE STORE DRAFT VALIDATION PASSED");
console.log(`record_types=${summary.record_type_count} records=${summary.record_count}`);
