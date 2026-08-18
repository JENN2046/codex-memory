#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { canonicalJson } = require('../src/runtime/native-image/runtime-authority');
const {
  validateEdgeBuildManifest,
  validateEdgeOciArchive
} = require('../src/runtime/native-image/edge-image-authority');
const {
  readBoundedArchive
} = require('./verify-codex-memory-runtime-image');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function parseArguments(argv) {
  const values = {};
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(argument);
    if (!match) fail('edge_image_verify_argument_invalid');
    values[match[1]] = path.resolve(match[2]);
  }
  if (!values.archive || !values['build-manifest']) {
    fail('edge_image_verify_argument_invalid');
  }
  return values;
}
function verifyEdgeOciArchive(archive, manifestFile) {
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')); } catch {
    fail('edge_build_manifest_file_invalid');
  }
  return validateEdgeOciArchive(readBoundedArchive(archive),
    validateEdgeBuildManifest(manifest));
}
function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  process.stdout.write(canonicalJson({
    ...verifyEdgeOciArchive(args.archive, args['build-manifest']), accepted: true
  }));
}
if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'edge_image_verify_failed'}\n`);
    process.exitCode = 1;
  }
}
module.exports = { main, parseArguments, verifyEdgeOciArchive };
