# 13A. Google Sheets Frontend Service

## Frontend Service Implementation

### `/src/services/google-sheets-integration.service.ts`

```typescript
import { apiClient } from './api-client';

export interface GoogleSheetsIntegration {
  id: string;
  user_id: string;
  spreadsheet_id: string;
  spreadsheet_url: string;
  sheet_names: Record<string, string>;
  auth_type: string;
  sync_enabled: boolean;
  sync_direction: 'bidirectional' | 'to_sheets' | 'from_sheets';
  auto_sync: boolean;
  sync_frequency?: number;
  last_sync_at?: string;
  last_sync_status?: string;
  last_sync_error?: string;
  sync_in_progress: boolean;
}

export interface SyncResult {
  success: boolean;
  synced: Record<string, number>;
  errors?: string[];
}

export const googleSheetsService = {
  /**
   * Get current integration settings
   */
  async getIntegration(): Promise<GoogleSheetsIntegration | null> {
    try {
      const response = await apiClient.get('/api/v1/google-sheets/integration');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get integration:', error);
      return null;
    }
  },

  /**
   * Setup or update Google Sheets integration
   */
  async setupIntegration(config: {
    spreadsheetUrl: string;
    credentials?: {
      type: 'service_account' | 'oauth2';
      data: any;
    };
  }): Promise<{
    integration: GoogleSheetsIntegration;
    connectionStatus: 'connected' | 'not_connected' | 'credentials_required';
  }> {
    const response = await apiClient.post('/api/v1/google-sheets/setup', config);
    return response.data.data;
  },

  /**
   * Sync data with Google Sheets
   */
  async syncData(
    direction: 'bidirectional' | 'to_sheets' | 'from_sheets' = 'bidirectional',
    entities: string[] = ['all']
  ): Promise<SyncResult> {
    const response = await apiClient.post('/api/v1/google-sheets/sync', {
      direction,
      entities,
    });
    return response.data.data;
  },

  /**
   * Disconnect Google Sheets integration
   */
  async disconnectIntegration(): Promise<void> {
    await apiClient.delete('/api/v1/google-sheets/integration');
  },

  /**
   * Update sync settings
   */
  async updateSyncSettings(settings: {
    sync_enabled?: boolean;
    sync_direction?: 'bidirectional' | 'to_sheets' | 'from_sheets';
    auto_sync?: boolean;
    sync_frequency?: number;
  }): Promise<GoogleSheetsIntegration> {
    const response = await apiClient.patch('/api/v1/google-sheets/settings', settings);
    return response.data.data;
  },

  /**
   * Get sync history/logs
   */
  async getSyncHistory(limit: number = 10): Promise<any[]> {
    const response = await apiClient.get(`/api/v1/google-sheets/sync-history?limit=${limit}`);
    return response.data.data;
  },

  /**
   * Validate spreadsheet URL
   */
  validateSpreadsheetUrl(url: string): boolean {
    const regex = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    return regex.test(url);
  },

  /**
   * Extract spreadsheet ID from URL
   */
  extractSpreadsheetId(url: string): string | null {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  },

  /**
   * Generate shareable link
   */
  getShareableLink(spreadsheetId: string): string {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=0`;
  },
};
```

---

## Integration Summary

### ✅ **Why Google Sheets Integration Won't Break Anything:**

1. **Uses Existing Personal ID System**
   - Personal ID is the unique key for upsert operations
   - Maintains data integrity across systems
   - No changes to existing ID generation

2. **Position Column for Order**
   - New column doesn't affect existing data structure
   - Maintains row order in sheets
   - Easy to sort and filter

3. **Optional Feature**
   - Users can choose to enable or not
   - Doesn't affect core functionality
   - Can be disabled anytime

4. **Follows Existing Patterns**
   - Same API response format
   - Same authentication system
   - Same user isolation
   - Same database transaction patterns

---

## 🎯 How It Works

### Data Flow Architecture:

```
Your App Database ←→ Sync Service ←→ Google Sheets API ←→ User's Google Sheet
     (Source)         (Mediator)       (Transport)         (Destination)
```

### Sync Process:

1. **TO Google Sheets:**
   ```
   Database → Read all user data
           → Transform to sheet format
           → Find rows by personal_id
           → Upsert (update or append)
           → Update position column
   ```

2. **FROM Google Sheets:**
   ```
   Google Sheet → Read all rows
                → Map by personal_id
                → Validate data
                → Upsert to database
                → Update relationships
   ```

### Sheet Structure:

**Accounts Sheet:**
| position | personal_id | name | type | currency | current_balance | ... |
|----------|------------|------|------|----------|-----------------|-----|
| 1 | 1 | Cash | cash | USD | 1000.00 | ... |
| 2 | 2 | Checking | bank | USD | 5000.00 | ... |

**Transactions Sheet:**
| position | personal_id | date | account | category | amount | type | ... |
|----------|------------|------|---------|----------|--------|------|-----|
| 1 | 1 | 2024-01-01 | Cash | Food | -50.00 | expense | ... |
| 2 | 2 | 2024-01-02 | Checking | Salary | 3000.00 | income | ... |

---

## 🚀 Use Cases

1. **Advanced Analysis**
   - Use Google Sheets formulas and pivot tables
   - Create custom charts and dashboards
   - Apply complex calculations

2. **Data Sharing**
   - Share read-only or edit access with family
   - Collaborate with accountant or financial advisor
   - Export for tax preparation

3. **Bulk Operations**
   - Mass edit transactions
   - Import historical data
   - Reorganize categories

4. **Backup Strategy**
   - Additional backup in Google Drive
   - Version history in Google Sheets
   - Cross-platform access

5. **Integration Hub**
   - Connect with Google Apps Script
   - Integrate with Zapier/Make
   - Use with Google Data Studio

---

## 🔧 Configuration Options

```typescript
// Sync Configuration
{
  sync_direction: 'bidirectional', // or 'to_sheets', 'from_sheets'
  auto_sync: false,               // Enable automatic sync
  sync_frequency: 60,             // Minutes between auto-syncs
  sync_on_change: true,           // Sync when data changes
  
  // Entity Selection
  entities_to_sync: [
    'accounts',
    'transactions', 
    'categories',
    'transfers',
    'labels'
  ],
  
  // Conflict Resolution
  conflict_resolution: 'latest_wins', // or 'sheets_wins', 'app_wins'
  
  // Performance
  batch_size: 100,                // Records per batch
  use_background_sync: true,      // Sync in background
}
```

---

## 🔒 Security & Privacy

1. **Your Data, Your Control**
   - Data stays in YOUR Google account
   - You control sharing permissions
   - Can revoke access anytime

2. **Credential Security**
   - Service account credentials encrypted
   - OAuth2 tokens encrypted
   - No credentials in client code

3. **User Isolation**
   - Each user has separate sheets
   - No cross-user data access
   - Personal spreadsheet URLs

4. **Audit Trail**
   - All syncs logged
   - Track what changed
   - Error reporting

---

## ✅ Benefits Summary

| Feature | Benefit |
|---------|---------|
| **Bidirectional Sync** | Edit in app or sheets |
| **Personal ID Key** | Reliable updates without duplicates |
| **Position Column** | Maintain order and organization |
| **Auto Sheet Creation** | Zero setup required |
| **Batch Operations** | Fast performance |
| **Conflict Resolution** | Handle concurrent edits |
| **Version History** | Google Sheets tracks all changes |
| **Formulas & Charts** | Advanced analysis capabilities |
| **Sharing** | Collaborate with others |
| **Free Storage** | Uses Google Drive quota |

---

## 🎯 Quick Start

1. **Enable in Settings**
   ```
   Settings → Integrations → Google Sheets → Connect
   ```

2. **Provide Sheet URL**
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
   ```

3. **Choose Sync Direction**
   - Bidirectional (recommended)
   - To Sheets Only (export)
   - From Sheets Only (import)

4. **Click Sync**
   - Data syncs using personal_id
   - Position column maintains order
   - See results in real-time

This integration provides powerful spreadsheet capabilities while maintaining the integrity and security of your financial data!
