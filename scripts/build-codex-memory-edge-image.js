#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { canonicalJson } = require('../src/runtime/native-image/runtime-authority');
const {
  verifyEdgeBuildContextBuffer
} = require('../src/runtime/native-image/edge-image-authority');
const { verifyEdgeOciArchive } = require('./verify-codex-memory-edge-image');
const {
  requirePrivateOutputDirectory,
  sameFileIdentity
} = require('./build-codex-memory-runtime-image');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function parseArguments(argv) {
  const values = {};
  for (const argument of argv) {
    const match = /^--([a-z0-9-]+)=(.+)$/u.exec(argument);
    if (!match) fail('edge_image_build_argument_invalid');
    values[match[1]] = match[2];
  }
  if (!values.context || !values.output || !values['context-sha256'] || !values.builder) {
    fail('edge_image_build_argument_invalid');
  }
  return values;
}

function buildEdgeImage({ contextDirectory, outputArchive,
  expectedContextArtifactSha256, builder, spawnFile = spawnSync,
  verifyArchive = verifyEdgeOciArchive }) {
  const contextArchive = path.join(contextDirectory, 'edge-context.tar');
  const descriptor = fs.openSync(contextArchive,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
  let contextBuffer;
  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile() || before.size < 1024 || before.size > 256 * 1024 * 1024) {
      fail('edge_context_artifact_invalid');
    }
    contextBuffer = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    if (!sameFileIdentity(before, after)) fail('edge_context_artifact_changed');
  } finally { fs.closeSync(descriptor); }
  const context = verifyEdgeBuildContextBuffer(contextBuffer);
  if (!/^sha256:[a-f0-9]{64}$/u.test(expectedContextArtifactSha256) ||
      context.artifactSha256 !== expectedContextArtifactSha256) {
    fail('edge_context_artifact_authority_mismatch');
  }
  if (fs.existsSync(outputArchive)) fail('edge_image_output_exists');
  const outputDirectory = path.dirname(outputArchive);
  fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  requirePrivateOutputDirectory(outputDirectory);
  const temporary = path.join(outputDirectory,
    `.${path.basename(outputArchive)}.${crypto.randomBytes(12).toString('hex')}.tmp`);
  const manifestFile = path.join(contextDirectory, 'edge-build-manifest.json');
  const args = [
    'buildx', 'build', '--no-cache', '--progress=plain',
    '--platform=linux/amd64', '--provenance=false', '--sbom=false',
    '--file', 'apps/chatgpt-edge/Dockerfile',
    '--build-arg', `SOURCE_COMMIT=${context.manifest.sourceCommit}`,
    '--output', `type=oci,dest=${temporary},name=codex-memory-chatgpt-edge:test,rewrite-timestamp=true`,
    '-'
  ];
  if (builder) args.splice(2, 0, '--builder', builder);
  let publicationDescriptor = null;
  try {
    const result = spawnFile('docker', args, {
      env: { ...process.env, BUILDKIT_MULTI_PLATFORM: '1',
        SOURCE_DATE_EPOCH: String(context.manifest.sourceDateEpoch) },
      input: contextBuffer, maxBuffer: 32 * 1024 * 1024,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    if (result.status !== 0) fail('edge_image_build_failed');
    fs.chmodSync(temporary, 0o600);
    publicationDescriptor = fs.openSync(temporary,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const held = fs.fstatSync(publicationDescriptor);
    if (!held.isFile() || held.nlink !== 1) fail('edge_image_publication_source_invalid');
    fs.fsyncSync(publicationDescriptor);
    const evidence = verifyArchive(temporary, manifestFile);
    if (!sameFileIdentity(held, fs.lstatSync(temporary))) {
      fail('edge_image_publication_source_changed');
    }
    const readback = verifyArchive(temporary, manifestFile);
    if (readback.artifactSha256 !== evidence.artifactSha256 ||
        !sameFileIdentity(held, fs.lstatSync(temporary))) {
      fail('edge_image_publication_readback_mismatch');
    }
    fs.linkSync(temporary, outputArchive);
    const published = fs.lstatSync(outputArchive);
    if (!sameFileIdentity(held, published) || published.nlink !== 2) {
      fail('edge_image_publication_identity_mismatch');
    }
    fs.closeSync(publicationDescriptor);
    publicationDescriptor = null;
    fs.unlinkSync(temporary);
    const directory = fs.openSync(outputDirectory, fs.constants.O_RDONLY);
    try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
    return Object.freeze({ ...readback,
      contextArtifactSha256: context.artifactSha256,
      edgeBuildContextFileManifestDigest: context.edgeBuildContextFileManifestDigest });
  } catch (error) {
    if (publicationDescriptor !== null) {
      try { fs.closeSync(publicationDescriptor); } catch {}
    }
    try { fs.unlinkSync(temporary); } catch {}
    throw error;
  }
}

function main(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  process.stdout.write(canonicalJson(buildEdgeImage({
    builder: args.builder,
    contextDirectory: path.resolve(args.context),
    expectedContextArtifactSha256: args['context-sha256'],
    outputArchive: path.resolve(args.output)
  })));
}
if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'edge_image_build_failed'}\n`);
    process.exitCode = 1;
  }
}
module.exports = { buildEdgeImage, main, parseArguments };
