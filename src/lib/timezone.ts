export function getClientTimezoneOffset(startDateParam: string | null): number {
  const now = new Date();
  if (startDateParam) {
    const d = new Date(startDateParam);
    const h = d.getUTCHours();
    const m = d.getUTCMinutes();
    if (h > 12) {
      return (24 - h) * 60 - m;
    } else if (h > 0 || m > 0) {
      return -h * 60 - m;
    }
  }
  return -now.getTimezoneOffset();
}

export function getUtcFromLocal(year: number, month: number, day: number, hours: number, minutes: number, seconds: number, ms: number = 0, offsetMinutes: number) {
  const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds, ms));
  d.setUTCMinutes(d.getUTCMinutes() - offsetMinutes);
  return d;
}

export function getLocalDateKey(utcDate: Date | string, offsetMinutes: number): string {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  const localDate = new Date(d.getTime() + offsetMinutes * 60000);
  return localDate.toISOString().split('T')[0]!;
}

export function formatDateLabelUtc(dateUtc: Date): string {
  return `${dateUtc.getUTCMonth() + 1}/${dateUtc.getUTCDate()}/${dateUtc.getUTCFullYear()}`;
}

export function formatDateLabelWithOffset(date: Date, offsetMinutes: number = 0): string {
  const localDate = new Date(date.getTime() + offsetMinutes * 60000);
  return `${localDate.getUTCMonth() + 1}/${localDate.getUTCDate()}/${localDate.getUTCFullYear()}`;
}

export function getDayOfPeriod(dateUtc: Date, periodStartUtc: Date, offsetMinutes: number): number {
  const dateLocal = new Date(dateUtc.getTime() + offsetMinutes * 60000);
  const startLocal = new Date(periodStartUtc.getTime() + offsetMinutes * 60000);
  dateLocal.setUTCHours(0, 0, 0, 0);
  startLocal.setUTCHours(0, 0, 0, 0);
  return Math.floor((dateLocal.getTime() - startLocal.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateAnalyticsPeriods(startDate: string | null, endDate: string | null) {
  const offsetMinutes = getClientTimezoneOffset(startDate);
  const now = new Date();
  
  const startLocal = startDate ? new Date(new Date(startDate).getTime() + offsetMinutes * 60000) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const endLocal = endDate ? new Date(new Date(endDate).getTime() + offsetMinutes * 60000) : new Date(now.getTime() + offsetMinutes * 60000);

  const start = getUtcFromLocal(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate(), 0, 0, 0, 0, offsetMinutes);
  const end = getUtcFromLocal(endLocal.getUTCFullYear(), endLocal.getUTCMonth(), endLocal.getUTCDate(), 23, 59, 59, 999, offsetMinutes);

  const periodLength = end.getTime() - start.getTime();
  const periodDays = Math.round(periodLength / (1000 * 60 * 60 * 24));

  const previousEndUtc = new Date(start.getTime() - 1);
  const previousEndLocal = new Date(previousEndUtc.getTime() + offsetMinutes * 60000);
  const previousEnd = getUtcFromLocal(previousEndLocal.getUTCFullYear(), previousEndLocal.getUTCMonth(), previousEndLocal.getUTCDate(), 23, 59, 59, 999, offsetMinutes);

  const previousStartUtc = new Date(previousEnd.getTime() - periodLength);
  const previousStartLocal = new Date(previousStartUtc.getTime() + offsetMinutes * 60000);
  const previousStart = getUtcFromLocal(previousStartLocal.getUTCFullYear(), previousStartLocal.getUTCMonth(), previousStartLocal.getUTCDate(), 0, 0, 0, 0, offsetMinutes);

  const yearAgoStartLocal = new Date(startLocal);
  yearAgoStartLocal.setUTCFullYear(yearAgoStartLocal.getUTCFullYear() - 1);
  
  const yearAgoEndLocal = new Date(endLocal);
  yearAgoEndLocal.setUTCFullYear(yearAgoEndLocal.getUTCFullYear() - 1);
  
  const yearAgoStart = getUtcFromLocal(yearAgoStartLocal.getUTCFullYear(), yearAgoStartLocal.getUTCMonth(), yearAgoStartLocal.getUTCDate(), 0, 0, 0, 0, offsetMinutes);
  const yearAgoEnd = getUtcFromLocal(yearAgoEndLocal.getUTCFullYear(), yearAgoEndLocal.getUTCMonth(), yearAgoEndLocal.getUTCDate(), 23, 59, 59, 999, offsetMinutes);

  return { 
    start, 
    end, 
    startLocal,
    endLocal,
    previousStart, 
    previousEnd, 
    yearAgoStart,
    yearAgoEnd,
    periodLength, 
    periodDays, 
    offsetMinutes 
  };
}
