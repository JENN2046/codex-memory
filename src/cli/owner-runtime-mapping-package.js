#!/usr/bin/env node
'use strict';

const {
  applyMappingPackage,
  checkMappingPackage,
  lowDisclosureReport,
  planMappingPackage
} = require('../core/OwnerOnlyMappingPackage');

const COMMANDS = new Set(['plan', 'apply', 'check']);

function createError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function parseArgs(argv = []) {
  const options = {
    command: '',
    mappingSource: '',
    privateRoot: '',
    packageName: '',
    confirmPrivateConfigWrite: false,
    json: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (token === '--json') {
      options.json = true;
      continue;
    }
    if (token === '--confirm-private-config-write') {
      options.confirmPrivateConfigWrite = true;
      continue;
    }
    if (token === '--mapping-source') {
      options.mappingSource = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--private-root') {
      options.privateRoot = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (token === '--package-name') {
      options.packageName = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (!options.command && COMMANDS.has(token)) {
      options.command = token;
      continue;
    }
    throw createError('owner_mapping_argument_invalid');
  }

  if (options.help) return options;
  if (!COMMANDS.has(options.command) || !options.privateRoot || !options.packageName) {
    throw createError('owner_mapping_argument_invalid');
  }
  if (options.command === 'check') {
    if (options.mappingSource || options.confirmPrivateConfigWrite) {
      throw createError('owner_mapping_argument_invalid');
    }
  } else if (!options.mappingSource) {
    throw createError('owner_mapping_argument_invalid');
  }
  if (options.command !== 'apply' && options.confirmPrivateConfigWrite) {
    throw createError('owner_mapping_argument_invalid');
  }
  return options;
}

function usage() {
  return [
    'Usage:',
    '  npm run owner-runtime:mapping-package -- plan --mapping-source <approved-owner-only-json> --private-root <existing-complete-owner-only-root> --package-name <new-package-name> [--json]',
    '  npm run owner-runtime:mapping-package -- apply --mapping-source <approved-owner-only-json> --private-root <existing-complete-owner-only-root> --package-name <new-package-name> --confirm-private-config-write [--json]',
    '  npm run owner-runtime:mapping-package -- check --private-root <existing-complete-owner-only-root> --package-name <package-name> [--json]',
    '',
    'plan validates without writing. apply performs an explicit private-configuration write.',
    'check validates the non-overwriting package without starting a runtime, calling a provider, or reading memory.',
    'The package exports mapping-only bindings; it never replaces the complete R4 private root.',
    'Output never includes paths, diary names, mapping references, mapping digests, credentials, or raw content.',
    'The apply confirmation flag records operator intent but does not grant an agent authorization.'
  ].join('\n');
}

function renderText(value) {
  return [
    `status: ${value.status}`,
    `command: ${value.command}`,
    ...(value.code ? [`code: ${value.code}`] : []),
    `mappingValidated: ${value.mapping_validated}`,
    `privateRootValidated: ${value.private_root_validated}`,
    `packageBindingMatched: ${value.package_binding_matched}`,
    `packageTargetAvailable: ${value.package_target_available}`,
    `privateConfigWriteConfirmed: ${value.private_config_write_confirmed}`,
    `configWritePerformed: ${value.config_write_performed}`,
    `cleanupPerformed: ${value.cleanup_performed}`,
    `durablyCommitted: ${value.durably_committed}`,
    `reconciliationRequired: ${value.reconciliation_required}`,
    `privateMaterialDisclosed: ${value.private_material_disclosed}`,
    `runtimeStarted: ${value.runtime_started}`,
    `providerCalls: ${value.provider_calls}`,
    `memoryReads: ${value.memory_reads}`,
    `primaryMemoryWrites: ${value.primary_memory_writes}`,
    `readinessClaimed: ${value.readiness_claimed}`
  ].join('\n') + '\n';
}

function renderFailure(command, error) {
  const code = /^owner_mapping_[a-z0-9_]+$/u.test(error?.code || '')
    ? error.code
    : 'owner_mapping_command_failed';
  return Object.freeze({
    ...lowDisclosureReport('BLOCK', command || null, {
      ...(error?.effects || {})
    }),
    code
  });
}

function run(argv = process.argv.slice(2), stdout = process.stdout) {
  let options;
  const jsonRequested = argv.includes('--json');
  const command = argv.find((token) => COMMANDS.has(token)) || null;
  try {
    options = parseArgs(argv);
    if (options.help) {
      stdout.write(`${usage()}\n`);
      return 0;
    }
    const input = {
      privateRoot: options.privateRoot,
      packageName: options.packageName
    };
    if (options.command !== 'check') input.mappingSource = options.mappingSource;
    const value = {
      plan: () => planMappingPackage(input),
      apply: () => applyMappingPackage({
        ...input,
        confirmed: options.confirmPrivateConfigWrite
      }),
      check: () => checkMappingPackage(input)
    }[options.command]();
    stdout.write(options.json ? `${JSON.stringify(value)}\n` : renderText(value));
    return 0;
  } catch (error) {
    const value = renderFailure(options?.command || command, error);
    stdout.write((options?.json || jsonRequested)
      ? `${JSON.stringify(value)}\n`
      : renderText(value));
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = run();
}

module.exports = {
  parseArgs,
  renderFailure,
  run,
  usage
};
