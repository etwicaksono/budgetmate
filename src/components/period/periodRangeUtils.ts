export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export const toISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const yearText = year.toString();
  return `${yearText}-${month}-${day}`;
};

export const parseISODate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const [datePart] = value.split('T');
  if (!datePart) {
    return null;
  }
  const parts = datePart.split('-');
  if (parts.length < 3) {
    return null;
  }
  const [yearRaw, monthRaw, dayRaw] = parts as [string, string, string];
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
};

export const getMonthRange = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
};

export const getYearRange = (year: number) => ({
  start: `${year.toString()}-01-01`,
  end: `${year.toString()}-12-31`,
});

export const getWeekRange = (reference: Date = new Date()) => {
  const start = new Date(reference);
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
};

export const getTodayRange = () => {
  const today = toISODate(new Date());
  return { start: today, end: today };
};

export const getRollingDaysRange = (days: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
};

export const getRollingMonthsRange = (months: number) => {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (months - 1));
  return { start: toISODate(start), end: toISODate(end) };
};

export const formatMonthLabel = (year: number, month: number): string =>
  new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

export const formatWeekLabel = (startDate: Date, endDate: Date): string => {
  const sameYear = startDate.getFullYear() === endDate.getFullYear();
  const startFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const endFormatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startFormatter.format(startDate)} - ${endFormatter.format(endDate)}`;
};

export const formatCustomRangeLabel = ({ start, end }: { start: string; end: string }): string => {
  if (!start && !end) {
    return 'All time';
  }
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (start && end) {
    const startDate = parseISODate(start) ?? new Date(start);
    const endDate = parseISODate(end) ?? new Date(end);
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }
  if (start) {
    const startDate = parseISODate(start) ?? new Date(start);
    return `${formatter.format(startDate)} ->`;
  }
  const endDate = parseISODate(end) ?? new Date(end);
  return `-> ${formatter.format(endDate)}`;
};

type PresetRangeMeta = {
  type: 'month' | 'year' | 'week' | 'custom';
  year?: number;
  month?: number;
};

export const getPresetRange = (
  key: string
): { range: { start: string; end: string }; label: string; meta: PresetRangeMeta } => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (key) {
    case 'thisMonth':
      return {
        range: getMonthRange(year, month),
        label: 'This month',
        meta: { type: 'month', year, month },
      };
    case 'lastMonth': {
      let lastMonth = month - 1;
      let lastMonthYear = year;
      if (lastMonth < 0) {
        lastMonth = 11;
        lastMonthYear -= 1;
      }
      return {
        range: getMonthRange(lastMonthYear, lastMonth),
        label: 'Last month',
        meta: { type: 'month', year: lastMonthYear, month: lastMonth },
      };
    }
    case 'thisYear':
      return {
        range: getYearRange(year),
        label: 'This year',
        meta: { type: 'year', year },
      };
    case 'lastYear':
      return {
        range: getYearRange(year - 1),
        label: 'Last year',
        meta: { type: 'year', year: year - 1 },
      };
    default:
      return {
        range: { start: '', end: '' },
        label: 'All time',
        meta: { type: 'custom' },
      };
  }
};
