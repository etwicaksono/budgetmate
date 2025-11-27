# Migration Guide: UUID to CUID

This guide explains how to migrate your database from UUID to CUID for sortable IDs.

## What Changed

All model IDs have been updated from `@default(uuid())` to `@default(cuid())` in the Prisma schema.

### Why CUID?

- **Time-sortable**: IDs are k-sortable, making time-based queries more efficient
- **Collision-resistant**: Extremely low collision probability
- **Shorter**: 24 characters vs 36 for UUIDs
- **URL-safe**: No special characters
- **Performance**: Better for database indexing with time-based access patterns

## Database Impact

**Important**: Both UUID and CUID are stored as `String` in PostgreSQL, so the actual database column types don't change. The difference is in how new IDs are generated.

### What This Means

- **Existing records**: Keep their current IDs (no data migration needed)
- **New records**: Will use CUID format starting now
- **Mixed IDs**: Database will contain both UUID and CUID formats (this is fine)

## Migration Steps

### Option 1: Fresh Database (Recommended for Development)

If you can drop and recreate your database:

\`\`\`bash
# 1. Drop your existing database
# In PostgreSQL:
psql -U postgres
DROP DATABASE finance_temp;
CREATE DATABASE finance_temp;
\\q

# 2. Remove old migrations
Remove-Item -Recurse -Force prisma/migrations

# 3. Create fresh migration with CUID
npx prisma migrate dev --name init_with_cuid

# 4. Generate Prisma Client
npx prisma generate
\`\`\`

### Option 2: Keep Existing Data

If you need to preserve existing data:

\`\`\`bash
# 1. Apply schema changes (no actual DB changes needed since both are strings)
npx prisma db push

# 2. Generate Prisma Client
npx prisma generate
\`\`\`

**Note**: Existing records keep their UUIDs, new records will use CUIDs. This is perfectly fine since both are strings.

## Verification

After migration, verify that new records use CUID format:

\`\`\`sql
-- Check a recently created record
SELECT id FROM "User" ORDER BY created_at DESC LIMIT 1;

-- CUID format example: clh12345678901234567890
-- UUID format example: 550e8400-e29b-41d4-a716-446655440000
\`\`\`

## Application Code

No changes needed in application code! Prisma handles ID generation automatically:

\`\`\`typescript
// IDs are generated automatically
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    // id is auto-generated as CUID
  }
});
\`\`\`

## Benefits in Practice

### Better Query Performance

\`\`\`typescript
// Time-range queries benefit from sortable IDs
const recentTransactions = await prisma.transaction.findMany({
  where: {
    created_at: {
      gte: new Date('2025-01-01')
    }
  },
  orderBy: { id: 'desc' } // More efficient with CUID
});
\`\`\`

### Efficient Pagination

\`\`\`typescript
// Cursor-based pagination works better with sortable IDs
const page = await prisma.transaction.findMany({
  take: 20,
  cursor: {
    id: lastId // CUID allows efficient seeking
  },
  orderBy: { id: 'desc' }
});
\`\`\`

## Troubleshooting

### Migration Fails with "non-interactive" Error

Run in a proper terminal (not from IDE):

\`\`\`bash
# Windows PowerShell
cd D:/Project/FinanceApp/experiment-rewrite/finance-app
npx prisma migrate dev --name init_with_cuid
\`\`\`

### Want to Use CUID2 Instead?

CUID2 is even better but requires application-level generation:

\`\`\`typescript
// In your service layer
import { generateSortableId } from '@/lib/id-generator';

const user = await prisma.user.create({
  data: {
    id: generateSortableId(), // Explicitly use CUID2
    email: 'user@example.com'
  }
});
\`\`\`

Then update schema to not have `@default()`:

\`\`\`prisma
model User {
  id String @id // No @default, generate in app code
  // ... other fields
}
\`\`\`

## References

- [CUID Documentation](https://github.com/paralleldrive/cuid)
- [CUID2 Documentation](https://github.com/paralleldrive/cuid2)
- [Prisma CUID](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#cuid)
- [Why Sortable IDs Matter](https://medium.com/@yonatankra/time-sortable-uuids-f36f2a8e5e9a)
