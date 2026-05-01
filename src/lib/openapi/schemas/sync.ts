import { z } from 'zod';
import { registry } from '../registry';

export const SyncPushRequestSchema = registry.register(
  'SyncPushRequest',
  z.object({
    spreadsheetId: z.string().optional().openapi({ example: '1BxiMVs0XRYFgCE9YxI...' }),
    spreadsheetName: z.string().optional().openapi({ example: 'My Finances Backup' }),
    mode: z.enum(['replace', 'merge']).default('replace').openapi({ example: 'replace' })
  })
);

export const SyncPullRequestSchema = registry.register(
  'SyncPullRequest',
  z.object({
    spreadsheetId: z.string().openapi({ example: '1BxiMVs0XRYFgCE9YxI...' }),
    mode: z.enum(['replace', 'merge']).default('merge').openapi({ example: 'merge' })
  })
);

// GET /api/v1/sync/status
registry.registerPath({
  method: 'get',
  path: '/api/v1/sync/status',
  description: 'Retrieve Google Drive sync status and connected spreadsheet details',
  summary: 'Get Sync Status',
  tags: ['Sync'],
  responses: {
    200: {
      description: 'Sync status data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/sync/history
registry.registerPath({
  method: 'get',
  path: '/api/v1/sync/history',
  description: 'Retrieve history of sync operations',
  summary: 'Get Sync History',
  tags: ['Sync'],
  responses: {
    200: {
      description: 'Sync history data',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// POST /api/v1/sync/push
registry.registerPath({
  method: 'post',
  path: '/api/v1/sync/push',
  description: 'Push data from database to Google Sheets',
  summary: 'Push Data to Sheets',
  tags: ['Sync'],
  request: {
    body: {
      content: { 'application/json': { schema: SyncPushRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Push successful',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// POST /api/v1/sync/pull
registry.registerPath({
  method: 'post',
  path: '/api/v1/sync/pull',
  description: 'Pull data from Google Sheets into the database',
  summary: 'Pull Data from Sheets',
  tags: ['Sync'],
  request: {
    body: {
      content: { 'application/json': { schema: SyncPullRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Pull successful',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/sync/connect
registry.registerPath({
  method: 'get',
  path: '/api/v1/sync/connect',
  description: 'Initiate OAuth2 connection to Google Drive',
  summary: 'Connect to Google Drive',
  tags: ['Sync'],
  responses: {
    200: {
      description: 'Connection URL returned',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// POST /api/v1/sync/disconnect
registry.registerPath({
  method: 'post',
  path: '/api/v1/sync/disconnect',
  description: 'Disconnect from Google Drive',
  summary: 'Disconnect Sync',
  tags: ['Sync'],
  responses: {
    200: {
      description: 'Disconnected successfully',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// GET /api/v1/sync/callback
registry.registerPath({
  method: 'get',
  path: '/api/v1/sync/callback',
  description: 'OAuth2 callback endpoint for Google Drive connection',
  summary: 'Google OAuth2 Callback',
  tags: ['Sync'],
  responses: {
    200: {
      description: 'OAuth2 redirect',
    }
  }
});
