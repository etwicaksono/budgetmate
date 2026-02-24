/**
 * Timezone utilities for Google Sheets sync
 * Converts between browser timezone (YYYY-MM-DD HH:MM:SS) and UTC timestamps
 */

export function formatDateForSheet(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function parseDateFromSheet(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('Date string is required');
  }

  // Accept both single and double digit hours, minutes, seconds
  const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!parts) {
    throw new Error(`Invalid date format: ${dateStr}. Expected: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD H:MM:SS`);
  }

  const [, year, month, day, hours, minutes, seconds] = parts;

  const date = new Date(
    parseInt(year!),
    parseInt(month!) - 1,
    parseInt(day!),
    parseInt(hours!),
    parseInt(minutes!),
    parseInt(seconds!)
  );

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date;
}

export function convertToUTC(localDateStr: string): Date {
  const localDate = parseDateFromSheet(localDateStr);
  const utcDate = new Date(localDate.toISOString());
  return utcDate;
}

export function convertFromUTC(utcDate: Date): string {
  return formatDateForSheet(new Date(utcDate));
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function parseDateOnly(dateStr: string): Date {
  if (!dateStr) {
    throw new Error('Date string is required');
  }

  const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) {
    throw new Error(`Invalid date format: ${dateStr}. Expected: YYYY-MM-DD`);
  }

  const [, year, month, day] = parts;

  const date = new Date(
    parseInt(year!),
    parseInt(month!) - 1,
    parseInt(day!),
    0,
    0,
    0
  );

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  return date;
}
