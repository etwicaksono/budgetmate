/**
 * Numeric input helpers:
 * - display: group thousands with ',' and use '.' as decimal
 * - normalized: digits with optional '.' decimal, leading '-' allowed
 * - deferCommit: true when user just typed decimal separator with no fractional digits
 */
export interface CoerceResult {
  display: string;
  normalized: string;
  deferCommit: boolean;
}

export function formatNumberDisplayFromValue(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') {
    return '';
  }
  const raw = String(val).trim();

  const sign = raw.startsWith('-') ? '-' : '';
  const s = raw.replace(/^-/, '');

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);

  let intDigits = s.replace(/[^\d]/g, '');
  let fracDigits = '';
  let useDecimal = false;

  if (lastSep !== -1) {
    const fractionCandidate = s.slice(lastSep + 1).replace(/[^\d]/g, '');
    if (fractionCandidate.length >= 1 && fractionCandidate.length <= 3) {
      useDecimal = true;
      intDigits = s.slice(0, lastSep).replace(/[^\d]/g, '');
      fracDigits = fractionCandidate;
    }
  }

  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return sign + (grouped || (useDecimal ? '0' : '')) + (useDecimal ? '.' + fracDigits : '');
}

export function coerceAndFormatNumber(input: string): CoerceResult {
  if (!input) {
    return { display: '', normalized: '', deferCommit: false };
  }

  let s = input.replace(/[^\d.,-]/g, '');
  s = s.replace(/(?!^)-/g, '');
  const sign = s.trim().startsWith('-') ? '-' : '';

  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  const lastSep = Math.max(lastDot, lastComma);
  const endsWithSep = s.endsWith('.') || s.endsWith(',');

  const fractionCandidate = lastSep !== -1 ? s.slice(lastSep + 1).replace(/[^\d]/g, '') : '';

  const useDecimal =
    lastSep !== -1 &&
    (endsWithSep || (fractionCandidate.length >= 1 && fractionCandidate.length <= 3));

  const integerPartRaw = useDecimal ? s.slice(0, lastSep) : s;
  const intDigits = integerPartRaw.replace(/[^\d]/g, '');

  const grouped = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const display =
    sign + (grouped || (useDecimal ? '0' : '')) + (useDecimal ? '.' + fractionCandidate : '');

  const normalized =
    sign + (intDigits || '') + (useDecimal && fractionCandidate ? '.' + fractionCandidate : '');

  const deferCommit = endsWithSep && fractionCandidate.length === 0;

  return { display, normalized, deferCommit };
}
