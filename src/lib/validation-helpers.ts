import { z } from 'zod';

/**
 * Date must be in the past
 */
export const pastDate = () =>
  z.date().refine(
    (date) => date <= new Date(),
    'Date cannot be in the future'
  );

/**
 * Date must be in the future
 */
export const futureDate = () =>
  z.date().refine(
    (date) => date >= new Date(),
    'Date cannot be in the past'
  );

/**
 * Hex color code (#RRGGBB)
 */
export const hexColor = () =>
  z.string().regex(
    /^#[0-9A-Fa-f]{6}$/,
    'Must be a valid hex color (#RRGGBB)'
  );

/**
 * Date range validation (end >= start)
 */
export const dateRange = () =>
  z.object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  }).refine(
    (data) => data.end_date >= data.start_date,
    {
      message: 'End date must be after or equal to start date',
      path: ['end_date'],
    }
  );

/**
 * Amount range validation (max >= min)
 */
export const amountRange = () =>
  z.object({
    min_amount: z.number(),
    max_amount: z.number(),
  }).refine(
    (data) => data.max_amount >= data.min_amount,
    {
      message: 'Maximum amount must be greater than or equal to minimum',
      path: ['max_amount'],
    }
  );
