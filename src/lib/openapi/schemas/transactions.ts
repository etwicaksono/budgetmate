import { z } from 'zod';
import { TransactionType } from '@prisma/client';
import { registry } from '../registry';
import { CreateTransactionSchema, UpdateTransactionSchema } from '@/lib/validation/transaction';

export const TransactionSchema = registry.register(
  'Transaction',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    date: z.date().openapi({ example: '2023-12-01T12:00:00Z' }),
    account_id: z.string().openapi({ example: 'clqaccount123456000000000' }),
    category_id: z.string().openapi({ example: 'clqcategory12345600000000' }),
    amount: z.number().openapi({ example: -150000 }), // Negative for expense
    type: z.nativeEnum(TransactionType).openapi({ example: TransactionType.expense }),
    description: z.string().nullable().openapi({ example: 'Grocery shopping' }),
    payee: z.string().nullable().openapi({ example: 'Supermarket' }),
    payment_method: z.string().nullable().openapi({ example: 'Credit Card' }),
    payment_status: z.string().nullable().openapi({ example: 'COMPLETED' }),
    debt_id: z.string().nullable().openapi({ example: null }),
    transfer_id: z.string().nullable().optional().openapi({ example: null }),
    labels: z.array(z.object({
      id: z.string(),
      name: z.string(),
      color: z.string().optional()
    })).optional(),
    account: z.object({
      id: z.string(),
      name: z.string()
    }).optional(),
    category: z.object({
      id: z.string(),
      name: z.string(),
      type: z.string()
    }).optional(),
    created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
    updated_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
  })
);

export const BulkDeleteTransactionSchema = z.object({
  allMatching: z.boolean().optional().openapi({ example: false }),
  ids: z.array(z.string()).optional().openapi({ example: ['clq1234560000000000000000'] }),
  filters: z.record(z.unknown()).optional().openapi({ example: { type: 'expense' } })
});

const CreateTransactionRequest = registry.register('CreateTransactionRequest', CreateTransactionSchema);
const UpdateTransactionRequest = registry.register('UpdateTransactionRequest', UpdateTransactionSchema);
const BulkDeleteTransactionRequest = registry.register('BulkDeleteTransactionRequest', BulkDeleteTransactionSchema);

// GET /api/v1/transactions
registry.registerPath({
  method: 'get',
  path: '/api/v1/transactions',
  description: 'Fetch transactions with optional filtering and pagination',
  summary: 'List Transactions',
  tags: ['Transactions'],
  parameters: [
    { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, required: false },
    { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 }, required: false },
    { name: 'account_id', in: 'query', schema: { type: 'string' }, required: false },
    { name: 'category_id', in: 'query', schema: { type: 'string' }, required: false },
    { name: 'type', in: 'query', schema: { type: 'string', enum: [TransactionType.income, TransactionType.expense] }, required: false },
    { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date-time' }, required: false },
    { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date-time' }, required: false },
    { name: 'keyword', in: 'query', schema: { type: 'string' }, required: false },
    { name: 'sort_by', in: 'query', schema: { type: 'string', default: 'date' }, required: false },
    { name: 'sort_order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }, required: false },
  ],
  responses: {
    200: {
      description: 'A paginated list of transactions',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(TransactionSchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              total_pages: z.number(),
              has_next: z.boolean(),
              has_prev: z.boolean()
            })
          })
        }
      }
    }
  }
});

// POST /api/v1/transactions
registry.registerPath({
  method: 'post',
  path: '/api/v1/transactions',
  description: 'Create a new transaction',
  summary: 'Create Transaction',
  tags: ['Transactions'],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateTransactionRequest }
      }
    }
  },
  responses: {
    201: {
      description: 'Transaction created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: TransactionSchema,
            meta: z.object({ message: z.string() })
          })
        }
      }
    }
  }
});

// GET /api/v1/transactions/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/transactions/{id}',
  description: 'Fetch a single transaction',
  summary: 'Get Transaction',
  tags: ['Transactions'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Transaction details',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: TransactionSchema })
        }
      }
    }
  }
});

// PUT /api/v1/transactions/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/transactions/{id}',
  description: 'Update a transaction',
  summary: 'Update Transaction',
  tags: ['Transactions'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: {
        'application/json': { schema: UpdateTransactionRequest }
      }
    }
  },
  responses: {
    200: {
      description: 'Transaction updated successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: TransactionSchema }) }
      }
    }
  }
});

// DELETE /api/v1/transactions/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/transactions/{id}',
  description: 'Delete a transaction',
  summary: 'Delete Transaction',
  tags: ['Transactions'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Transaction deleted successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) }
      }
    }
  }
});

// DELETE /api/v1/transactions/bulk
registry.registerPath({
  method: 'delete',
  path: '/api/v1/transactions/bulk',
  description: 'Bulk delete transactions based on IDs or filter criteria',
  summary: 'Bulk Delete Transactions',
  tags: ['Transactions'],
  request: {
    body: {
      content: {
        'application/json': { schema: BulkDeleteTransactionRequest }
      }
    }
  },
  responses: {
    200: {
      description: 'Transactions deleted successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({ deletedCount: z.number() }),
            meta: z.object({ message: z.string() })
          })
        }
      }
    }
  }
});
