# 11. Data Export/Import Feature Implementation

## Overview
Complete backup and restore functionality allowing users to export their data as JSON and restore it later, protecting against data loss.

---

## 📦 Database Schema Extension

### Step 1: Add Backup History Table (Optional)

```prisma
// Add to schema.prisma
model BackupHistory {
  id              String   @id @default(cuid())
  user_id         String
  backup_date     DateTime @default(now())
  file_size       Int?
  record_count    Json?    // {"transactions": 150, "accounts": 3, ...}
  restore_date    DateTime?
  status          String   // 'exported', 'restored'
  
  user            User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, backup_date])
}
```

---

## 🔒 API Implementation

### Export Endpoint: `/app/api/v1/backup/export/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }

    // Fetch ALL user data with relations
    const userData = await prisma.$transaction(async (tx) => {
      const [
        accounts,
        categories,
        transactions,
        transfers,
        labels,
        transactionLabels,
      ] = await Promise.all([
        // Accounts
        tx.account.findMany({
          where: { user_id: user.id },
          orderBy: { personal_id: 'asc' },
        }),
        
        // Categories with hierarchy
        tx.category.findMany({
          where: { user_id: user.id },
          orderBy: { personal_id: 'asc' },
        }),
        
        // Transactions
        tx.transaction.findMany({
          where: { user_id: user.id },
          orderBy: { personal_id: 'asc' },
        }),
        
        // Transfers
        tx.transfer.findMany({
          where: { user_id: user.id },
          orderBy: { date: 'desc' },
        }),
        
        // Labels
        tx.label.findMany({
          where: { user_id: user.id },
          orderBy: { personal_id: 'asc' },
        }),
        
        // Transaction-Label relations
        tx.transactionLabel.findMany({
          where: { 
            transaction: { 
              user_id: user.id 
            } 
          },
        }),
      ]);

      // Record backup history (optional)
      await tx.backupHistory.create({
        data: {
          user_id: user.id,
          status: 'exported',
          record_count: {
            accounts: accounts.length,
            categories: categories.length,
            transactions: transactions.length,
            transfers: transfers.length,
            labels: labels.length,
          },
        },
      });

      return {
        accounts,
        categories,
        transactions,
        transfers,
        labels,
        transactionLabels,
      };
    });

    // Convert BigInt and Decimal to JSON-safe formats
    const sanitizedData = {
      exportVersion: '1.0.0',
      exportDate: new Date().toISOString(),
      user: {
        email: user.email,
        name: user.name,
      },
      data: {
        accounts: userData.accounts.map(acc => ({
          ...acc,
          personal_id: Number(acc.personal_id),
          current_balance: acc.current_balance.toNumber(),
          initial_balance: acc.initial_balance.toNumber(),
        })),
        categories: userData.categories.map(cat => ({
          ...cat,
          personal_id: Number(cat.personal_id),
        })),
        transactions: userData.transactions.map(tx => ({
          ...tx,
          personal_id: Number(tx.personal_id),
          amount: tx.amount.toNumber(),
        })),
        transfers: userData.transfers.map(tr => ({
          ...tr,
          amount: tr.amount.toNumber(),
          to_amount: tr.to_amount?.toNumber() || null,
          exchange_rate: tr.exchange_rate?.toNumber() || null,
        })),
        labels: userData.labels.map(label => ({
          ...label,
          personal_id: Number(label.personal_id),
        })),
        transactionLabels: userData.transactionLabels,
      },
      metadata: {
        totalRecords: 
          userData.accounts.length + 
          userData.categories.length + 
          userData.transactions.length + 
          userData.transfers.length + 
          userData.labels.length,
        checksum: generateChecksum(userData), // Optional: Add data integrity check
      },
    };

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set(
      'Content-Disposition',
      `attachment; filename="finance-backup-${new Date().toISOString().split('T')[0]}.json"`
    );

    return new NextResponse(JSON.stringify(sanitizedData, null, 2), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Export error:', error);
    return apiResponse.error('Failed to export data', 500);
  }
}

// Optional: Generate checksum for data integrity
function generateChecksum(data: any): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex').substring(0, 16);
}
```

### Import/Restore Endpoint: `/app/api/v1/backup/import/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';
import { z } from 'zod';

// Validation schema for imported data
const importSchema = z.object({
  exportVersion: z.string(),
  exportDate: z.string(),
  data: z.object({
    accounts: z.array(z.object({
      name: z.string(),
      type: z.string(),
      currency: z.string(),
      current_balance: z.number(),
      initial_balance: z.number(),
      is_active: z.boolean(),
      icon: z.string().optional(),
      color: z.string().optional(),
      description: z.string().optional(),
      // Note: We'll regenerate personal_id
    })),
    categories: z.array(z.object({
      name: z.string(),
      type: z.enum(['income', 'expense']),
      color: z.string(),
      icon: z.string().optional(),
      description: z.string().optional(),
      nature: z.enum(['WANT', 'NEED', 'MUST']).optional(),
      // Store original parent_id for hierarchy rebuild
      parent_id: z.string().optional(),
    })),
    transactions: z.array(z.object({
      date: z.string(),
      amount: z.number(),
      type: z.enum(['income', 'expense', 'transfer_in', 'transfer_out']),
      payee: z.string().optional(),
      description: z.string().optional(),
      // Store original IDs for relationship mapping
      original_account_id: z.string().optional(),
      original_category_id: z.string().optional(),
    })),
    // ... other entities
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }

    // Parse and validate imported data
    const body = await request.json();
    const validatedData = importSchema.parse(body);

    // Check if user wants to merge or replace
    const mode = request.nextUrl.searchParams.get('mode') || 'replace';
    
    const result = await prisma.$transaction(async (tx) => {
      // ID mapping tables for relationships
      const accountIdMap = new Map<string, string>();
      const categoryIdMap = new Map<string, string>();
      const labelIdMap = new Map<string, string>();
      
      // If replace mode, delete existing data
      if (mode === 'replace') {
        await tx.transactionLabel.deleteMany({ 
          where: { transaction: { user_id: user.id } } 
        });
        await tx.transaction.deleteMany({ where: { user_id: user.id } });
        await tx.transfer.deleteMany({ where: { user_id: user.id } });
        await tx.label.deleteMany({ where: { user_id: user.id } });
        await tx.category.deleteMany({ where: { user_id: user.id } });
        await tx.account.deleteMany({ where: { user_id: user.id } });
      }

      // Get starting personal_ids
      const getNextPersonalId = async (model: any) => {
        const max = await model.findFirst({
          where: { user_id: user.id },
          orderBy: { personal_id: 'desc' },
        });
        return Number(max?.personal_id || 0n) + 1;
      };

      let accountPersonalId = await getNextPersonalId(tx.account);
      let categoryPersonalId = await getNextPersonalId(tx.category);
      let transactionPersonalId = await getNextPersonalId(tx.transaction);
      let labelPersonalId = await getNextPersonalId(tx.label);

      // 1. Import Accounts
      const createdAccounts = [];
      for (const account of validatedData.data.accounts) {
        const created = await tx.account.create({
          data: {
            user_id: user.id,
            personal_id: BigInt(accountPersonalId++),
            name: account.name,
            type: account.type,
            currency: account.currency,
            current_balance: account.current_balance,
            initial_balance: account.initial_balance,
            is_active: account.is_active,
            icon: account.icon,
            color: account.color,
            description: account.description,
            display_order: accountPersonalId - 1,
          },
        });
        
        // Map old ID to new ID (if provided in import)
        if ((account as any).id) {
          accountIdMap.set((account as any).id, created.id);
        }
        createdAccounts.push(created);
      }

      // 2. Import Categories (handle hierarchy)
      const createdCategories = [];
      const categoriesWithParent: any[] = [];
      
      // First pass: Create root categories
      for (const category of validatedData.data.categories) {
        if (!category.parent_id) {
          const created = await tx.category.create({
            data: {
              user_id: user.id,
              personal_id: BigInt(categoryPersonalId++),
              name: category.name,
              type: category.type,
              color: category.color,
              icon: category.icon,
              description: category.description,
              nature: category.nature,
            },
          });
          
          if ((category as any).id) {
            categoryIdMap.set((category as any).id, created.id);
          }
          createdCategories.push(created);
        } else {
          categoriesWithParent.push(category);
        }
      }
      
      // Second pass: Create child categories
      for (const category of categoriesWithParent) {
        const parentId = categoryIdMap.get(category.parent_id!);
        if (parentId) {
          const created = await tx.category.create({
            data: {
              user_id: user.id,
              personal_id: BigInt(categoryPersonalId++),
              name: category.name,
              type: category.type,
              color: category.color,
              icon: category.icon,
              description: category.description,
              nature: category.nature,
              parent_id: parentId,
            },
          });
          createdCategories.push(created);
        }
      }

      // 3. Import Transactions
      const createdTransactions = [];
      for (const transaction of validatedData.data.transactions) {
        // Map account and category IDs
        const accountId = accountIdMap.get(transaction.original_account_id!) 
          || createdAccounts[0]?.id; // Fallback to first account
        
        const categoryId = transaction.original_category_id 
          ? categoryIdMap.get(transaction.original_category_id) 
          : null;

        if (accountId) {
          const created = await tx.transaction.create({
            data: {
              user_id: user.id,
              personal_id: BigInt(transactionPersonalId++),
              date: new Date(transaction.date),
              amount: transaction.amount,
              type: transaction.type,
              account_id: accountId,
              category_id: categoryId,
              payee: transaction.payee,
              description: transaction.description,
            },
          });
          createdTransactions.push(created);
        }
      }

      // Record restore history
      await tx.backupHistory.create({
        data: {
          user_id: user.id,
          status: 'restored',
          restore_date: new Date(),
          record_count: {
            accounts: createdAccounts.length,
            categories: createdCategories.length,
            transactions: createdTransactions.length,
          },
        },
      });

      return {
        accounts: createdAccounts.length,
        categories: createdCategories.length,
        transactions: createdTransactions.length,
      };
    });

    return apiResponse.success({
      message: 'Data restored successfully',
      imported: result,
    });

  } catch (error) {
    console.error('Import error:', error);
    if (error instanceof z.ZodError) {
      return apiResponse.error('Invalid backup file format', 400, error.errors);
    }
    return apiResponse.error('Failed to import data', 500);
  }
}
```

---

## 🎨 Frontend Implementation

### Backup/Restore Service: `/src/services/backup.service.ts`

```typescript
import { apiClient } from './api-client';

export interface BackupData {
  exportVersion: string;
  exportDate: string;
  user: {
    email: string;
    name: string;
  };
  data: {
    accounts: any[];
    categories: any[];
    transactions: any[];
    transfers: any[];
    labels: any[];
  };
  metadata: {
    totalRecords: number;
    checksum?: string;
  };
}

export const backupService = {
  /**
   * Export all user data as JSON
   */
  async exportData(): Promise<void> {
    try {
      const response = await apiClient.get('/api/v1/backup/export', {
        responseType: 'blob',
      });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
      
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
  },

  /**
   * Import data from JSON backup
   */
  async importData(file: File, mode: 'replace' | 'merge' = 'replace'): Promise<any> {
    try {
      // Read file
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      
      // Validate version compatibility
      if (!this.isVersionCompatible(data.exportVersion)) {
        throw new Error('Backup file version is not compatible');
      }
      
      // Upload to server
      const response = await apiClient.post(
        `/api/v1/backup/import?mode=${mode}`,
        data
      );
      
      return response.data;
      
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  },

  /**
   * Validate backup file before import
   */
  async validateBackupFile(file: File): Promise<{
    valid: boolean;
    data?: BackupData;
    error?: string;
  }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      
      // Check required fields
      if (!data.exportVersion || !data.data || !data.exportDate) {
        return { valid: false, error: 'Invalid backup file format' };
      }
      
      // Check version
      if (!this.isVersionCompatible(data.exportVersion)) {
        return { valid: false, error: 'Incompatible backup version' };
      }
      
      return { valid: true, data };
      
    } catch (error) {
      return { valid: false, error: 'Failed to parse backup file' };
    }
  },

  /**
   * Check if backup version is compatible
   */
  isVersionCompatible(version: string): boolean {
    const [major] = version.split('.');
    const [currentMajor] = '1.0.0'.split('.'); // Current version
    return major === currentMajor;
  },
};
```

### Backup/Restore UI Component: `/src/components/settings/BackupRestore.tsx`

```tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/context/ToastContext';
import { backupService } from '@/services/backup.service';
import { 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  FileJson,
  Loader2
} from 'lucide-react';

export function BackupRestore() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await backupService.exportData();
      showToast({
        title: 'Export Successful',
        message: 'Your data has been exported successfully',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Validate file
    const validation = await backupService.validateBackupFile(file);
    if (validation.valid && validation.data) {
      setFileInfo({
        fileName: file.name,
        fileSize: (file.size / 1024).toFixed(2) + ' KB',
        exportDate: validation.data.exportDate,
        totalRecords: validation.data.metadata.totalRecords,
        user: validation.data.user,
      });
    } else {
      showToast({
        title: 'Invalid File',
        message: validation.error || 'The selected file is not a valid backup',
        type: 'error',
      });
      setSelectedFile(null);
      setFileInfo(null);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const result = await backupService.importData(selectedFile, importMode);
      
      showToast({
        title: 'Import Successful',
        message: `Imported ${result.data.imported.accounts} accounts, ${result.data.imported.categories} categories, and ${result.data.imported.transactions} transactions`,
        type: 'success',
      });
      
      // Clear selection
      setSelectedFile(null);
      setFileInfo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refresh page to show new data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      showToast({
        title: 'Import Failed',
        message: 'Failed to import data. Please check the file and try again.',
        type: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Download className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Export Data</h3>
            <p className="text-sm text-gray-600 mt-1">
              Download all your financial data as a JSON file for backup
            </p>
            <ul className="text-sm text-gray-500 mt-2 space-y-1">
              <li>• Includes all accounts, transactions, and categories</li>
              <li>• Preserves all relationships and settings</li>
              <li>• Can be restored anytime</li>
            </ul>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="mt-4"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Import Section */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Upload className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Import Data</h3>
            <p className="text-sm text-gray-600 mt-1">
              Restore your data from a previously exported backup file
            </p>
            
            {/* Import Mode Selection */}
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Import Mode:</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Replace (Delete existing data)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Merge (Keep existing data)
                  </span>
                </label>
              </div>
            </div>

            {/* Warning for Replace mode */}
            {importMode === 'replace' && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Replace mode will delete all your existing data before importing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* File Selection Button or File Info */}
            {!selectedFile ? (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4"
              >
                <FileJson className="mr-2 h-4 w-4" />
                Select Backup File
              </Button>
            ) : (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{fileInfo.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {fileInfo.fileSize} • Exported {new Date(fileInfo.exportDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fileInfo.totalRecords} records • User: {fileInfo.user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileInfo(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}

            {/* Import Button */}
            {selectedFile && (
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="mt-4"
                variant="default"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Data
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Info Section */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Backup Best Practices</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Export your data regularly (weekly or monthly)</li>
              <li>• Store backup files in multiple secure locations</li>
              <li>• Test restore functionality periodically</li>
              <li>• Keep multiple versions of backups</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## 🔒 Security Considerations

1. **User Isolation**: Export only includes user's own data
2. **Authentication Required**: Both endpoints require valid JWT
3. **Data Validation**: Imported data is validated with Zod schemas
4. **Personal ID Regeneration**: New personal IDs generated on import
5. **Transaction Safety**: All operations wrapped in database transactions
6. **File Size Limits**: Add upload size limits in Next.js config

---

## ⚙️ Configuration

Add to `next.config.js`:

```javascript
module.exports = {
  // ... existing config
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Adjust based on expected data size
    },
  },
};
```

---

## ✅ Testing Checklist

- [ ] Export creates valid JSON file
- [ ] Export includes all user data
- [ ] Import validates file format
- [ ] Replace mode deletes existing data
- [ ] Merge mode preserves existing data
- [ ] Personal IDs regenerate correctly
- [ ] Category hierarchy preserved
- [ ] Account balances maintained
- [ ] Transaction relationships intact
- [ ] Error handling for corrupt files
- [ ] File size limits enforced
- [ ] User can't import other user's data

---

## 🎯 Usage Flow

1. **User exports data** → Downloads JSON file
2. **User stores backup** → External storage
3. **If needed, user imports** → Uploads JSON file
4. **System validates** → Checks format and version
5. **User chooses mode** → Replace or Merge
6. **System restores** → Recreates all data with new IDs
7. **User continues** → All data restored

This implementation provides complete data portability without breaking any existing functionality!
