import { z } from 'zod';
import { registry } from '../registry';
import { CreateTransferSchema, UpdateTransferSchema } from '@/lib/validation/transfer';

export const TransferSchema = registry.register(
  'Transfer',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    from_account: z.string().openapi({ example: 'clqaccount1' }),
    to_account: z.string().openapi({ example: 'clqaccount2' }),
    amount: z.number().openapi({ example: 500000 }),
    to_amount: z.number().nullable().optional().openapi({ example: null }),
    description: z.string().nullable().openapi({ example: 'Moving funds to savings' }),
    currency: z.string().openapi({ example: 'IDR' }),
    to_currency: z.string().nullable().optional().openapi({ example: null }),
    created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
    updated_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
  })
);

const CreateTransferRequest = registry.register('CreateTransferRequest', CreateTransferSchema);
const UpdateTransferRequest = registry.register('UpdateTransferRequest', UpdateTransferSchema);

// POST /api/v1/transfers
registry.registerPath({
  method: 'post',
  path: '/api/v1/transfers',
  description: 'Create a new transfer between accounts',
  summary: 'Create Transfer',
  tags: ['Transfers'],
  request: {
    body: {
      content: {
        'application/json': { schema: CreateTransferRequest }
      }
    }
  },
  responses: {
    201: {
      description: 'Transfer created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              transfer: TransferSchema,
              transaction_out: z.unknown().openapi({ description: 'The expense transaction ID' }),
              transaction_in: z.unknown().openapi({ description: 'The income transaction ID' })
            }),
            meta: z.object({ message: z.string() })
          })
        }
      }
    }
  }
});

// GET /api/v1/transfers/{id}
registry.registerPath({
  method: 'get',
  path: '/api/v1/transfers/{id}',
  description: 'Fetch a single transfer record',
  summary: 'Get Transfer',
  tags: ['Transfers'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Transfer details',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean(), data: TransferSchema })
        }
      }
    }
  }
});

// PUT /api/v1/transfers/{id}
registry.registerPath({
  method: 'put',
  path: '/api/v1/transfers/{id}',
  description: 'Update a transfer',
  summary: 'Update Transfer',
  tags: ['Transfers'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  request: {
    body: {
      content: { 'application/json': { schema: UpdateTransferRequest } }
    }
  },
  responses: {
    200: {
      description: 'Transfer updated successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: TransferSchema }) }
      }
    }
  }
});

// DELETE /api/v1/transfers/{id}
registry.registerPath({
  method: 'delete',
  path: '/api/v1/transfers/{id}',
  description: 'Delete a transfer and its associated transactions',
  summary: 'Delete Transfer',
  tags: ['Transfers'],
  parameters: [
    { name: 'id', in: 'path', schema: { type: 'string' }, required: true }
  ],
  responses: {
    200: {
      description: 'Transfer deleted successfully',
      content: {
        'application/json': { schema: z.object({ success: z.boolean(), data: z.null() }) }
      }
    }
  }
});
