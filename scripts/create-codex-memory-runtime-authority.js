#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const {
  AUTHORITY_SCHEMA,
  STATE_MOUNT_SCHEMA,
  canonicalJson,
  containerConfigDigest,
  digest,
  validateAuthorityRecord,
  validateBuildManifest
} = require('../src/runtime/native-image/runtime-authority');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function sha256File(file) {
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
}
function inspect(kind, id) {
  const parsed = JSON.parse(execFileSync('/usr/bin/docker', [kind, 'inspect', id], {
    encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  }));
  if (!Array.isArray(parsed) || parsed.length !== 1) fail('runtime_authority_inspect_invalid');
  return parsed[0];
}
function parse(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_authority_argument_invalid');
    values[match[1]] = match[2];
  }
  return values;
}

function main(argv = process.argv.slice(2)) {
  const args = parse(argv);
  const runtime = inspect('container', args['runtime-container-id']);
  const edge = inspect('container', args['edge-container-id']);
  const image = inspect('image', args['image-config-id']);
  const manifest = validateBuildManifest(JSON.parse(fs.readFileSync(
    path.resolve(args['build-manifest']), 'utf8'
  )));
  const stateMountContract = {
    containerPath: args['state-destination'],
    readOnly: true,
    schemaVersion: STATE_MOUNT_SCHEMA,
    stateRootClass: 'external_primary_r5c'
  };
  const candidate = validateAuthorityRecord({
    acceptedImageConfigId: args['image-config-id'],
    acceptedOciManifestDigest: args['oci-manifest-digest'],
    authoritySchemaVersion: AUTHORITY_SCHEMA,
    buildManifestDigest: digest(manifest),
    codexMemoryCommit: manifest.codexMemoryCommit,
    containerConfigDigest: containerConfigDigest(runtime),
    edgeConfigDigest: containerConfigDigest(edge),
    edgeContainerId: edge.Id,
    edgeImageIdentity: edge.Image,
    edgeLifecycleAuthority: 'host_launcher',
    expectedRuntimeContainerId: runtime.Id,
    hostLauncherDigest: sha256File(path.resolve(args['host-launcher'])),
    hostLauncherVersion: 'codex-memory-native-host-launcher/v1',
    rootfsChainDigest: digest(image.RootFS.Layers),
    stateMountContract,
    stateMountContractDigest: digest(stateMountContract),
    vcpCommit: manifest.vcpCommit
  });
  process.stdout.write(canonicalJson(candidate));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_authority_create_failed'}\n`);
    process.exitCode = 1;
  }
}
