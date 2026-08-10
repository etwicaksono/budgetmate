# Task Breakdown: Bulk Edit Transactions

Dokumen desain: [`bulk-edit-transactions.md`](./bulk-edit-transactions.md)

## Status

| Task | Status | Commit |
|---|---|---|
| T1 — Zod schema | selesai | `49f3a23` |
| T2 — Where builder + unit test | selesai | `41ba82a` |
| T3 — Refactor DELETE | selesai | `8d9fecd` |
| T4 — Handler PATCH | selesai | `abc64fe` |
| T5 — `api.patch` | selesai | `16e1c08` |
| T6 — Service method | selesai | `a19b7d7` |
| T7 — Konstanta payment | selesai | `ff8424e` |
| T8 — `BulkEditModal` | selesai | `9170dd0` |
| T9 — Wiring halaman | selesai | `e8f601a` |
| T10 — OpenAPI | selesai | `e46bf0b` |
| T11 — Verifikasi otomatis | selesai | type-check, lint, 67 test, build hijau |
| T11 — Verifikasi manual | **belum** | 22 skenario E2E + query DB, **gate Fase 2** |

Perbaikan menyusul setelah T11: `bbf1562` (bug `category_id` pada `updateMany`), `d22e9c2` (selector label selalu aktif), `2d31f4a` (mode append + `label_mode`).

Fase 2 (T12–T15) **belum boleh dimulai** sampai verifikasi manual T11 selesai.

Keputusan yang mengikat seluruh task di bawah:

1. Labels = **Replace atau Append**, ditentukan `label_mode`. Checkbox "Replace existing labels" mati = append, nyala = replace (pilihan kosong berarti hapus semua). Lihat tabel di dokumen desain.
2. **Dukung** `allMatching` + `filters` (mode "Select all N matching records").
3. Transfer & debt **di-skip**, jumlahnya dilaporkan.
4. Field kosong = **tidak diubah**. Tidak ada fitur "clear field".
5. **Category** ikut bisa di-bulk-update. Transaksi yang tipenya tidak cocok dengan tipe kategori **di-skip**, bukan menggagalkan seluruh request.
6. Response memakai **rincian skip per alasan**: `skipped: { transferOrDebt, categoryTypeMismatch }`.
7. Dropdown kategori di modal **selalu menampilkan semua kategori** (tidak difilter berdasarkan tipe seleksi).

## Aturan Kecocokan Tipe Kategori

`prisma/schema.prisma` mendefinisikan `CategoryType` = `income | expense | both`, sedangkan `TransactionType` = `income | expense | transfer_in | transfer_out | debt_in | debt_out`.

Aturan yang dipakai `POST /transactions` (`route.ts:358-366`) dan `PUT /transactions/[id]`: kategori bertipe `both` menerima semua, selain itu `category.type` harus sama persis dengan `transaction.type`.

Untuk bulk edit, aturan yang sama diterapkan tetapi **hasilnya skip, bukan error**:

| Kategori dipilih | Transaksi `income` | Transaksi `expense` |
|---|---|---|
| `type: 'both'` | update | update |
| `type: 'income'` | update | skip (`categoryTypeMismatch`) |
| `type: 'expense'` | skip (`categoryTypeMismatch`) | update |

Transaksi `transfer_*` dan `debt_*` tidak pernah sampai ke pengecekan ini karena sudah lebih dulu di-skip sebagai `transferOrDebt`. Setiap baris hanya dihitung pada **satu** kategori skip (prioritas: transferOrDebt lebih dulu), sehingga `updatedCount + skipped.transferOrDebt + skipped.categoryTypeMismatch === requestedCount`.

## Konvensi

- Setiap task punya **DoD (Definition of Done)** berupa checklist yang bisa diverifikasi.
- `npm run type-check` dan `npm run lint` wajib bersih di akhir setiap task yang menyentuh kode.
- `tsconfig.json` memakai `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals`, `noPropertyAccessFromIndexSignature`. Semua kode baru harus lolos tanpa `any` dan tanpa `@ts-ignore`.

## Urutan & Dependensi

```
T1 (schema) ─┐
T2 (helper)  ├─> T4 (PATCH handler) ─> T6 (service) ─> T9 (wiring) ─> T11 (verifikasi)
T3 (refactor DELETE) ─┘                    ↑              ↑
T5 (api.patch) ────────────────────────────┘              │
T7 (constants) ─> T8 (modal) ─────────────────────────────┘
T10 (OpenAPI) — bisa paralel setelah T1
```

Urutan commit yang disarankan: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11.

**Fase 2 (T12-T15)** — perbaikan hard delete → soft delete pada bulk delete — ada di bagian akhir dokumen dan **baru boleh dimulai setelah T11 terverifikasi aman**.

---

## T1 — Zod schema untuk bulk update

**File**: `src/lib/validation/transaction.ts`

Tambahkan `BulkUpdateTransactionsSchema` + type `BulkUpdateTransactionsInput` setelah `UpdateTransactionSchema`, mengikuti gaya `cuidRegex` yang sudah ada di file.

Aturan:

- `allMatching`: boolean optional, default `false`.
- `ids`: array CUID, optional, `.max(1000)`.
- `filters`: `z.record(z.unknown()).optional()` (divalidasi ulang oleh helper T2).
- `data`: object berisi `description`, `payee` (max 255), `payment_method` (max 50), `payment_status` (max 32), `category_id` (CUID), `label_ids` (array CUID) — semuanya optional.
- String field pakai `.trim().min(1)` sehingga string kosong **ditolak** (bukan diam-diam dianggap clear).
- `category_id` pakai `cuidRegex` seperti field ID lain di file ini. Tidak menerima `null` — mengosongkan kategori tidak didukung (konsisten dengan keputusan 4).
- `superRefine`: error jika (`!allMatching` dan `ids` kosong) atau `data` tidak punya key sama sekali.

**DoD**

- [ ] `BulkUpdateTransactionsSchema` dan `BulkUpdateTransactionsInput` diekspor.
- [ ] `{ ids: ['x'], data: {} }` → invalid, pesan menyebut "At least one field".
- [ ] `{ data: { payee: 'A' } }` tanpa `ids` dan tanpa `allMatching` → invalid.
- [ ] `{ allMatching: true, data: { payee: 'A' } }` → valid.
- [ ] `{ ids: ['clq...'], data: { payee: '   ' } }` → invalid (trim jadi kosong).
- [ ] `{ ids: ['clq...'], data: { label_ids: [] } }` → valid, `label_mode` default `append` (tidak mengubah label).
- [ ] `{ ids: ['clq...'], data: { label_ids: [], label_mode: 'replace' } }` → valid (hapus semua label).
- [ ] `{ ids: ['clq...'], data: { label_mode: 'append' } }` → **invalid**, `label_mode` punya default sehingga tidak boleh dihitung sebagai perubahan.
- [ ] `{ ids: ['clq...'], data: { label_ids: [], label_mode: 'merge' } }` → invalid (enum).
- [ ] `{ ids: ['clq...'], data: { category_id: 'clq...' } }` → valid.
- [ ] `{ ids: ['clq...'], data: { category_id: 'bukan-cuid' } }` → invalid.
- [ ] `{ ids: ['clq...'], data: { category_id: null } }` → invalid (bukan diam-diam jadi uncategorized).
- [ ] `payee` 256 karakter → invalid; `payment_method` 51 karakter → invalid; `payment_status` 33 karakter → invalid (sesuai batas kolom DB).
- [ ] Tidak ada perubahan perilaku pada schema lain di file yang sama.

---

## T2 — Ekstrak filter → Prisma where builder

**File baru**: `src/lib/api/transactionFilters.ts`

Signature:

```ts
export async function buildTransactionWhere(
  userId: string,
  filters: Record<string, unknown> | undefined
): Promise<Prisma.TransactionWhereInput>
```

Isi = penyatuan logika filter dari `GET /api/v1/transactions` (`app/api/v1/transactions/route.ts:47-172`) dan blok `allMatching` di `app/api/v1/transactions/bulk/route.ts`. Yang wajib ditangani:

`account_id` / `account_ids`, `category_id` / `category_ids` (termasuk ekspansi child category seperti di bulk DELETE), `type`, `transfer_option`, `debt_option`, `draft_option`, `start_date` / `end_date` (end-of-day UTC), `min_amount` / `max_amount` (pola OR positif/negatif via `AND[]`), `keyword` / `search`, `label_ids`.

Wajib selalu menambahkan `user_id: userId` dan `deleted_at: null`.

Kombinasi `transfer_option='only'` + `debt_option='only'` mustahil dipenuhi. Karena helper tidak bisa mengembalikan `NextResponse`, lempar error khusus yang bisa dipetakan caller ke HTTP 400:

```ts
export class InvalidFilterError extends Error {}
```

**DoD**

- [ ] File baru mengekspor `buildTransactionWhere` dan `InvalidFilterError`.
- [ ] `filters` `undefined` → where hanya `{ user_id, deleted_at: null }` plus default `is_draft: false`.
- [ ] Tanpa `draft_option` → `is_draft: false` (mempertahankan default GET saat ini).
- [ ] `draft_option: 'include'` → tidak ada key `is_draft` di hasil.
- [ ] `transfer_option: 'only'` + `debt_option: 'only'` → melempar `InvalidFilterError`.
- [ ] `end_date` menghasilkan `lte` pada 23:59:59.999 UTC.
- [ ] `account_ids`/`category_ids`/`label_ids` di-`slice(0, 50)` seperti GET.
- [ ] `min_amount`/`max_amount` dan `search` masuk ke `AND[]`, tidak menimpa key lain.
- [ ] Punya unit test `__tests__` (jest sudah tersedia di project) minimal untuk 4 kasus di atas.

---

## T3 — Refactor handler DELETE bulk agar memakai helper

**File**: `app/api/v1/transactions/bulk/route.ts`

Ganti blok filter inline (~baris 27-137) dengan `buildTransactionWhere`. Tangkap `InvalidFilterError` → `errorResponse('INVALID_FILTER', err.message, 400)`.

Task ini murni refactor: **perilaku DELETE tidak boleh berubah** kecuali dua perbaikan bug yang memang dibawa helper:

- kini menghormati `draft_option` (sebelumnya diabaikan),
- kini menghormati `keyword` sebagai alias `search`.

Catatan: helper menambahkan `deleted_at: null`. Untuk DELETE ini tidak mengubah hasil akhir secara praktis (baris ter-soft-delete sudah tidak muncul di UI), tapi mencegah hard-delete baris yang sudah ter-soft-delete.

> Di luar scope: DELETE bulk masih `deleteMany` (hard delete) sementara `DELETE /transactions/[id]` soft delete. Catat sebagai follow-up, jangan diubah di task ini.

**DoD**

- [ ] Tidak ada lagi blok pembangunan `whereClause` inline di file ini.
- [ ] Bulk delete by `ids` tetap berfungsi (tidak menyentuh helper).
- [ ] Bulk delete `allMatching` dengan filter kategori + rentang tanggal menghapus jumlah baris yang sama seperti sebelum refactor (verifikasi manual dengan data seed).
- [ ] `transfer_option='only'` + `debt_option='only'` → HTTP 400 `INVALID_FILTER`.
- [ ] Response shape `{ deletedCount }` tidak berubah.

---

## T4 — Handler `PATCH /api/v1/transactions/bulk`

**File**: `app/api/v1/transactions/bulk/route.ts` (tambah export baru, file yang sama dengan DELETE)

Alur:

1. `requireAuth(req)`; jika `'error' in authResult` → return `authResult.error`.
2. `BulkUpdateTransactionsSchema.safeParse(await req.json())`; gagal → `errorResponse('VALIDATION_ERROR', 'Validation failed', 400, validation.error.errors)`.
3. Bangun `baseWhere`:
   - `allMatching` → `await buildTransactionWhere(userId, filters)`
   - selain itu → `{ id: { in: ids }, user_id: userId, deleted_at: null }`
4. `requestedCount = await prisma.transaction.count({ where: baseWhere })`.
5. Bangun `eligibleWhere` dengan menggabungkan guard skip lewat `AND` (**jangan** menimpa `baseWhere.type`):

```ts
const skipGuard: Prisma.TransactionWhereInput = {
  type: { notIn: [
    TransactionType.transfer_in, TransactionType.transfer_out,
    TransactionType.debt_in, TransactionType.debt_out,
  ] },
  transfer_id: null,
  debt_id: null,
};

const eligibleWhere: Prisma.TransactionWhereInput = {
  ...baseWhere,
  AND: [
    ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : baseWhere.AND ? [baseWhere.AND] : []),
    skipGuard,
  ],
};
```

6. Jika `data.category_id` ada: verifikasi kategori milik user dan aktif — pola sama dengan `POST /transactions` (`route.ts:344-356`). Kategori memakai `is_active` sebagai flag soft-delete, **bukan** `deleted_at`.

```ts
const category = await prisma.category.findFirst({
  where: { id: data.category_id, user_id: userId, is_active: true },
  select: { id: true, type: true },
});
if (!category) {
  return errorResponse('INVALID_CATEGORY', 'Category not found or inactive', 404);
}
```

7. Jika `data.label_ids` ada dan tidak kosong: verifikasi semua label milik user (`prisma.label.findMany`), mismatch → `errorResponse('INVALID_LABEL', 'One or more labels not found', 404)`.

8. Jika kategori bertipe `income` atau `expense` (bukan `both`), persempit `eligibleWhere` agar hanya menyentuh transaksi bertipe sama:

```ts
const typeConstrainedWhere: Prisma.TransactionWhereInput =
  category && category.type !== 'both'
    ? { ...eligibleWhere, AND: [...(eligibleWhere.AND as Prisma.TransactionWhereInput[]), { type: category.type as TransactionType }] }
    : eligibleWhere;
```

Hitung juga `eligibleCount = await prisma.transaction.count({ where: eligibleWhere })` untuk memisahkan dua alasan skip:

```ts
const skipped = {
  transferOrDebt: requestedCount - eligibleCount,
  categoryTypeMismatch: eligibleCount - updatedCount,
};
```

9. Bangun `scalarUpdate` dengan spread bersyarat (`exactOptionalPropertyTypes` aktif, jangan kirim key `undefined`). Sertakan `category_id` bila ada, selalu set `updated_at: new Date()` dan `updated_by: userId`.

10. Eksekusi (semua memakai `typeConstrainedWhere`):
   - `label_ids` **tidak** ada → satu `prisma.transaction.updateMany({ where: typeConstrainedWhere, data: scalarUpdate })`, `updatedCount = result.count`.
   - `label_ids` ada **dan** benar-benar menulis label (mode `replace`, atau mode `append` dengan minimal 1 label) → `findMany({ where: typeConstrainedWhere, select: { id: true } })`, lalu per chunk 500 di dalam `prisma.$transaction`: `updateMany` scalar → `transactionLabel.deleteMany` **hanya bila mode `replace`** → `createMany({ skipDuplicates: true })` jika `label_ids.length > 0`. Mode `append` dengan `label_ids: []` tidak mengubah label, jadi ikut jalur `updateMany` tunggal.
11. Guard ukuran: jika `label_ids` ada dan `requestedCount > 10000` → `errorResponse('TOO_MANY_RECORDS', 'Label update is limited to 10000 transactions per request', 400)`.
12. Response:

```ts
return successResponse(
  { updatedCount, skipped },
  { message: `Successfully updated ${updatedCount} transaction(s)` },
  200
);
```

13. `catch` → `logError('Bulk update error:', error)` + `errorResponse('INTERNAL_ERROR', 'Failed to update transactions', 500)`.

> **Amount tidak disentuh.** Mengubah kategori tidak mengubah `type` maupun tanda `amount`, jadi tidak ada rekalkulasi saldo. Justru karena itulah transaksi yang tipenya tidak cocok harus di-skip, bukan dipaksa — memaksa akan menghasilkan baris income bertanda positif dengan kategori expense, yang merusak agregasi di `analytics/expenses-by-category`.

**DoD**

- [ ] Tanpa auth → 401 (mengikuti `requireAuth`).
- [ ] `ids` berisi transaksi milik user lain → tidak ikut ter-update; `updatedCount` hanya menghitung milik user sendiri.
- [ ] Update `payee` saja → `description`, `payment_method`, `payment_status`, `category_id`, dan label tidak berubah di DB.
- [ ] Update 3 field scalar sekaligus → ketiganya berubah dalam satu request.
- [ ] `label_ids: ['a','b']` → transaksi target punya **tepat** label a & b; label lama hilang.
- [ ] `label_ids: []` → semua `TransactionLabel` transaksi target terhapus.
- [ ] `label_ids` berisi ID label milik user lain → 404 `INVALID_LABEL`, **tidak ada** perubahan tersimpan (tidak ada partial write).
- [ ] `category_id` milik user lain atau `is_active: false` → 404 `INVALID_CATEGORY`, tidak ada perubahan tersimpan.
- [ ] Kategori `type: 'both'` + seleksi campuran income & expense → semua ter-update, `categoryTypeMismatch: 0`.
- [ ] Kategori `type: 'expense'` + seleksi 4 expense & 3 income → `updatedCount: 4`, `skipped.categoryTypeMismatch: 3`; baris income **tidak** berubah sama sekali (termasuk field scalar lain di request yang sama).
- [ ] Kategori diubah bersamaan dengan `payee` → keduanya diterapkan hanya pada baris yang tipenya cocok.
- [ ] Seleksi campuran (5 expense + 2 transfer + 1 debt) → `updatedCount: 5`, `skipped.transferOrDebt: 3`, `skipped.categoryTypeMismatch: 0`.
- [ ] Invariant terpenuhi: `updatedCount + skipped.transferOrDebt + skipped.categoryTypeMismatch === requestedCount`.
- [ ] `allMatching: true` + `filters: { transfer_option: 'only' }` → `updatedCount: 0`, `skipped.transferOrDebt` = jumlah transfer yang cocok.
- [ ] Nilai `amount` dan `type` tidak pernah berubah oleh endpoint ini.
- [ ] Baris dengan `deleted_at != null` tidak pernah ter-update.
- [ ] `updated_at` dan `updated_by` terisi pada semua baris yang ter-update.
- [ ] Handler DELETE di file yang sama tetap berfungsi.

---

## T5 — Tambah `patch` di wrapper API

**File**: `src/services/api.ts`

Tambahkan setelah `put` (baris ~180), meniru pola `put` persis:

```ts
patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
  return apiClient.patch(url, data, config).then(response => response.data);
},
```

**DoD**

- [ ] `api.patch` tersedia dan bertipe generik seperti `api.put`.
- [ ] Interceptor auth/refresh token yang sudah ada tetap berlaku (otomatis, karena memakai `apiClient` yang sama).
- [ ] Tidak menyentuh logika dedup `pendingGetRequests` milik `api.get`.

---

## T6 — Service method `bulkUpdateTransactions`

**File**: `src/services/transactionService.ts`

Tambahkan interface + method, ditempatkan tepat setelah `bulkDeleteTransactions` agar mudah dibandingkan:

```ts
export interface BulkUpdateTransactionsData {
  description?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  category_id?: string;
  label_ids?: string[];
  label_mode?: 'replace' | 'append';
}

export interface BulkUpdateTransactionsRequest {
  allMatching?: boolean;
  ids?: string[];
  filters?: TransactionFilters;
  data: BulkUpdateTransactionsData;
}

export interface BulkUpdateSkipBreakdown {
  transferOrDebt: number;
  categoryTypeMismatch: number;
}

export interface BulkUpdateTransactionsResult {
  updatedCount: number;
  skipped: BulkUpdateSkipBreakdown;
}

async bulkUpdateTransactions(
  payload: BulkUpdateTransactionsRequest
): Promise<BulkUpdateTransactionsResult> {
  const response = await api.patch<{ success: boolean; data: BulkUpdateTransactionsResult }>(
    '/transactions/bulk',
    payload
  );
  return response.data;
}
```

**DoD**

- [ ] Keempat interface diekspor dari `transactionService.ts`.
- [ ] Method mengembalikan `response.data` (bukan seluruh envelope), konsisten dengan `bulkDeleteTransactions`.
- [ ] `BulkUpdateTransactionsData` tidak memakai `| undefined` eksplisit agar cocok dengan `exactOptionalPropertyTypes`.
- [ ] Tidak ada perubahan pada method existing.

---

## T7 — Konsolidasi konstanta payment

**File**: `src/utils/constants.ts` dan `src/components/transaction/TransactionForm.tsx`

Masalah saat ini: `TransactionForm.tsx:12-13` punya array lokal yang **berbeda isinya** dari `constants.ts`:

| Sumber | Payment Method | Payment Status |
|---|---|---|
| `TransactionForm.tsx` | Cash, Credit Card, Debit Card, Bank Transfer, Digital Wallet | Cleared, Pending, Scheduled |
| `constants.ts` | + Check, Other | + Cancelled |

Langkah:

1. Di `constants.ts`, tambahkan setelah objek yang sudah ada:
   ```ts
   export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS);
   export const PAYMENT_STATUS_OPTIONS = Object.values(PAYMENT_STATUS);
   ```
2. Di `TransactionForm.tsx`, hapus dua array lokal dan impor dari constants.

> Konsekuensi yang harus disadari & disetujui: form transaksi biasa akan bertambah opsi `Check`, `Other`, dan `Cancelled`. Ini disengaja agar bulk edit dan form tunggal tidak drift. Data lama tidak terpengaruh (kolom bertipe string bebas).

**DoD**

- [ ] `PAYMENT_METHOD_OPTIONS` dan `PAYMENT_STATUS_OPTIONS` diekspor dari `src/utils/constants.ts`.
- [ ] `TransactionForm.tsx` tidak lagi mendeklarasikan array payment lokal.
- [ ] Dropdown di `TransactionForm` merender 7 payment method dan 4 payment status.
- [ ] Membuka transaksi lama yang `payment_method`-nya di luar daftar tidak menyebabkan crash (nilai lama tetap tersimpan sampai user mengubahnya).

---

## T8 — Komponen `BulkEditModal`

**File baru**: `app/(app)/transactions/_components/BulkEditModal.tsx`

Mengikuti pola folder `_components` yang sudah dipakai `TransactionFilterSidebar.tsx`, dan pola modal `react-bootstrap` dari `src/components/transaction/TransactionModal.tsx`.

Kontrak:

```tsx
export interface BulkEditValues {
  description?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  category_id?: string;
  label_ids?: string[];
  label_mode?: 'replace' | 'append';
}

interface BulkEditModalProps {
  show: boolean;
  onHide: () => void;
  targetCount: number;
  isGlobalSelectAll: boolean;
  onSubmit: (values: BulkEditValues) => Promise<void>;
}
```

Isi modal:

- **Header**: `Bulk Edit`.
- **Banner info** (`Alert variant="info"`):
  - `isGlobalSelectAll` → `Editing ALL {targetCount} matching transactions`
  - selain itu → `Editing {targetCount} transaction(s)`
  - Baris kecil: `Empty fields will be left unchanged. Transfer & debt transactions will be skipped.`
- **Category**: `TransactionCategorySelect` (`src/components/transaction/TransactionCategorySelect.tsx`), dipakai apa adanya tanpa prop `filterType` sehingga **semua kategori tampil**. Komponen ini sudah mengambil datanya sendiri lewat `categoryService` saat dropdown dibuka, jadi tidak perlu passing daftar kategori. Prop yang dipakai: `selectedCategoryId`, `onSelect`, `placeholder="Leave empty to keep unchanged"`.
  - Di bawah field, tampilkan teks bantu: `Transactions whose type doesn't match the selected category will be skipped.`
  - `TransactionCategorySelect` sudah menyediakan `ClearButton` bawaan untuk mengembalikan pilihan ke `null` (= tidak diubah).
- **Description**: `Form.Control type="text"`, placeholder `Leave empty to keep unchanged`.
- **Payee**: sama seperti Description.
- **Payment Method**: `Form.Select`, opsi pertama `value=""` berlabel `-- No change --`, sisanya dari `PAYMENT_METHOD_OPTIONS`.
- **Payment Status**: sama polanya dengan `PAYMENT_STATUS_OPTIONS`.
- **Labels**: checkbox `Replace existing labels` + `LabelMultiSelect` yang **selalu aktif**. Checkbox menentukan `label_mode`: centang = `replace` (pilihan kosong berarti hapus semua label), tidak centang = `append` (pilihan kosong berarti `label_ids` tidak dikirim sama sekali). Checkbox default mati dan otomatis menyala pada pemilihan label **pertama**, lalu tidak pernah menimpa toggle eksplisit user. Sumber `labels` dan `isLoading` dari `useTransactionData()`.
- **Footer**: `Cancel` + `Apply`. `Apply` disabled ketika tidak ada perubahan atau `isSubmitting`; tampilkan `Spinner` saat submit.

> Catatan z-index: dropdown `TransactionCategorySelect` memakai `zIndex: 1051` (baris ~253). Modal Bootstrap default `1055`, backdrop `1050`. Verifikasi dropdown tidak tertutup badan modal; kalau tertutup, bungkus dengan container ber-`position: relative` atau naikkan z-index lokal di modal — **jangan** mengubah komponen aslinya karena dipakai juga oleh `TransactionForm`.

Aturan submit:

- Bangun payload hanya dari field yang terisi; `trim()` string; buang yang jadi kosong.
- `category_id` disertakan hanya jika tidak `null`.
- `label_ids` disertakan **hanya** jika checkbox tercentang.
- Reset seluruh state form pada `useEffect` ketika `show` berubah jadi `false` (pola sama dengan `TransactionModal`).
- `onSubmit` di-`await`; jika melempar, modal tetap terbuka dan `isSubmitting` kembali `false` (page yang menampilkan Swal error).

**DoD**

- [ ] Modal terbuka/tertutup mengikuti prop `show`.
- [ ] `Apply` disabled saat semua field kosong dan checkbox label tidak dicentang.
- [ ] Mengisi Payee saja → `Apply` enabled; payload hanya `{ payee }`.
- [ ] Memilih kategori saja → `Apply` enabled; payload hanya `{ category_id }`.
- [ ] Dropdown kategori menampilkan kategori income **dan** expense sekaligus (tidak difilter).
- [ ] Dropdown kategori tampil di atas badan modal, tidak terpotong.
- [ ] Menekan clear pada kategori → `category_id` tidak ikut di payload.
- [ ] Memilih `-- No change --` pada select → key tidak ikut di payload.
- [ ] Checkbox label tidak dicentang → `label_ids` tidak ada di payload meski ada label ter-pilih sebelumnya.
- [ ] Checkbox label dicentang tanpa memilih label → payload berisi `label_ids: []` dan `Apply` enabled.
- [ ] Input berisi spasi saja → dianggap kosong, tidak masuk payload.
- [ ] Banner menampilkan `ALL {n} matching` saat `isGlobalSelectAll` true.
- [ ] Menutup lalu membuka kembali modal → semua field kembali kosong, termasuk kategori.
- [ ] Saat submit berlangsung, tombol disabled dan spinner tampil.
- [ ] Layout rapi di viewport mobile (modal scrollable, tidak ada overflow horizontal).

---

## T9 — Wiring di halaman Transactions

**File**: `app/(app)/transactions/page.tsx`

### T9a — Ekstrak `buildCurrentFilters`

Blok pembangunan `filters` untuk `allMatching` saat ini hidup di dalam `handleBulkDelete` (baris ~605-627). Angkat jadi `useCallback` terpisah agar dipakai bersama bulk edit:

```tsx
const buildCurrentFilters = useCallback((): TransactionFilters => {
  const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
  const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

  return {
    ...(startDateTime && { start_date: startDateTime }),
    ...(endDateTime && { end_date: endDateTime }),
    ...(searchTerm && { search: searchTerm }),
    ...(selectedCategories.length > 0 && categories.length > 0 && {
      category_ids: categories.filter(cat => selectedCategories.includes(cat.name)).map(cat => cat.id).join(',')
    }),
    ...(selectedAccounts.length > 0 && apiAccounts.length > 0 && {
      account_ids: apiAccounts.filter(acc => selectedAccounts.includes(acc.name)).map(acc => acc.id).join(',')
    }),
    ...(selectedLabelIds.length > 0 && { label_ids: selectedLabelIds.join(',') }),
    ...(minAmount > 0 && { min_amount: minAmount }),
    ...(maxAmount < Infinity && { max_amount: maxAmount }),
    ...(transferOption && { transfer_option: transferOption }),
    ...(debtOption && { debt_option: debtOption }),
    ...(draftOption && { draft_option: draftOption }),
  };
}, [dateRange, searchTerm, selectedCategories, categories, selectedAccounts, apiAccounts,
    selectedLabelIds, minAmount, maxAmount, transferOption, debtOption, draftOption]);
```

Catatan: versi lama **tidak** menyertakan `draft_option` — ini bug ringan yang sekalian diperbaiki di sini karena helper T2 sudah mendukungnya.

`handleBulkDelete` diubah untuk memanggil `buildCurrentFilters()`; dependency array-nya menyusut jadi `[selectedTransactionIds, isGlobalSelectAll, totalRecords, buildCurrentFilters, fetchTransactions]`.

**DoD T9a**

- [ ] Tidak ada duplikasi blok filter di `handleBulkDelete`.
- [ ] Bulk delete `allMatching` masih berfungsi identik (uji manual dengan filter kategori aktif).
- [ ] Dependency array `handleBulkDelete` menyusut dan lint `react-hooks/exhaustive-deps` bersih.
- [ ] `draft_option` kini ikut terkirim pada bulk delete `allMatching`.

### T9b — State & handler bulk edit

- Tambah `const [showBulkEdit, setShowBulkEdit] = useState(false);`
- Ganti isi `handleBulkEdit` (baris ~563) dari Swal placeholder menjadi `setShowBulkEdit(true)`; dependency array jadi `[]`.
- Tambah `handleBulkEditSubmit`:

```tsx
const handleBulkEditSubmit = useCallback(async (values: BulkEditValues) => {
  const payload: BulkUpdateTransactionsRequest = isGlobalSelectAll
    ? { allMatching: true, filters: buildCurrentFilters(), data: values }
    : { allMatching: false, ids: Array.from(selectedTransactionIds), data: values };

  try {
    const res = await transactionService.bulkUpdateTransactions(payload);
    setShowBulkEdit(false);

    const reasons: string[] = [];
    if (res.skipped.transferOrDebt > 0) {
      reasons.push(`${res.skipped.transferOrDebt} transfer/debt`);
    }
    if (res.skipped.categoryTypeMismatch > 0) {
      reasons.push(`${res.skipped.categoryTypeMismatch} with a mismatched category type`);
    }

    await Swal.fire({
      icon: reasons.length > 0 ? 'warning' : 'success',
      title: 'Updated',
      text: reasons.length > 0
        ? `Updated ${res.updatedCount} transaction(s). Skipped ${reasons.join(' and ')}.`
        : `Successfully updated ${res.updatedCount} transaction(s)`,
      ...(reasons.length === 0 && { timer: 2000, showConfirmButton: false }),
    });
    setSelectedTransactionIds(new Set());
    setIsGlobalSelectAll(false);
    fetchTransactions(1);
  } catch (error) {
    logError('Failed to bulk edit:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Update Failed',
      text: 'Failed to update transactions',
      confirmButtonText: 'OK',
      confirmButtonColor: '#dc3545',
    });
    throw error; // biarkan modal tetap terbuka
  }
}, [isGlobalSelectAll, selectedTransactionIds, buildCurrentFilters, fetchTransactions]);
```

### T9c — Render modal

Render di dalam `<Container fluid>`, memanfaatkan slot kosong sebelum `</Container>` di akhir file (baris ~800):

```tsx
<BulkEditModal
  show={showBulkEdit}
  onHide={() => setShowBulkEdit(false)}
  targetCount={isGlobalSelectAll ? totalRecords : selectedTransactionIds.size}
  isGlobalSelectAll={isGlobalSelectAll}
  onSubmit={handleBulkEditSubmit}
/>
```

**DoD T9b + T9c**

- [ ] Klik tombol Edit di `RecordsHeader` (mobile & desktop) membuka modal, bukan Swal placeholder.
- [ ] `targetCount` menampilkan jumlah yang dipilih; berubah jadi `totalRecords` saat "select all matching" aktif.
- [ ] Setelah sukses: modal tertutup, notifikasi muncul, seleksi ter-reset, list ter-refresh dari page 1.
- [ ] Notifikasi memakai ikon `warning` dan merinci alasan skip ketika ada baris yang dilewati.
- [ ] Skip karena dua alasan sekaligus → pesan menyebut keduanya (`Skipped 3 transfer/debt and 2 with a mismatched category type.`).
- [ ] Kategori yang baru diterapkan langsung terlihat di list setelah refresh (nama, warna, dan ikon kategori ikut berubah).
- [ ] Saat API gagal: Swal error muncul dan modal tetap terbuka dengan input user utuh.
- [ ] Tidak ada warning `react-hooks/exhaustive-deps` baru.
- [ ] Tidak ada import yang tidak terpakai (`noUnusedLocals` aktif).

---

## T10 — Registrasi OpenAPI

**File**: `src/lib/openapi/schemas/transactions.ts`

Mengikuti pola `BulkDeleteTransactionSchema` yang sudah ada di baris ~39-47:

```ts
export const BulkUpdateTransactionSchema = z.object({
  allMatching: z.boolean().optional().openapi({ example: false }),
  ids: z.array(z.string()).optional().openapi({ example: ['clq1234560000000000000000'] }),
  filters: z.record(z.unknown()).optional().openapi({ example: { category_ids: 'clq...' } }),
  data: z.object({
    description: z.string().optional().openapi({ example: 'Monthly groceries' }),
    payee: z.string().optional().openapi({ example: 'Supermarket' }),
    payment_method: z.string().optional().openapi({ example: 'Credit Card' }),
    payment_status: z.string().optional().openapi({ example: 'Cleared' }),
    category_id: z.string().optional().openapi({ example: 'clqcategory12345600000000' }),
    label_ids: z.array(z.string()).optional().openapi({ example: ['clqlabel1234560000000000'] }),
  })
});

const BulkUpdateTransactionRequest = registry.register('BulkUpdateTransactionRequest', BulkUpdateTransactionSchema);

registry.registerPath({
  method: 'patch',
  path: '/api/v1/transactions/bulk',
  description: 'Bulk update transaction fields (category, labels, description, payee, payment method, payment status) by IDs or filter criteria. Transfer and debt transactions are skipped, as are transactions whose type does not match the selected category type.',
  summary: 'Bulk Update Transactions',
  tags: ['Transactions'],
  request: { body: { content: { 'application/json': { schema: BulkUpdateTransactionRequest } } } },
  responses: {
    200: {
      description: 'Transactions updated successfully',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              updatedCount: z.number(),
              skipped: z.object({
                transferOrDebt: z.number(),
                categoryTypeMismatch: z.number(),
              })
            }),
            meta: z.object({ message: z.string() })
          })
        }
      }
    }
  }
});
```

**DoD**

- [ ] `/api-docs` merender entri `PATCH /api/v1/transactions/bulk` di tag Transactions.
- [ ] Contoh request body tampil lengkap dengan objek `data` termasuk `category_id`.
- [ ] Response schema menampilkan `updatedCount` dan objek `skipped` dengan kedua sub-field.
- [ ] Deskripsi menyebut aturan skip untuk transfer/debt **dan** ketidakcocokan tipe kategori.
- [ ] Tidak ada nama komponen yang bentrok di `registry` (nama `BulkUpdateTransactionRequest` unik).

---

## T11 — Verifikasi akhir

Perintah:

```powershell
npm run type-check
npm run lint
npm test
```

Skenario manual end-to-end (jalankan `npm run dev`):

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Pilih 3 expense → isi Payee saja → Apply | Hanya payee berubah; description & label utuh |
| 2 | Pilih 3 expense → isi Description + Payment Method + Payment Status | Ketiganya berubah dalam satu request |
| 3 | Centang "Replace existing labels", pilih 2 label | Transaksi target punya tepat 2 label tersebut |
| 4 | Centang "Replace existing labels", tidak pilih label | Semua label transaksi target terhapus |
| 5 | Tidak centang, tidak pilih label | Label sama sekali tidak berubah (`label_ids` tidak dikirim) |
| 5a | Pilih 1 label lalu **matikan** checkbox → Apply | Label tersebut **ditambahkan**, label lama tetap ada (mode append) |
| 5b | Ulangi 5a dengan label yang sudah dimiliki transaksi | Tidak error, tidak ada duplikat (`skipDuplicates` + unique constraint) |
| 5c | Buka modal → pilih label pertama kali | Checkbox otomatis tercentang (replace) |
| 5d | Matikan checkbox lalu pilih/ganti label lagi | Checkbox **tetap** mati — pilihan eksplisit user tidak ditimpa |
| 6 | Seleksi campuran expense + transfer + debt | `skipped.transferOrDebt` sesuai jumlah transfer+debt, notifikasi warning |
| 7 | "Select all N matching" + filter kategori & tanggal | Hanya baris yang cocok filter yang berubah |
| 8 | Submit tanpa mengisi apa pun | Tombol Apply disabled |
| 9 | Matikan server lalu Apply | Swal error, modal tetap terbuka, input tidak hilang |
| 10 | Ulangi skenario 1 di viewport mobile | Tombol Edit di baris aksi mobile membuka modal yang sama |
| 11 | Pilih 3 expense → pilih kategori expense | Ketiganya berpindah kategori; nama/warna/ikon berubah di list |
| 12 | Pilih 2 income + 2 expense → pilih kategori bertipe `both` | Keempatnya berubah, `categoryTypeMismatch: 0` |
| 13 | Pilih 2 income + 2 expense → pilih kategori bertipe `expense` | Hanya 2 expense berubah, `categoryTypeMismatch: 2`, notifikasi warning menyebut alasannya |
| 14 | Skenario 13 tapi Payee juga diisi | Baris income **tidak** berubah payee-nya (skip berlaku untuk seluruh baris, bukan per field) |
| 15 | Pilih kategori + centang "Replace existing labels" sekaligus | Kategori dan label berubah dalam satu request pada baris yang cocok |
| 16 | Seleksi campuran expense + transfer, pilih kategori expense | Kedua alasan skip muncul di pesan bila keduanya > 0 |
| 17 | Cek saldo akun sebelum & sesudah semua skenario di atas | Saldo **tidak berubah** (kategori tidak memengaruhi amount) |
| 18 | Buka Analytics → Expenses by Category setelah skenario 11 | Agregat berpindah ke kategori baru, total keseluruhan tetap sama |

Verifikasi DB (Prisma Studio / query langsung):

- [ ] `updated_at` dan `updated_by` terisi pada baris yang berubah.
- [ ] Tidak ada baris dengan `deleted_at != null` yang tersentuh.
- [ ] Tidak ada baris `TransactionLabel` yatim (transaction_id yang sudah tidak ada).
- [ ] Baris transfer (`transfer_id != null`) dan debt (`debt_id != null`) tidak berubah nilainya.
- [ ] Kolom `amount` dan `type` identik sebelum & sesudah bulk edit untuk semua baris.
- [ ] Tidak ada transaksi `type: 'income'` yang punya kategori bertipe `expense`, dan sebaliknya.

      **Ini cek berbasis baseline, bukan "harus kosong".** Database bisa sudah punya pelanggaran lama
      yang tidak ada hubungannya dengan bulk edit (lihat follow-up #5), jadi yang diverifikasi adalah
      **tidak ada baris baru**. Jalankan sebelum mulai testing dan simpan hasilnya:

      ```sql
      SELECT t.id FROM "Transaction" t
      JOIN "Category" c ON c.id = t.category_id
      WHERE c.type <> 'both' AND c.type::text <> t.type::text
        AND t.type IN ('income','expense') AND t.deleted_at IS NULL
      ORDER BY t.id;
      ```

      Jalankan lagi setelah seluruh skenario selesai — himpunan ID harus **identik**. Kalau muncul ID
      baru, itu regresi nyata dari bulk edit dan gate Fase 2 tertutup.

      Baseline yang sudah tercatat (pre-existing, bukan dari bulk edit):
      `cml5wy48h035nu6k3ipxdwj41`, `cml6g8ggb02k839e37njtajqo`.

---

## Follow-up di luar scope (catat, jangan dikerjakan sekarang)

1. `transactionService.bulkCreateTransactions` memanggil `POST /transactions/bulk`, tetapi route tersebut tidak punya handler `POST` — dead code.
3. Bulk Export (`handleBulkExport`, `page.tsx:573`) masih placeholder dengan pola yang sama; bisa memakai `buildCurrentFilters` hasil T9a saat diimplementasi nanti.
4. Bulk edit belum mendukung perubahan akun/tanggal — bisa jadi fase berikutnya karena butuh rekalkulasi saldo.
5. **`PUT /api/v1/categories/[id]` bisa membuat transaksi jadi tipe-mismatch.** Endpoint itu mengizinkan
   `type` kategori diubah (`route.ts:196-201`) tanpa memeriksa transaksi yang sudah memakainya, dan
   perubahan tipe itu diteruskan ke seluruh kategori anak (`route.ts:229`). Mengubah kategori dari
   `both`/`income` menjadi `expense` langsung membuat transaksi lamanya melanggar aturan kecocokan tipe
   yang ditegakkan `POST /transactions`, `PUT /transactions/[id]`, dan `PATCH /transactions/bulk`.
   Dua baris pre-existing pada baseline di atas kemungkinan besar berasal dari sini.

   Opsi penanganan saat dikerjakan nanti: tolak perubahan tipe bila masih ada transaksi yang memakai
   (mirip `TYPE_MISMATCH` yang sudah ada), atau izinkan tapi laporkan jumlah transaksi terdampak dan
   minta konfirmasi eksplisit. Perlu keputusan produk lebih dulu, jadi tidak dikerjakan diam-diam.

---

# Fase 2 — Bulk Delete: Hard Delete → Soft Delete

> **GATE**: Task T12-T15 hanya boleh dimulai setelah **seluruh DoD T1-T11 tercentang** dan bulk edit sudah dipakai normal minimal beberapa hari tanpa laporan bug. Alasannya: T12 mengubah `bulk/route.ts` yang sama dengan T3/T4, jadi mengerjakannya bersamaan akan mencampur dua perubahan berisiko dalam satu diff.

## Konteks Masalah

`app/api/v1/transactions/bulk/route.ts` memakai `prisma.transaction.deleteMany` di dua tempat (baris ~142 untuk `allMatching`, ~152 untuk `ids`) — **hard delete permanen**. Sementara `DELETE /api/v1/transactions/[id]` (baris ~386-393) memakai `prisma.transaction.update` yang menyetel `deleted_at` — **soft delete**.

Konsekuensi inkonsistensi ini:

1. **Data hilang permanen.** Hapus 1 transaksi dari menu row → masih bisa dipulihkan lewat DB. Hapus 50 transaksi lewat bulk → hilang selamanya. Perilaku destruktifnya berbeda padahal dari sudut pandang user aksinya sama.
2. **Cascade ikut menghapus.** `TransactionLabel` punya `onDelete: Cascade` (schema.prisma:243), jadi hard delete ikut menghapus relasi label tanpa jejak.
3. **Leg transfer jadi yatim.** Bulk delete tidak punya penanganan `transfer_id` seperti yang ada di `[id]/route.ts:357-382`. Menghapus satu leg transfer lewat bulk akan menyisakan leg pasangannya, sehingga saldo dua akun jadi tidak seimbang. Ini bug yang sudah ada sekarang, bukan efek samping perubahan.
4. **Audit trail hilang.** `updated_by`/`deleted_at` tidak sempat tercatat.

Yang **tidak** bermasalah: perhitungan saldo sudah aman karena `balanceService.ts` sudah memfilter `deleted_at IS NULL` di keempat query-nya (baris 33, 72, 110, 150), dan `GET /transactions` juga sudah memfilter (`route.ts:50`). Jadi mengubah bulk delete jadi soft delete tidak akan membuat baris ter-hapus muncul kembali di saldo maupun list.

---

## T12 — Ubah bulk DELETE menjadi soft delete

**File**: `app/api/v1/transactions/bulk/route.ts`

### T12a — Ganti operasi delete

Kedua `deleteMany` diganti `updateMany`:

```ts
const softDeleteData = {
  deleted_at: new Date(),
  updated_at: new Date(),
  updated_by: userId,
};

const result = await prisma.transaction.updateMany({
  where: { ...whereClause, user_id: userId, deleted_at: null },
  data: softDeleteData,
});
deletedCount = result.count;
```

Untuk jalur `ids`, tambahkan `deleted_at: null` juga supaya baris yang sudah ter-soft-delete tidak dihitung ulang di `deletedCount` (idempoten).

### T12b — Tangani leg transfer berpasangan

Selaraskan dengan `[id]/route.ts:357-382`. Sebelum melakukan soft delete, kumpulkan `transfer_id` dari baris target lalu perluas cakupannya:

```ts
const targets = await prisma.transaction.findMany({
  where: baseWhere,
  select: { id: true, transfer_id: true },
});

const transferIds = [...new Set(
  targets.map(t => t.transfer_id).filter((v): v is string => v !== null)
)];

await prisma.$transaction(async (tx) => {
  // Soft delete baris yang dipilih + seluruh leg pasangannya
  const result = await tx.transaction.updateMany({
    where: {
      user_id: userId,
      deleted_at: null,
      OR: [
        { id: { in: targets.map(t => t.id) } },
        ...(transferIds.length > 0 ? [{ transfer_id: { in: transferIds } }] : []),
      ],
    },
    data: softDeleteData,
  });
  deletedCount = result.count;

  // Stempel audit pada record Transfer (model Transfer tidak punya deleted_at)
  if (transferIds.length > 0) {
    await tx.transfer.updateMany({
      where: { id: { in: transferIds }, user_id: userId },
      data: { updated_at: new Date(), updated_by: userId },
    });
  }
});
```

> Catatan penting: `deletedCount` kini **bisa lebih besar** dari jumlah baris yang dipilih user, karena leg pasangan transfer ikut terhapus. Ini perilaku yang benar dan sudah sesuai dengan single delete, tapi pesan konfirmasi di UI perlu menyesuaikan (T14).

> `model Transfer` (schema.prisma:196-215) **tidak punya kolom `deleted_at`** — konsisten dengan `[id]/route.ts` yang juga hanya menyentuh `updated_at`/`updated_by` pada record Transfer. Jangan menambah kolom di task ini.

### T12c — Chunking untuk dataset besar

`updateMany` dengan `id: { in: [...] }` berisi puluhan ribu ID akan membebani query planner. Terapkan chunk 1000 seperti pola T4, dan akumulasikan `deletedCount`.

**DoD T12**

- [ ] Tidak ada lagi `deleteMany` pada model `Transaction` di file ini.
- [ ] Bulk delete by `ids` → baris ber-`deleted_at` terisi, **masih ada** di tabel DB.
- [ ] Bulk delete `allMatching` → sama, dan hanya menyentuh baris `deleted_at: null`.
- [ ] Menghapus 1 leg transfer lewat bulk → **kedua** leg ter-soft-delete; saldo kedua akun tetap seimbang.
- [ ] Record `Transfer` terkait mendapat `updated_at`/`updated_by` baru.
- [ ] `TransactionLabel` **tidak** ikut terhapus (relasi tetap utuh untuk keperluan restore).
- [ ] Menjalankan bulk delete dua kali pada ID yang sama → request kedua mengembalikan `deletedCount: 0`, tidak error.
- [ ] `deletedCount` menghitung leg pasangan transfer yang ikut terhapus.
- [ ] Baris ter-soft-delete tidak muncul di `GET /transactions`, tidak masuk perhitungan `balanceService`, dan tidak muncul di analytics.
- [ ] Response shape `{ deletedCount }` tidak berubah (backward compatible).

---

## T13 — Audit query yang belum memfilter `deleted_at`

**Tujuan**: memastikan baris yang ter-soft-delete tidak "hidup kembali" di tempat lain setelah T12 membuat jumlah baris ter-soft-delete meningkat drastis.

Sebelum T12, hard delete menyembunyikan bug filter yang mungkin ada. Setelah T12, bug tersebut akan terlihat. Karena itu audit ini **wajib** dan bukan opsional.

Endpoint/service yang harus dicek satu per satu (query pada model `Transaction`):

| Lokasi | Status saat ini |
|---|---|
| `app/api/v1/transactions/route.ts:50` | sudah filter |
| `app/api/v1/transactions/[id]/route.ts` (36, 157, 172, 348) | sudah filter |
| `src/services/balanceService.ts` (33, 72, 110, 150) | sudah filter |
| `app/api/v1/analytics/trends/route.ts` (71, 91) | sudah filter |
| `app/api/v1/analytics/expenses-by-category/route.ts:42` | sudah filter |
| `app/api/v1/analytics/cashflow/route.ts:80` | sudah filter |
| `app/api/v1/analytics/income-vs-expenses/route.ts:33` | sudah filter |
| `app/api/v1/analytics/income-expense-report/route.ts:149` | sudah filter |
| `app/api/v1/analytics/advanced-charts/route.ts` | **perlu dicek** |
| `app/api/v1/analytics/balance-trend/route.ts` | **perlu dicek** |
| `app/api/v1/budgets/status/route.ts:79` | sudah filter |
| `app/api/v1/debts/**` | **perlu dicek** |
| `app/api/v1/transfers/**` (129, 137, 153) | sudah filter, cek yang lain |
| `src/lib/ai/tools.ts` (129, 169) | sudah filter |
| `app/api/v1/backup/export/route.ts` (51, 75) | sudah filter — artinya baris ter-soft-delete **tidak** ikut ter-backup; putuskan apakah ini yang diinginkan |

**DoD T13**

- [ ] Setiap query `prisma.transaction.*` dan raw SQL pada tabel `"Transaction"` di seluruh `app/api` dan `src` sudah diverifikasi punya filter `deleted_at IS NULL`, atau punya komentar eksplisit kenapa tidak perlu.
- [ ] Daftar di atas diperbarui dengan hasil pengecekan aktual (bukan asumsi).
- [ ] Setiap temuan yang belum memfilter diperbaiki di task ini juga.
- [ ] Keputusan soal backup export (ikut menyertakan baris ter-soft-delete atau tidak) dicatat sebagai keputusan sadar di dokumen ini.
- [ ] Uji manual: soft-delete 10 transaksi, lalu cek Dashboard, Analytics (semua tab), Budgets, Net Worth, dan Debts — tidak ada angka yang berubah dibanding sebelum penghapusan selain yang memang seharusnya berkurang.

---

## T14 — Sesuaikan copy konfirmasi di UI

**File**: `app/(app)/transactions/page.tsx` (`handleBulkDelete`, baris ~584-597)

Teks konfirmasi sekarang berbunyi *"permanently delete ALL {n} transactions ... This cannot be undone."* — setelah T12 ini **tidak akurat lagi**.

Perubahan:

- Hapus kata `permanently` dan kalimat `This cannot be undone.`
- Untuk `allMatching`: `Are you sure you want to delete ALL {totalRecords} transactions matching your current filters?`
- Tambahkan catatan kecil ketika seleksi mengandung transfer: `Deleting a transfer also removes its paired transaction.`
- Pesan sukses tetap memakai `res.deletedCount`, sehingga angka yang lebih besar dari jumlah pilihan (karena leg pasangan) sudah otomatis akurat.

**DoD T14**

- [ ] Tidak ada lagi klaim "permanently" / "cannot be undone" pada dialog bulk delete.
- [ ] Notifikasi sukses menampilkan `deletedCount` dari server, bukan `selectedTransactionIds.size`.
- [ ] Copy diverifikasi di mode seleksi biasa maupun `isGlobalSelectAll`.

---

## T15 — Verifikasi Fase 2

Perintah:

```powershell
npm run type-check
npm run lint
npm test
```

Skenario manual:

| # | Skenario | Hasil yang diharapkan |
|---|---|---|
| 1 | Bulk delete 5 expense | Hilang dari list; di DB `deleted_at` terisi, baris masih ada |
| 2 | Cek saldo akun sebelum & sesudah skenario 1 | Saldo berkurang sesuai jumlah transaksi terhapus |
| 3 | Bulk delete yang menyertakan 1 leg transfer | Kedua leg hilang; saldo kedua akun tetap seimbang |
| 4 | Bandingkan single delete vs bulk delete pada transaksi sejenis | Efek di DB identik (`deleted_at` terisi, `updated_by` terisi) |
| 5 | Bulk delete `allMatching` dengan filter aktif | Hanya baris yang cocok filter yang ter-soft-delete |
| 6 | Ulangi bulk delete pada ID yang sama | `deletedCount: 0`, tidak error |
| 7 | Setelah menghapus, buka Analytics & Dashboard | Tidak ada baris terhapus yang muncul di grafik/agregat |
| 8 | Backup export setelah menghapus | Sesuai keputusan yang dicatat di T13 |
| 9 | Restore manual via SQL (`UPDATE "Transaction" SET deleted_at = NULL WHERE id = ...`) | Transaksi muncul kembali di list dan saldo, membuktikan data benar-benar pulih |

Verifikasi DB:

- [ ] `SELECT COUNT(*) FROM "Transaction" WHERE deleted_at IS NOT NULL` bertambah sesuai jumlah yang dihapus.
- [ ] Tidak ada baris `Transaction` yang benar-benar hilang dari tabel setelah bulk delete.
- [ ] Tidak ada transfer dengan tepat 1 leg aktif (`SELECT transfer_id FROM "Transaction" WHERE transfer_id IS NOT NULL AND deleted_at IS NULL GROUP BY transfer_id HAVING COUNT(*) = 1` harus kosong).
- [ ] `TransactionLabel` untuk baris ter-soft-delete masih ada.

---

## Catatan Lanjutan Setelah Fase 2

Setelah soft delete berlaku, baris ter-soft-delete akan menumpuk tanpa batas. Dua hal berikut layak dipertimbangkan sebagai fase terpisah (**jangan** dikerjakan bersama T12-T15):

1. **UI Restore / Trash bin** — halaman untuk melihat dan memulihkan transaksi terhapus. Tanpa ini, soft delete hanya bermanfaat untuk recovery manual lewat DB.
2. **Purge job** — hard delete otomatis untuk baris dengan `deleted_at` lebih tua dari N hari, agar tabel tidak membengkak. Perlu keputusan retensi (mis. 30/90 hari).
