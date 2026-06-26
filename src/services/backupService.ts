/**
 * Backup Service
 * 
 * Client-side service for backup/restore operations
 */

import { apiClient } from './api';
import { tokenCrypto } from '@/utils/crypto';
import { APP_CONFIG } from '@/utils/constants';
import type {
  BackupData,
  ImportResponse,
  ValidateResponse,
  ImportMode,
} from '@/types/backup.types';
import { BackupDataSchema, isVersionCompatible } from '@/lib/validation/backupSchemas';
import { logError } from '@/lib/logger';

class BackupService {
  /**
   * Generate local timestamp in format YYYY-MM-DD_HHMMSS
   */
  private getLocalTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
  }

  /**
   * Export all user data as JSON file
   * Downloads the file automatically to user's device
   */
  async exportData(): Promise<void> {
    try {
      // Generate local timestamp to send to server
      const timestamp = this.getLocalTimestamp();
      
      // Use apiClient which has auth interceptors for automatic token refresh
      // Note: apiClient already has baseURL='/api/v1', so we use relative path
      // Send timestamp as query parameter so server uses client's local time in filename
      const response = await apiClient.get(`/backup/export?timestamp=${timestamp}`, {
        responseType: 'blob',
      });

      // Get filename from Content-Disposition header or use local timestamp as fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = `finance-backup-${timestamp}.json`;
      
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Create blob from response data
      const blob = new Blob([response.data], { type: 'application/json' });
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logError('Export failed:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON backup file or pre-parsed backup data
   *
   * Uses SSE (Server-Sent Events) to receive realtime progress updates.
   * The server streams progress events as it processes data in chunks.
   *
   * @param fileOrData - The backup JSON file or pre-parsed BackupData object
   * @param mode - Import mode ('replace' or 'merge')
   * @param onProgress - Optional callback for progress updates
   */
  async importData(
    fileOrData: File | BackupData,
    mode: ImportMode = 'replace',
    onProgress?: (progress: number, step: string) => void
  ): Promise<ImportResponse> {
    try {
      // If a File is passed, read and parse it
      let data: BackupData;

      if (fileOrData instanceof File) {
        const text = await fileOrData.text();
        data = JSON.parse(text) as BackupData;
      } else {
        // Already parsed data — use directly (avoids double file read)
        data = fileOrData;
      }

      // Get auth token (same mechanism as apiClient interceptor)
      const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
      let authHeader = '';

      if (encryptedToken) {
        const token = await tokenCrypto.decryptToken(encryptedToken);
        if (token) {
          authHeader = `Bearer ${token}`;
        }
      }

      // Use fetch() to support SSE streaming response
      const response = await fetch(`${APP_CONFIG.api.baseUrl}/backup/import?mode=${mode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify(data),
      });

      // Check for non-streaming error responses (validation, auth, etc.)
      if (!response.ok && response.headers.get('content-type') !== 'text/event-stream') {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error?.message || errorBody?.error || 'Import failed';
        logError('[Backup Import] Server returned error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody,
          message,
        });
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error('No response stream received');
      }

      // Parse SSE events from the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let result: ImportResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Skip heartbeat comments and empty lines
          if (!line.startsWith('data: ')) continue;

          let event: {
            error?: boolean;
            message?: string;
            progress?: number;
            step?: string;
            done?: boolean;
            result?: NonNullable<ImportResponse['data']>['imported'];
            warning?: string;
          };
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            // Skip malformed JSON lines
            continue;
          }

          if (event.error) {
            logError('[Backup Import] SSE error event:', {
              message: event.message,
              step: event.step,
              progress: event.progress,
              warning: event.warning,
            });
            throw new Error(event.message || 'Import failed');
          }

          if (event.progress !== undefined && onProgress) {
            onProgress(event.progress, event.step || '');
          }

          if (event.done) {
            result = {
              success: true,
              data: {
                message: 'Import successful',
                imported: event.result!,
                ...(event.warning ? { warning: event.warning } : {}),
              },
            };
          }
        }
      }

      if (!result) {
        throw new Error('Import completed but no result received');
      }

      return result;
    } catch (error) {
      logError('Import failed:', error);
      throw error;
    }
  }

  /**
   * Validate backup file before import
   * 
   * Uses the Zod BackupDataSchema for structural validation, replacing
   * the previous manual field-by-field checks. Only file-level checks
   * (size, extension, JSON parse) are done outside the Zod schema.
   * 
   * @param file - The backup JSON file to validate
   * @returns Validation result with file details
   */
  async validateBackupFile(file: File): Promise<ValidateResponse> {
    try {
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (10MB)`,
        };
      }

      // Check file extension
      if (!file.name.endsWith('.json')) {
        return {
          valid: false,
          error: 'File must be a JSON file (.json extension)',
        };
      }

      // Try to parse JSON
      const text = await file.text();
      let parsed: unknown;
      
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          valid: false,
          error: 'Invalid JSON format',
        };
      }

      // Validate using Zod schema (replaces manual field-by-field checks)
      const result = BackupDataSchema.safeParse(parsed);

      if (!result.success) {
        const firstError = result.error.errors[0];
        const errorMsg = firstError
          ? `${firstError.path.join('.')}: ${firstError.message}`
          : 'Invalid backup file format';
        return {
          valid: false,
          error: `Invalid backup file: ${errorMsg}`,
        };
      }

      const data = result.data;

      // Check version compatibility
      if (!isVersionCompatible(data.exportVersion)) {
        return {
          valid: false,
          error: `Backup version ${data.exportVersion} is not compatible with current version`,
        };
      }

      // Return validation success with details
      return {
        valid: true,
        data: data as BackupData,
        details: {
          fileName: file.name,
          fileSize: this.formatFileSize(file.size),
          exportDate: data.exportDate,
          totalRecords: data.metadata.totalRecords,
          user: {
            email: data.user.email,
          },
          version: data.exportVersion,
          compatible: true,
        },
      };
    } catch (error) {
      logError('Validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate backup file',
      };
    }
  }

  /**
   * Format file size in human-readable format
   * 
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., "2.5 MB")
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Get estimated import time based on file size
   * 
   * @param fileSize - File size in bytes
   * @returns Estimated time in seconds
   */
  getEstimatedImportTime(fileSize: number): number {
    // Rough estimate: 1MB = 2 seconds
    const mb = fileSize / (1024 * 1024);
    return Math.ceil(mb * 2);
  }
}

// Export singleton instance
export const backupService = new BackupService();
