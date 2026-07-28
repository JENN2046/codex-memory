'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const {
  BINDING_FILE_NAME,
  ENVIRONMENT_FILE_NAME,
  EXPORTED_ENVIRONMENT_NAMES,
  MAPPING_FILE_NAME,
  MAX_MAPPING_BYTES,
  applyMappingPackage,
  checkMappingPackage,
  planMappingPackage,
  renameDirectoryNoReplace
} = require('../src/core/OwnerOnlyMappingPackage');

const repositoryRoot = path.resolve(__dirname, '..');

function syntheticMapping({ writeEligible = false } = {}) {
  return {
    schemaVersion: 1,
    mappingReference: 'jenn-vcp-diary-scope-v1',
    defaultPolicy: 'deny',
    entries: [{
      partitionReference: 'synthetic-owner-package-project-v1',
      diaryName: 'SYNTHETIC_OWNER_PACKAGE_DIARY',
      classification: 'project_shared',
      clientId: null,
      projectId: 'codex-memory',
      workspaceId: null,
      readProfiles: ['exact_visibility', 'task_start_context'],
      writeEligible
    }]
  };
}

function makeFixture({ quotedRoot = false, mapping = syntheticMapping() } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-mapping-package-'));
  fs.chmodSync(base, 0o700);
  const sourceDirectory = path.join(base, 'source');
  const privateRoot = path.join(base, quotedRoot ? "private'root" : 'private-root');
  fs.mkdirSync(sourceDirectory, { mode: 0o700 });
  fs.mkdirSync(privateRoot, { mode: 0o700 });
  fs.chmodSync(sourceDirectory, 0o700);
  fs.chmodSync(privateRoot, 0o700);
  const mappingSource = path.join(sourceDirectory, 'mapping.json');
  fs.writeFileSync(mappingSource, JSON.stringify(mapping), { mode: 0o600 });
  fs.chmodSync(mappingSource, 0o600);
  return {
    base,
    mappingSource,
    packageName: 'readonly-context-v2',
    privateRoot
  };
}

function cleanup(base) {
  fs.rmSync(base, { recursive: true, force: true });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => {
    assert.equal(error.code, code);
    return true;
  });
}

test('plan validates an owner-only source and complete private root without writing', () => {
  const fixture = makeFixture();
  try {
    const before = fs.readdirSync(fixture.privateRoot);
    const result = planMappingPackage(fixture);
    const after = fs.readdirSync(fixture.privateRoot);

    assert.equal(result.status, 'PLAN_VALID');
    assert.equal(result.mapping_validated, true);
    assert.equal(result.private_root_validated, true);
    assert.equal(result.package_target_available, true);
    assert.equal(result.config_write_performed, false);
    assert.equal(result.private_material_disclosed, false);
    assert.deepEqual(after, before);
  } finally {
    cleanup(fixture.base);
  }
});

test('plan fails closed before mapping read when no-replace primitive is unavailable', () => {
  const fixture = makeFixture();
  try {
    let mappingOpened = false;
    const missingPrimitiveFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'openSync') {
          return (targetPath, ...args) => {
            if (String(targetPath).endsWith('/mapping.json')) {
              mappingOpened = true;
            }
            return fs.openSync(targetPath, ...args);
          };
        }
        if (property === 'statSync') {
          return (targetPath, ...args) => {
            if (targetPath === '/usr/bin/python3') {
              const error = new Error('synthetic missing primitive');
              error.code = 'ENOENT';
              throw error;
            }
            return fs.statSync(targetPath, ...args);
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });

    expectCode(
      () => planMappingPackage({
        ...fixture,
        fsImpl: missingPrimitiveFs
      }),
      'owner_mapping_noreplace_primitive_unavailable'
    );
    assert.equal(mappingOpened, false);
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('plan fails closed when the no-replace syscall probe reports unavailable', () => {
  const fixture = makeFixture();
  try {
    let mappingOpened = false;
    let observedArguments = null;
    const trackingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'openSync') {
          return (targetPath, ...args) => {
            if (String(targetPath).endsWith('/mapping.json')) {
              mappingOpened = true;
            }
            return fs.openSync(targetPath, ...args);
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });
    const unsupportedProbe = (_executable, arguments_) => {
      observedArguments = arguments_;
      return {
        error: undefined,
        signal: null,
        status: 78
      };
    };

    expectCode(
      () => planMappingPackage({
        ...fixture,
        fsImpl: trackingFs,
        spawnSyncImpl: unsupportedProbe
      }),
      'owner_mapping_noreplace_primitive_unavailable'
    );
    assert.equal(observedArguments.includes('--probe'), true);
    assert.equal(mappingOpened, false);
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('apply requires explicit private-config confirmation and leaves no files when absent', () => {
  const fixture = makeFixture();
  try {
    expectCode(
      () => applyMappingPackage(fixture),
      'owner_mapping_private_config_confirmation_required'
    );
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('apply durably creates a non-overwriting mapping-only package and check verifies it', () => {
  const fixture = makeFixture();
  try {
    const applied = applyMappingPackage({
      ...fixture,
      confirmed: true
    });
    assert.equal(applied.status, 'APPLIED');
    assert.equal(applied.config_write_performed, true);
    assert.equal(applied.durably_committed, true);
    assert.equal(applied.reconciliation_required, false);

    const packageRoot = path.join(fixture.privateRoot, fixture.packageName);
    assert.equal(fs.statSync(packageRoot).mode & 0o777, 0o700);
    assert.deepEqual(
      fs.readdirSync(packageRoot).sort(),
      [BINDING_FILE_NAME, ENVIRONMENT_FILE_NAME, MAPPING_FILE_NAME].sort()
    );
    for (const fileName of [BINDING_FILE_NAME, ENVIRONMENT_FILE_NAME, MAPPING_FILE_NAME]) {
      assert.equal(fs.statSync(path.join(packageRoot, fileName)).mode & 0o777, 0o600);
    }

    const binding = JSON.parse(
      fs.readFileSync(path.join(packageRoot, BINDING_FILE_NAME), 'utf8')
    );
    assert.equal(binding.r4PrivateRootExported, false);
    assert.equal(binding.completeRuntimeConfiguration, false);
    assert.equal(binding.memoryWriteEnabled, false);
    assert.deepEqual(binding.exports, EXPORTED_ENVIRONMENT_NAMES);

    const environment = fs.readFileSync(
      path.join(packageRoot, ENVIRONMENT_FILE_NAME),
      'utf8'
    );
    assert.equal(environment.includes('CODEX_MEMORY_R4_GOVERNANCE_PRIVATE_ROOT'), false);
    for (const name of EXPORTED_ENVIRONMENT_NAMES) {
      assert.equal(environment.includes(`export ${name}=`), true, name);
    }

    const checked = checkMappingPackage(fixture);
    assert.equal(checked.status, 'VALID');
    assert.equal(checked.package_binding_matched, true);
    assert.equal(checked.config_write_performed, false);

    expectCode(
      () => applyMappingPackage({ ...fixture, confirmed: true }),
      'owner_mapping_package_exists'
    );
  } finally {
    cleanup(fixture.base);
  }
});

test('descriptor-bound reads reject source and package-file symlinks', () => {
  const sourceFixture = makeFixture();
  try {
    const sourceLink = path.join(path.dirname(sourceFixture.mappingSource), 'mapping-link.json');
    fs.symlinkSync(sourceFixture.mappingSource, sourceLink);
    expectCode(
      () => planMappingPackage({
        ...sourceFixture,
        mappingSource: sourceLink
      }),
      'owner_mapping_source_symlink_denied'
    );
  } finally {
    cleanup(sourceFixture.base);
  }

  for (const fileName of [MAPPING_FILE_NAME, ENVIRONMENT_FILE_NAME]) {
    const fixture = makeFixture();
    try {
      applyMappingPackage({ ...fixture, confirmed: true });
      const packageRoot = path.join(fixture.privateRoot, fixture.packageName);
      const target = path.join(packageRoot, fileName);
      const external = path.join(fixture.base, `external-${fileName}`);
      fs.copyFileSync(target, external);
      fs.chmodSync(external, 0o600);
      fs.unlinkSync(target);
      fs.symlinkSync(external, target);

      expectCode(
        () => checkMappingPackage(fixture),
        fileName === MAPPING_FILE_NAME
          ? 'owner_mapping_package_mapping_invalid'
          : 'owner_mapping_package_environment_invalid'
      );
    } finally {
      cleanup(fixture.base);
    }
  }
});

test('package verification rejects directory or file permission drift', () => {
  for (const mode of [0o400, 0o700, 0o4600]) {
    const fixture = makeFixture();
    try {
      applyMappingPackage({ ...fixture, confirmed: true });
      const mappingPath = path.join(
        fixture.privateRoot,
        fixture.packageName,
        MAPPING_FILE_NAME
      );
      fs.chmodSync(mappingPath, mode);

      expectCode(
        () => checkMappingPackage(fixture),
        'owner_mapping_package_mapping_invalid'
      );
    } finally {
      cleanup(fixture.base);
    }
  }

  for (const mode of [0o500, 0o1700]) {
    const directoryFixture = makeFixture();
    const packageRoot = path.join(
      directoryFixture.privateRoot,
      directoryFixture.packageName
    );
    try {
      applyMappingPackage({ ...directoryFixture, confirmed: true });
      fs.chmodSync(packageRoot, mode);
      expectCode(
        () => checkMappingPackage(directoryFixture),
        'owner_mapping_package_directory_security_invalid'
      );
    } finally {
      if (fs.existsSync(packageRoot)) fs.chmodSync(packageRoot, 0o700);
      cleanup(directoryFixture.base);
    }
  }
});

test('package verification fails closed when a file entry changes after descriptor read', () => {
  const fixture = makeFixture();
  try {
    applyMappingPackage({ ...fixture, confirmed: true });
    const packageRoot = path.join(fixture.privateRoot, fixture.packageName);
    const mappingPath = path.join(packageRoot, MAPPING_FILE_NAME);
    const replacementPath = path.join(fixture.base, 'mapping-replacement');
    fs.copyFileSync(mappingPath, replacementPath);
    fs.chmodSync(replacementPath, 0o600);
    let swapped = false;
    const swappingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'readSync') {
          return (...args) => {
            const count = fs.readSync(...args);
            const descriptorPath = `/proc/self/fd/${args[0]}`;
            let openedPath = '';
            try {
              openedPath = fs.readlinkSync(descriptorPath);
            } catch {}
            if (!swapped && openedPath === mappingPath) {
              fs.renameSync(replacementPath, mappingPath);
              swapped = true;
            }
            return count;
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });

    expectCode(
      () => checkMappingPackage({
        ...fixture,
        fsImpl: swappingFs
      }),
      'owner_mapping_package_file_identity_changed'
    );
    assert.equal(swapped, true);
  } finally {
    cleanup(fixture.base);
  }
});

test('apply cleans its staging directory when the atomic rename fails', () => {
  const fixture = makeFixture();
  try {
    const failingRename = () => {
      const error = new Error('synthetic rename failure');
      error.code = 'EIO';
      throw error;
    };
    assert.throws(
      () => applyMappingPackage({
        ...fixture,
        confirmed: true,
        renameNoReplace: failingRename
      }),
      (error) => {
        assert.equal(error.code, 'owner_mapping_package_apply_failed');
        assert.deepEqual(error.effects, {
          config_write_performed: true,
          cleanup_performed: true,
          durably_committed: false,
          reconciliation_required: false
        });
        return true;
      }
    );
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('apply reports and cleans a staging directory that cannot be descriptor-opened', () => {
  const fixture = makeFixture();
  try {
    const stagingSuffix = `/.${fixture.packageName}.staging`;
    const failingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'openSync') {
          return (targetPath, ...args) => {
            if (String(targetPath).endsWith(stagingSuffix)) {
              const error = new Error('synthetic staging open failure');
              error.code = 'EIO';
              throw error;
            }
            return fs.openSync(targetPath, ...args);
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });

    assert.throws(
      () => applyMappingPackage({
        ...fixture,
        confirmed: true,
        fsImpl: failingFs
      }),
      (error) => {
        assert.equal(error.code, 'owner_mapping_staging_directory_create_failed');
        assert.deepEqual(error.effects, {
          config_write_performed: true,
          cleanup_performed: true,
          durably_committed: false,
          reconciliation_required: false
        });
        return true;
      }
    );
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('apply fails closed and cleans staging when private-root permissions drift', () => {
  const fixture = makeFixture();
  try {
    let changed = false;
    const driftingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'writeSync') {
          return (...args) => {
            const count = fs.writeSync(...args);
            if (!changed) {
              fs.chmodSync(fixture.privateRoot, 0o750);
              changed = true;
            }
            return count;
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });

    assert.throws(
      () => applyMappingPackage({
        ...fixture,
        confirmed: true,
        fsImpl: driftingFs
      }),
      (error) => {
        assert.equal(error.code, 'owner_mapping_private_root_security_invalid');
        assert.deepEqual(error.effects, {
          config_write_performed: true,
          cleanup_performed: true,
          durably_committed: false,
          reconciliation_required: false
        });
        return true;
      }
    );
    assert.equal(changed, true);
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('plan and apply fail closed on a stale deterministic staging directory', () => {
  const fixture = makeFixture();
  try {
    const staging = path.join(
      fixture.privateRoot,
      `.${fixture.packageName}.staging`
    );
    fs.mkdirSync(staging, { mode: 0o700 });
    fs.chmodSync(staging, 0o700);
    const partial = path.join(staging, MAPPING_FILE_NAME);
    fs.writeFileSync(partial, '{}\n', { mode: 0o600 });
    fs.chmodSync(partial, 0o600);

    for (const action of [
      () => planMappingPackage(fixture),
      () => applyMappingPackage({ ...fixture, confirmed: true })
    ]) {
      assert.throws(action, (error) => {
        assert.equal(
          error.code,
          'owner_mapping_staging_reconciliation_required'
        );
        if (error.effects) {
          assert.equal(error.effects.reconciliation_required, true);
        }
        return true;
      });
    }
    assert.equal(fs.existsSync(partial), true);
    assert.equal(
      fs.existsSync(path.join(fixture.privateRoot, fixture.packageName)),
      false
    );
  } finally {
    cleanup(fixture.base);
  }
});

test('apply detects a private-root path swap and reports committed-state reconciliation', () => {
  const fixture = makeFixture();
  try {
    const displacedRoot = `${fixture.privateRoot}-displaced`;
    const replacementRoot = `${fixture.privateRoot}-replacement`;
    fs.mkdirSync(replacementRoot, { mode: 0o700 });
    fs.chmodSync(replacementRoot, 0o700);
    let swapped = false;
    const swappingRename = (rootFd, sourceName, targetName) => {
      if (!swapped) {
        fs.renameSync(fixture.privateRoot, displacedRoot);
        fs.renameSync(replacementRoot, fixture.privateRoot);
        swapped = true;
      }
      fs.renameSync(
        `/proc/self/fd/${rootFd}/${sourceName}`,
        `/proc/self/fd/${rootFd}/${targetName}`
      );
    };

    assert.throws(
      () => applyMappingPackage({
        ...fixture,
        confirmed: true,
        renameNoReplace: swappingRename
      }),
      (error) => {
        assert.equal(error.code, 'owner_mapping_private_root_identity_changed');
        assert.deepEqual(error.effects, {
          config_write_performed: true,
          cleanup_performed: false,
          durably_committed: false,
          reconciliation_required: true
        });
        return true;
      }
    );
    assert.equal(swapped, true);
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
    assert.equal(
      fs.existsSync(path.join(displacedRoot, fixture.packageName)),
      true
    );
  } finally {
    cleanup(fixture.base);
  }
});

test('atomic no-replace commit preserves a target created in the final race window', () => {
  const fixture = makeFixture();
  try {
    let targetCreated = false;
    const racingRename = (rootFd, sourceName, targetName, options) => {
      fs.mkdirSync(`/proc/self/fd/${rootFd}/${targetName}`, {
        mode: 0o700
      });
      targetCreated = true;
      renameDirectoryNoReplace(rootFd, sourceName, targetName, options);
    };

    assert.throws(
      () => applyMappingPackage({
        ...fixture,
        confirmed: true,
        renameNoReplace: racingRename
      }),
      (error) => {
        assert.equal(error.code, 'owner_mapping_package_exists');
        assert.deepEqual(error.effects, {
          config_write_performed: true,
          cleanup_performed: true,
          durably_committed: false,
          reconciliation_required: false
        });
        return true;
      }
    );
    assert.equal(targetCreated, true);
    const targetPath = path.join(fixture.privateRoot, fixture.packageName);
    assert.deepEqual(fs.readdirSync(targetPath), []);
    assert.equal(
      fs.existsSync(
        path.join(
          fixture.privateRoot,
          `.${fixture.packageName}.staging`
        )
      ),
      false
    );
  } finally {
    cleanup(fixture.base);
  }
});

test('apply retains state for reconciliation when the staging path is replaced', () => {
  const fixture = makeFixture();
  try {
    const stagingPath = path.join(
      fixture.privateRoot,
      `.${fixture.packageName}.staging`
    );
    const displacedPath = `${stagingPath}-displaced`;
    let targetInspections = 0;
    let swapped = false;
    const swappingFs = new Proxy(fs, {
      get(target, property, receiver) {
        if (property === 'lstatSync') {
          return (targetPath, ...args) => {
            if (String(targetPath).endsWith(`/${fixture.packageName}`)) {
              targetInspections += 1;
              if (targetInspections === 2 && !swapped) {
                fs.renameSync(stagingPath, displacedPath);
                fs.mkdirSync(stagingPath, { mode: 0o700 });
                fs.chmodSync(stagingPath, 0o700);
                swapped = true;
              }
            }
            return fs.lstatSync(targetPath, ...args);
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });

    assert.throws(
      () => applyMappingPackage({
        ...fixture,
        confirmed: true,
        fsImpl: swappingFs
      }),
      (error) => {
        assert.equal(error.code, 'owner_mapping_staging_identity_changed');
        assert.deepEqual(error.effects, {
          config_write_performed: true,
          cleanup_performed: false,
          durably_committed: false,
          reconciliation_required: true
        });
        return true;
      }
    );
    assert.equal(swapped, true);
    assert.deepEqual(fs.readdirSync(stagingPath), []);
    assert.deepEqual(
      fs.readdirSync(displacedPath).sort(),
      [BINDING_FILE_NAME, ENVIRONMENT_FILE_NAME, MAPPING_FILE_NAME].sort()
    );
    assert.equal(
      fs.existsSync(path.join(fixture.privateRoot, fixture.packageName)),
      false
    );
  } finally {
    cleanup(fixture.base);
  }
});

test('read-only package rejects write-eligible and oversized mappings before writing', () => {
  const writeFixture = makeFixture({
    mapping: syntheticMapping({ writeEligible: true })
  });
  try {
    expectCode(
      () => planMappingPackage(writeFixture),
      'owner_mapping_write_eligible_denied'
    );
    assert.deepEqual(fs.readdirSync(writeFixture.privateRoot), []);
  } finally {
    cleanup(writeFixture.base);
  }

  const oversizedFixture = makeFixture();
  try {
    fs.writeFileSync(
      oversizedFixture.mappingSource,
      Buffer.alloc(MAX_MAPPING_BYTES + 1, 0x20),
      { mode: 0o600 }
    );
    fs.chmodSync(oversizedFixture.mappingSource, 0o600);
    expectCode(
      () => planMappingPackage(oversizedFixture),
      'owner_mapping_source_security_invalid'
    );
    assert.deepEqual(fs.readdirSync(oversizedFixture.privateRoot), []);
  } finally {
    cleanup(oversizedFixture.base);
  }
});

test('private roots must be canonical owner-only directories outside repository boundaries', () => {
  const fixture = makeFixture();
  try {
    const alias = path.join(fixture.base, 'private-root-alias');
    fs.symlinkSync(fixture.privateRoot, alias);
    expectCode(
      () => planMappingPackage({ ...fixture, privateRoot: alias }),
      'owner_mapping_private_root_symlink_denied'
    );
    expectCode(
      () => planMappingPackage({ ...fixture, privateRoot: repositoryRoot }),
      'owner_mapping_path_in_repository'
    );
    expectCode(
      () => planMappingPackage({
        ...fixture,
        mappingSource: path.join(os.tmpdir(), 'state-private', 'mapping.json')
      }),
      'owner_mapping_private_boundary_denied'
    );
    expectCode(
      () => planMappingPackage({
        ...fixture,
        platform: 'darwin'
      }),
      'owner_mapping_descriptor_platform_unsupported'
    );
  } finally {
    cleanup(fixture.base);
  }
});

test('repository boundary rejects a different Git worktree marker', () => {
  const fixture = makeFixture();
  try {
    fs.writeFileSync(
      path.join(fixture.base, '.git'),
      'gitdir: synthetic-other-worktree\n',
      { mode: 0o600 }
    );
    fs.chmodSync(path.join(fixture.base, '.git'), 0o600);

    expectCode(
      () => planMappingPackage(fixture),
      'owner_mapping_path_in_repository'
    );
    assert.deepEqual(fs.readdirSync(fixture.privateRoot), []);
  } finally {
    cleanup(fixture.base);
  }
});

test('package verification rejects extra files and generated shell remains parseable', () => {
  const fixture = makeFixture({ quotedRoot: true });
  try {
    applyMappingPackage({ ...fixture, confirmed: true });
    const packageRoot = path.join(fixture.privateRoot, fixture.packageName);
    const environmentPath = path.join(packageRoot, ENVIRONMENT_FILE_NAME);
    const shellCheck = spawnSync('bash', ['-n', environmentPath], {
      encoding: 'utf8'
    });
    assert.equal(shellCheck.status, 0, shellCheck.stderr);
    assert.equal(checkMappingPackage(fixture).status, 'VALID');

    const extra = path.join(packageRoot, 'unexpected.txt');
    fs.writeFileSync(extra, 'unexpected\n', { mode: 0o600 });
    fs.chmodSync(extra, 0o600);
    expectCode(
      () => checkMappingPackage(fixture),
      'owner_mapping_package_file_set_invalid'
    );
  } finally {
    cleanup(fixture.base);
  }
});
