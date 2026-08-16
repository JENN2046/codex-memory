#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { canonicalJson } = require('../src/runtime/native-image/runtime-authority');
const {
  EXPECTED_VEXUS_PATH,
  EXPECTED_VEXUS_SHA256,
  NATIVE_CLOSURE_SCHEMA,
  validateNativeClosure
} = require('../src/runtime/native-image/native-closure');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function sha256(file) {
  return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
}
function command(name, args) {
  return execFileSync(name, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function nativeFiles(root) {
  const output = [];
  const visit = directory => {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) {
        let target;
        try { target = fs.statSync(file); } catch {
          fail('runtime_native_closure_symlink_forbidden');
        }
        if (target.isDirectory() || name.endsWith('.node') || name.endsWith('.so')) {
          fail('runtime_native_closure_symlink_forbidden');
        }
        // npm creates executable JS links under node_modules/.bin. They are
        // immutable image bytes but not native artifacts, so never follow them.
        continue;
      }
      if (stat.isDirectory()) visit(file);
      else if (stat.isFile() && (name.endsWith('.node') || name.endsWith('.so'))) output.push(file);
    }
  };
  for (const relative of ['opt/codex-memory', 'opt/vcptoolbox']) {
    const directory = path.join(root, relative);
    if (fs.existsSync(directory)) visit(directory);
  }
  return output;
}
function inspect(root = '/') {
  const expected = path.join(root, EXPECTED_VEXUS_PATH.slice(1));
  const files = nativeFiles(root);
  if (files.length !== 1 || files[0] !== expected || sha256(expected) !== EXPECTED_VEXUS_SHA256) {
    fail('runtime_native_artifact_set_mismatch');
  }
  const header = command('readelf', ['-h', expected]);
  const dynamic = command('readelf', ['-d', expected]);
  const notes = command('readelf', ['-n', expected]);
  const programHeaders = command('readelf', ['-l', expected]);
  const symbols = command('objdump', ['-T', expected]);
  const pick = (expression, code) => {
    const match = expression.exec(header);
    if (!match) fail(code);
    return match[1].trim();
  };
  const needed = [...dynamic.matchAll(/\(NEEDED\).*\[([^\]]+)\]/gu)].map(match => match[1]).sort();
  const rpath = /\(RPATH\).*\[([^\]]*)\]/u.exec(dynamic)?.[1] ?? null;
  const runpath = /\(RUNPATH\).*\[([^\]]*)\]/u.exec(dynamic)?.[1] ?? null;
  if (rpath !== null || runpath !== null || needed.some(name => name.includes('/'))) {
    fail('runtime_native_loader_path_forbidden');
  }
  const resolved = command('ldd', [expected]).split('\n').map(line =>
    /^\s*(\S+)\s+=>\s+(\/\S+)\s+\(/u.exec(line)
  ).filter(Boolean).map(match => ({ name: match[1], path: match[2] }));
  if (resolved.some(item => item.path.startsWith('/opt/') || !fs.statSync(item.path).isFile())) {
    fail('runtime_native_dependency_path_invalid');
  }
  const glibcVersions = [...symbols.matchAll(/\bGLIBC_(\d+)\.(\d+)\b/gu)]
    .map(match => [Number(match[1]), Number(match[2])]);
  if (glibcVersions.length < 1) fail('runtime_native_glibc_evidence_missing');
  glibcVersions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const maximumGlibc = glibcVersions.at(-1).join('.');
  const artifact = {
    buildId: /Build ID:\s*([a-f0-9]+)/u.exec(notes)?.[1] || '',
    elfClass: pick(/^\s*Class:\s*(.+)$/mu, 'runtime_native_elf_class_invalid'),
    interpreter: /Requesting program interpreter:\s*([^\]]+)/u
      .exec(programHeaders)?.[1] || null,
    machine: pick(/^\s*Machine:\s*(.+)$/mu, 'runtime_native_elf_machine_invalid'),
    maximumGlibc,
    needed,
    path: EXPECTED_VEXUS_PATH,
    resolvedLibraries: resolved.sort((a, b) => a.name.localeCompare(b.name)).map(item => ({
      name: item.name,
      path: item.path,
      sha256: sha256(item.path)
    })),
    rpath,
    runpath,
    sha256: sha256(expected),
    type: pick(/^\s*Type:\s*(.+)$/mu, 'runtime_native_elf_type_invalid')
  };
  return validateNativeClosure({ artifacts: [artifact], schemaVersion: NATIVE_CLOSURE_SCHEMA });
}

function main(argv = process.argv.slice(2)) {
  const values = Object.fromEntries(argv.map(value => {
    const match = /^--([a-z-]+)=(.+)$/u.exec(value);
    if (!match) fail('runtime_native_closure_argument_invalid');
    return [match[1], match[2]];
  }));
  const result = inspect(path.resolve(values.root || '/'));
  if (values.output) fs.writeFileSync(path.resolve(values.output), canonicalJson(result));
  else process.stdout.write(canonicalJson(result));
}
if (require.main === module) {
  try { main(); } catch (error) {
    process.stderr.write(`${error?.code || error?.message || 'runtime_native_closure_failed'}\n`);
    process.exitCode = 1;
  }
}
module.exports = { inspect, nativeFiles };
