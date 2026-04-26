function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeek(date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const offset = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - offset);
  return result;
}

function endOfWeek(date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addRange(ranges, start, end, label) {
  const key = `${start.getTime()}|${end.getTime()}`;
  if (!ranges.some(range => range.key === key)) {
    ranges.push({ key, start, end, label });
  }
}

function parseFlexibleDate(rawValue = '', isEnd = false) {
  const normalized = String(rawValue || '').trim().replace(/[./]/g, '-');
  const match = normalized.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = match[2] ? Number.parseInt(match[2], 10) : (isEnd ? 12 : 1);
  if (month < 1 || month > 12) return null;

  let day;
  if (match[3]) {
    day = Number.parseInt(match[3], 10);
  } else if (isEnd) {
    day = new Date(year, month, 0).getDate();
  } else {
    day = 1;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    isEnd ? 23 : 0,
    isEnd ? 59 : 0,
    isEnd ? 59 : 0,
    isEnd ? 999 : 0
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

class TimeExpressionParser {
  parse(text = '', directiveValue = null, now = new Date()) {
    const source = String(text || '').toLowerCase();
    const ranges = [];
    this.parseDirectiveRange(directiveValue, now, ranges);
    this.parseNaturalRanges(source, now, ranges);
    return ranges.map(range => ({
      start: range.start,
      end: range.end,
      label: range.label
    }));
  }

  parseDirectiveRange(value, now, ranges) {
    if (!value || value === true) return;
    const raw = String(value).trim().toLowerCase();
    const explicitRangeMatch = raw.match(
      /^(20\d{2}(?:[-./]\d{1,2}(?:[-./]\d{1,2})?)?)\s*[~到]\s*(20\d{2}(?:[-./]\d{1,2}(?:[-./]\d{1,2})?)?)$/
    );
    if (explicitRangeMatch) {
      const start = parseFlexibleDate(explicitRangeMatch[1], false);
      const end = parseFlexibleDate(explicitRangeMatch[2], true);
      if (start && end && start.getTime() <= end.getTime()) {
        addRange(ranges, start, end, `${explicitRangeMatch[1]}~${explicitRangeMatch[2]}`);
      }
      return;
    }

    const explicitDate = parseFlexibleDate(raw, false);
    if (explicitDate) {
      const endDate = parseFlexibleDate(raw, true);
      if (endDate && explicitDate.getTime() <= endDate.getTime()) {
        addRange(ranges, explicitDate, endDate, raw);
      }
      return;
    }

    const match = raw.match(/^(\d+)\s*([dwmy])$/);
    if (!match) {
      if (/^\d+$/.test(raw)) {
        const days = Number.parseInt(raw, 10);
        const start = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
        addRange(ranges, start, endOfDay(now), `${days}d`);
      }
      return;
    }

    const amount = Number.parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'd') {
      addRange(ranges, startOfDay(new Date(now.getTime() - (amount - 1) * 24 * 60 * 60 * 1000)), endOfDay(now), `${amount}d`);
    }
    if (unit === 'w') {
      const start = startOfWeek(new Date(now.getTime() - (amount - 1) * 7 * 24 * 60 * 60 * 1000));
      addRange(ranges, start, endOfDay(now), `${amount}w`);
    }
    if (unit === 'm') {
      const start = new Date(now.getFullYear(), now.getMonth() - (amount - 1), 1, 0, 0, 0, 0);
      addRange(ranges, start, endOfDay(now), `${amount}m`);
    }
    if (unit === 'y') {
      const start = new Date(now.getFullYear() - (amount - 1), 0, 1, 0, 0, 0, 0);
      addRange(ranges, start, endOfDay(now), `${amount}y`);
    }
  }

  parseNaturalRanges(source, now, ranges) {
    if (/(\btoday\b|今天)/.test(source)) {
      addRange(ranges, startOfDay(now), endOfDay(now), 'today');
    }

    if (/(\byesterday\b|昨天)/.test(source)) {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      addRange(ranges, startOfDay(yesterday), endOfDay(yesterday), 'yesterday');
    }

    if (/(\bthis week\b|本周|这周)/.test(source)) {
      addRange(ranges, startOfWeek(now), endOfWeek(now), 'this-week');
    }

    if (/(\blast week\b|上周)/.test(source)) {
      const previousWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      addRange(ranges, startOfWeek(previousWeek), endOfWeek(previousWeek), 'last-week');
    }

    if (/(\bthis month\b|本月)/.test(source)) {
      addRange(ranges, startOfMonth(now), endOfMonth(now), 'this-month');
    }

    if (/(\blast month\b|上月|上个月)/.test(source)) {
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      addRange(ranges, startOfMonth(previousMonth), endOfMonth(previousMonth), 'last-month');
    }

    for (const match of source.matchAll(/(?:最近|近|last\s+)(\d+)\s*(天|day|days|周|week|weeks|个月|月|month|months)/g)) {
      const amount = Number.parseInt(match[1], 10);
      const unit = match[2];
      if (/天|day/.test(unit)) {
        addRange(ranges, startOfDay(new Date(now.getTime() - (amount - 1) * 24 * 60 * 60 * 1000)), endOfDay(now), `last-${amount}-days`);
      } else if (/周|week/.test(unit)) {
        addRange(ranges, startOfDay(new Date(now.getTime() - (amount * 7 - 1) * 24 * 60 * 60 * 1000)), endOfDay(now), `last-${amount}-weeks`);
      } else if (/月|month/.test(unit)) {
        addRange(ranges, new Date(now.getFullYear(), now.getMonth() - amount + 1, 1, 0, 0, 0, 0), endOfDay(now), `last-${amount}-months`);
      }
    }

    const explicitDateMatch = source.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (explicitDateMatch) {
      const explicitDate = new Date(Number(explicitDateMatch[1]), Number(explicitDateMatch[2]) - 1, Number(explicitDateMatch[3]));
      addRange(ranges, startOfDay(explicitDate), endOfDay(explicitDate), 'explicit-date');
    }
  }
}

module.exports = {
  TimeExpressionParser
};
