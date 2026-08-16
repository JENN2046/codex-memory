'use strict';

const path = require('node:path');

const BLOCK = 512;
const DEFAULT_LIMITS = Object.freeze({
  maximumArchiveBytes: 2 * 1024 * 1024 * 1024,
  maximumEntries: 20_000,
  maximumFileBytes: 512 * 1024 * 1024,
  maximumTrailingZeroBytes: 1024 * 1024,
  maximumTotalBytes: 2 * 1024 * 1024 * 1024
});

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function field(block, start, length) {
  return block.subarray(start, start + length).toString('utf8').replace(/\0.*$/su, '');
}

function octal(block, start, length) {
  const value = field(block, start, length).trim();
  if (!/^[0-7]+$/u.test(value || '0')) fail('runtime_tar_header_invalid');
  const number = Number.parseInt(value || '0', 8);
  if (!Number.isSafeInteger(number) || number < 0) fail('runtime_tar_header_invalid');
  return number;
}

function normalizedName(name) {
  const stripped = name.replace(/^\.\//u, '').replace(/\/$/u, '');
  const normalized = path.posix.normalize(stripped);
  if (!stripped || stripped.startsWith('/') || normalized !== stripped ||
      normalized === '..' || normalized.startsWith('../') || normalized.includes('\0')) {
    fail('runtime_tar_path_unsafe');
  }
  return normalized;
}

function validatedLinkTarget(name, target, hardLink) {
  if (!target || target.includes('\0')) fail('runtime_tar_link_target_unsafe');
  if (hardLink) return normalizedName(target);
  const rooted = target.startsWith('/') ? target.slice(1) :
    path.posix.join(path.posix.dirname(name), target);
  const normalized = path.posix.normalize(rooted);
  if (!normalized || normalized === '..' || normalized.startsWith('../')) {
    fail('runtime_tar_link_target_unsafe');
  }
  return target;
}

function parseTarBuffer(buffer, limits = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length < BLOCK * 2 || buffer.length % BLOCK !== 0) {
    fail('runtime_tar_archive_invalid');
  }
  const policy = { ...DEFAULT_LIMITS, ...limits };
  if (buffer.length > policy.maximumArchiveBytes) fail('runtime_tar_archive_too_large');
  const entries = [];
  const names = new Set();
  let offset = 0;
  let totalBytes = 0;
  let zeroBlocks = 0;
  while (offset + BLOCK <= buffer.length) {
    const header = buffer.subarray(offset, offset + BLOCK);
    if (header.every(byte => byte === 0)) {
      zeroBlocks += 1;
      offset += BLOCK;
      if (zeroBlocks === 2) break;
      continue;
    }
    if (zeroBlocks !== 0) fail('runtime_tar_archive_invalid');
    const storedChecksum = octal(header, 148, 8);
    let checksum = 0;
    for (let index = 0; index < BLOCK; index += 1) {
      checksum += index >= 148 && index < 156 ? 32 : header[index];
    }
    if (checksum !== storedChecksum) fail('runtime_tar_checksum_invalid');
    const magic = header.subarray(257, 263).toString('latin1');
    const version = header.subarray(263, 265).toString('latin1');
    const canonicalUstar = magic === 'ustar\0' && version === '00';
    const gnuUstar = magic === 'ustar ' && version === ' \0';
    if (!canonicalUstar && (policy.requireCanonicalUstar !== false || !gnuUstar)) {
      fail('runtime_tar_ustar_invalid');
    }
    const prefix = field(header, 345, 155);
    const basename = field(header, 0, 100);
    const rawName = prefix ? `${prefix}/${basename}` : basename;
    const name = policy.allowRootEntry === true && ['./', '.'].includes(rawName) ? '.' :
      normalizedName(rawName);
    if (names.has(name)) fail('runtime_tar_duplicate_path');
    names.add(name);
    const type = String.fromCharCode(header[156] || 48);
    const allowedTypes = policy.allowedTypeFlags || ['0', '5'];
    if (!allowedTypes.includes(type)) fail('runtime_tar_special_entry_forbidden');
    const size = octal(header, 124, 12);
    if (type !== '0' && size !== 0) fail('runtime_tar_header_invalid');
    if (size > policy.maximumFileBytes) fail('runtime_tar_entry_too_large');
    totalBytes += size;
    if (totalBytes > policy.maximumTotalBytes) fail('runtime_tar_expansion_limit');
    const contentOffset = offset + BLOCK;
    const next = contentOffset + Math.ceil(size / BLOCK) * BLOCK;
    if (next > buffer.length) fail('runtime_tar_archive_truncated');
    const paddingStart = contentOffset + size;
    if (!buffer.subarray(paddingStart, next).every(byte => byte === 0)) {
      fail('runtime_tar_padding_invalid');
    }
    const linkTarget = ['1', '2'].includes(type) ? validatedLinkTarget(
      name, field(header, 157, 100), type === '1'
    ) : null;
    entries.push(Object.freeze({
      content: type === '0' ? buffer.subarray(contentOffset, contentOffset + size) : null,
      linkTarget,
      mode: octal(header, 100, 8),
      name,
      size,
      type: ({ '0': 'file', '1': 'hardlink', '2': 'symlink', '5': 'directory' })[type]
    }));
    if (entries.length > policy.maximumEntries) fail('runtime_tar_entry_limit');
    offset = next;
  }
  if (zeroBlocks < 2) fail('runtime_tar_archive_unterminated');
  if (buffer.length - offset > policy.maximumTrailingZeroBytes) {
    fail('runtime_tar_trailing_padding_limit');
  }
  for (; offset < buffer.length; offset += 1) {
    if (buffer[offset] !== 0) fail('runtime_tar_trailing_data');
  }
  return Object.freeze(entries);
}

function regularFiles(entries) {
  return new Map(entries.filter(entry => entry.type === 'file')
    .map(entry => [entry.name, entry]));
}

module.exports = { DEFAULT_LIMITS, parseTarBuffer, regularFiles };
