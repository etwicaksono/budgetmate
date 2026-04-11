import { z } from 'zod';
import { registry } from '../registry';
import { getCurrencyCodes } from '@/config/currencies';

const cuidRegex = /^[a-z][a-z0-9]{8,}$/;
const VALID_CURRENCIES = getCurrencyCodes();

export const AccountSchema = registry.register(
  'Account',
  z.object({
      id: z.string().openapi({ example: 'clq1234560000000000000000' }),
      name: z.string().openapi({ example: 'Main Checking' }),
      account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']).openapi({ example: 'checking' }),
      icon: z.string().openapi({ example: 'wallet' }),
      color: z.string().openapi({ example: '#4F46E5' }),
      currency: z.string().openapi({ example: 'USD' }),
      initial_balance: z.number().openapi({ example: 1000 }),
      current_balance: z.number().optional().openapi({ example: 1500 }),
      credit_limit: z.number().nullable().openapi({ example: null }),
      interest_rate: z.number().nullable().openapi({ example: null }),
      is_active: z.boolean().openapi({ example: true }),
      is_included_in_total: z.boolean().openapi({ example: true }),
      order: z.number().openapi({ example: 0 }),
      created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
      updated_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' }),
  })
);

export const CreateAccountSchema = registry.register(
  'CreateAccountRequest',
  z.object({
    name: z.string().min(1).max(100).openapi({ example: 'Main Checking' }),
    account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']).openapi({ example: 'checking' }),
    icon: z.string().openapi({ example: 'wallet' }),
    color: z.string().regex(/^#[0-9A-F]{6}$/i).openapi({ example: '#4F46E5' }),
    currency: z.string().default('USD').refine(
      (code) => VALID_CURRENCIES.includes(code),
      { message: 'Invalid currency code' }
    ).openapi({ example: 'USD', description: 'ISO 4217 Currency Code' }),
    initial_balance: z.number().default(0).openapi({ example: 1000 }),
    credit_limit: z.number().optional().openapi({ example: 0 }),
    interest_rate: z.number().optional().openapi({ example: 0 }),
    group_id: z.string().regex(cuidRegex, 'Invalid group ID').optional().openapi({ example: 'clqsomething' }),
    is_active: z.boolean().default(true).openapi({ example: true }),
    is_included_in_total: z.boolean().default(true).openapi({ example: true })
  })
);

// Register the GET endpoint
registry.registerPath({
  method: 'get',
  path: '/api/v1/accounts',
  description: 'Fetch all accounts for the authenticated user.',
  summary: 'List Accounts',
  tags: ['Accounts'],
  parameters: [
    { name: 'is_active', in: 'query', schema: { type: 'boolean' }, required: false, description: 'Filter by active status' },
    { name: 'group_id', in: 'query', schema: { type: 'string' }, required: false, description: 'Filter by account group ID' },
    { name: 'include_balance', in: 'query', schema: { type: 'boolean' }, required: false, description: 'Calculate and include current balances' },
  ],
  responses: {
    200: {
      description: 'A list of accounts',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.array(AccountSchema),
            meta: z.object({
              total: z.number().openapi({ example: 1 }),
              total_balance: z.number().optional().openapi({ example: 1500 })
            }).optional()
          }),
        },
      },
    },
  },
});

// Register the POST endpoint
registry.registerPath({
  method: 'post',
  path: '/api/v1/accounts',
  description: 'Create a new financial account.',
  summary: 'Create Account',
  tags: ['Accounts'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAccountSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Account created successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: AccountSchema,
            meta: z.object({ message: z.string().openapi({ example: 'Account created successfully' }) }).optional()
          }),
        },
      },
    },
    400: {
      description: 'Validation Error',
    }
  },
});
