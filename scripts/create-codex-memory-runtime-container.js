#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const { canonicalJson } = require('../src/runtime/native-image/runtime-authority');
const {
  buildDockerCreateArguments
} = require('../src/runtime/native-image/container-plan');

function fail(code) {
  const error = new Error(code); error.code = code; throw error;
}
function parse(argv) {
  const values = {};
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(arg);
    if (!match) fail('runtime_container_create_argument_invalid');
    values[match[1]] = match[2];
  }
  return values;
}

function main(argv = process.argv.slice(2)) {
  const value = parse(argv);
  const args = buildDockerCreateArguments({
    authoritySource: value.authority,
    edgeReceiptSource: value['edge-receipt'],
    imageConfigId: value.image,
    name: value.name,
    primaryStateDestination: value['state-destination'],
    primaryStateSource: value.state,
    profileSource: value.profile,
    providerReceiptSource: value['provider-receipt'],
    providerEnvironmentSource: value['provider-environment'],
    runtimeDirectorySource: value['runtime-directory']
  });
  if (value.execute === 'true') {
    const id = execFileSync('/usr/bin/docker', args, {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    process.stdout.write(canonicalJson({ accepted: true, containerId: id }));
    return;
  }
  process.stdout.write(canonicalJson({
    accepted: true,
    action: 'candidate_only',
    argumentCount: args.length,
    dockerSocketMounted: false,
    productionContainerCreated: false
  }));
}

if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_container_create_failed'}\n`);
    process.exitCode = 1;
  }
}
