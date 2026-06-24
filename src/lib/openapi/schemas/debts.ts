import { z } from 'zod';
import { registry } from '../registry';
import { CreateDebtSchema, UpdateDebtSchema, CreateRepaymentSchema } from '@/lib/validation/debt';

export const DebtSchema = registry.register(
  'Debt',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    type: z.enum(['lend', 'borrow']).openapi({ example: 'borrow' }),
    counterparty: z.string().openapi({ example: 'John Doe' }),
    description: z.string().nullable().openapi({ example: 'Loan for car repair' }),
    account_id: z.string().openapi({ example: 'clqaccount123456000000000' }),
    category_id: z.string().nullable().openapi({ example: null }),
    date: z.date().openapi({ example: '2023-12-01T12:00:00Z' }),
    due_date: z.date().nullable().openapi({ example: '2024-12-01T12:00:00Z' }),
    expected_amount: z.number().openapi({ example: 100000 }),
    remaining_amount: z.number().openapi({ example: 50000 }),
    settled_amount: z.number().openapi({ example: 50000 }),
    status: z.enum(['active', 'settled', 'cancelled']).openapi({ example: 'active' }),
    initial_transaction_id: z.string().nullable().openapi({ example: 'clqtx1234' }),
    created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
    updated_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' })
  })
);

const CreateDebtRequest = registry.register('CreateDebtRequest', CreateDebtSchema);
const UpdateDebtRequest = registry.register('UpdateDebtRequest', UpdateDebtSchema);
const CreateRepaymentRequest = registry.register('CreateRepaymentRequest', CreateRepaymentSchema);

// GET /api/v1/debts
registry.registerPath({
  method: 'get',
  path: '/api/v1/debts',
  description: 'Fetch all active and settled debts for the user',
  summary: 'List Debts',
  tags: ['Debts'],
  responses: {
    200: {
      description: 'A list of debts',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.array(DebtSchema)
          })
        }
      }
    }
  }
});

// POST /api/v1/debts
registry.registerPath({
  method: 'post',
  path: '/api/v1/debts',
  description: 'Record a new borrowing or lending transaction',
  summary: 'Create Debt',
  tags: ['Debts'],
  request: {
    body: {
      content: { 'application/json': { schema: CreateDebtRequest } }
    }
  },
  responses: {
    201: {
      description: 'Debt created',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: DebtSchema })
        }
      }
    }
  }
});

// GET /api/v1/debts/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/debts/{id}',
  description: 'Get debt details and complete transaction history',
  summary: 'Get Debt',
  tags: ['Debts'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Debt details with transactions',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: DebtSchema.extend({
              transactions: z.array(z.unknown())
            })
          })
        }
      }
    }
  }
});

// PUT /api/v1/debts/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/debts/{id}',
  description: 'Update root debt metadata',
  summary: 'Update Debt',
  tags: ['Debts'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateDebtRequest } }
    }
  },
  responses: {
    200: {
      description: 'Debt updated successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: DebtSchema }) }
      }
    }
  }
});

// DELETE /api/v1/debts/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/debts/{id}',
  description: 'Delete a debt and cleanly reverse all associated financial transactions',
  summary: 'Delete Debt',
  tags: ['Debts'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Debt and related transactions deleted',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) }
      }
    }
  }
});

// POST /api/v1/debts/{id}/increase
registry.registerPath({
  method: 'post',
  path: '/api/v1/debts/{id}/increase',
  description: 'Increase the principal amount of an existing debt (borrow more / lend more)',
  summary: 'Increase Debt',
  tags: ['Debts'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: { 'application/json': { schema: CreateRepaymentRequest } }
    }
  },
  responses: {
    201: {
      description: 'Debt increased successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) }
      }
    }
  }
});

// POST /api/v1/debts/{id}/repayments
registry.registerPath({
  method: 'post',
  path: '/api/v1/debts/{id}/repayments',
  description: 'Log a repayment for an active debt (pay back / receive payment)',
  summary: 'Record Repayment',
  tags: ['Debts'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: { 'application/json': { schema: CreateRepaymentRequest } }
    }
  },
  responses: {
    201: {
      description: 'Repayment recorded successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) }
      }
    }
  }
});
