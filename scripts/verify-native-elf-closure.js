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
  EXPECTED_NATIVE_PATHS,
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
  const files = nativeFiles(root);
  const expectedFiles = EXPECTED_NATIVE_PATHS.map(value => path.join(root, value.slice(1)));
  if (files.length !== expectedFiles.length) {
    fail('runtime_native_artifact_count_mismatch');
  }
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    fail('runtime_native_artifact_set_mismatch');
  }
  if (sha256(path.join(root, EXPECTED_VEXUS_PATH.slice(1))) !== EXPECTED_VEXUS_SHA256) {
    fail('runtime_native_vexus_digest_mismatch');
  }
  const artifacts = expectedFiles.map((expected, index) => {
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
    const needed = [...dynamic.matchAll(/\(NEEDED\).*\[([^\]]+)\]/gu)]
      .map(match => match[1]).sort();
    const rpath = /\(RPATH\).*\[([^\]]*)\]/u.exec(dynamic)?.[1] ?? null;
    const runpath = /\(RUNPATH\).*\[([^\]]*)\]/u.exec(dynamic)?.[1] ?? null;
    if (rpath !== null || runpath !== null || needed.some(name => name.includes('/'))) {
      fail('runtime_native_loader_path_forbidden');
    }
    const resolved = command('ldd', [expected]).split('\n').map(line => {
      const linked = /^\s*(\S+)\s+=>\s+(\/\S+)\s+\(/u.exec(line);
      if (linked) return { name: linked[1], path: fs.realpathSync(linked[2]) };
      const direct = /^\s*(\/\S+)\s+\(/u.exec(line);
      return direct ? {
        name: path.basename(direct[1]), path: fs.realpathSync(direct[1])
      } : null;
    }).filter(Boolean);
    if (resolved.some(item => item.path.startsWith('/opt/') ||
        !fs.statSync(item.path).isFile())) fail('runtime_native_dependency_path_invalid');
    const glibcVersions = [...symbols.matchAll(/\bGLIBC_(\d+)\.(\d+)\b/gu)]
      .map(match => [Number(match[1]), Number(match[2])]);
    if (glibcVersions.length < 1) fail('runtime_native_glibc_evidence_missing');
    glibcVersions.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return {
      buildId: /Build ID:\s*([a-f0-9]+)/u.exec(notes)?.[1] || '',
      elfClass: pick(/^\s*Class:\s*(.+)$/mu, 'runtime_native_elf_class_invalid'),
      interpreter: /Requesting program interpreter:\s*([^\]]+)/u
        .exec(programHeaders)?.[1] || null,
      machine: pick(/^\s*Machine:\s*(.+)$/mu, 'runtime_native_elf_machine_invalid'),
      maximumGlibc: glibcVersions.at(-1).join('.'),
      needed,
      path: EXPECTED_NATIVE_PATHS[index],
      resolvedLibraries: resolved.sort((a, b) => a.name.localeCompare(b.name)).map(item => ({
        name: item.name, path: item.path, sha256: sha256(item.path)
      })),
      rpath,
      runpath,
      sha256: sha256(expected),
      type: pick(/^\s*Type:\s*(.+)$/mu, 'runtime_native_elf_type_invalid')
    };
  });
  return validateNativeClosure({ artifacts, schemaVersion: NATIVE_CLOSURE_SCHEMA });
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
