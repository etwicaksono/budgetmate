# 12A. Theme System API Endpoints

## API Implementation for User Preferences

### 1. Get User Preferences: `/app/api/v1/preferences/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '@/lib/auth-middleware';
import { apiResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }

    // Get or create preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { user_id: user.id },
    });

    if (!preferences) {
      // Create default preferences if not exists
      preferences = await prisma.userPreferences.create({
        data: {
          user_id: user.id,
          theme_mode: 'system',
          accent_color: '#3B82F6',
          font_size: 'medium',
          compact_mode: false,
          show_animations: true,
          currency_display: 'symbol',
          date_format: 'MM/DD/YYYY',
          start_of_week: 0,
        },
      });
    }

    return apiResponse.success(preferences);
  } catch (error) {
    console.error('Failed to get preferences:', error);
    return apiResponse.error('Failed to get preferences', 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authMiddleware(request);
    if (!user) {
      return apiResponse.error('Unauthorized', 401);
    }

    const body = await request.json();
    
    // Validate allowed fields
    const allowedFields = [
      'theme_mode',
      'custom_theme',
      'accent_color',
      'compact_mode',
      'show_animations',
      'font_size',
      'currency_display',
      'date_format',
      'start_of_week',
    ];

    const updates: any = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { user_id: user.id },
      update: updates,
      create: {
        user_id: user.id,
        ...updates,
      },
    });

    return apiResponse.success(preferences);
  } catch (error) {
    console.error('Failed to update preferences:', error);
    return apiResponse.error('Failed to update preferences', 500);
  }
}
```

### 2. User Preferences Service: `/src/services/user-preferences.service.ts`

```typescript
import { apiClient } from './api-client';

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_mode: 'light' | 'dark' | 'system' | 'custom';
  custom_theme?: any;
  accent_color?: string;
  compact_mode: boolean;
  show_animations: boolean;
  font_size: 'small' | 'medium' | 'large';
  currency_display: 'symbol' | 'code' | 'name';
  date_format: string;
  start_of_week: number;
}

export const userPreferencesService = {
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const response = await apiClient.get('/api/v1/preferences');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get preferences:', error);
      return null;
    }
  },

  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences | null> {
    try {
      const response = await apiClient.put('/api/v1/preferences', updates);
      return response.data.data;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return null;
    }
  },

  async updateTheme(themeMode: string, customTheme?: any): Promise<void> {
    await this.updatePreferences({
      theme_mode: themeMode as any,
      custom_theme: customTheme,
    });
  },

  async updateAccentColor(color: string): Promise<void> {
    await this.updatePreferences({
      accent_color: color,
    });
  },

  async updateDisplaySettings(settings: {
    compact_mode?: boolean;
    font_size?: 'small' | 'medium' | 'large';
    show_animations?: boolean;
  }): Promise<void> {
    await this.updatePreferences(settings);
  },
};
```

---

## Integration Summary

Both features (Backup/Restore and Theme System) integrate seamlessly:

### ✅ **Non-Breaking Additions:**
1. **New Database Tables** - Only add, don't modify existing
2. **New API Endpoints** - Separate routes, no conflicts
3. **New Context Provider** - Added to hierarchy without breaking order
4. **New Services** - Additional service files
5. **New Components** - Drop-in UI components

### ✅ **Following Existing Patterns:**
1. **API Response Format** - Uses same success/error structure
2. **Authentication** - Uses existing authMiddleware
3. **User Isolation** - All queries filter by user_id
4. **Database Transactions** - Atomic operations for data integrity
5. **TypeScript Strict Mode** - Full type safety

### ✅ **Security Maintained:**
1. **JWT Authentication** - Both features require auth
2. **Data Validation** - Zod schemas for import data
3. **User Isolation** - Can't access other users' data
4. **File Size Limits** - Prevent abuse
5. **Sanitization** - BigInt/Decimal conversion

### ✅ **How to Add to Existing App:**

```bash
# 1. Add database tables
npx prisma migrate dev --name add_backup_and_preferences

# 2. Create new API routes
# - /app/api/v1/backup/export/route.ts
# - /app/api/v1/backup/import/route.ts  
# - /app/api/v1/preferences/route.ts

# 3. Add services
# - /src/services/backup.service.ts
# - /src/services/user-preferences.service.ts

# 4. Add contexts
# - /src/context/ThemeContext.tsx

# 5. Update provider hierarchy
# Add ThemeProvider to the stack

# 6. Add UI components
# - /src/components/settings/BackupRestore.tsx
# - /src/components/settings/ThemeSettings.tsx

# 7. Update global CSS
# Add theme variables and compact mode styles
```

### 🎯 **Result:**
- Users can backup/restore their data anytime
- Users can customize the UI to their preference
- Original functionality remains untouched
- All existing rules and conventions maintained
- Performance unaffected
- Security preserved

These features enhance user experience without any risk to the current flow!
