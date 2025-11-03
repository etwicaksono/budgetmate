/**
 * Date formatting utilities for the Finance Web Application
 * Handles conversion between frontend datetime-local format and backend RFC3339 format
 */

/**
 * Convert a datetime-local input value to RFC3339 format for Go backend
 * @param dateValue - The date value from datetime-local input (YYYY-MM-DDTHH:mm) or Date object
 * @returns RFC3339 formatted date string with seconds and timezone
 */
export function formatDateForBackend(dateValue: string | Date | undefined | null): string {
  if (!dateValue) {
    // Return current date if no value provided
    return new Date().toISOString();
  }

  try {
    let date: Date;
    
    if (typeof dateValue === 'string') {
      // Handle datetime-local format (YYYY-MM-DDTHH:mm)
      // This format doesn't have seconds or timezone, so we need to add them
      
      // Check if it's datetime-local format without seconds (16 chars: YYYY-MM-DDTHH:mm)
      if (dateValue.length === 16 && dateValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Add seconds for proper parsing
        dateValue = `${dateValue}:00`;
      }
      
      // Create date object - JavaScript will interpret as local time
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      // Fallback to current date for invalid input
      return new Date().toISOString();
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value:', dateValue);
      return new Date().toISOString();
    }

    // toISOString() returns format: YYYY-MM-DDTHH:mm:ss.sssZ
    // This is RFC3339 compliant and what Go expects
    return date.toISOString();
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateValue);
    return new Date().toISOString();
  }
}

/**
 * Convert RFC3339 date from backend to datetime-local format for input fields
 * @param rfc3339Date - RFC3339 formatted date string from backend
 * @returns datetime-local formatted string (YYYY-MM-DDTHH:mm)
 */
export function formatDateForInput(rfc3339Date: string | Date | undefined | null): string {
  if (!rfc3339Date) {
    // Return current date/time in local format
    return formatDateToLocal(new Date());
  }

  try {
    const date = typeof rfc3339Date === 'string' ? new Date(rfc3339Date) : rfc3339Date;
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid date value for input:', rfc3339Date);
      return formatDateToLocal(new Date());
    }

    return formatDateToLocal(date);
  } catch (error) {
    console.error('Error formatting date for input:', error, 'Input:', rfc3339Date);
    return formatDateToLocal(new Date());
  }
}

/**
 * Format a Date object to datetime-local input format
 * @param date - Date object to format
 * @returns datetime-local formatted string (YYYY-MM-DDTHH:mm)
 */
function formatDateToLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Get the current date/time in datetime-local format
 * @returns Current date/time as datetime-local string
 */
export function getCurrentDateTimeLocal(): string {
  return formatDateToLocal(new Date());
}

/**
 * Get the current date/time in RFC3339 format for backend
 * @returns Current date/time as RFC3339 string
 */
export function getCurrentDateTimeRFC3339(): string {
  return new Date().toISOString();
}
