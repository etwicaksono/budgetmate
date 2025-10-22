export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseISODate = (value) => {
  if (!value) {
    return null;
  }
  const datePart = value.split('T')[0];
  const [yearRaw, monthRaw, dayRaw] = datePart.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
};

export const getMonthRange = (year, month) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
};

export const getYearRange = (year) => ({
  start: `${year}-01-01`,
  end: `${year}-12-31`,
});

export const getWeekRange = (reference = new Date()) => {
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

export const getRollingDaysRange = (days) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: toISODate(start), end: toISODate(end) };
};

export const getRollingMonthsRange = (months) => {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - (months - 1));
  return { start: toISODate(start), end: toISODate(end) };
};

export const formatMonthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });

export const formatWeekLabel = (startDate, endDate) => {
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

export const formatCustomRangeLabel = ({ start, end }) => {
  if (!start && !end) {
    return 'All time';
  }
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (start && end) {
    const startDate = parseISODate(start) || new Date(start);
    const endDate = parseISODate(end) || new Date(end);
    return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
  }
  if (start) {
    const startDate = parseISODate(start) || new Date(start);
    return `${formatter.format(startDate)} ->`;
  }
  const endDate = parseISODate(end) || new Date(end);
  return `-> ${formatter.format(endDate)}`;
};

export const getPresetRange = (key) => {
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
