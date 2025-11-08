import { z } from 'zod';

/**
 * Date range filter for transactions, transfers, etc.
 */
export const DateRangeSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
});

/**
 * Amount range filter for financial records
 */
export const AmountRangeSchema = z.object({
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
});
