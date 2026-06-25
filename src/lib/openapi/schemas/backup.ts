import { z } from 'zod';
import { registry } from '../registry';
import { BackupDataSchema } from '@/lib/validation/backupSchemas';

const ExportBackupSchema = registry.register('BackupData', BackupDataSchema);

// GET /api/v1/backup/export
registry.registerPath({
  method: 'get',
  path: '/api/v1/backup/export',
  description: 'Export all user data as a consolidated JSON backup file (Content-Disposition: attachment)',
  summary: 'Export Data',
  tags: ['Backup'],
  responses: {
    200: {
      description: 'Backup JSON file download. Returns the raw backup payload, not a { success, data } wrapper.',
      content: { 'application/json': { schema: ExportBackupSchema } }
    }
  }
});

// POST /api/v1/backup/import
registry.registerPath({
  method: 'post',
  path: '/api/v1/backup/import',
  description: 'Import previously exported data from JSON payload. Query param: mode=replace|merge',
  summary: 'Import Data',
  tags: ['Backup'],
  request: {
    body: {
      content: { 'application/json': { schema: ExportBackupSchema } }
    }
  },
  responses: {
    200: {
      description: 'Data imported successfully',
      content: { 'application/json': { schema: z.object({ success: z.boolean(), data: z.object({ message: z.string(), imported: z.unknown() }) }) } }
    }
  }
});
