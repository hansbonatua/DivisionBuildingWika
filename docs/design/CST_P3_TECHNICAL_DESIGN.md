# P3 — Technical Design: Calculation Sheet Template (CST)

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 — Technical Design
**Tanggal:** 2026-11-09
**Baseline:** `main` @ `c053c48`
**Input:** P1 Requirement (FINAL) + `docs/design/CST_P2_AUDIT.md` (PASS)
**Status:** Desain selesai — menunggu review Owner/ChatGPT
**P4:** Belum dimulai

---

## A. Executive Summary

CST adalah **master reference flat**: satu tabel, 7 kategori hardcoded, tanpa Sub-Kategori.
Desain ini memakai ulang tiga pola yang sudah terbukti di repo dan **tidak** merefaktor
modul yang sudah `IMPLEMENTED & VERIFIED`:

| Kebutuhan | Pola yang dipakai | Sumber |
|---|---|---|
| Inline editing per baris (tanpa modal) | State machine MSL: satu baris diedit, draft terpisah, error per baris | `MslEngineeringPage.tsx`, `MslTable.tsx`, `msl-draft.ts` |
| API + error mapping | Plumbing MKS: actor sesi, `parseJsonBody`, mapping SQLSTATE, `no-store` | `src/app/api/metode-kerja-standar/_helpers.ts` |
| URL evidence | Field Zod 2048 + http/https, CHECK DB, tampilan link truncate | `metode-kerja-standar/schema.ts`, `MetodeKerjaTable.tsx` |
| Kategori hardcoded | Array konstanta `{ code, label, slug }` | `metode-kerja-standar/constants.ts`, `engineering-database/access.ts` |
| Sidebar | Accordion top-level + submenu dari array konstanta | `DashboardSidebar.tsx:206-241, 725-770` |
| RBAC | Permission registry + access helper + guard berlapis | `permissions.ts`, `metode-kerja-standar/access.ts`, `layout.tsx` |

Keputusan struktural utama:

1. **Satu halaman** `/dashboard/calculation-sheet-template` berisi satu `<table>` dengan
   **7 `<tbody>`**, masing-masing diawali header kategori `colSpan={6}` dan `id` anchor.
   Sidebar menampilkan 7 submenu yang men-scroll ke `#slug` (D-CST-01).
2. **Inline create**: tombol `+ Baris` per kategori menambah satu draft row di dalam tabel;
   satu draft aktif pada satu waktu. Tidak ada modal, tidak ada halaman form.
3. **Kode unik per kategori** lewat unique index `(kategori, lower(btrim(kode)))`
   (D-CST-02), dinormalisasi uppercase oleh service.
4. **PIC tunggal wajib** (`pic_user_id NOT NULL`), hanya role Head Office, disimpan sebagai
   FK ke `users` (D-CST-03).
5. **Tanpa versioning**; `updated_at`/`updated_by` hanya audit (D-CST-04). Duplikasi kode
   tetap dicegah database → 409.
6. **Tanpa** reorder, PDF, upload file, summary, atau soft delete (D-CST-06).

Estimasi dampak: 1 migration aditif (tabel baru), 2 permission baru, 5 route API, 1 layout,
1 page, 3 komponen client, 5 modul lib, plus test murni. Tidak ada perubahan pada tabel,
API, atau komponen MKS/MSL/KM.

---

## B. Requirement Traceability Matrix

| ID | Requirement P1 | Keputusan desain | Implementasi | Verifikasi |
|---|---|---|---|---|
| R-CST-01 | Master reference flat, tanpa Sub-Kategori | Satu tabel `calculation_sheet_templates` | §E | Migration + schema test |
| R-CST-02 | 7 kategori hardcoded tanpa angka prefix | `CST_CATEGORIES` (code/label/slug), label tanpa angka | §E.1, §G.2 | Unit test constants |
| R-CST-03 | Header kategori `colSpan` penuh | `<tbody id={slug}>` + `<th colSpan={6}>` | §G.3 | Manual + component markup review |
| R-CST-04 | 100% inline table editing, tanpa modal | State machine per baris, draft row | §G.4, §H, §I | Manual 4 role |
| R-CST-05 | Field: Kode | `kode` 1–30, uppercase, unik per kategori | §E.2, §F.2, §H.1 | Schema + API test |
| R-CST-06 | Field: Nama | `nama` 1–200 | §E.2 | Schema test |
| R-CST-07 | Field: PIC single-select Head Office | `pic_user_id` NOT NULL, `<select>` inline, options endpoint | §C.1, §G.4 | API + manual |
| R-CST-08 | Field: Link Evidence URL ≤ 2048 | `evidence_url`, Zod 2048 + http(s), CHECK DB | §E.2, §F.2 | Unit + manual |
| R-CST-09 | Field: Catatan | `catatan` ≤ 2000, opsional | §E.2 | Schema test |
| R-CST-10 | Tidak ada upload file/blob | Tidak ada kolom storage/endpoint unggah | §E, §N | Review diff |
| R-CST-11 | Admin & Head Office full CRUD | `CALCULATION_SHEET_MANAGE` = HO; Admin super-rule | §J | Manual 4 role |
| R-CST-12 | Management & Project read-only | `CALCULATION_SHEET_VIEW`; tanpa input/tombol mutasi | §J, §G.5 | Manual 4 role |
| R-CST-13 | Sidebar 7 submenu sebagai anchor | `CST_CATEGORIES` → menu `href="#slug"` | §G.2, §E.3 | Sidebar unit test + manual |
| R-CST-14 | Tanpa reorder/PDF/fitur ekstra | Non-goals eksplisit | §A, §O | Review scope |

---

## C. Repository Baseline

| Item | Nilai |
|---|---|
| Branch | `main` |
| HEAD | `c053c48` — "docs: mark MKS and KM V2 as fully verified after 4-role RBAC test" |
| Commit terkait | `22258c6` (Summary MKS), `9dd9f5d` (merge Sub-Kategori), `c053c48` (dokumentasi RBAC) |
| Migration journal | **17 entry** (`idx` 0–16, tag terakhir `0016_metode_kerja_standar`) |
| Migration berikutnya | **`0017`** (nama disarankan `0017_calculation_sheet_template`) |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9.3 · Tailwind 4 · Drizzle ORM · PostgreSQL (Neon) |
| Test runner | `node --import tsx --test "src/**/*.test.ts"` (tanpa jsdom) |
| Database tooling | `psql` tidak tersedia; apply migration via `drizzle-kit migrate` + `DIRECT_URL` (`docs/audit/13`) |
| Pola UI existing | Tailwind `--primary #001f3f`, `--secondary #0061a5`; tabel `border-collapse`, header `bg-background`, sel `border-b border-outline/50` |
| Status working tree | Bersih sebelum P3; satu-satunya artefak P3 adalah dokumen ini |

Catatan: seluruh nomor baris pada dokumen P2 dan P3 mengacu ke `c053c48`, sehingga stabil
terhadap HEAD.

---

## D. Existing vs Proposed Architecture

| Lapisan | MSL (inline) | MKS (plumbing) | Usulan CST | Alasan |
|---|---|---|---|---|
| Sumber baris | Master Project per tahun/bulan | Sub-kategori/item buatan user | Record CST buatan user | Master reference |
| State edit | 1 `editing` global + `createDrafts` map | Modal dialog, state lokal form | **1 `editing` global + 1 draft row global** | Paling sederhana untuk tabel flat; mencegah baris kosong menggantung |
| Create | Inline pada baris yang sudah ada | Modal | Inline draft row di dalam tabel | D-CST / P1 |
| Validasi | `msl-draft.ts` (pure) | Zod + validasi form | `cst-draft.ts` (pure) + Zod | Dapat diuji tanpa DOM |
| API error | Union `{actor}|{response}`, mapping 4 error | Throw + `mapDomainError` lengkap + SQLSTATE | **MKS** | Pesan 409 kode duplikat & FK PIC |
| Cache header | tidak ada | `no-store` | `no-store` | Data master sering berubah |
| DB | 1 tabel + FK project | 3 tabel + pivot PIC | **1 tabel, FK PIC tunggal** | Flat, single PIC |
| Sidebar | Accordion 6 disiplin | Accordion 6 disiplin | Accordion + 7 anchor | D-CST-01 |
| Delete | Admin/manage | Permission terpisah (Admin-only) | MANAGE (HO boleh) | P1 full CRUD |
| Optimistic concurrency | tidak ada | tidak ada | tidak ada | D-CST-04 |

Pola yang **tidak** dipakai: modal `MetodeKerjaFormDialog`, pivot `metode_kerja_pic`,
`sort_order`/reorder, tree `buildSummaryTree`, exporter PDF.

---

## E. Database Design

### E.1 Konstanta kategori (bukan tabel)

7 kategori adalah konstanta aplikasi, bukan seed database (pola `DISIPLIN_LIST`):

| # | Code (disimpan) | Label (UI) | Slug (anchor) |
|---|---|---|---|
| 1 | `ARSITEKTUR` | Arsitektur | `arsitektur` |
| 2 | `STRUKTUR` | Struktur | `struktur` |
| 3 | `INFRASTRUKTUR` | Infrastruktur | `infrastruktur` |
| 4 | `GEOTEKNIK` | Geoteknik | `geoteknik` |
| 5 | `GREEN_BUILDING` | Green Building | `green-building` |
| 6 | `MEEP` | MEEP | `meep` |
| 7 | `LAINNYA` | Lainnya | `lainnya` |

Urutan array = urutan tampil = urutan submenu. **Tanpa angka prefix** di label maupun slug.
`LAINNYA` selalu dirender walau kosong (seperti `F. Lainnya` MKS).

File: `src/lib/calculation-sheet-template/constants.ts`
(dependency-free, aman diimport Client Component, pola `metode-kerja-standar/constants.ts`).

### E.2 Tabel `calculation_sheet_templates`

Drizzle (`src/lib/pg/schema.ts`):

```ts
export const calculationSheetTemplates = pgTable(
  "calculation_sheet_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kategori: text("kategori").notNull(),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    picUserId: uuid("pic_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    evidenceUrl: text("evidence_url"),
    catatan: text("catatan"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("calculation_sheet_templates_kategori_kode_unique").on(
      table.kategori,
      sql`lower(btrim(${table.kode}))`,
    ),
    index("calculation_sheet_templates_kategori_kode_idx").on(table.kategori, table.kode),
    index("calculation_sheet_templates_pic_user_idx").on(table.picUserId),
    index("calculation_sheet_templates_created_by_idx").on(table.createdBy),
    index("calculation_sheet_templates_updated_by_idx").on(table.updatedBy),
    check(
      "calculation_sheet_templates_kategori_check",
      sql`${table.kategori} in ('ARSITEKTUR','STRUKTUR','INFRASTRUKTUR','GEOTEKNIK','GREEN_BUILDING','MEEP','LAINNYA')`,
    ),
    check(
      "calculation_sheet_templates_kode_check",
      sql`length(btrim(${table.kode})) between 1 and 30`,
    ),
    check(
      "calculation_sheet_templates_nama_check",
      sql`length(btrim(${table.nama})) between 1 and 200`,
    ),
    check(
      "calculation_sheet_templates_evidence_check",
      sql`${table.evidenceUrl} is null or (${table.evidenceUrl} ~ '^https?://' and length(${table.evidenceUrl}) <= 2048)`,
    ),
    check(
      "calculation_sheet_templates_catatan_check",
      sql`${table.catatan} is null or length(${table.catatan}) <= 2000`,
    ),
  ],
);
```

### E.3 Keputusan schema

| Aspek | Keputusan | Alasan |
|---|---|---|
| Kategori | `text` + CHECK 7 nilai kanonik | Hardcoded; CHECK mencegah typo; label di constants |
| Kode | uppercase oleh service; unique `(kategori, lower(btrim(kode)))` | Kode bebas tanpa prefix; unik per kategori (D-CST-02) |
| PIC | `uuid NOT NULL` FK users `no action` | PIC wajib (D-CST-03); user PIC tidak boleh terhapus diam-diam |
| Evidence | `text NULL`, CHECK http(s) + ≤2048 | D-CST-05; kosong = `NULL` |
| Catatan | `text NULL`, ≤2000 | Konsisten MKS/MSL |
| Audit | `created_by` NOT NULL `no action`; `updated_by` NULL `set null` | Konvensi MKS/MSL |
| Urutan | Tanpa `sort_order` | Tidak ada reorder (D-CST-06); urut kategori kanonik lalu `kode` di service |
| Version | Tanpa kolom `version` | D-CST-04 |
| Storage | Tanpa `blob_pathname`/bucket | Tidak ada upload (D-CST-05) |
| Delete | Hard delete | Tidak ada soft delete di P1 |

### E.4 Migration

- Generate: ubah `schema.ts` → `npx drizzle-kit generate` → `0017_calculation_sheet_template.sql`
  + `drizzle/meta/0017_snapshot.json` + entry `_journal.json` (dibuat tool, bukan manual).
- Sifat: **aditif murni** (CREATE TABLE + index/constraint); tidak mengubah tabel existing.
- Rollback: `DROP TABLE calculation_sheet_templates;` (aman, belum ada consumer lain).
- Apply hanya setelah otorisasi Owner, dengan `DIRECT_URL`; P3/P4 tidak menjalankan migration.

---

## F. API Contract

Namespace: `src/app/api/calculation-sheet-template/**`. Semua response `Cache-Control: no-store`,
body sukses `{ data: ... }`, body error `{ error: { message, details? } }`.

### F.1 `GET /api/calculation-sheet-template`

- Auth: `CALCULATION_SHEET_VIEW` + akun aktif.
- 200:

```json
{
  "data": {
    "rows": [
      {
        "id": "uuid",
        "kategori": "ARSITEKTUR",
        "kode": "ARS-01",
        "nama": "Shop Drawing Arsitektur",
        "pic": { "user_id": "uuid", "name": "Nama PIC", "status": "active", "position": "Engineer" },
        "evidence_url": "https://example.com/file",
        "catatan": "Catatan opsional",
        "created_by": { "user_id": "uuid", "name": "Pembuat" },
        "created_at": "2026-11-09T02:00:00.000Z",
        "updated_by": { "user_id": "uuid", "name": "Pengubah" },
        "updated_at": "2026-11-09T03:00:00.000Z"
      }
    ]
  }
}
```

Urutan dari server: `kategori`, lalu `lower(kode)`, lalu `id` (deterministik). Pengelompokan
kanonik + header kosong dilakukan client lewat helper murni `groupCstRows()` (`§G.2`),
sehingga API tetap sederhana dan helper bisa diuji tanpa database.

### F.2 `POST /api/calculation-sheet-template`

- Auth: `CALCULATION_SHEET_MANAGE`.
- Body (strict):

```json
{
  "kategori": "ARSITEKTUR",
  "kode": "ARS-01",
  "nama": "Shop Drawing Arsitektur",
  "pic_user_id": "uuid",
  "evidence_url": "https://example.com/file",
  "catatan": "Opsional"
}
```

- `evidence_url`/`catatan` boleh `null`/absen/kosong → `NULL`.
- 201 `{ data: row }` (DTO lengkap seperti F.1).

### F.3 `PUT /api/calculation-sheet-template/[id]`

- Auth: `CALCULATION_SHEET_MANAGE`.
- Body (strict): `kode`, `nama`, `pic_user_id`, `evidence_url`, `catatan`.
  **`kategori` tidak ada di kontrak** dan ditolak (strict) — kategori immutable.
- 200 `{ data: row }`; 404 bila id tidak ada; 409 bila kode bentrok di kategori yang sama.

### F.4 `DELETE /api/calculation-sheet-template/[id]`

- Auth: `CALCULATION_SHEET_MANAGE` (HO termasuk, sesuai P1 full CRUD).
- Hard delete. 200 `{ data: { deleted: true, id } }`; 404 bila tidak ada.

### F.5 `GET /api/calculation-sheet-template/pic-options`

- Auth: `CALCULATION_SHEET_MANAGE` (hanya role yang bisa membuka editor).
- 200:

```json
{
  "data": [
    { "user_id": "uuid", "name": "Nama", "status": "active", "position": "Engineer" }
  ]
}
```

- Sumber: `users` role Head Office, **tanpa filter status**; UI memberi label `(non-aktif)`
  untuk status selain `active` (pola MKS).

### F.6 Error mapping

| Kondisi | Status | Pesan |
|---|---|---|
| Tanpa sesi | 401 | `Unauthenticated` |
| Role tidak berhak / akun suspended | 403 | `Akses Calculation Sheet Template ditolak` |
| Body bukan JSON / Zod gagal | 400 | pesan issue pertama + `details.fieldErrors` |
| `id` bukan UUID | 400 | `ID tidak valid` |
| Kategori tidak dikenal | 400 | `Kategori tidak valid` |
| PIC bukan Head Office | 400 | `PIC harus user Head Office` |
| Unique `(kategori, kode)` | 409 | `Kode sudah dipakai pada kategori ini` |
| PIC dihapus / FK violation | 409 | `PIC sudah tidak tersedia` |
| CHECK database | 400 | `Data tidak memenuhi aturan database` |
| Lainnya | 500 | `Terjadi kesalahan server` + log label route |

Implementasi mapping: adaptasi `src/app/api/metode-kerja-standar/_helpers.ts`
(`mapDomainError`, `parseJsonBody`, `handleRouteError`, `isUuid`, `getActor`).

---

## G. UI/UX Design

### G.1 Struktur halaman

Route: `/dashboard/calculation-sheet-template` (single page).

```
DashboardShell
└── CalculationSheetLayout (guard VIEW: redirect /login | /dashboard)
    └── page.tsx (server: getCurrentUser → canManage)
        └── CalculationSheetPage (client)
            ├── Page header: badge "Core Enterprise" · judul · deskripsi · counter baris
            ├── Feedback banner (sukses) / error banner + Coba Lagi
            └── <table> (satu tabel, min-w-[1100px], overflow-x-auto)
                ├── <thead> kolom: Kode | Nama | PIC | Evidence | Catatan | Aksi
                └── 7 × <tbody id={slug} class="scroll-mt-24">
                      ├── header kategori <th colSpan={6}> + tombol "+ Baris"
                      ├── baris data / draft row / empty state
                      └── (opsional) pesan "Belum ada baris"
```

Alasan satu `<table>` dengan 7 `<tbody>`: lebar kolom konsisten antar kategori, header
kategori tetap `colSpan` penuh, dan anchor cukup pada `<tbody>` tanpa duplikasi markup tabel.

### G.2 Kategori, grouping, dan anchor

Helper murni (`src/lib/calculation-sheet-template/grouping.ts`):

```ts
export type CstCategoryGroup = { kategori: CstKategori; label: string; slug: string; rows: CstRowDto[] };
export function groupCstRows(rows: CstRowDto[]): CstCategoryGroup[];
```

- Selalu mengembalikan **7 grup** (termasuk kosong), urut `CST_CATEGORIES`.
- Di dalam grup, urut `kode` (localeCompare `id`/numeric) lalu `id`.
- Dipakai page untuk render; diuji tanpa DOM.

**Anchor + sidebar.** `SidebarItem` diperluas opsional:

```ts
type SidebarItem = { label: string; href: string; icon: React.ReactNode; anchor?: string };
```

- Item CST: `href = "/dashboard/calculation-sheet-template"`, `anchor = slug`.
- Render: `href={`${item.href}#${item.anchor}`}` dengan `scroll-mt-24` pada `<tbody>`.
- `isActivePath()` saat ini membandingkan `pathname` dengan `href` dan **tidak membaca hash**
  (`DashboardSidebar.tsx:500-502`). Untuk item ber-`anchor`, status aktif dihitung dari
  `pathname === href && activeAnchor === anchor`.
- `activeAnchor` diinisialisasi dari `window.location.hash` di `useEffect` dan diperbarui
  pada event `hashchange` (klik submenu memicu event ini). Tanpa scroll-spy; lihat §O R-03.
- Klik Submenu saat sudah di halaman: `preventDefault` + `scrollIntoView({ behavior: "smooth" })`
  agar tetap mulus dan tidak memicu navigasi ulang.

### G.3 Header kategori

```html
<tbody id="arsitektur" class="scroll-mt-24">
  <tr>
    <th scope="colgroup" colSpan={6}
        class="border-b border-outline bg-primary px-3 py-2 text-left text-[11px]
               font-bold uppercase tracking-wider text-white">
      ARSITEKTUR
    </th>
  </tr>
  ...
</tbody>
```

- Header navy `--primary`, teks putih — konsisten dengan header disiplin MKS.
- Tidak ada angka prefix (`1. Arsitektur` dilarang).
- Tombol `+ Baris` hanya untuk `canManage`, diletakkan di header kategori (kanan) atau di
  empty state; tidak keduanya sekaligus.
- Warna baris: putih, hover `bg-background/60`; draft/edit row `bg-blue-50/40`.

### G.4 Perilaku inline editing

Kolom dan kontrol:

| Kolom | Mode baca | Mode edit / draft |
|---|---|---|
| Kode | teks mono uppercase | `<input>` `h-8`, `maxLength=30`, `aria-label="Kode baris N"` |
| Nama | teks bold | `<input>` `maxLength=200` |
| PIC | nama + `(non-aktif)` | `<select>` dari `pic-options`, wajib dipilih |
| Evidence | link truncate (`max-w-[200px]`, `target="_blank"`, `rel="noopener noreferrer"`) | `<input type="url">` `maxLength=2048` |
| Catatan | 2 baris clamp + `title` | `<textarea rows={2}>` `maxLength=2000` |
| Aksi | Edit · Hapus (manage) | Simpan · Batal |

Aturan interaksi:

1. **Satu baris tersimpan diedit pada satu waktu.** Membuka Edit baris lain saat ada draft
   kotor → konfirmasi; saat draft bersih → buang draft dan pindah (pola MSL).
2. **Satu draft create global.** `+ Baris` di kategori lain saat draft ada → konfirmasi
   buang; draft selalu muncul sebagai baris terakhir kategorinya.
3. Simpan hanya aktif bila `kode`, `nama`, dan PIC terisi; tombol disabled saat `busy`.
4. Validasi klien dijalankan sebelum request; pesan error dirender **per baris**:
   `<tr><td colSpan={6} role="alert">…</td></tr>` (atau `<p>` di bawah sel) agar tidak
   menghimpit kolom.
5. Batal: bila ada perubahan → `window.confirm("Perubahan belum disimpan. Batalkan?")`;
   bila bersih → keluar langsung.
6. `beforeunload` aktif selama ada draft/edit kotor. Navigasi client-side belum dicegat
   (keterbatasan, §O).
7. Read-only role tidak menerima input, `+ Baris`, Edit, Hapus, atau Simpan/Batal.

### G.5 Empty, loading, error

| State | Tampilan |
|---|---|
| Initial load | Skeleton 3–4 baris + teks "Memuat Calculation Sheet Template..." |
| Load gagal (belum ada data) | Kartu error + `Coba Lagi` |
| Load gagal (sudah ada data) | Banner error di atas tabel + `Coba Lagi`; data lama tetap |
| Kategori kosong | Baris `colSpan={6}`: "Belum ada baris untuk kategori ini." + CTA `+ Baris` (manage) |
| Sukses mutasi | Banner hijau `role="status"`, auto-dismiss 5 detik |
| Gagal mutasi | Pesan per baris; data lama tidak berubah |
| Refresh | Teks "Memperbarui data..." (opsional, tanpa layout shift) |

### G.6 Aksesibilitas & responsif

- Setiap input punya `aria-label` yang menyebut baris/kategori; header kolom `scope="col"`.
- Fokus terlihat (`focus:ring-2 focus:ring-secondary/20`) mengikuti kelas MKS.
- Tabel dibungkus `overflow-x-auto`; `min-w-[1100px]`; mobile mengandalkan scroll horizontal.
- Tombol icon (jika ada) wajib `aria-label`; tidak ada interaksi hover-only.

---

## H. Table Design

### H.1 Kolom

| # | Header | Lebar | Isi |
|---|---|---|---|
| 1 | Kode | ~150px | Kode uppercase, mono, `break-words` |
| 2 | Nama | ~260px | Nama, bold |
| 3 | PIC | ~200px | Satu nama + status |
| 4 | Evidence | ~180px | Link terpotong menuju URL eksternal |
| 5 | Catatan | ~260px | Clamp 2 baris, `title` = teks penuh |
| 6 | Aksi | ~220px | Edit/Hapus atau Simpan/Batal |

`CST_COLUMN_COUNT = 6` diekspor sebagai konstanta dan dipakai header kategori, empty state,
dan baris error (mencegah `colSpan` drift — pola `DISIPLIN_ROW_COLUMN_COUNT`).

### H.2 State per baris

| State | Field state | Render |
|---|---|---|
| `idle` | — | Nilai read-only |
| `editing` | `editing = { id, draft, initial, error }` | Input + Simpan/Batal |
| `creating` | `create = { kategori, draft, error }` | Input + Simpan/Batal |
| `busy` | `busyId: string \| "new" \| null` | Semua tombol mutasi disabled |
| `error` | `error` di state editing/create | Baris pesan merah, data server tidak berubah |

Tipe draft murni (`cst-draft.ts`):

```ts
type CstDraft = { kode: string; nama: string; picUserId: string; evidenceUrl: string; catatan: string };
const EMPTY_CST_DRAFT: CstDraft;
function toCstDraft(row: CstRowDto): CstDraft;
function draftEquals(a, b): boolean;
function isEmptyDraft(d): boolean;
function validateCstDraft(d): { field: keyof CstDraft; message: string } | null;
function draftToCreatePayload(d, kategori): CreatePayload | null;
function draftToUpdatePayload(d): UpdatePayload | null;
```

Aturan validasi klien (cermin Zod):

| Field | Aturan | Pesan |
|---|---|---|
| Kode | wajib, trim, ≤30 | `Kode wajib diisi` / `Kode maksimal 30 karakter` |
| Nama | wajib, trim, ≤200 | `Nama wajib diisi` / `Nama maksimal 200 karakter` |
| PIC | wajib UUID | `PIC wajib dipilih` |
| Evidence | opsional, ≤2048, http(s) | `URL evidence maksimal 2.048 karakter` / `URL evidence harus diawali http:// atau https://` |
| Catatan | opsional, ≤2000 | `Catatan maksimal 2.000 karakter` |

### H.3 Perilaku tombol

| Tombol | Syarat tampil | Efek |
|---|---|---|
| `+ Baris` | `canManage`, tidak ada draft/create aktif | Buka draft di kategori tersebut |
| `Simpan` | mode editing/creating, draft valid | POST/PUT, ganti state dari response |
| `Batal` | mode editing/creating | Konfirmasi bila dirty, lalu tutup |
| `Edit` | `canManage`, baris idle | Masuk mode editing |
| `Hapus` | `canManage`, baris idle | `window.confirm` → DELETE |

Tidak ada tombol naik/turun (tanpa reorder) dan tidak ada tombol PDF.

---

## I. Data Flow

### I.1 Initial load

```
Server page → getCurrentUser() → canManage
Client page → GET /api/calculation-sheet-template
           → rows[] → groupCstRows(rows) → 7 tbody
```

Tidak ada fetch per kategori; satu request. Opsi PIC baru diambil saat pertama kali masuk
mode edit/create (`GET pic-options`), lalu di-cache di state halaman.

### I.2 Create (inline)

```
Klik + Baris (kategori X)
  → state create = { kategori: X, draft: EMPTY }
  → user mengisi 5 field
  → Simpan → validasi klien
  → POST /api/calculation-sheet-template
      201 → row DTO
  → setRows(prev => [...prev, row])
  → state create = null, feedback sukses
  → groupCstRows memindahkan baris ke grup X pada posisi kode yang benar
```

Tidak ada refetch; response server adalah sumber kebenaran. Bila 409 (kode duplikat),
draft tetap terbuka dengan pesan error dan data lain tidak berubah.

### I.3 Update (inline)

```
Edit → editing = { id, draft: toCstDraft(row), initial, error: null }
Simpan → validasi → PUT /api/calculation-sheet-template/{id}
      200 → setRows(rows.map(r => r.id === id ? dto : r))
          → editing = null, feedback sukses
```

### I.4 Delete

```
Hapus → window.confirm(`Hapus "${kode} — ${nama}"?`)
      → DELETE /api/calculation-sheet-template/{id}
      200 → setRows(rows.filter(r => r.id !== id)), feedback sukses
```

### I.5 Aturan konsistensi

- Semua mutasi memakai `busyId`; hanya satu request mutasi pada satu waktu.
- Bila response sukses tetapi body tidak valid → perlakukan sebagai error, jangan set state.
- Setelah mutasi, urutan dihitung ulang oleh `groupCstRows` (tanpa endpoint reorder).
- Feedback sukses tidak menutupi error baris; error baris tetap sampai diperbaiki/dibatalkan.

---

## J. Authentication & RBAC

### J.1 Permission baru (`src/lib/auth/permissions.ts`)

```ts
CALCULATION_SHEET_VIEW: "CALCULATION_SHEET_VIEW",
CALCULATION_SHEET_MANAGE: "CALCULATION_SHEET_MANAGE",
```

| Permission | Non-Admin roles | Efek |
|---|---|---|
| `CALCULATION_SHEET_VIEW` | Head Office, Project, Management | Melihat sidebar, halaman, `GET` |
| `CALCULATION_SHEET_MANAGE` | Head Office | `POST`/`PUT`/`DELETE`, `+ Baris`, `pic-options` |

Admin otomatis lolos keduanya lewat `hasPermission()` super-application rule. Tidak ada
`CALCULATION_SHEET_DELETE` karena P1 memberi Head Office full CRUD (berbeda dari MKS).

### J.2 Access helper (`src/lib/calculation-sheet-template/access.ts`)

```ts
canViewCalculationSheet(role): boolean
canManageCalculationSheet(role): boolean
assertViewAccess(actor): void   // aktif + VIEW
assertManageAccess(actor): void // aktif + MANAGE
isEligibleCstPic(user): boolean // role Head Office, status bebas
```

### J.3 Guard berlapis

| Lapisan | Perilaku |
|---|---|
| Sidebar | `showCalculationSheet = canViewCalculationSheet(role)`; masuk `showCoreEnterprise` |
| Layout | `getCurrentUser()`; tanpa sesi → `/login`; tanpa VIEW → `/dashboard` |
| Server page | `canManage = canManageCalculationSheet(role)` dikirim sebagai prop; browser tidak mengirim role |
| Client UI | Render tombol/input hanya bila `canManage`; read-only tetap melihat data |
| Service | `assertViewAccess`/`assertManageAccess` sebelum query/tulis |
| API | Actor dari sesi (`requireUser`); 401/403 dari `mapDomainError` |

### J.4 Aturan PIC

- Hanya role Head Office yang eligible; suspended **tetap** eligible dengan label
  `(non-aktif)` (pola MKS).
- Validasi server wajib: user ada + role Head Office; bukan hanya validasi UI.
- `pic_user_id` NOT NULL; menghapus user PIC ditolak FK (`no action`).

### J.5 Matriks izin

| Aksi | Admin | Head Office | Management | Project |
|---|---|---|---|---|
| Lihat halaman/list | ✅ | ✅ | ✅ | ✅ |
| Tambah baris | ✅ | ✅ | — | — |
| Edit baris | ✅ | ✅ | — | — |
| Hapus baris | ✅ | ✅ | — | — |
| Lihat opsi PIC | ✅ | ✅ | — | — |

---

## K. Concurrency

| Aspek | Keputusan |
|---|---|
| Versioning | **Tidak ada** kolom `version`/token (D-CST-04) |
| Strategi | Last-write-wins per baris |
| Audit | `updated_by` + `updated_at` di-set service setiap update |
| Duplikasi kode | Dicegah unique index; dua create bersamaan → satu 201, satu 409 |
| Dua editor | Editor kedua menimpa perubahan pertama tanpa peringatan; diterima sebagai risiko residual |
| Mitigasi UI | `busyId` memblokir mutasi ganda dalam satu tab; edit singkat; setelah 409 user melihat pesan |
| Delete vs edit | Delete baris yang sedang diedit ditolak di UI; API tetap mengembalikan 404 bila sudah hilang |
| Masa depan | Bila dibutuhkan, tambahkan `version`/`updated_at` token seperti KM V2 — **bukan** scope P4 |

Catatan: tanpa versioning, tidak ada 409 optimistik; satu-satunya 409 adalah pelanggaran
unique kode dan FK.

---

## L. Regression Impact

| Area | Dampak | Mitigasi |
|---|---|---|
| MKS | Tidak ada perubahan file/komponen/logika | Tidak menyentuh `metode-kerja-standar/**` |
| MSL | Tidak ada perubahan | Tidak menyentuh `msl/**` |
| KM | Tidak ada perubahan | Tidak menyentuh `knowledge-management/**` |
| Sidebar existing | `SidebarItem` diberi field opsional `anchor`; blok CST ditambahkan | Additive; item lama tanpa `anchor` berperilaku sama |
| `getSidebarVisibility` | Field baru `showCalculationSheet`; `showCoreEnterprise` diperluas | Default derive dari permission baru; role lama tidak berubah untuk modul lain |
| Permission map | 2 entry baru | Additive; tidak mengubah role array existing |
| Database | Tabel baru | Migration aditif; tidak mengubah tabel existing |
| Tests sidebar | Test existing harus tetap PASS | Tambah test CST; jangan ubah ekspektasi lama |
| Bundle | Halaman baru + client components | Tidak ada dependency baru |

Sidebar adalah satu-satunya file bersama yang berubah. Karena itu P4 wajib menjalankan
seluruh test sidebar existing (`DashboardSidebar.test.ts`, `metodeKerjaSidebar.test.ts`,
`knowledgeManagement` sidebar test) dan memeriksa keempat role.

---

## M. Testing Strategy

### M.1 Unit test murni (node:test, tanpa DOM)

| File uji | Cakupan |
|---|---|
| `constants.test.ts` | 7 kategori; urutan; label tanpa angka; slug unik; lookup code/slug; `LAINNYA` ada |
| `schema.test.ts` | kode 1–30 + uppercase; nama 1–200; URL valid/invalid/2048/2049; catatan 2000/2001; strict menolak `kategori` pada update; PIC UUID |
| `cst-draft.test.ts` | `EMPTY_CST_DRAFT`, `toCstDraft`, `draftEquals`, `isEmptyDraft`, `validateCstDraft` (semua field), payload create/update null saat invalid |
| `grouping.test.ts` | 7 grup selalu; grup kosong; urutan kanonik; urutan kode; baris kategori tak dikenal diabaikan/di-fail-safe |
| `access.test.ts` | VIEW/MANAGE per 4 role + suspended + role tak dikenal; eligibility PIC |
| `_helpers.test.ts` | `mapDomainError`: 401/403/404/409/400, Zod details, 23505 → 409, 23503 → 409, 23514 → 400, unknown → `null` |
| `service.test.ts` | Normalisasi kode/nama/catatan/URL; validasi PIC role (fake dependency); pesan 409 |

Tidak ada test yang membutuhkan database atau jsdom; sesuai runner existing.

### M.2 API/route test

- Route diuji pada level helper/validasi (tanpa DB): body invalid → 400, id invalid → 400,
  kategori invalid → 400, mapping error.
- Integrasi DB nyata (create/update/delete) **tidak** dijalankan otomatis karena tidak ada
  database uji terisolasi; verifikasi dilakukan manual oleh Owner (§Q) dan dilaporkan
  sebagai runtime, bukan unit test.

### M.3 Quality gates (wajib sebelum handoff P4)

| Perintah | Target |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <file berubah>` | exit 0, 0 warning |
| `npm test` | seluruh suite PASS (baseline 122 + test CST baru) |
| `git diff --check` | exit 0 |
| `npx drizzle-kit check` | PASS (schema/snapshot konsisten) |

### M.4 Manual acceptance (Owner)

| Skenario | Admin | Head Office | Management | Project |
|---|---|---|---|---|
| Lihat 7 kategori + data | ✅ | ✅ | ✅ | ✅ |
| Tambah baris | ✅ | ✅ | tidak ada tombol | tidak ada tombol |
| Edit baris | ✅ | ✅ | — | — |
| Hapus baris | ✅ | ✅ | — | — |
| Kode duplikat per kategori | 409 terlihat | 409 | — | — |
| URL invalid | error baris | error baris | — | — |
| PIC non-aktif | bisa dipilih | bisa dipilih | — | — |
| Anchor sidebar | scroll tepat | scroll tepat | scroll tepat | scroll tepat |
| Refresh setelah CRUD | data persisten | persisten | — | — |

---

## N. File Impact Inventory

### N.1 File baru

| Path | Isi |
|---|---|
| `src/lib/calculation-sheet-template/constants.ts` | 7 kategori + label/slug + helper lookup |
| `src/lib/calculation-sheet-template/access.ts` | VIEW/MANAGE + assert + eligibility PIC |
| `src/lib/calculation-sheet-template/schema.ts` | Zod create/update + `isSafeCstUrl` |
| `src/lib/calculation-sheet-template/grouping.ts` | `groupCstRows`, tipe grup |
| `src/lib/calculation-sheet-template/repository.ts` | Query flat + insert/update/delete + list PIC options |
| `src/lib/calculation-sheet-template/service.ts` | Assert actor, normalisasi, DTO, mapping error, validasi PIC |
| `src/app/api/calculation-sheet-template/_helpers.ts` | Actor, parse body, `mapDomainError` |
| `src/app/api/calculation-sheet-template/route.ts` | `GET`, `POST` |
| `src/app/api/calculation-sheet-template/[id]/route.ts` | `PUT`, `DELETE` |
| `src/app/api/calculation-sheet-template/pic-options/route.ts` | `GET` opsi PIC |
| `src/app/dashboard/calculation-sheet-template/layout.tsx` | Guard VIEW |
| `src/app/dashboard/calculation-sheet-template/page.tsx` | Server page + `canManage` |
| `src/components/dashboard/calculation-sheet-template/CalculationSheetPage.tsx` | State, fetch, mutasi, feedback |
| `src/components/dashboard/calculation-sheet-template/CalculationSheetTable.tsx` | Tabel, header kategori, baris |
| `src/components/dashboard/calculation-sheet-template/CalculationSheetPicSelect.tsx` | `<select>` PIC inline |
| `src/components/dashboard/calculation-sheet-template/cst-draft.ts` | Helper draft murni |
| `src/lib/calculation-sheet-template/*.test.ts` (5–6 file) | Unit test murni |
| `drizzle/0017_calculation_sheet_template.sql` | Migration (dibuat `drizzle-kit generate`) |
| `drizzle/meta/0017_snapshot.json` | Snapshot (dibuat tool) |

### N.2 File yang diubah

| Path | Perubahan |
|---|---|
| `src/lib/auth/permissions.ts` | 2 permission + role mapping |
| `src/lib/pg/schema.ts` | Tabel `calculationSheetTemplates` + tipe Pg |
| `src/components/dashboard/DashboardSidebar.tsx` | `SidebarItem.anchor?`, menu 7 item, visibility, accordion, blok render, active-by-anchor |
| `src/components/dashboard/DashboardSidebar.test.ts` | Test visibility + anchor CST |
| `drizzle/meta/_journal.json` | Entry `0017` (oleh tool) |
| `docs/development/CURRENT_PROJECT_STATE.md`, `DEVELOPMENT_MASTER_LOG.md`, `FEATURE_REGISTER.md` | Catatan implementasi P4 (fase P4, bukan P3) |

### N.3 File yang TIDAK boleh berubah

`src/lib/metode-kerja-standar/**`, `src/components/dashboard/metode-kerja-standar/**`,
`src/lib/msl/**`, `src/components/dashboard/msl/**`, `src/lib/knowledge-management/**`,
`src/components/dashboard/knowledge-management/**`, `docs/design/CST_P2_AUDIT.md`,
serta seluruh tabel/migration `0000`–`0016`.

---

## O. Technical Risks & Open Decisions

### O.1 Risiko

| # | Risiko | Prob. | Dampak | Mitigasi |
|---|---|---|---|---|
| R-01 | Draft hilang saat navigasi client-side | Sedang | Kehilangan input | Konfirmasi Batal/pindah baris + `beforeunload`; dokumentasikan batasan |
| R-02 | Baris kosong menumpuk | Rendah | Data sampah | Satu draft global, Simpan/Batal eksplisit, tidak ada auto-insert ke DB |
| R-03 | Anchor tidak aktif tanpa klik (tanpa scroll-spy) | Sedang | Indikator submenu tidak mengikuti posisi scroll | Terima sebagai batasan V1; klik selalu benar; scroll-spy opsional di masa depan |
| R-04 | `scroll-mt` kurang akibat header sticky | Rendah | Judul tertutup | `scroll-mt-24` pada `<tbody>`; verifikasi manual desktop/mobile |
| R-05 | Kode duplikat antar kategori | Rendah | 409 saat simpan | Sesuai D-CST-02; pesan menyebut kategori |
| R-06 | PIC dihapus | Rendah | FK 409 | Pesan jelas; admin harus ganti PIC lebih dulu |
| R-07 | URL panjang merusak layout | Sedang | Baris melebar | `truncate` + `max-w` + `title`; input `maxLength` |
| R-08 | Dua editor saling menimpa | Sedang | Kehilangan perubahan | Diterima (D-CST-04); audit `updated_by/at`; pesan 409 hanya untuk kode |
| R-09 | Perubahan sidebar memecah modul lain | Rendah | Navigasi rusak | Field `anchor` opsional; test sidebar existing wajib PASS |
| R-10 | Migration dijalankan tanpa backup | Rendah | Data loss (tabel baru, risiko terbatas) | Rollback `DROP TABLE`; apply hanya dengan otorisasi |
| R-11 | Scope creep (PDF/reorder/upload) | Sedang | Jadwal | Non-goals §A/§O.3; tolak perubahan tanpa P1 baru |
| R-12 | `catatan`/`kode` berisi karakter aneh | Rendah | Tampilan rusak | React escaping; `break-words`; tidak ada `dangerouslySetInnerHTML` |

### O.2 Keputusan teknis yang sudah final (tidak perlu OQ)

| ID | Keputusan | Alasan |
|---|---|---|
| TD-01 | Kategori disimpan sebagai **code** uppercase, label di constants | Stabil, CHECK ketat, label mudah diubah |
| TD-02 | `kategori` **immutable** setelah create (tidak ada di body PUT) | Field P1 tidak menyertakan kategori; mencegah baris berpindah grup tanpa jejak |
| TD-03 | API mengembalikan **flat rows**, grouping di client lewat helper murni | Satu request, 7 header tetap dirender, helper mudah diuji |
| TD-04 | Satu `<table>` dengan 7 `<tbody>` | Lebar kolom konsisten; anchor pada tbody |
| TD-05 | Evidence & catatan **opsional** | P1 tidak menyatakan wajib; MKS juga opsional |
| TD-06 | Tanpa `sort_order`; urut kategori kanonik lalu kode | Tidak ada reorder di P1 |
| TD-07 | HO boleh hapus (satu permission MANAGE) | P1: Admin & HO full CRUD |
| TD-08 | Nama route `calculation-sheet-template`, permission `CALCULATION_SHEET_*` | Mengikuti pola penamaan modul existing |

### O.3 Non-goals (tidak dibangun di P4)

- Reorder baris/kategori, drag & drop.
- PDF/export, summary report, chart.
- Upload file/blob atau preview dokumen.
- Modal form, halaman edit terpisah.
- Soft delete, restore, audit trail historis.
- Optimistic concurrency/version.
- Pencarian/filter/pagination (data master kecil; dapat ditambah kemudian bila diminta).
- Perubahan pada MKS/MSL/KM.

### O.4 Open decisions non-blocking (boleh diputuskan saat P4)

| # | Pertanyaan | Default desain |
|---|---|---|
| OD-01 | Label modul di sidebar: "Calculation Sheet Template" atau "Calculation Sheet"? | **Calculation Sheet Template** |
| OD-02 | Tombol `+ Baris` di header kategori atau hanya empty state? | **Header kategori** + empty state CTA saat kosong |
| OD-03 | Auto-uppercase kode saat mengetik atau saat simpan? | **Saat simpan** (server), input menampilkan apa yang diketik; setelah sukses tampil uppercase |
| OD-04 | Perlu indikator jumlah baris per kategori di header? | **Ya**, teks kecil `(N)` di kanan header |
| OD-05 | Perlu tombol "Batal" pada draft yang belum diisi? | **Ya**, selalu tersedia saat mode create |

---

## P. Implementation Plan (Sub-fase A–E)

| Sub-fase | Isi | Deliverable | Gate |
|---|---|---|---|
| **A — Foundation** | `constants.ts`, `access.ts`, `schema.ts`, permission baru, tabel Drizzle, generate migration `0017`, unit test constants/schema/access | Schema + migration file + test PASS | `tsc`, test, `drizzle-kit check` |
| **B — Backend** | `repository.ts`, `service.ts`, `_helpers.ts`, route `GET/POST`, `[id] PUT/DELETE`, `pic-options`; unit test grouping/service/helper | API lengkap | `tsc`, eslint, test, mapping error teruji |
| **C — Read-only UI** | Layout guard, server page, client page fetch, `groupCstRows`, tabel 7 `<tbody>` + header `colSpan`, skeleton/error/empty, PIC read-only, EvidenceCell | Halaman dapat dibaca 4 role | Manual read-only; test grouping |
| **D — Inline CRUD** | State `editing`/`create`/`busy`, draft helpers, PIC select, validasi per baris, Simpan/Batal/Edit/Hapus, feedback, dirty guard | CRUD inline lengkap | Manual Admin/HO; 409/400 terlihat |
| **E — Sidebar, regression, docs** | `SidebarItem.anchor`, 7 submenu, visibility/accordion, active-by-anchor, test sidebar, regresi MKS/MSL/KM, dokumentasi P4 | Navigasi final + laporan | Semua gate §M.3 + manual 4 role |

Urutan wajib: A → B → C → D → E. Setiap sub-fase berhenti di gate sebelum lanjut; tidak
ada commit/push tanpa otorisasi Owner.

---

## Q. Acceptance Criteria

### Q.1 Fungsional

1. Halaman menampilkan **7 kategori** berurutan sesuai constants, tanpa angka prefix, dan
   header kategori membentang penuh (`colSpan={6}`).
2. Setiap kategori kosong tetap dirender dengan pesan "Belum ada baris untuk kategori ini."
3. Admin/Head Office dapat menambah baris inline pada kategori mana pun; setelah simpan
   baris muncul pada grup dan posisi kode yang benar.
4. Admin/Head Office dapat mengedit semua field kecuali kategori; perubahan tersimpan dan
   terlihat setelah refresh.
5. Admin/Head Office dapat menghapus baris dengan konfirmasi; baris hilang setelah refresh.
6. `kode` unik per kategori (case-insensitive, trim); duplikat menghasilkan pesan 409 yang
   menyebut kategori.
7. PIC wajib, hanya Head Office, single-select; suspended tampil `(non-aktif)` dan tetap
   dapat dipilih.
8. `evidence_url` opsional, maks 2048, hanya http/https; URL invalid menampilkan error pada
   baris yang salah, bukan banner global.
9. `catatan` opsional, maks 2000.
10. Tidak ada modal, upload file, reorder, PDF, atau summary di modul ini.
11. Sidebar menampilkan 7 submenu yang men-scroll ke kategori terkait pada halaman yang sama.

### Q.2 RBAC

12. Admin: seluruh aksi berhasil (create, edit, delete).
13. Head Office: seluruh aksi berhasil (create, edit, delete).
14. Management: hanya melihat data; tidak ada `+ Baris`/Edit/Hapus; API mutasi → 403.
15. Project: hanya melihat data; API mutasi → 403.
16. Tanpa sesi: halaman → `/login`; API → 401.
17. Akun suspended: API → 403.

### Q.3 Integritas data

18. Migration `0017` aditif; tabel existing tidak berubah; rollback tersedia.
19. `pic_user_id` NOT NULL dan FK `no action`; menghapus user PIC ditolak.
20. CHECK kategori/kode/nama/URL/catatan aktif di database (bukan hanya Zod).
21. Tidak ada kolom/endpoint storage atau jejak upload.

### Q.4 Non-regresi

22. Seluruh test existing PASS (baseline 122 + test CST baru).
23. MKS, MSL, KM tidak berubah secara fungsional maupun markup.
24. Sidebar modul lain tetap berperilaku sama (accordion, active state, visibility 4 role).

### Q.5 Kualitas

25. `npx tsc --noEmit` exit 0.
26. `npx eslint` file berubah exit 0 tanpa warning.
27. `git diff --check` exit 0.
28. `npx drizzle-kit check` PASS.
29. Tidak ada dependency baru.
30. Dokumentasi P4 diperbarui (`CURRENT_PROJECT_STATE`, `DEVELOPMENT_MASTER_LOG`,
    `FEATURE_REGISTER`) dengan bukti runtime yang benar (bukan klaim tanpa sumber).

---

## Ringkasan Handoff

| Item | Status |
|---|---|
| Struktur dokumen A–Q | **Lengkap 17 section** |
| Keputusan Owner D-CST-01…06 | Semua tercermin (§A, §E, §G, §J, §K) |
| Source code diubah | **Tidak** |
| File baru | Hanya `docs/design/CST_P3_TECHNICAL_DESIGN.md` |
| Migration dijalankan | **Tidak** |
| Commit/push | **Tidak** |

Dokumen ini siap direview Owner/ChatGPT. Jika PASS dan Owner memberi **"Siap dikembangkan"**,
P4 Implementasi dimulai dari Sub-fase A (foundation + migration), dengan gate statis sebelum
melanjutkan ke backend/UI.
