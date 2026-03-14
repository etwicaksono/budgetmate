# 13. Google Sheets Integration

## Overview
Complete bi-directional synchronization with Google Sheets, allowing users to read and write their financial data using Google Sheets as an external data source.

---

## 🔧 Prerequisites

### 1. Google Cloud Setup
1. Create a Google Cloud Project
2. Enable Google Sheets API
3. Create Service Account or OAuth2 credentials
4. Download credentials JSON

### 2. Required Packages

```bash
npm install googleapis google-auth-library
npm install --save-dev @types/google.auth
```

---

## 📦 Database Schema Extension

### Step 1: Add Google Sheets Integration Table

```prisma
// Add to schema.prisma
model GoogleSheetsIntegration {
  id                String   @id @default(cuid())
  user_id           String   @unique
  
  // Google Sheets Info
  spreadsheet_id    String   // Extracted from URL
  spreadsheet_url   String   // Full URL for reference
  sheet_names       Json     // {"accounts": "Accounts", "transactions": "Transactions", ...}
  
  // Authentication
  auth_type         String   @default("service_account") // service_account or oauth2
  encrypted_credentials Json? // Encrypted service account key or refresh token
  
  // Sync Settings
  sync_enabled      Boolean  @default(true)
  sync_direction    String   @default("bidirectional") // bidirectional, to_sheets, from_sheets
  auto_sync         Boolean  @default(false)
  sync_frequency    Int?     @default(60) // minutes
  
  // Sync Status
  last_sync_at      DateTime?
  last_sync_status  String?  // success, failed, partial
  last_sync_error   String?
  sync_in_progress  Boolean  @default(false)
  
  // Column Mappings (position column for each sheet)
  position_columns  Json     @default("{}") // {"accounts": "A", "transactions": "A", ...}
  
  created_at        DateTime @default(now())
  updated_at        DateTime @updatedAt
  
  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
}

model SyncLog {
  id                String   @id @default(cuid())
  user_id           String
  integration_id    String
  
  sync_type         String   // manual, auto, webhook
  sync_direction    String   // to_sheets, from_sheets, bidirectional
  entity_type       String   // accounts, transactions, categories, etc.
  
  records_read      Int      @default(0)
  records_written   Int      @default(0)
  records_updated   Int      @default(0)
  records_failed    Int      @default(0)
  
  status            String   // success, failed, partial
  error_details     Json?
  
  started_at        DateTime @default(now())
  completed_at      DateTime?
  
  user              User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id, integration_id])
}
```

---

## 🔌 Google Sheets Service Implementation

### Core Google Sheets Service: `/src/services/google-sheets/google-sheets.service.ts`

```typescript
import { google, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { JWT } from 'google-auth-library';

export interface SheetData {
  sheetName: string;
  headers: string[];
  rows: any[][];
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  credentials: any; // Service account key or OAuth tokens
  authType: 'service_account' | 'oauth2';
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  
  constructor(config: GoogleSheetsConfig) {
    this.spreadsheetId = config.spreadsheetId;
    
    if (config.authType === 'service_account') {
      // Service Account Authentication
      const auth = new JWT({
        email: config.credentials.client_email,
        key: config.credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth });
    } else {
      // OAuth2 Authentication
      const oauth2Client = new OAuth2Client(
        config.credentials.client_id,
        config.credentials.client_secret,
        config.credentials.redirect_uri
      );
      
      oauth2Client.setCredentials({
        refresh_token: config.credentials.refresh_token,
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    }
  }
  
  /**
   * Extract spreadsheet ID from URL
   */
  static extractSpreadsheetId(url: string): string | null {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
  
  /**
   * Get or create a sheet
   */
  async ensureSheet(sheetName: string): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheets = response.data.sheets || [];
      const sheetExists = sheets.some(sheet => sheet.properties?.title === sheetName);
      
      if (!sheetExists) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            }],
          },
        });
      }
    } catch (error) {
      console.error('Error ensuring sheet:', error);
      throw error;
    }
  }
  
  /**
   * Read data from a sheet
   */
  async readSheet(sheetName: string, range?: string): Promise<SheetData> {
    try {
      const fullRange = range ? `${sheetName}!${range}` : sheetName;
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING',
      });
      
      const values = response.data.values || [];
      
      if (values.length === 0) {
        return {
          sheetName,
          headers: [],
          rows: [],
        };
      }
      
      return {
        sheetName,
        headers: values[0] || [],
        rows: values.slice(1),
      };
    } catch (error) {
      console.error('Error reading sheet:', error);
      throw error;
    }
  }
  
  /**
   * Write data to a sheet (overwrite)
   */
  async writeSheet(sheetName: string, data: any[][], range?: string): Promise<void> {
    try {
      const fullRange = range ? `${sheetName}!${range}` : sheetName;
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: fullRange,
        valueInputOption: 'RAW',
        requestBody: {
          values: data,
        },
      });
    } catch (error) {
      console.error('Error writing to sheet:', error);
      throw error;
    }
  }
  
  /**
   * Append data to a sheet
   */
  async appendToSheet(sheetName: string, data: any[][]): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: sheetName,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: data,
        },
      });
    } catch (error) {
      console.error('Error appending to sheet:', error);
      throw error;
    }
  }
  
  /**
   * Clear a sheet (keep headers)
   */
  async clearSheet(sheetName: string, keepHeaders: boolean = true): Promise<void> {
    try {
      if (keepHeaders) {
        // Get headers first
        const data = await this.readSheet(sheetName, 'A1:Z1');
        
        // Clear entire sheet
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: sheetName,
        });
        
        // Restore headers
        if (data.headers.length > 0) {
          await this.writeSheet(sheetName, [data.headers], 'A1');
        }
      } else {
        // Clear entire sheet
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.spreadsheetId,
          range: sheetName,
        });
      }
    } catch (error) {
      console.error('Error clearing sheet:', error);
      throw error;
    }
  }
  
  /**
   * Batch update for better performance
   */
  async batchUpdate(requests: sheets_v4.Schema$Request[]): Promise<void> {
    try {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests,
        },
      });
    } catch (error) {
      console.error('Error in batch update:', error);
      throw error;
    }
  }
  
  /**
   * Find row by personal_id
   */
  async findRowByPersonalId(
    sheetName: string, 
    personalId: number, 
    personalIdColumn: number = 1
  ): Promise<number | null> {
    try {
      const data = await this.readSheet(sheetName);
      
      for (let i = 0; i < data.rows.length; i++) {
        if (Number(data.rows[i][personalIdColumn]) === personalId) {
          return i + 2; // +2 because sheets are 1-indexed and we skip header
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding row:', error);
      return null;
    }
  }
  
  /**
   * Upsert row based on personal_id
   */
  async upsertRow(
    sheetName: string,
    personalId: number,
    rowData: any[],
    personalIdColumn: number = 1
  ): Promise<void> {
    try {
      const rowNumber = await this.findRowByPersonalId(sheetName, personalId, personalIdColumn);
      
      if (rowNumber) {
        // Update existing row
        await this.writeSheet(sheetName, [rowData], `A${rowNumber}`);
      } else {
        // Append new row
        await this.appendToSheet(sheetName, [rowData]);
      }
    } catch (error) {
      console.error('Error upserting row:', error);
      throw error;
    }
  }
}
```

---

## 🔄 Data Sync Service: `/src/services/google-sheets/sync.service.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { GoogleSheetsService } from './google-sheets.service';
import { Decimal } from '@prisma/client/runtime';

export interface SyncOptions {
  userId: string;
  entities?: string[]; // Which entities to sync
  direction?: 'to_sheets' | 'from_sheets' | 'bidirectional';
  forceOverwrite?: boolean;
}

export class GoogleSheetsSyncService {
  private sheetsService: GoogleSheetsService;
  private userId: string;
  
  // Sheet names configuration
  private readonly SHEETS = {
    accounts: 'Accounts',
    transactions: 'Transactions',
    categories: 'Categories',
    transfers: 'Transfers',
    labels: 'Labels',
  };
  
  // Column headers for each sheet
  private readonly HEADERS = {
    accounts: [
      'position', 'personal_id', 'name', 'type', 'currency', 
      'current_balance', 'initial_balance', 'is_active', 
      'icon', 'color', 'description', 'display_order'
    ],
    transactions: [
      'position', 'personal_id', 'date', 'account', 'category', 
      'amount', 'type', 'payee', 'description', 'labels'
    ],
    categories: [
      'position', 'personal_id', 'name', 'type', 'parent', 
      'color', 'icon', 'description', 'nature'
    ],
    transfers: [
      'position', 'id', 'date', 'from_account', 'to_account', 
      'amount', 'to_amount', 'exchange_rate', 'description'
    ],
    labels: [
      'position', 'personal_id', 'name', 'color', 'description'
    ],
  };
  
  constructor(sheetsService: GoogleSheetsService, userId: string) {
    this.sheetsService = sheetsService;
    this.userId = userId;
  }
  
  /**
   * Initialize sheets with headers
   */
  async initializeSheets(): Promise<void> {
    for (const [entity, sheetName] of Object.entries(this.SHEETS)) {
      await this.sheetsService.ensureSheet(sheetName);
      
      // Check if headers exist
      const data = await this.sheetsService.readSheet(sheetName, 'A1:Z1');
      
      if (data.headers.length === 0) {
        // Write headers
        const headers = this.HEADERS[entity as keyof typeof this.HEADERS];
        await this.sheetsService.writeSheet(sheetName, [headers], 'A1');
      }
    }
  }
  
  /**
   * Sync accounts to Google Sheets
   */
  async syncAccountsToSheets(): Promise<number> {
    const accounts = await prisma.account.findMany({
      where: { user_id: this.userId },
      orderBy: { display_order: 'asc' },
    });
    
    const rows = accounts.map((account, index) => [
      index + 1, // position
      Number(account.personal_id),
      account.name,
      account.type,
      account.currency,
      account.current_balance.toNumber(),
      account.initial_balance.toNumber(),
      account.is_active,
      account.icon || '',
      account.color || '',
      account.description || '',
      account.display_order,
    ]);
    
    // Clear and rewrite (maintaining headers)
    await this.sheetsService.clearSheet(this.SHEETS.accounts, true);
    
    if (rows.length > 0) {
      await this.sheetsService.appendToSheet(this.SHEETS.accounts, rows);
    }
    
    return rows.length;
  }
  
  /**
   * Sync transactions to Google Sheets
   */
  async syncTransactionsToSheets(): Promise<number> {
    const transactions = await prisma.transaction.findMany({
      where: { user_id: this.userId },
      include: {
        account: true,
        category: true,
        transactionLabels: {
          include: {
            label: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { personal_id: 'desc' },
      ],
    });
    
    const rows = transactions.map((tx, index) => [
      index + 1, // position
      Number(tx.personal_id),
      tx.date.toISOString().split('T')[0],
      tx.account.name,
      tx.category?.name || '',
      tx.amount.toNumber(),
      tx.type,
      tx.payee || '',
      tx.description || '',
      tx.transactionLabels.map(tl => tl.label.name).join(', '),
    ]);
    
    await this.sheetsService.clearSheet(this.SHEETS.transactions, true);
    
    if (rows.length > 0) {
      await this.sheetsService.appendToSheet(this.SHEETS.transactions, rows);
    }
    
    return rows.length;
  }
  
  /**
   * Sync categories to Google Sheets
   */
  async syncCategoriesToSheets(): Promise<number> {
    const categories = await prisma.category.findMany({
      where: { user_id: this.userId },
      include: {
        parent: true,
      },
      orderBy: { personal_id: 'asc' },
    });
    
    const rows = categories.map((category, index) => [
      index + 1, // position
      Number(category.personal_id),
      category.name,
      category.type,
      category.parent?.name || '',
      category.color,
      category.icon || '',
      category.description || '',
      category.nature || '',
    ]);
    
    await this.sheetsService.clearSheet(this.SHEETS.categories, true);
    
    if (rows.length > 0) {
      await this.sheetsService.appendToSheet(this.SHEETS.categories, rows);
    }
    
    return rows.length;
  }
  
  /**
   * Sync from Google Sheets to database
   */
  async syncAccountsFromSheets(): Promise<number> {
    const data = await this.sheetsService.readSheet(this.SHEETS.accounts);
    
    if (data.rows.length === 0) return 0;
    
    let updated = 0;
    
    for (const row of data.rows) {
      const [
        position, personalId, name, type, currency,
        currentBalance, initialBalance, isActive,
        icon, color, description, displayOrder
      ] = row;
      
      if (!personalId || !name) continue;
      
      // Upsert account
      await prisma.account.upsert({
        where: {
          user_id_personal_id: {
            user_id: this.userId,
            personal_id: BigInt(personalId),
          },
        },
        update: {
          name,
          type,
          currency,
          current_balance: new Decimal(currentBalance || 0),
          initial_balance: new Decimal(initialBalance || 0),
          is_active: Boolean(isActive),
          icon: icon || null,
          color: color || null,
          description: description || null,
          display_order: displayOrder || position,
        },
        create: {
          user_id: this.userId,
          personal_id: BigInt(personalId),
          name,
          type,
          currency,
          current_balance: new Decimal(currentBalance || 0),
          initial_balance: new Decimal(initialBalance || 0),
          is_active: Boolean(isActive),
          icon: icon || null,
          color: color || null,
          description: description || null,
          display_order: displayOrder || position,
        },
      });
      
      updated++;
    }
    
    return updated;
  }
  
  /**
   * Sync transactions from Google Sheets
   */
  async syncTransactionsFromSheets(): Promise<number> {
    const data = await this.sheetsService.readSheet(this.SHEETS.transactions);
    
    if (data.rows.length === 0) return 0;
    
    // Get account and category mappings
    const accounts = await prisma.account.findMany({
      where: { user_id: this.userId },
    });
    const accountMap = new Map(accounts.map(a => [a.name, a.id]));
    
    const categories = await prisma.category.findMany({
      where: { user_id: this.userId },
    });
    const categoryMap = new Map(categories.map(c => [c.name, c.id]));
    
    let updated = 0;
    
    for (const row of data.rows) {
      const [
        position, personalId, date, accountName, categoryName,
        amount, type, payee, description, labelsStr
      ] = row;
      
      if (!personalId || !date || !accountName) continue;
      
      const accountId = accountMap.get(accountName);
      if (!accountId) continue; // Skip if account not found
      
      const categoryId = categoryName ? categoryMap.get(categoryName) : null;
      
      // Parse date
      const transactionDate = new Date(date);
      if (isNaN(transactionDate.getTime())) continue;
      
      // Upsert transaction
      await prisma.transaction.upsert({
        where: {
          user_id_personal_id: {
            user_id: this.userId,
            personal_id: BigInt(personalId),
          },
        },
        update: {
          date: transactionDate,
          account_id: accountId,
          category_id: categoryId,
          amount: new Decimal(amount || 0),
          type: type as any,
          payee: payee || null,
          description: description || null,
        },
        create: {
          user_id: this.userId,
          personal_id: BigInt(personalId),
          date: transactionDate,
          account_id: accountId,
          category_id: categoryId,
          amount: new Decimal(amount || 0),
          type: type as any,
          payee: payee || null,
          description: description || null,
        },
      });
      
      updated++;
    }
    
    return updated;
  }
  
  /**
   * Full sync operation
   */
  async performFullSync(options: SyncOptions): Promise<{
    success: boolean;
    synced: Record<string, number>;
    errors?: string[];
  }> {
    const synced: Record<string, number> = {};
    const errors: string[] = [];
    
    try {
      // Initialize sheets if needed
      await this.initializeSheets();
      
      // Create sync log
      const syncLog = await prisma.syncLog.create({
        data: {
          user_id: this.userId,
          integration_id: '', // Set from integration record
          sync_type: 'manual',
          sync_direction: options.direction || 'bidirectional',
          entity_type: 'all',
          status: 'in_progress',
        },
      });
      
      // Sync based on direction
      if (options.direction === 'to_sheets' || options.direction === 'bidirectional') {
        // Sync to Google Sheets
        synced.accounts_to = await this.syncAccountsToSheets();
        synced.categories_to = await this.syncCategoriesToSheets();
        synced.transactions_to = await this.syncTransactionsToSheets();
      }
      
      if (options.direction === 'from_sheets' || options.direction === 'bidirectional') {
        // Sync from Google Sheets
        synced.accounts_from = await this.syncAccountsFromSheets();
        synced.transactions_from = await this.syncTransactionsFromSheets();
      }
      
      // Update sync log
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          completed_at: new Date(),
          records_written: Object.values(synced).reduce((a, b) => a + (b || 0), 0),
        },
      });
      
      return {
        success: true,
        synced,
      };
      
    } catch (error: any) {
      errors.push(error.message);
      
      return {
        success: false,
        synced,
        errors,
      };
    }
  }
}
```

---

## 🔌 API Endpoints

### 1. Setup Google Sheets Integration: `/app/api/v1/google-sheets/setup/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';
import { GoogleSheetsService } from '@/services/google-sheets/google-sheets.service';
import { z } from 'zod';
import { encrypt } from '@/lib/crypto';

const setupSchema = z.object({
  spreadsheetUrl: z.string().url(),
  credentials: z.object({
    type: z.enum(['service_account', 'oauth2']),
    data: z.any(), // Service account JSON or OAuth tokens
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }
    
    const body = await request.json();
    const validated = setupSchema.parse(body);
    
    // Extract spreadsheet ID
    const spreadsheetId = GoogleSheetsService.extractSpreadsheetId(validated.spreadsheetUrl);
    if (!spreadsheetId) {
      return apiResponse.error('Invalid Google Sheets URL', 400);
    }
    
    // Encrypt credentials if provided
    let encryptedCredentials = null;
    if (validated.credentials) {
      encryptedCredentials = await encrypt(JSON.stringify(validated.credentials.data));
    }
    
    // Create or update integration
    const integration = await prisma.googleSheetsIntegration.upsert({
      where: { user_id: user.id },
      update: {
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: validated.spreadsheetUrl,
        encrypted_credentials: encryptedCredentials,
        auth_type: validated.credentials?.type || 'service_account',
      },
      create: {
        user_id: user.id,
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: validated.spreadsheetUrl,
        encrypted_credentials: encryptedCredentials,
        auth_type: validated.credentials?.type || 'service_account',
        sheet_names: {
          accounts: 'Accounts',
          transactions: 'Transactions',
          categories: 'Categories',
          transfers: 'Transfers',
          labels: 'Labels',
        },
      },
    });
    
    // Test connection
    if (validated.credentials) {
      try {
        const sheetsService = new GoogleSheetsService({
          spreadsheetId,
          credentials: validated.credentials.data,
          authType: validated.credentials.type,
        });
        
        // Try to read spreadsheet to verify access
        await sheetsService.readSheet('Sheet1', 'A1:A1');
        
        return apiResponse.success({
          integration,
          connectionStatus: 'connected',
        });
      } catch (error) {
        return apiResponse.success({
          integration,
          connectionStatus: 'not_connected',
          error: 'Failed to connect to spreadsheet. Check permissions.',
        });
      }
    }
    
    return apiResponse.success({
      integration,
      connectionStatus: 'credentials_required',
    });
    
  } catch (error: any) {
    console.error('Setup error:', error);
    if (error instanceof z.ZodError) {
      return apiResponse.error('Invalid input', 400, error.errors);
    }
    return apiResponse.error('Failed to setup integration', 500);
  }
}
```

### 2. Sync Endpoint: `/app/api/v1/google-sheets/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';
import { GoogleSheetsService } from '@/services/google-sheets/google-sheets.service';
import { GoogleSheetsSyncService } from '@/services/google-sheets/sync.service';
import { decrypt } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }
    
    const { direction = 'bidirectional', entities = ['all'] } = await request.json();
    
    // Get integration settings
    const integration = await prisma.googleSheetsIntegration.findUnique({
      where: { user_id: user.id },
    });
    
    if (!integration) {
      return apiResponse.error('Google Sheets not configured', 404);
    }
    
    if (!integration.encrypted_credentials) {
      return apiResponse.error('Credentials not configured', 400);
    }
    
    // Check if sync is already in progress
    if (integration.sync_in_progress) {
      return apiResponse.error('Sync already in progress', 409);
    }
    
    // Mark sync as in progress
    await prisma.googleSheetsIntegration.update({
      where: { id: integration.id },
      data: { sync_in_progress: true },
    });
    
    try {
      // Decrypt credentials
      const credentials = JSON.parse(await decrypt(integration.encrypted_credentials as string));
      
      // Initialize services
      const sheetsService = new GoogleSheetsService({
        spreadsheetId: integration.spreadsheet_id,
        credentials,
        authType: integration.auth_type as any,
      });
      
      const syncService = new GoogleSheetsSyncService(sheetsService, user.id);
      
      // Perform sync
      const result = await syncService.performFullSync({
        userId: user.id,
        direction,
        entities,
      });
      
      // Update integration status
      await prisma.googleSheetsIntegration.update({
        where: { id: integration.id },
        data: {
          sync_in_progress: false,
          last_sync_at: new Date(),
          last_sync_status: result.success ? 'success' : 'failed',
          last_sync_error: result.errors?.join(', '),
        },
      });
      
      return apiResponse.success({
        success: result.success,
        synced: result.synced,
        errors: result.errors,
      });
      
    } catch (error: any) {
      // Reset sync status on error
      await prisma.googleSheetsIntegration.update({
        where: { id: integration.id },
        data: {
          sync_in_progress: false,
          last_sync_status: 'failed',
          last_sync_error: error.message,
        },
      });
      
      throw error;
    }
    
  } catch (error: any) {
    console.error('Sync error:', error);
    return apiResponse.error('Sync failed', 500, { message: error.message });
  }
}
```

---

## 🎨 UI Component: `/src/components/settings/GoogleSheetsIntegration.tsx`

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/context/ToastContext';
import { googleSheetsService } from '@/services/google-sheets-integration.service';
import {
  Sheet,
  RefreshCw,
  Link2,
  Unlink,
  AlertCircle,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  FileSpreadsheet,
  Settings,
} from 'lucide-react';

export function GoogleSheetsIntegration() {
  const { showToast } = useToast();
  const [integration, setIntegration] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [syncDirection, setSyncDirection] = useState<'bidirectional' | 'to_sheets' | 'from_sheets'>('bidirectional');
  const [lastSyncInfo, setLastSyncInfo] = useState<any>(null);

  useEffect(() => {
    loadIntegration();
  }, []);

  const loadIntegration = async () => {
    try {
      const data = await googleSheetsService.getIntegration();
      setIntegration(data);
      if (data?.spreadsheet_url) {
        setSpreadsheetUrl(data.spreadsheet_url);
      }
      if (data?.sync_direction) {
        setSyncDirection(data.sync_direction as any);
      }
    } catch (error) {
      console.error('Failed to load integration:', error);
    }
  };

  const handleSetup = async () => {
    if (!spreadsheetUrl) {
      showToast({
        title: 'Error',
        message: 'Please enter a Google Sheets URL',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await googleSheetsService.setupIntegration({
        spreadsheetUrl,
        // For demo, using service account stored server-side
        // In production, implement OAuth2 flow or secure credential storage
      });

      setIntegration(result.integration);
      
      showToast({
        title: 'Success',
        message: result.connectionStatus === 'connected' 
          ? 'Connected to Google Sheets successfully' 
          : 'Integration saved. Add credentials to enable sync.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Setup Failed',
        message: 'Failed to setup Google Sheets integration',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await googleSheetsService.syncData(syncDirection);
      
      setLastSyncInfo(result);
      
      showToast({
        title: 'Sync Complete',
        message: `Synced ${Object.values(result.synced).reduce((a: number, b: any) => a + (b || 0), 0)} records`,
        type: 'success',
      });
      
      // Reload integration to get latest sync status
      await loadIntegration();
    } catch (error) {
      showToast({
        title: 'Sync Failed',
        message: 'Failed to sync with Google Sheets',
        type: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Sheets?')) {
      return;
    }

    setLoading(true);
    try {
      await googleSheetsService.disconnectIntegration();
      setIntegration(null);
      setSpreadsheetUrl('');
      
      showToast({
        title: 'Disconnected',
        message: 'Google Sheets integration removed',
        type: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Error',
        message: 'Failed to disconnect',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSyncDirectionIcon = () => {
    switch (syncDirection) {
      case 'bidirectional':
        return <ArrowUpDown className="h-4 w-4" />;
      case 'to_sheets':
        return <ArrowUp className="h-4 w-4" />;
      case 'from_sheets':
        return <ArrowDown className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Setup Section */}
      <Card className="p-6">
        <div className="flex items-start space-x-4">
          <FileSpreadsheet className="h-8 w-8 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Google Sheets Integration</h3>
            <p className="text-sm text-gray-600 mt-1">
              Sync your financial data with Google Sheets for advanced analysis and sharing
            </p>

            {!integration ? (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">Google Sheets URL</label>
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={spreadsheetUrl}
                    onChange={(e) => setSpreadsheetUrl(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create a new Google Sheet and paste its URL here
                  </p>
                </div>
                
                <Button onClick={handleSetup} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect Google Sheets
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {/* Connection Status */}
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                
                {/* Spreadsheet Link */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <a
                    href={integration.spreadsheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center"
                  >
                    <Sheet className="mr-2 h-4 w-4" />
                    Open in Google Sheets
                  </a>
                </div>
                
                {/* Last Sync Info */}
                {integration.last_sync_at && (
                  <div className="text-sm text-gray-600">
                    Last sync: {new Date(integration.last_sync_at).toLocaleString()}
                    {integration.last_sync_status === 'success' ? (
                      <span className="ml-2 text-green-600">✓ Success</span>
                    ) : (
                      <span className="ml-2 text-red-600">✗ Failed</span>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Sync Controls */}
      {integration && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <RefreshCw className="mr-2 h-5 w-5" />
            Sync Settings
          </h3>
          
          {/* Sync Direction */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Sync Direction</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSyncDirection('bidirectional')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  syncDirection === 'bidirectional'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowUpDown className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Bidirectional</span>
              </button>
              
              <button
                onClick={() => setSyncDirection('to_sheets')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  syncDirection === 'to_sheets'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowUp className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">To Sheets</span>
              </button>
              
              <button
                onClick={() => setSyncDirection('from_sheets')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  syncDirection === 'from_sheets'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowDown className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">From Sheets</span>
              </button>
            </div>
            
            <p className="text-xs text-gray-500">
              {syncDirection === 'bidirectional' && 'Sync changes in both directions'}
              {syncDirection === 'to_sheets' && 'Export your data to Google Sheets'}
              {syncDirection === 'from_sheets' && 'Import changes from Google Sheets'}
            </p>
          </div>
          
          {/* Sync Button */}
          <Button
            onClick={handleSync}
            disabled={syncing || integration.sync_in_progress}
            className="w-full mt-4"
          >
            {syncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                {getSyncDirectionIcon()}
                <span className="ml-2">Sync Now</span>
              </>
            )}
          </Button>
          
          {/* Sync Results */}
          {lastSyncInfo && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Last Sync Results</h4>
              <div className="space-y-1 text-xs text-gray-600">
                {Object.entries(lastSyncInfo.synced).map(([key, value]) => (
                  <div key={key}>
                    {key}: {value} records
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Info Section */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">How it works</h4>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>• Personal ID is used as the unique key for updates</li>
              <li>• Position column tracks the row order in sheets</li>
              <li>• Sheets are auto-created: Accounts, Transactions, Categories</li>
              <li>• Changes sync based on your selected direction</li>
              <li>• Your data remains private in your own Google account</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## 🔑 Key Features

1. **Bidirectional Sync**
   - Push data to Google Sheets
   - Pull changes from Google Sheets
   - Configurable sync direction

2. **Personal ID as Primary Key**
   - Uses personal_id for upsert operations
   - Maintains data integrity
   - Prevents duplicates

3. **Position Column**
   - Tracks row position in sheet
   - Maintains order
   - Easy sorting

4. **Auto Sheet Creation**
   - Creates required sheets automatically
   - Sets up headers
   - Maintains structure

5. **Sync Logging**
   - Tracks all sync operations
   - Error reporting
   - Performance metrics

---

## ✅ Implementation Checklist

- [ ] Database migration for integration tables
- [ ] Google Cloud project setup
- [ ] Service account or OAuth2 configuration
- [ ] Google Sheets service implementation
- [ ] Sync service with upsert logic
- [ ] API endpoints for setup and sync
- [ ] UI component for settings
- [ ] Position column management
- [ ] Personal ID based upsert
- [ ] Error handling and retry logic
- [ ] Sync status tracking
- [ ] Batch operations for performance
- [ ] Conflict resolution strategy
- [ ] Security for credentials storage

---

## 🔒 Security Considerations

1. **Credential Encryption** - All credentials encrypted before storage
2. **User Isolation** - Each user's sheets are separate
3. **Permission Scopes** - Only spreadsheet access requested
4. **Rate Limiting** - Prevent API quota exhaustion
5. **Validation** - Input sanitization for sheet data

This integration allows users to leverage Google Sheets' powerful features while maintaining their data in your app!
