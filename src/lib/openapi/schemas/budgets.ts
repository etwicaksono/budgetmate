import { z } from 'zod';
import { registry } from '../registry';

export const BudgetStatusSchema = registry.register(
  'BudgetStatus',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    category: z.string().openapi({ example: 'Groceries' }),
    spent: z.number().openapi({ example: 450000 }),
    total: z.number().openapi({ example: 500000 }),
    percentage: z.number().openapi({ example: 90.0 }),
    status: z.enum(['success', 'warning', 'danger']).openapi({ example: 'warning' }),
  })
);

// GET /api/v1/budgets/status
registry.registerPath({
  method: 'get',
  path: '/api/v1/budgets/status',
  description: 'Fetch the status of spending towards active budgets',
  summary: 'Budget Status',
  tags: ['Budgets'],
  parameters: [
    { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date-time' }, required: false },
    { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date-time' }, required: false },
    { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 }, required: false },
  ],
  responses: {
    200: {
      description: 'Budget statuses mapped against categories',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(BudgetStatusSchema)
          })
        }
      }
    }
  }
});
