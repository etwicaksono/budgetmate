import { z } from 'zod';
import { registry } from '../registry';

// Generic Analytics Query Parameters
const AnalyticsQueryParams = [
  { name: 'start_date', in: 'query', schema: { type: 'string', format: 'date-time' }, required: false },
  { name: 'end_date', in: 'query', schema: { type: 'string', format: 'date-time' }, required: false },
  { name: 'category_ids', in: 'query', schema: { type: 'string' }, required: false },
  { name: 'account_ids', in: 'query', schema: { type: 'string' }, required: false },
  { name: 'currencies', in: 'query', schema: { type: 'string' }, required: false },
  { name: 'search', in: 'query', schema: { type: 'string' }, required: false },
  { name: 'min_amount', in: 'query', schema: { type: 'number' }, required: false },
  { name: 'max_amount', in: 'query', schema: { type: 'number' }, required: false },
] as const;

// GET /api/v1/analytics/cashflow
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/cashflow',
  description: 'Get cashflow analytics including daily breakdown and historical comparisons',
  summary: 'Get Cashflow Analytics',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Cashflow Data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/analytics/expenses-by-category
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/expenses-by-category',
  description: 'Get expenses broken down by category, supporting parent-child category rollups',
  summary: 'Expenses by Category',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Category expenses data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/analytics/income-vs-expenses
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/income-vs-expenses',
  description: 'Get summary of income vs expenses',
  summary: 'Income vs Expenses',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Income vs expenses data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/analytics/income-expense-report
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/income-expense-report',
  description: 'Detailed report of income and expenses',
  summary: 'Income and Expense Report',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Detailed report data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/analytics/balance-trend
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/balance-trend',
  description: 'Trend of net balance over time',
  summary: 'Balance Trend',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Balance trend data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/analytics/trends
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/trends',
  description: 'General account trends',
  summary: 'Trends',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Trends data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/analytics/advanced-charts
registry.registerPath({
  method: 'get',
  path: '/api/v1/analytics/advanced-charts',
  description: 'Data for advanced charts',
  summary: 'Advanced Charts',
  tags: ['Analytics'],
  parameters: [...AnalyticsQueryParams],
  responses: {
    200: {
      description: 'Advanced chart data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});
