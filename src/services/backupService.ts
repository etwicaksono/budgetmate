/**
 * Backup Service
 * 
 * Client-side service for backup/restore operations
 */

import { api, apiClient } from './api';
import type {
  BackupData,
  ImportResponse,
  ValidateResponse,
  ImportMode,
} from '@/types/backup.types';

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
      console.error('Export failed:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON backup file
   * 
   * @param file - The backup JSON file
   * @param mode - Import mode ('replace' or 'merge')
   */
  async importData(file: File, mode: ImportMode = 'replace'): Promise<ImportResponse> {
    try {
      // Read file content
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      // Validate before uploading
      const validation = await this.validateBackupFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid backup file');
      }

      // Upload to server
      // Note: api service already has baseURL='/api/v1', so we use relative path
      const response = await api.post<ImportResponse>(
        `/backup/import?mode=${mode}`,
        data
      );

      if ('data' in response && response.data) {
        return {
          success: true,
          data: response.data,
        };
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }

  /**
   * Validate backup file before import
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
      let data: BackupData;
      
      try {
        data = JSON.parse(text);
      } catch {
        return {
          valid: false,
          error: 'Invalid JSON format',
        };
      }

      // Check required fields
      if (!data.exportVersion || !data.data || !data.exportDate) {
        return {
          valid: false,
          error: 'Invalid backup file format: missing required fields',
        };
      }

      // Check version compatibility
      const compatible = this.isVersionCompatible(data.exportVersion);
      
      if (!compatible) {
        return {
          valid: false,
          error: `Backup version ${data.exportVersion} is not compatible with current version`,
        };
      }

      // Return validation success with details
      return {
        valid: true,
        data,
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
      console.error('Validation error:', error);
      return {
        valid: false,
        error: 'Failed to validate backup file',
      };
    }
  }

  /**
   * Check if backup version is compatible with current app version
   * 
   * @param backupVersion - Version from backup file (e.g., "1.0.0")
   * @returns True if compatible
   */
  isVersionCompatible(backupVersion: string): boolean {
    const currentVersion = '1.0.0'; // Current app version
    
    const [backupMajor] = backupVersion.split('.');
    const [currentMajor] = currentVersion.split('.');
    
    // Major version must match for compatibility
    return backupMajor === currentMajor;
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
