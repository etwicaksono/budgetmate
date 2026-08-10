# Plan: Bulk Edit Transactions

Sumber: `app/(app)/transactions/page.tsx:563` (`handleBulkEdit`) yang saat ini masih placeholder Swal "not yet implemented".

## Tujuan

Ketika tombol **Edit** di `RecordsHeader` diklik, tampilkan modal berisi field:

| Field | Tipe input | Kolom DB |
|---|---|---|
| Category | `TransactionCategorySelect` | `Transaction.category_id` |
| Labels | `LabelMultiSelect` (multi) | relasi `TransactionLabel` |
| Description | text input | `Transaction.description` (Text) |
| Payee | text input | `Transaction.payee` (VarChar 255) |
| Payment Method | select | `Transaction.payment_method` (VarChar 50) |
| Payment Status | select | `Transaction.payment_status` (VarChar 32) |

Field yang **diisi** akan diterapkan ke seluruh transaksi terpilih. Field yang dibiarkan kosong = **tidak diubah** (bukan dikosongkan).

## Keputusan Desain (sudah disepakati)

1. **Labels = Replace atau Append.** Checkbox "Replace existing labels" menentukan mode lewat field `label_mode`:

   | Checkbox | Pilihan label | Efek | Payload |
   |---|---|---|---|
   | centang | kosong | hapus semua label | `label_ids: []`, `label_mode: 'replace'` |
   | centang | ada | ganti label lama | `label_ids: [...]`, `label_mode: 'replace'` |
   | tidak | kosong | tidak diubah | `label_ids` tidak dikirim |
   | tidak | ada | tambahkan ke label existing | `label_ids: [...]`, `label_mode: 'append'` |

   Checkbox default mati; pemilihan label **pertama** menyalakannya, tapi setelah user menyentuh checkbox sendiri pilihannya tidak pernah ditimpa. Append bergantung pada `@@unique([transaction_id, label_id])` + `skipDuplicates` supaya label yang sudah ada tidak menimbulkan error.
2. **Dukung `allMatching`.** Sama seperti bulk delete: bisa "Select all N matching records" berbasis filter aktif, bukan cuma ID yang sudah ter-load.
3. **Skip transfer & debt.** Transaksi `transfer_in`/`transfer_out`/`debt_in`/`debt_out` (atau yang punya `transfer_id`/`debt_id`) tidak ikut diubah. Jumlah yang dilewati dilaporkan ke user.
4. **Tidak ada "clear field".** Kosong = tidak diubah. Tidak ada checkbox clear.
5. **Category = skip on mismatch.** Kategori bertipe `income`/`expense` hanya diterapkan ke transaksi bertipe sama; kategori bertipe `both` diterapkan ke semua. Yang tidak cocok di-skip, tidak menggagalkan request.
6. **Rincian skip.** Response memakai `skipped: { transferOrDebt, categoryTypeMismatch }` agar user tahu alasan sebuah baris dilewati.
7. **Dropdown kategori tidak difilter.** Semua kategori ditampilkan apa adanya; validasi kecocokan sepenuhnya ditangani backend.

---

## Kondisi Saat Ini (hasil penelusuran)

- `handleBulkEdit` di `page.tsx:563` hanya menampilkan Swal info.
- Tombol Edit sudah terpasang: `RecordsHeader` menerima prop `onBulkEdit` (`src/components/Records/RecordsHeader.tsx`), dipakai di `page.tsx` (versi mobile & desktop).
- State seleksi sudah ada di page: `selectedTransactionIds: Set<string>`, `isGlobalSelectAll: boolean`, `totalRecords`.
- API bulk yang tersedia baru **`DELETE /api/v1/transactions/bulk`** (`app/api/v1/transactions/bulk/route.ts`). Belum ada endpoint bulk update.
- `POST /api/v1/transactions/bulk` di service (`bulkCreateTransactions`) menunjuk ke path yang **tidak punya handler POST** — dead code, catat sebagai temuan terpisah.
- Kolom `payee`, `payment_method`, `payment_status`, `description`, `category_id` semuanya sudah ada di `prisma/schema.prisma` (model `Transaction`, baris ~158-165).
- Aturan kecocokan tipe kategori sudah dipakai di `POST /transactions` (`route.ts:358-366`) dan `PUT /transactions/[id]`: `category.type !== 'both' && category.type !== transaction.type` → `CATEGORY_TYPE_MISMATCH`. Bulk edit memakai aturan yang sama tapi hasilnya skip, bukan error.
- `Category` memakai `is_active` sebagai flag soft-delete (tidak punya kolom `deleted_at`) — lihat komentar di `route.ts:344-345`.
- Komponen & konstanta yang bisa dipakai ulang:
  - `src/components/transaction/LabelMultiSelect.tsx`
  - `src/components/transaction/TransactionCategorySelect.tsx` → self-fetching, punya search + grouping parent/child, dan `ClearButton` bawaan
  - `src/hooks/useTransactionData.ts` → menyediakan `labels`, `isLoading`
  - `src/utils/constants.ts` → `PAYMENT_METHODS`, `PAYMENT_STATUS`
  - `src/components/transaction/TransactionForm.tsx:12-13` punya array lokal `PAYMENT_METHODS`/`PAYMENT_STATUSES` yang **duplikat** dengan constants — sebaiknya disatukan (lihat Langkah 6).

### Temuan yang perlu diperhatikan saat implementasi

- Route bulk DELETE **tidak** memfilter `deleted_at: null` dan memakai `deleteMany` (hard delete), sedangkan `DELETE /transactions/[id]` melakukan soft delete (`deleted_at`). Inkonsistensi ini ditangani di **Fase 2 (T12-T15)** pada dokumen task breakdown, bukan di fase ini; tapi **bulk update wajib** menyertakan `deleted_at: null` sejak sekarang.
- Filter builder di bulk DELETE adalah duplikasi dari builder di `GET /api/v1/transactions` dan **tertinggal**: tidak menangani `draft_option`, `keyword`, serta pola `AND[]` untuk amount/search. Rekomendasi: ekstrak jadi helper bersama (Langkah 2) supaya bulk edit tidak menambah duplikasi ketiga.

---

## Langkah Implementasi

### 1. Validation schema — `src/lib/validation/transaction.ts`

Tambahkan schema baru (ikuti gaya `UpdateTransactionSchema` yang sudah ada):

```ts
export const BulkUpdateTransactionsSchema = z.object({
  allMatching: z.boolean().optional().default(false),
  ids: z.array(z.string().regex(cuidRegex, 'Invalid transaction ID')).max(1000).optional(),
  filters: z.record(z.unknown()).optional(),
  data: z.object({
    description: z.string().trim().min(1).optional(),
    payee: z.string().trim().min(1).max(255).optional(),
    payment_method: z.string().trim().min(1).max(50).optional(),
    payment_status: z.string().trim().min(1).max(32).optional(),
    category_id: z.string().regex(cuidRegex, 'Invalid category ID').optional(),
    label_ids: z.array(z.string().regex(cuidRegex, 'Invalid label ID')).optional(),
    label_mode: z.enum(['replace', 'append']).default('append'),
  })
}).superRefine((val, ctx) => {
  if (!val.allMatching && (!val.ids || val.ids.length === 0)) {
    ctx.addIssue({ code: 'custom', message: 'Must provide ids or allMatching = true' });
  }
  // `label_mode` dikeluarkan karena punya default: kalau ikut dihitung, `data: {}`
  // akan lolos padahal user tidak mengubah apa pun.
  const { label_mode: _labelMode, ...mutations } = val.data;
  if (Object.values(mutations).filter(v => v !== undefined).length === 0) {
    ctx.addIssue({ code: 'custom', message: 'At least one field must be provided' });
  }
});

export type BulkUpdateTransactionsInput = z.infer<typeof BulkUpdateTransactionsSchema>;
```

Catatan: `min(1)` pada string membuat string kosong ditolak, konsisten dengan keputusan "kosong = tidak diubah" (frontend cukup tidak mengirim key-nya).

### 2. Ekstrak filter → where builder (refactor pendukung)

Buat `src/lib/api/transactionFilters.ts`:

```ts
export async function buildTransactionWhere(
  userId: string,
  filters: Record<string, unknown> | undefined
): Promise<Prisma.TransactionWhereInput>
```

Isi: pindahkan logika dari `app/api/v1/transactions/bulk/route.ts` (blok `allMatching`) + selaraskan dengan `GET /api/v1/transactions` (`account_ids`, `category_ids`, `start_date`/`end_date`, `type`, `transfer_option`, `debt_option`, `draft_option`, `label_ids`, `search`/`keyword`, `min_amount`/`max_amount`). Selalu sertakan `user_id` dan `deleted_at: null`.

Lalu pakai helper ini di:
- handler DELETE bulk (menggantikan blok inline),
- handler PATCH bulk yang baru.

Kalau ingin scope minimal, helper boleh dibuat khusus untuk bulk saja dulu, tapi jangan menyalin blok filter untuk ketiga kalinya.

### 3. Endpoint baru — `PATCH /api/v1/transactions/bulk`

Tambahkan `export async function PATCH(req: NextRequest)` di `app/api/v1/transactions/bulk/route.ts` (file yang sama dengan DELETE).

Alur:

1. `requireAuth(req)` → ambil `userId`.
2. Parse body dengan `BulkUpdateTransactionsSchema.safeParse`; kalau gagal → `errorResponse('VALIDATION_ERROR', ..., 400, issues)`.
3. Bangun `where` dasar:
   ```ts
   const baseWhere: Prisma.TransactionWhereInput = allMatching
     ? await buildTransactionWhere(userId, filters)
     : { id: { in: ids }, user_id: userId, deleted_at: null };
   ```
4. Hitung `requestedCount` = jumlah baris yang cocok `baseWhere` (`prisma.transaction.count`).
5. Tambahkan guard skip transfer & debt:
   ```ts
   const eligibleWhere: Prisma.TransactionWhereInput = {
     ...baseWhere,
     type: { notIn: [
       TransactionType.transfer_in, TransactionType.transfer_out,
       TransactionType.debt_in, TransactionType.debt_out
     ] },
     transfer_id: null,
     debt_id: null,
   };
   ```
   > Hati-hati: kalau `baseWhere` sudah punya key `type` (dari `filters.type` / `transfer_option` / `debt_option`), jangan ditimpa begitu saja. Gabungkan lewat `AND: [...]` agar kedua kondisi tetap berlaku.
6. Validasi `category_id` (jika ada): pastikan kategori milik user dan `is_active: true`, kalau tidak → `errorResponse('INVALID_CATEGORY', ..., 404)`. Ambil `category.type` untuk langkah 8.
7. Validasi `label_ids` (jika ada): pastikan semua label milik user, kalau tidak → `errorResponse('INVALID_LABEL', ..., 404)`.
8. Jika `category.type !== 'both'`, persempit lagi lewat `AND` dengan `{ type: category.type }` menjadi `typeConstrainedWhere`. Hitung `eligibleCount` dari `eligibleWhere` (sebelum penyempitan) untuk memisahkan dua alasan skip.
9. Eksekusi (semua memakai `typeConstrainedWhere`):
   - **Tanpa label_ids** → cukup satu `updateMany`:
     ```ts
     const result = await prisma.transaction.updateMany({
       where: typeConstrainedWhere,
       data: {
         ...(data.description !== undefined && { description: data.description }),
         ...(data.payee !== undefined && { payee: data.payee }),
         ...(data.payment_method !== undefined && { payment_method: data.payment_method }),
         ...(data.payment_status !== undefined && { payment_status: data.payment_status }),
         ...(data.category_id !== undefined && { category_id: data.category_id }),
         updated_at: new Date(),
         updated_by: userId,
       }
     });
     ```
   - **Dengan label_ids** → butuh ID konkret untuk mengurus tabel join. `deleteMany` hanya dijalankan pada mode `replace`; mode `append` langsung `createMany`. Append tanpa label sama sekali bukan perubahan, jadi tetap memakai jalur `updateMany` tunggal di atas:
     ```ts
     const targets = await prisma.transaction.findMany({
       where: typeConstrainedWhere, select: { id: true }
     });
     const targetIds = targets.map(t => t.id);
     const isReplace = label_mode === 'replace';
     // proses per chunk (mis. 500) agar tidak meledak di query planner
     for (const chunk of chunkArray(targetIds, 500)) {
       await prisma.$transaction(async (tx) => {
         await tx.transaction.updateMany({ where: { id: { in: chunk } }, data: scalarUpdate });
         if (isReplace) {
           await tx.transactionLabel.deleteMany({ where: { transaction_id: { in: chunk } } });
         }
         if (label_ids.length > 0) {
           await tx.transactionLabel.createMany({
             data: chunk.flatMap(id => label_ids.map(label_id => ({ transaction_id: id, label_id }))),
             skipDuplicates: true,
           });
         }
       });
     }
     ```
10. Response:
   ```ts
   return successResponse(
     {
       updatedCount,
       skipped: {
         transferOrDebt: requestedCount - eligibleCount,
         categoryTypeMismatch: eligibleCount - updatedCount,
       }
     },
     { message: `Successfully updated ${updatedCount} transaction(s)` },
     200
   );
   ```
11. `catch` → `logError('Bulk update error:', error)` + `errorResponse('INTERNAL_ERROR', 'Failed to update transactions', 500)`.

### 4. Service — `src/services/transactionService.ts`

```ts
export interface BulkUpdateTransactionsRequest {
  allMatching?: boolean;
  ids?: string[];
  filters?: TransactionFilters;
  data: {
    description?: string;
    payee?: string;
    payment_method?: string;
    payment_status?: string;
    category_id?: string;
    label_ids?: string[];
    label_mode?: 'replace' | 'append';
  };
}

export interface BulkUpdateTransactionsResult {
  updatedCount: number;
  skipped: {
    transferOrDebt: number;
    categoryTypeMismatch: number;
  };
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

> `src/services/api.ts` saat ini hanya mengekspor `get/post/put/delete` pada wrapper `api`. **Perlu tambah `patch`** dengan pola yang sama:
> ```ts
> patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
>   apiClient.patch(url, data, config).then(response => response.data),
> ```
> Alternatif tanpa menyentuh `api.ts`: pakai `api.put` dan daftarkan `PUT` sebagai alias `PATCH` di route (pola ini sudah dipakai di `transactions/[id]/route.ts`). Rekomendasi: tambahkan `patch` di wrapper, lebih bersih secara semantik.

### 5. Komponen modal — `app/(app)/transactions/_components/BulkEditModal.tsx`

Komponen baru, sejajar dengan `TransactionFilterSidebar.tsx` yang sudah ada di folder itu.

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
  targetCount: number;          // selectedTransactionIds.size atau totalRecords
  isGlobalSelectAll: boolean;
  onSubmit: (values: BulkEditValues) => Promise<void>;
}
```

Isi:
- `react-bootstrap` `Modal` + `Form` (konsisten dengan `TransactionModal`).
- Banner info di atas: `Editing N transaction(s)` / `Editing ALL N matching transactions`, plus catatan kecil: *"Transfer & debt transactions will be skipped."* dan *"Empty fields will be left unchanged."*
- Field:
  - Category → `TransactionCategorySelect` **tanpa** prop `filterType` (semua kategori tampil). Komponen ini self-fetching, jadi tidak perlu passing daftar kategori. Beri teks bantu: *"Transactions whose type doesn't match the selected category will be skipped."* Perhatikan dropdown-nya memakai `zIndex: 1051` — verifikasi tidak tertutup badan modal.
  - Description → `Form.Control type="text"`
  - Payee → `Form.Control type="text"`
  - Payment Method → `Form.Select`, opsi dari constants + opsi kosong `-- No change --` sebagai default
  - Payment Status → `Form.Select`, sama polanya
  - Labels → `LabelMultiSelect` (selalu aktif) + **checkbox "Replace existing labels"**. Checkbox menentukan `label_mode` sesuai tabel di keputusan desain #1. Selector tidak pernah di-disable oleh checkbox, dan help text di bawahnya menjelaskan efek kombinasi yang sedang aktif.
  - Sumber `labels` dari `useTransactionData()` (sudah menyediakan `labels` + `isLoading`).
- Tombol `Apply` disabled ketika tidak ada satu pun field terisi, dan menampilkan spinner selama `isSubmitting`.
- Saat submit, buang key yang kosong sebelum memanggil `onSubmit`.

### 6. Konsolidasi konstanta payment (kecil tapi wajib)

`TransactionForm.tsx:12-13` mendefinisikan array lokal yang duplikat dengan `src/utils/constants.ts`. Tambahkan array turunan di `constants.ts`:

```ts
export const PAYMENT_METHOD_OPTIONS = Object.values(PAYMENT_METHODS);
export const PAYMENT_STATUS_OPTIONS = Object.values(PAYMENT_STATUS);
```

lalu pakai di `BulkEditModal` **dan** ganti array lokal di `TransactionForm` agar tidak terjadi drift opsi (`constants.ts` punya `Check`/`Other`/`Cancelled` yang tidak ada di form).

### 7. Wiring di `app/(app)/transactions/page.tsx`

- Tambah state: `const [showBulkEdit, setShowBulkEdit] = useState(false);`
- Ganti isi `handleBulkEdit` (baris ~563) menjadi `setShowBulkEdit(true)`.
- Ekstrak pembangunan payload filter agar tidak menyalin blok yang sudah ada di `handleBulkDelete` (baris ~600-625). Buat satu `useCallback buildCurrentFilters()` yang dipakai bersama `handleBulkDelete` dan bulk edit.
- Tambah handler submit:
  ```tsx
  const handleBulkEditSubmit = useCallback(async (values: BulkEditValues) => {
    const payload: BulkUpdateTransactionsRequest = isGlobalSelectAll
      ? { allMatching: true, filters: buildCurrentFilters(), data: values }
      : { allMatching: false, ids: Array.from(selectedTransactionIds), data: values };

    const res = await transactionService.bulkUpdateTransactions(payload);
    setShowBulkEdit(false);
    const totalSkipped = res.skipped.transferOrDebt + res.skipped.categoryTypeMismatch;
    await Swal.fire({
      icon: totalSkipped > 0 ? 'warning' : 'success',
      title: 'Updated',
      text: totalSkipped > 0
        ? `Updated ${res.updatedCount} transaction(s). Skipped ${res.skipped.transferOrDebt} transfer/debt and ${res.skipped.categoryTypeMismatch} with a mismatched category type.`
        : `Successfully updated ${res.updatedCount} transaction(s)`,
      ...
    });
    setSelectedTransactionIds(new Set());
    setIsGlobalSelectAll(false);
    fetchTransactions(1);
  }, [...]);
  ```
  Error handling mengikuti pola `handleBulkDelete`: `logError` + Swal error.
- Render `<BulkEditModal ... />` di dalam `<Container fluid>` (ada slot kosong sebelum `</Container>` di akhir file).

### 8. OpenAPI — `src/lib/openapi/schemas/transactions.ts`

Registrasikan schema + path baru mengikuti pola `BulkDeleteTransactionRequest`:

```ts
export const BulkUpdateTransactionSchema = z.object({ ... });
const BulkUpdateTransactionRequest = registry.register('BulkUpdateTransactionRequest', BulkUpdateTransactionSchema);

registry.registerPath({
  method: 'patch',
  path: '/api/v1/transactions/bulk',
  summary: 'Bulk Update Transactions',
  tags: ['Transactions'],
  request: { body: { content: { 'application/json': { schema: BulkUpdateTransactionRequest } } } },
  responses: { 200: { /* { updatedCount, skipped: { transferOrDebt, categoryTypeMismatch } } */ } }
});
```

---

## Ringkasan File yang Disentuh

| File | Perubahan |
|---|---|
| `src/lib/validation/transaction.ts` | Tambah `BulkUpdateTransactionsSchema` |
| `src/lib/api/transactionFilters.ts` | **Baru** — `buildTransactionWhere` (dipakai bulk DELETE & PATCH) |
| `app/api/v1/transactions/bulk/route.ts` | Tambah handler `PATCH`; DELETE pakai helper filter |
| `src/services/api.ts` | Tambah method `patch` di wrapper `api` |
| `src/services/transactionService.ts` | Tambah `BulkUpdateTransactionsRequest`, `bulkUpdateTransactions` |
| `app/(app)/transactions/_components/BulkEditModal.tsx` | **Baru** — modal bulk edit |
| `app/(app)/transactions/page.tsx` | State modal, `handleBulkEdit` → buka modal, `handleBulkEditSubmit`, ekstrak `buildCurrentFilters`, render modal |
| `src/utils/constants.ts` | Tambah `PAYMENT_METHOD_OPTIONS`, `PAYMENT_STATUS_OPTIONS` |
| `src/components/transaction/TransactionForm.tsx` | Pakai constants bersama (hapus array lokal duplikat) |
| `src/lib/openapi/schemas/transactions.ts` | Registrasi schema & path PATCH bulk |

---

## Edge Case & Risiko

1. **`type` bentrok di where clause.** Kalau filter aktif sudah menyetel `where.type` (mis. `transfer_option: 'only'`), guard skip transfer akan menghasilkan himpunan kosong. Ini justru benar secara semantik (semua di-skip), tapi pesan ke user harus jelas: `updatedCount = 0, skipped.transferOrDebt = N`. Penyempitan tipe kategori juga masuk lewat `AND`, bukan menimpa `type`, agar tidak bentrok dengan dua kondisi sebelumnya.
2. **Global select all pada dataset besar.** `updateMany` tanpa label aman. Dengan label replace, `findMany` + chunking wajib; pertimbangkan batas atas (mis. tolak > 10.000 baris dengan pesan yang jelas) supaya request tidak timeout.
3. **`exactOptionalPropertyTypes: true`** aktif di `tsconfig.json`. Jangan mengirim `{ payee: undefined }`; gunakan pola spread bersyarat `...(x !== undefined && { x })` seperti yang sudah dipakai di `transactions/[id]/route.ts`.
4. **`noUncheckedIndexedAccess: true`** — hati-hati saat mengakses hasil chunk/array by index.
5. **Optimistic update.** Bulk edit tidak menggunakan optimistic update; cukup `fetchTransactions(1)` setelah sukses (konsisten dengan `handleBulkDelete`). Opsional: dispatch `dispatchAppEvent('transaction-updated', ...)` — tapi payload event bus saat ini bertipe `{ transactionId: string }` (tunggal), jadi butuh event baru kalau mau dipakai. Untuk fase ini, refetch saja.
6. **`skipDuplicates`** pada `createMany` untuk `TransactionLabel` mencegah error kalau ada label duplikat di input.
7. **Draft transactions** tidak diperlakukan khusus — ikut ter-update seperti transaksi biasa.
8. **Skip berlaku per baris, bukan per field.** Kalau user mengubah kategori + payee sekaligus dan sebuah baris tipenya tidak cocok dengan kategori, baris itu tidak mendapat perubahan apa pun — termasuk payee. Ini konsekuensi dari satu `updateMany` yang dipersempit tipe. Alternatifnya (dua query terpisah: scalar untuk semua baris, kategori untuk yang cocok) membuat hasil lebih sulit dijelaskan ke user dan `updatedCount` jadi ambigu, jadi tidak dipilih.
9. **Kategori tidak mengubah saldo.** `category_id` tidak memengaruhi `amount` maupun `type`, jadi tidak ada rekalkulasi saldo. Yang berubah hanya pengelompokan di analytics.
10. **Kategori parent vs child.** `TransactionCategorySelect` merender parent sebagai header grup yang tidak bisa diklik dan hanya child yang bisa dipilih (kecuali parent tanpa child, yang tampil sebagai item standalone). Perilaku ini dibiarkan sama dengan form transaksi tunggal — jangan diubah khusus untuk bulk edit.
11. **Kategori nonaktif.** `Category` memakai `is_active` sebagai flag soft-delete. Validasi wajib menyertakan `is_active: true` supaya bulk edit tidak memindahkan transaksi ke kategori yang sudah dinonaktifkan.

---

## Verifikasi

1. `npm run type-check` dan `npm run lint` bersih.
2. Manual:
   - Pilih beberapa transaksi expense → isi hanya Payee → cek hanya payee berubah, description/label utuh.
   - Isi Payment Method + Payment Status sekaligus → keduanya berubah.
   - Centang "Replace existing labels" dengan 2 label → label lama terganti persis 2 label tersebut.
   - Centang "Replace existing labels" tanpa memilih label → semua label transaksi terpilih terhapus.
   - Tidak centang, tanpa memilih label → label sama sekali tidak berubah.
   - Tidak centang, pilih 1 label → label tersebut ditambahkan tanpa menghapus label lama.
   - Pilih kategori bertipe `both` pada seleksi campuran income & expense → semua berubah.
   - Pilih kategori bertipe `expense` pada seleksi campuran → hanya expense berubah, sisanya masuk `skipped.categoryTypeMismatch`.
   - Sertakan transaksi transfer & debt dalam seleksi → dilewati, `skipped.transferOrDebt` muncul di notifikasi.
   - Mode "Select all N matching records" dengan filter kategori/tanggal aktif → hanya transaksi yang cocok filter yang berubah.
   - Submit tanpa mengisi apa pun → tombol Apply disabled.
3. Cek di DB (Prisma Studio) bahwa `updated_at`/`updated_by` ikut terisi, `amount`/`type` tidak berubah, dan tidak ada baris `deleted_at != null` yang tersentuh.
4. Pastikan tidak ada transaksi income yang berakhir dengan kategori expense (dan sebaliknya) setelah bulk edit.
