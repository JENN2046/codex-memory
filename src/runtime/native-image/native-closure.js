'use strict';

const { digest, sha256Buffer } = require('./runtime-authority');

const NATIVE_CLOSURE_SCHEMA = 'codex-memory-native-closure/v1';
const EXPECTED_VEXUS_SHA256 =
  'sha256:8d969b407d3458d835656286570cebba9cc0981b3e505a25701e7b48f15a5c54';
const EXPECTED_VEXUS_PATH =
  '/opt/vcptoolbox/rust-vexus-lite/vexus-lite.linux-x64-gnu.node';
const EXPECTED_BETTER_SQLITE_PATH =
  '/opt/vcptoolbox/node_modules/better-sqlite3/build/Release/better_sqlite3.node';
const EXPECTED_NATIVE_PATHS = Object.freeze([
  EXPECTED_BETTER_SQLITE_PATH,
  EXPECTED_VEXUS_PATH
]);

function fail(code) { const error = new Error(code); error.code = code; throw error; }

function validateNativeClosure(value) {
  if (!value || value.schemaVersion !== NATIVE_CLOSURE_SCHEMA ||
      !Array.isArray(value.artifacts) || value.artifacts.length !== 2 ||
      value.artifacts.some((item, index) => item?.path !== EXPECTED_NATIVE_PATHS[index])) {
    fail('runtime_native_closure_invalid');
  }
  for (const artifact of value.artifacts) {
    if (!/^sha256:[a-f0-9]{64}$/u.test(artifact.sha256 || '') ||
      (artifact.path === EXPECTED_VEXUS_PATH && artifact.sha256 !== EXPECTED_VEXUS_SHA256) ||
      artifact.elfClass !== 'ELF64' || artifact.machine !== 'Advanced Micro Devices X86-64' ||
      artifact.type !== 'DYN (Shared object file)' ||
      artifact.interpreter !== null ||
      typeof artifact.maximumGlibc !== 'string' ||
      !/^\d+\.\d+$/u.test(artifact.maximumGlibc) ||
      Number(artifact.maximumGlibc.split('.')[0]) > 2 ||
      (artifact.maximumGlibc.startsWith('2.') &&
        Number(artifact.maximumGlibc.split('.')[1]) > 35) ||
      typeof artifact.buildId !== 'string' || !/^[a-f0-9]{40}$/u.test(artifact.buildId) ||
      artifact.rpath !== null || artifact.runpath !== null ||
      !Array.isArray(artifact.needed) || artifact.needed.length < 1 ||
      !Array.isArray(artifact.resolvedLibraries) || artifact.resolvedLibraries.length < 1) {
      fail('runtime_native_closure_invalid');
    }
    for (const needed of artifact.needed) {
      if (!/^[A-Za-z0-9_.+-]+\.so(?:\.[0-9]+)*$/u.test(needed)) {
        fail('runtime_native_closure_dependency_invalid');
      }
    }
    if (new Set(artifact.needed).size !== artifact.needed.length) {
      fail('runtime_native_closure_dependency_invalid');
    }
    for (const library of artifact.resolvedLibraries) {
      if (!library || !['/lib/x86_64-linux-gnu/', '/usr/lib/x86_64-linux-gnu/']
        .some(prefix => library.path.startsWith(prefix)) ||
        !/^sha256:[a-f0-9]{64}$/u.test(library.sha256 || '') ||
        !artifact.needed.includes(library.name)) {
        fail('runtime_native_closure_dependency_invalid');
      }
    }
    if (artifact.resolvedLibraries.length !== artifact.needed.length ||
      new Set(artifact.resolvedLibraries.map(item => item.name)).size !==
        artifact.needed.length ||
      new Set(artifact.resolvedLibraries.map(item => item.path)).size !==
        artifact.needed.length) fail('runtime_native_closure_dependency_missing');
  }
  return Object.freeze(value);
}

function nativeClosureDigest(value) { return digest(validateNativeClosure(value)); }

function verifyNativeClosureBytes(value, readFile) {
  const closure = validateNativeClosure(value);
  if (typeof readFile !== 'function') fail('runtime_native_closure_reader_invalid');
  const expected = closure.artifacts.flatMap(
    artifact => [artifact, ...artifact.resolvedLibraries]
  );
  for (const item of expected) {
    let bytes;
    try { bytes = readFile(item.path); } catch {
      fail('runtime_native_closure_file_unavailable');
    }
    if (!Buffer.isBuffer(bytes) || sha256Buffer(bytes) !== item.sha256) {
      fail('runtime_native_closure_file_mismatch');
    }
  }
  return closure;
}

module.exports = {
  EXPECTED_BETTER_SQLITE_PATH,
  EXPECTED_NATIVE_PATHS,
  EXPECTED_VEXUS_PATH,
  EXPECTED_VEXUS_SHA256,
  NATIVE_CLOSURE_SCHEMA,
  nativeClosureDigest,
  validateNativeClosure,
  verifyNativeClosureBytes
};
