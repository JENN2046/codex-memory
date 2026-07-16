'use strict';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('fixed_date_preload_test_environment_required');
}

const fixedNow = Date.parse(process.env.CODEX_MEMORY_TEST_FIXED_NOW || '');
if (!Number.isFinite(fixedNow)) {
  throw new Error('fixed_date_preload_valid_timestamp_required');
}

const NativeDate = Date;

class FixedDate extends NativeDate {
  constructor(...args) {
    super(...(args.length === 0 ? [fixedNow] : args));
  }

  static now() {
    return fixedNow;
  }
}

global.Date = FixedDate;
