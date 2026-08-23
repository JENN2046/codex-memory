'use strict';

const path = require('node:path');
const {
  AUTHORITY_RECORD_PATH,
  EDGE_RECEIPT_PATH,
  PROVIDER_RECEIPT_PATH,
  IMAGE_BUILD_MANIFEST_PATH,
  VCP_PROVIDER_HOST_ENVIRONMENT_PATH
} = require('./runtime-authority');

const SAFE_ID = /^sha256:[a-f0-9]{64}$/u;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/u;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function absolute(value, code) {
  if (typeof value !== 'string' || !path.isAbsolute(value) ||
      path.normalize(value) !== value || value.includes('\n') ||
      value.includes('\0')) fail(code);
  return value;
}

function readOnlyBind(source, destination) {
  absolute(source, 'runtime_container_mount_source_invalid');
  absolute(destination, 'runtime_container_mount_destination_invalid');
  return `type=bind,src=${source},dst=${destination},readonly`;
}

function buildDockerCreateArguments({
  authoritySource,
  edgeReceiptSource,
  imageConfigId,
  name,
  primaryStateSource,
  primaryStateDestination,
  profileSource,
  providerReceiptSource,
  providerEnvironmentSource,
  runtimeDirectorySource
}) {
  if (!SAFE_ID.test(imageConfigId || '') || !SAFE_NAME.test(name || '')) {
    fail('runtime_container_identity_input_invalid');
  }
  if (providerEnvironmentSource !== VCP_PROVIDER_HOST_ENVIRONMENT_PATH) {
    fail('runtime_container_provider_environment_source_invalid');
  }
  const args = [
    'container', 'create',
    '--name', name,
    '--user', '1000:1000',
    '--read-only',
    '--network', 'host',
    '--ipc', 'private',
    '--log-driver', 'none',
    '--restart', 'no',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges:true',
    '--tmpfs', '/tmp:rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
    '--tmpfs', '/run/codex-memory-runtime:rw,noexec,nosuid,nodev,mode=0700,uid=1000,gid=1000',
    '--mount', readOnlyBind(authoritySource, AUTHORITY_RECORD_PATH),
    '--mount', readOnlyBind(edgeReceiptSource, EDGE_RECEIPT_PATH),
    '--mount', readOnlyBind(providerReceiptSource, PROVIDER_RECEIPT_PATH),
    '--mount', readOnlyBind(profileSource, '/run/codex-memory/profile.json'),
    '--mount', readOnlyBind(
      providerEnvironmentSource,
      '/run/secrets/codex-memory-vcp-provider.env'
    ),
    '--mount', readOnlyBind(primaryStateSource, primaryStateDestination),
    '--mount', `type=bind,src=${absolute(runtimeDirectorySource,
      'runtime_container_runtime_directory_invalid')},dst=/run/codex-memory-runtime-data`,
    '--env', `CODEX_MEMORY_CONTAINER_AUTHORITY_PATH=${AUTHORITY_RECORD_PATH}`,
    '--env', `CODEX_MEMORY_EDGE_RECEIPT_PATH=${EDGE_RECEIPT_PATH}`,
    '--env', `CODEX_MEMORY_PROVIDER_RECEIPT_PATH=${PROVIDER_RECEIPT_PATH}`,
    '--env', `CODEX_MEMORY_RUNTIME_BUILD_MANIFEST_PATH=${IMAGE_BUILD_MANIFEST_PATH}`,
    '--env', 'CODEX_MEMORY_STACK_PROFILE_PATH=/run/codex-memory/profile.json',
    '--env', 'CODEX_MEMORY_STACK_RUNTIME_DIR=/run/codex-memory-runtime-data',
    '--env', 'XDG_RUNTIME_DIR=/run/codex-memory-runtime-data',
    '--env', 'CODEX_MEMORY_CONTAINER_SUPERVISOR=1',
    '--env', 'VCP_ROOT=/opt/vcptoolbox',
    '--env', 'VCPTOOLBOX_ROOT=/opt/vcptoolbox',
    imageConfigId
  ];
  if (args.some(value => value === '/var/run/docker.sock' ||
      value.includes('/opt/codex-memory:') ||
      value.includes('/opt/vcptoolbox:'))) {
    fail('runtime_container_forbidden_mount');
  }
  return Object.freeze(args);
}

module.exports = { buildDockerCreateArguments, readOnlyBind };
