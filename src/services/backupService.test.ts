/**
 * BackupService Unit Tests
 *
 * NOTE: These tests require the following dev dependencies to be installed:
 *   npm i -D jest ts-jest @types/jest jest-environment-jsdom
 *
 * And a jest.config.ts:
 *   import type { Config } from 'jest';
 *   const config: Config = {
 *     preset: 'ts-jest',
 *     testEnvironment: 'jsdom',
 *     moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
 *   };
 *   export default config;
 *
 * Once dependencies are installed, run: npm test -- --testPathPattern=backupService
 */

// Placeholder — uncomment and adapt after installing test dependencies

/*
import { backupService } from './backupService';
import { api, apiClient } from './api';
import { BackupDataSchema } from '@/lib/validation/backupSchemas';

jest.mock('./api');

const validBackupData = {
  exportVersion: '1.0.0',
  exportDate: new Date().toISOString(),
  appVersion: '1.0.0',
  user: {
    email: 'test@example.com',
    settings: {
      timezone: 'Asia/Jakarta',
      locale: 'en-US',
      date_format: 'yyyy-MM-dd',
      number_format: 'en-US',
    },
  },
  data: {
    accounts: [],
    categories: [],
    transactions: [],
    transfers: [],
    labels: [],
    transactionLabels: [],
  },
  metadata: {
    totalRecords: 0,
    recordCounts: {
      accounts: 0,
      categories: 0,
      transactions: 0,
      transfers: 0,
      labels: 0,
      transactionLabels: 0,
    },
    checksum: '',
    exportedAt: new Date().toISOString(),
  },
};

describe('BackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportData()', () => {
    it('should call apiClient.get with blob responseType', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        headers: { 'content-disposition': 'attachment; filename="test.json"' },
        data: new Blob(['{}'], { type: 'application/json' }),
      });

      // Mock DOM APIs
      global.URL.createObjectURL = jest.fn(() => 'blob:url');
      global.URL.revokeObjectURL = jest.fn();

      await backupService.exportData();

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/backup/export?timestamp='),
        { responseType: 'blob' }
      );
    });
  });

  describe('validateBackupFile()', () => {
    it('should accept a valid backup file', async () => {
      const file = new File([JSON.stringify(validBackupData)], 'backup.json', { type: 'application/json' });
      const result = await backupService.validateBackupFile(file);

      expect(result.valid).toBe(true);
      expect(result.details).toBeDefined();
      expect(result.details!.user.email).toBe('test@example.com');
    });

    it('should reject wrong file extension', async () => {
      const file = new File([JSON.stringify(validBackupData)], 'backup.txt', { type: 'text/plain' });
      const result = await backupService.validateBackupFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JSON');
    });

    it('should reject malformed JSON', async () => {
      const file = new File(['not json', 'invalid'], 'backup.json', { type: 'application/json' });
      const result = await backupService.validateBackupFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should reject missing required fields', async () => {
      const badData = { foo: 'bar' };
      const file = new File([JSON.stringify(badData)], 'backup.json', { type: 'application/json' });
      const result = await backupService.validateBackupFile(file);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid backup file');
    });
  });

  describe('importData()', () => {
    it('should call api.post with parsed backup data as body', async () => {
      const mockResponse = { data: { success: true, data: { message: 'ok', imported: {} } } };
      (api.post as jest.Mock).mockResolvedValue(mockResponse);

      await backupService.importData(validBackupData as any, 'replace');

      expect(api.post).toHaveBeenCalledWith(
        '/backup/import?mode=replace',
        validBackupData
      );
    });
  });
});
*/
