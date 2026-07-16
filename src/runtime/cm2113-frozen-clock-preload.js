'use strict';

const RealDate = Date;
const fixedIso = '2026-07-12T00:00:00.000Z';
const fixedTime = RealDate.parse(fixedIso);

if (!Number.isFinite(fixedTime)) throw new Error('cm2113_fixed_time_invalid');

class Cm2113FrozenDate extends RealDate {
  constructor(...args) {
    super(...(args.length === 0 ? [fixedTime] : args));
  }

  static now() {
    return fixedTime;
  }
}

global.Date = Cm2113FrozenDate;
