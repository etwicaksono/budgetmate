# Plan: Menambahkan Field `analytic_flag` ke Model Category

## Konteks & Masalah

Field `analytic_flag` sudah dipakai di layer frontend (form, service, tipe) dan **kolomnya sudah ada di database** (migration `20260428000000_add_analytic_flag` menambahkan `analytic_flag VARCHAR(20) NOT NULL DEFAULT 'expense'`), TETAPI:

1. **`prisma/schema.prisma` (model `Category`) tidak punya field `analytic_flag`** → schema drift antara Prisma dan DB. Prisma Client tidak mengenal field ini, sehingga tidak bisa dibaca/ditulis lewat Prisma.
2. **POST `/api/v1/categories` (create)** tidak menyimpan `analytic_flag` ke DB, dan tidak mengembalikannya di response.
3. **PUT `/api/v1/categories/[id]` (update)** tidak memasukkan `analytic_flag` ke `updateData`, tidak melakukan propagasi ke child, dan tidak mengembalikannya di response.
4. **GET (list & single)** tidak mengembalikan `analytic_flag` di response.
5. **`CategoryModal.tsx`** saat reset form mode "add" (blok `else`) tidak menyertakan default `analytic_flag`, sehingga nilainya bisa `undefined`.

## Tujuan

Membuat `analytic_flag` konsisten dari DB → Prisma → API (create/update/read) → frontend, sehingga nilai yang dipilih user di form tersimpan dan terbaca dengan benar.

## Aturan Bisnis `analytic_flag`

- Hanya relevan (dapat diubah user) ketika `type === 'both'`.
- Jika `type === 'income'` → efektif `income`. Jika `type === 'expense'` → efektif `expense`.
- Default kolom di DB: `'expense'`.
- Child category mewarisi `type` dari parent, jadi `analytic_flag` juga sebaiknya ikut dipropagasi saat parent berubah (mengikuti pola propagasi `color`/`type` yang sudah ada).

---

## Langkah Implementasi

### 1. `prisma/schema.prisma` — Tambah field ke model `Category`

Tambahkan field di model `Category` (setelah `type`) agar sinkron dengan kolom DB yang sudah ada:

```prisma
model Category {
  id            String         @id @default(cuid())
  user_id       String
  parent_id     String?
  name          String         @db.VarChar(100)
  type          CategoryType
  analytic_flag CategoryType   @default(expense) @db.VarChar(20)
  nature        CategoryNature @default(WANT)
  ...
}
```

Catatan:
- Kolom DB bertipe `VARCHAR(20)` dengan nilai `'income'`/`'expense'`. Karena `CategoryType` enum juga punya nilai `both`, gunakan tetapi jaga agar validasi hanya mengizinkan `income`/`expense` (validasi sudah dilakukan di Zod). Alternatif: pakai `String @default("expense") @db.VarChar(20)` agar 1:1 dengan kolom existing dan menghindari mismatch enum. **Rekomendasi: gunakan `String` untuk mencocokkan kolom `VARCHAR(20)` yang sudah ada** dan hindari perlu migrasi tipe.

Final (rekomendasi):
```prisma
  analytic_flag String         @default("expense") @db.VarChar(20)
```

### 2. Regenerasi Prisma Client & selaraskan migration

- Karena kolom sudah ada di DB (via migration `20260428000000`), **tidak perlu** migration baru untuk menambah kolom.
- Jalankan `npx prisma generate` untuk memperbarui Prisma Client.
- Verifikasi tidak ada drift lain: `npx prisma migrate status`. Jika Prisma mendeteksi perbedaan, buat migration `--create-only` yang no-op / selaras (jangan drop kolom).

### 3. POST `app/api/v1/categories/route.ts` (create)

- Saat `prisma.category.create`, tambahkan `analytic_flag`:
  ```ts
  const resolvedAnalyticFlag =
    categoryType === 'both'
      ? (data.analytic_flag ?? 'expense')
      : (categoryType === 'income' ? 'income' : 'expense');
  ```
  lalu masukkan ke `data: { ..., analytic_flag: resolvedAnalyticFlag }`.
- Jika ada `parent_id`, warisi `analytic_flag` dari parent (mengikuti pola inherit `color`).
- Tambahkan `analytic_flag: category.analytic_flag` ke objek `response`.

### 4. PUT `app/api/v1/categories/[id]/route.ts` (update)

- Tambahkan ke `updateData`:
  ```ts
  if (data.analytic_flag !== undefined) updateData['analytic_flag'] = data.analytic_flag;
  ```
  Pertimbangkan aturan: jika `type` diubah menjadi `income`/`expense`, set `analytic_flag` sesuai type; jika `both`, pakai `data.analytic_flag` (fallback nilai existing / `'expense'`).
- Pada blok propagasi child (`existingCategory.parent_id === null`), tambahkan:
  ```ts
  if (data.analytic_flag !== undefined) childUpdateData.analytic_flag = data.analytic_flag;
  ```
- Tambahkan `analytic_flag: updated.analytic_flag` ke objek `response`.

### 5. GET (list & single) — kembalikan `analytic_flag`

- `route.ts` GET (list): tambahkan `analytic_flag: category.analytic_flag` di `transformedCategories`.
- `[id]/route.ts` GET (single): tambahkan `analytic_flag: category.analytic_flag` di `response`.

### 6. `src/components/category/CategoryModal.tsx` — perbaiki reset form

Pada blok `else` di `useEffect` (mode "add"), tambahkan default:
```ts
setFormData({
  name: '',
  type: 'expense',
  analytic_flag: 'expense',
  nature: 'WANT',
  icon: 'FaGift',
  color: '#dc3545',
  parent_id: null,
  is_active: true,
});
```

### 7. Verifikasi tipe frontend (sudah ada, cek konsistensi)

- `src/services/categoryService.ts`: `Category.analytic_flag`, `CreateCategoryPayload.analytic_flag`, `UpdateCategoryPayload.analytic_flag` sudah ada — pastikan tetap konsisten.
- `src/lib/validation/category.ts`: `CreateCategorySchema` & `UpdateCategorySchema` sudah punya `analytic_flag` — OK.
- Cek `src/lib/openapi/schemas/categories.ts` apakah perlu ditambah `analytic_flag` agar dokumentasi OpenAPI konsisten.

---

## Verifikasi / Testing

1. `npx prisma generate` sukses tanpa error.
2. `npx prisma migrate status` tidak menampilkan drift.
3. Lint & typecheck: `npm run lint`, `npm run typecheck` (atau `tsc --noEmit`).
4. Manual/integration:
   - Create category `type=both` dengan `analytic_flag=income` → tersimpan & terbaca di GET.
   - Update category `type=both` mengubah `analytic_flag` → tersimpan.
   - Update parent `type` → child ikut ter-update `analytic_flag`.
   - Create/edit `type=income`/`expense` → `analytic_flag` mengikuti type.
5. Jalankan unit test terkait categories jika ada.

## Ringkasan File yang Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah field `analytic_flag` ke model `Category` |
| `app/api/v1/categories/route.ts` | Simpan & kembalikan `analytic_flag` (POST + GET list) |
| `app/api/v1/categories/[id]/route.ts` | Simpan (update + propagasi child) & kembalikan `analytic_flag` (PUT + GET single) |
| `src/components/category/CategoryModal.tsx` | Default `analytic_flag` di reset form mode add |
| `src/lib/openapi/schemas/categories.ts` | (opsional) Tambah `analytic_flag` ke schema OpenAPI |

## Catatan / Risiko

- Tidak perlu migration DB baru karena kolom sudah ada; hanya sinkronisasi schema Prisma.
- Pastikan tipe di `schema.prisma` (`String @db.VarChar(20)`) cocok dengan kolom existing untuk menghindari `prisma migrate` ingin mengubah tipe kolom.
- Nilai lama di DB sudah default `'expense'` (NOT NULL), sehingga aman dibaca.
