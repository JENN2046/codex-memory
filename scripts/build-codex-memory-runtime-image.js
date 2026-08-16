#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  canonicalJson,
  digest,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');
const { verifyOciArchive } = require('./verify-codex-memory-runtime-image');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function parseArguments(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_image_build_argument_invalid');
    values[match[1]] = match[2];
  }
  if (!values.context || !values.output) fail('runtime_image_build_argument_invalid');
  return values;
}

function buildRuntimeImage({ contextDirectory, outputArchive, builder }) {
  const manifestFile = path.join(
    contextDirectory, 'runtime', 'runtime-build-manifest.json'
  );
  const manifest = validateBuildManifest(JSON.parse(fs.readFileSync(
    manifestFile, 'utf8'
  )));
  if (fs.existsSync(outputArchive)) fail('runtime_image_output_exists');
  const args = [
    'buildx', 'build', '--no-cache', '--progress=plain',
    '--platform=linux/amd64',
    '--file', path.join(contextDirectory, 'codex-memory', 'deploy',
      'native-runtime', 'Dockerfile'),
    '--build-arg', `SOURCE_DATE_EPOCH=${manifest.sourceDateEpoch}`,
    '--build-arg', `BUILD_MANIFEST_DIGEST=${digest(manifest)}`,
    '--output', `type=oci,dest=${outputArchive},name=codex-memory-native-runtime:test`,
    contextDirectory
  ];
  if (builder) args.splice(2, 0, '--builder', builder);
  execFileSync('docker', args, {
    env: {
      ...process.env,
      BUILDKIT_MULTI_PLATFORM: '1',
      SOURCE_DATE_EPOCH: String(manifest.sourceDateEpoch)
    },
    maxBuffer: 32 * 1024 * 1024,
    stdio: ['ignore', 'inherit', 'inherit']
  });
  return verifyOciArchive(outputArchive, manifestFile);
}

function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const result = buildRuntimeImage({
    builder: args.builder,
    contextDirectory: path.resolve(args.context),
    outputArchive: path.resolve(args.output)
  });
  process.stdout.write(canonicalJson(result));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_image_build_failed'}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildRuntimeImage };
