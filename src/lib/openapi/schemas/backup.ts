import { z } from 'zod';
import { registry } from '../registry';
import { ImportRequestSchema as NativeImportRequestSchema } from '@/lib/validation/backupSchemas';

const ImportRequestSchema = registry.register('ImportRequest', NativeImportRequestSchema);

// GET /api/v1/backup/export
registry.registerPath({
  method: 'get',
  path: '/api/v1/backup/export',
  description: 'Export all user data as a consolidated JSON backup',
  summary: 'Export Data',
  tags: ['Backup'],
  responses: {
    200: {
      description: 'Backup JSON generated successfully',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});

// POST /api/v1/backup/import
registry.registerPath({
  method: 'post',
  path: '/api/v1/backup/import',
  description: 'Import previously exported data from JSON payload',
  summary: 'Import Data',
  tags: ['Backup'],
  request: {
    body: {
      content: { 'application/json': { schema: ImportRequestSchema } }
    }
  },
  responses: {
    200: {
      description: 'Data imported successfully',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.unknown() }) } }
    }
  }
});
