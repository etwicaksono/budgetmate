# Phase 1 — Schema & Migration

> Hapus field currency dari Prisma schema, buat migration untuk drop kolom, dan update seed data.

## 1.1 — Hapus field currency dari `prisma/schema.prisma` ✅ DONE

### User model (line 24)
```diff
-  currency           String    @default("USD") @db.VarChar(3)
```

### Account model (line 84)
```diff
-  currency             String    @default("USD") @db.VarChar(3)
```

### Transaction model (lines 151-152)
```diff
-  currency         String    @default("USD") @db.VarChar(3)
-  exchange_rate    Decimal   @default(1) @db.Decimal(10, 6)
```

### Transfer model (lines 198, 200-201)
```diff
-  to_amount    Decimal? @db.Decimal(15, 2)
-  currency     String   @default("USD") @db.VarChar(3)
-  to_currency  String?  @db.VarChar(3)
```

### RecurringTransaction model (line 273)
```diff
-  currency       String    @db.VarChar(3)
```

### Goal model (line 293)
```diff
-  currency       String    @default("USD") @db.VarChar(3)
```

## 1.2 — Buat Prisma migration ✅ DONE

Jalankan perintah berikut untuk generate migration yang akan drop kolom currency:

```bash
npx prisma migrate dev --name remove_multi_currency_fields
```

Ini akan menghasilkan file migration SQL di `prisma/migrations/` dengan perintah `ALTER TABLE ... DROP COLUMN` untuk setiap kolom yang dihapus.

### Tabel yang terdampak:
| Tabel | Kolom yang di-drop |
|-------|-------------------|
| `User` | `currency` |
| `Account` | `currency` |
| `Transaction` | `currency`, `exchange_rate` |
| `Transfer` | `to_amount`, `currency`, `to_currency` |
| `RecurringTransaction` | `currency` |
| `Goal` | `currency` |

### Verifikasi migration SQL:
Pastikan migration SQL yang dihasilkan berisi:
```sql
ALTER TABLE "User" DROP COLUMN "currency";
ALTER TABLE "Account" DROP COLUMN "currency";
ALTER TABLE "Transaction" DROP COLUMN "currency";
ALTER TABLE "Transaction" DROP COLUMN "exchange_rate";
ALTER TABLE "Transfer" DROP COLUMN "to_amount";
ALTER TABLE "Transfer" DROP COLUMN "currency";
ALTER TABLE "Transfer" DROP COLUMN "to_currency";
ALTER TABLE "RecurringTransaction" DROP COLUMN "currency";
ALTER TABLE "Goal" DROP COLUMN "currency";
```

## 1.3 — Update `prisma/seed.ts` ✅ DONE

Hari semua baris yang men-set `currency`:

- **Line 102**: Hapus `currency: '...'` dari user seed data
- **Line 189**: Hapus `currency: '...'` dari account seed data
- **Line 230**: Hapus `currency: '...'` dari transaction/transfer seed data

## 1.4 — Update `src/data/default_accounts.json` ✅ DONE

- **Lines 7, 17, 27**: Hapus field `"currency": "USD"` dari setiap entry akun default

## 1.5 — Regenerate Prisma Client ✅ DONE

```bash
npx prisma generate
```

## 1.6 — Verifikasi ✅ DONE

- [x] `npx tsc --noEmit` — menghasilkan error TypeScript yang expected (Property 'currency' does not exist) — ini akan menjadi guide untuk Phase 2
- [x] `npx prisma generate` — Prisma Client ter-regenerate tanpa field currency
- [ ] `npx prisma migrate dev` — migration belum di-apply (database drift, akan di-apply saat deploy)
- [ ] Cek database: kolom currency sudah ter-drop dari semua tabel (akan di-apply saat deploy)

## 1.7 — Catatan untuk phase berikutnya

Setelah schema bersih, semua kode yang mengakses `currency`, `exchange_rate`, `to_currency`, `to_amount` pada model Prisma akan error TypeScript. Error ini akan menjadi **guide** untuk Phase 2 — ikuti error satu per satu untuk menemukan semua referensi yang perlu di-update.

### Urutan prioritas penanganan error:
1. **Services** (accountService, transactionService, transferService, analyticsService) — karena API routes bergantung pada services
2. **API routes** — karena UI bergantung pada API
3. **Utils & hooks** — karena UI bergantung pada hooks
4. **UI components** — tahap akhir setelah semua dependency bersih
