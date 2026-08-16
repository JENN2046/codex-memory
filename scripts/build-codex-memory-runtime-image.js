#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const {
  canonicalJson,
  digest,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');
const { verifyOciArchive } = require('./verify-codex-memory-runtime-image');
const {
  verifyBuildContextBuffer
} = require('../src/runtime/native-image/build-context');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function parseArguments(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z0-9-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_image_build_argument_invalid');
    values[match[1]] = match[2];
  }
  if (!values.context || !values.output) fail('runtime_image_build_argument_invalid');
  return values;
}

function buildRuntimeImage({ contextDirectory, outputArchive, expectedContextArtifactSha256, builder,
  spawnFile = spawnSync, verifyArchive = verifyOciArchive }) {
  const contextArchive = path.join(contextDirectory, 'runtime-context.tar');
  const descriptor = fs.openSync(
    contextArchive, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0)
  );
  let contextBuffer;
  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || before.size < 1024 || before.size > 2 * 1024 ** 3) {
      fail('runtime_context_artifact_invalid');
    }
    contextBuffer = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (before.dev !== after.dev || before.ino !== after.ino ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      fail('runtime_context_artifact_changed');
    }
  } finally { fs.closeSync(descriptor); }
  const contextEvidence = verifyBuildContextBuffer(contextBuffer);
  if (!/^sha256:[a-f0-9]{64}$/u.test(expectedContextArtifactSha256 || '') ||
      contextEvidence.artifactSha256 !== expectedContextArtifactSha256) {
    fail('runtime_context_artifact_authority_mismatch');
  }
  const manifest = validateBuildManifest(contextEvidence.manifest);
  if (fs.existsSync(outputArchive)) fail('runtime_image_output_exists');
  const outputDirectory = path.dirname(outputArchive);
  fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  const temporary = path.join(outputDirectory,
    `.${path.basename(outputArchive)}.${crypto.randomBytes(12).toString('hex')}.tmp`);
  const args = [
    'buildx', 'build', '--no-cache', '--progress=plain',
    '--platform=linux/amd64',
    '--provenance=false', '--sbom=false',
    '--file', 'codex-memory/deploy/native-runtime/Dockerfile',
    '--build-arg', `SOURCE_DATE_EPOCH=${manifest.sourceDateEpoch}`,
    '--build-arg', `BUILD_MANIFEST_DIGEST=${digest(manifest)}`,
    '--output', `type=oci,dest=${temporary},name=codex-memory-native-runtime:test,rewrite-timestamp=true`,
    '-'
  ];
  if (builder) args.splice(2, 0, '--builder', builder);
  try {
    const result = spawnFile('docker', args, {
      env: {
        ...process.env,
        BUILDKIT_MULTI_PLATFORM: '1',
        SOURCE_DATE_EPOCH: String(manifest.sourceDateEpoch)
      },
      input: contextBuffer,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    if (result.status !== 0) fail('runtime_image_build_failed');
    const evidence = verifyArchive(temporary, manifest);
    const file = fs.openSync(temporary, fs.constants.O_RDONLY);
    try { fs.fsyncSync(file); } finally { fs.closeSync(file); }
    const readBack = verifyArchive(temporary, manifest);
    if (readBack.archiveSha256 !== evidence.archiveSha256) {
      fail('runtime_image_publication_readback_mismatch');
    }
    try {
      fs.linkSync(temporary, outputArchive);
    } catch (error) {
      if (error?.code === 'EEXIST') fail('runtime_image_output_exists');
      throw error;
    }
    fs.unlinkSync(temporary);
    const directory = fs.openSync(outputDirectory, fs.constants.O_RDONLY);
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    return Object.freeze({ ...readBack, ...contextEvidence });
  } catch (error) {
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const result = buildRuntimeImage({
    builder: args.builder,
    contextDirectory: path.resolve(args.context),
    expectedContextArtifactSha256: args['context-sha256'],
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

module.exports = { buildRuntimeImage, parseArguments };
