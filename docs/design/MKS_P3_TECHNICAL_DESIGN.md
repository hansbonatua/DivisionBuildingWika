# P3 — Technical Design: Metode Kerja Standar

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building  
**Fase:** P3 — Technical Design (dokumen saja)  
**Tanggal:** 2026-11-06  
**Baseline:** `main` @ `ea70ba2`  
**Status:** READY FOR REVIEW  
**P4:** Belum dimulai

---

## A. Executive Summary

### A.1 Tujuan MKS

Metode Kerja Standar (MKS) adalah **master reference** perusahaan untuk cara kerja
engineering, bukan data per-project. MKS mengelompokkan cara kerja ke dalam enam
disiplin hardcoded (A–F), lalu menyimpan sub-kategori dan item di bawahnya. Setiap
entitas dapat memiliki PIC dari User Directory (Head Office), evidence URL opsional,
catatan, urutan tampil, dan audit trail.

Struktur navigasi:

```text
/dashboard/metode-kerja-standar
  /summary
  /a-struktur
  /b-arsitektur
  /c-mep
  /d-landscape-hardscape-infrastructure
  /e-site-management
  /f-lainnya
```

Root selalu redirect ke `/summary` untuk semua role yang berhak melihat.

### A.2 Keputusan Owner (final)

| ID | Keputusan | Konsekuensi desain |
|---|---|---|
| D-MKS-01 | PIC suspended tetap boleh menjadi PIC dan diberi label `(non-aktif)` | Query PIC **tidak** memfilter status; UI menampilkan status |
| D-MKS-02 | Filter Summary: Disiplin, PIC, Search (nama/kode); client-side | Summary memuat seluruh data sekali; filter di memori |
| D-MKS-03 | “F. Lainnya” selalu ada dan boleh kosong | Enam disiplin adalah konstanta; tidak ada seed sub-kategori |
| D-MKS-04 | Audit trail di sub-kategori dan item | `created_by`, `created_at`, `updated_by`, `updated_at` |
| D-MKS-05 | Evidence URL opsional (http/https) di sub-kategori dan item | Satu kolom `evidence_url` nullable per tabel |
| D-MKS-06 | Semua role redirect ke `/summary`; Management/Project read-only | Guard root + UI tanpa tombol mutasi untuk role view |

### A.3 Enam keputusan P3

| ID | Keputusan | Alasan ringkas |
|---|---|---|
| P3-01 | PIC memakai **tabel relasi** `metode_kerja_pic`, bukan JSON array | Integritas FK ke `users`, query PIC, konsisten dengan KM/Program Kerja |
| P3-02 | **Tidak ada** kolom `version` / optimistic concurrency di V1 | Master reference, volume kecil, tidak ada edit bersamaan kritis |
| P3-03 | Reorder memakai **tombol naik/turun**, bukan drag/drop | Lebih sederhana, aksesibel, dan cukup untuk kebutuhan |
| P3-04 | Summary menampilkan baris **“Belum ada item”** untuk disiplin/sub-kategori kosong | User melihat seluruh enam disiplin, termasuk F |
| P3-05 | PDF **A4 landscape**; fallback A3 hanya bila lebar kolom melebihi area cetak | A4 cukup untuk 7 kolom; A3 adalah jaring pengaman |
| P3-06 | Sub-kategori **tidak dapat pindah disiplin**; item tidak dapat pindah sub-kategori | Menjaga hirarki dan menyederhanakan edit |

### A.4 Arsitektur ringkas

**Baru:** constants, dua tabel entitas + satu tabel PIC, repository/service/schema,
API namespace baru, lima komponen UI inti, exporter PDF, halaman/route, migration.

**Reuse:** permission registry, pola access helper, pola modal/dirty/focus trap KM,
pola PIC checklist, pola summary client-side, pola PDF, pola sidebar accordion, pola
redirect root, pola error mapping route/service.

---

## B. Requirement Traceability Matrix

> Catatan: dokumen P1 tidak tersimpan di repository ini. AC-01–AC-21 di bawah adalah
> rekonstruksi dari ringkasan P1 yang diberikan Owner. Jika penomoran P1 berbeda,
> tabel ini tetap menjadi pemetaan resmi P3 dan tidak mengubah keputusan P1.

| AC | Requirement | File impacted | Komponen | Verifikasi |
|---|---|---|---|---|
| AC-01 | Enam disiplin A–F, termasuk F, selalu tersedia | `constants.ts`, `schema.ts`, `DashboardSidebar.tsx` | Constants, sidebar | Unit test daftar disiplin; UI |
| AC-02 | Summary Report paling atas submenu | `DashboardSidebar.tsx` | Menu MKS | Unit test urutan menu |
| AC-03 | Root MKS redirect ke `/summary` | `app/dashboard/metode-kerja-standar/page.tsx` | Server redirect | HTTP 307/308 ke summary |
| AC-04 | Summary berupa tabel flat semua disiplin | `MetodeKerjaSummaryPage.tsx`, `summary.ts` | Summary page | Browser + unit filter |
| AC-05 | Filter Summary berdasarkan disiplin | `MetodeKerjaSummaryPage.tsx` | Filter bar | Unit filter; browser |
| AC-06 | Filter Summary berdasarkan PIC | `MetodeKerjaSummaryPage.tsx` | Filter bar | Unit filter; browser |
| AC-07 | Search Summary berdasarkan nama/kode | `MetodeKerjaSummaryPage.tsx`, `summary.ts` | Filter bar | Unit filter; browser |
| AC-08 | Summary dapat diexport PDF | `metodeKerjaExportPdf.ts` | PDF menu | Manual PDF; unit filename |
| AC-09 | Tabel disiplin memakai header disiplin full-width | `MetodeKerjaTable.tsx` | Table | Browser/visual |
| AC-10 | Sub-kategori indentasi level 1, item level 2 | `MetodeKerjaTable.tsx` | Table | Browser/visual |
| AC-11 | Create sub-kategori | FormDialog, API, service | Form + API | API 201 + browser |
| AC-12 | Edit sub-kategori | FormDialog, API, service | Form + API | API 200 + browser |
| AC-13 | Delete sub-kategori diblok jika masih ada item | service, FK RESTRICT | Delete dialog | API 409; DB test |
| AC-14 | Create item | FormDialog, API, service | Form + API | API 201 + browser |
| AC-15 | Edit item | FormDialog, API, service | Form + API | API 200 + browser |
| AC-16 | Delete item | API, service | Delete dialog | API 200 + browser |
| AC-17 | Sub-kategori boleh tanpa PIC | schema, service | Form | API 201 dengan `pic_ids: []` |
| AC-18 | Item wajib minimal 1 PIC Head Office | schema, service, DB trigger | PicMultiSelect | API 400/409; DB test |
| AC-19 | PIC non-aktif tetap dapat dipilih dan diberi label | repository, PicMultiSelect | PicMultiSelect | Menu berisi suspended + label |
| AC-20 | Ordering `sort_order`, default append +10, reorder naik/turun | service, API reorder, Table | Table | Unit sort; API; browser |
| AC-21 | RBAC: Admin full, HO manage, Mgmt/Project view | `permissions.ts`, `access.ts`, layout/API | Guard | Unit matrix; API 403 |
| AC-22 | Audit trail pada sub-kategori dan item | schema, DTO | Detail/table | DB row + response |
| AC-23 | Evidence URL opsional http/https | schema, DB CHECK | Form | Unit URL; API |
| AC-24 | Disiplin/sub-kategori kosong tetap tampil di Summary | summary builder | Summary | Unit + browser |
| AC-25 | Role view-only tidak melihat tombol mutasi | pages/components | UI | Browser 4 role |

---

## C. Repository Baseline

| Item | Nilai |
|---|---|
| Branch | `main` |
| HEAD | `ea70ba2` — `feat(KM): V2 enhancement — view, PDF, filter, search` |
| Working tree | Bersih selain `?? docs/design/MKS_P2_AUDIT.md` (P2) |
| Test existing | 60/60 PASS, 19 suite (KM V2 enhancement) |
| Modul MKS | Belum ada route, API, schema, atau komponen |
| Migration terakhir | `0015_knowledge_management_v2_fresh.sql`, journal idx 15 |
| KM V2 | Enhancement sudah ter-commit; tidak boleh disentuh |
| MSL/Org/Program Kerja | Stabil; tidak boleh disentuh |

Pola acuan utama:

- Permission: `src/lib/auth/permissions.ts:24-118`.
- Modal/dirty: `KnowledgeFormDialog.tsx:289-349, 532-570`.
- PIC: `ProgramKerjaForm.tsx:492-516`; `KnowledgeFormDialog.tsx:656-719`.
- Summary: `ProgramKerjaSummaryDashboard.tsx:409-505`; `summaryService.ts:98-121`.
- PDF: `knowledgeExportPdf.ts:90-95, 217-222, 455-476`.
- Sidebar: `DashboardSidebar.tsx:145-179, 259-274, 570-760`.
- Redirect: `program-kerja/page.tsx:1-5`.
- Error mapping: `api/engineering-database/_helpers.ts`.
- Schema/audit/FK: `src/lib/pg/schema.ts`.

---

## D. Existing vs Proposed Architecture

### D.1 Diagram

```text
Browser
  |
  |-- /dashboard/metode-kerja-standar ---------> redirect /summary
  |-- /summary --------------------------------> SummaryPage (client)
  |-- /[disiplin] -----------------------------> DisiplinPage (client container)
  |                                                |-- MetodeKerjaTable
  |                                                |-- MetodeKerjaFormDialog
  |                                                |-- MetodeKerjaDeleteDialog
  |
  +--> /api/metode-kerja-standar/* -------------> route -> service -> repository -> PostgreSQL
                                                   |
                                                   +-- permissions/access
                                                   +-- users (PIC)
```

### D.2 Baru vs reuse

| Area | Baru | Reuse |
|---|---|---|
| Data | 3 tabel + migration 0016 | pola pgTable, CHECK, FK, index |
| Domain | constants/schema/repository/service/summary | pola KM/Engineering |
| API | namespace MKS | `_helpers` pattern, getActor, mapDomainError |
| UI | Table, FormDialog, PicMultiSelect, SummaryPage, DeleteDialog, PDF | modal/focus/dirty pattern, filter bar, PDF |
| Navigasi | menu MKS | accordion Core Enterprise |
| Auth | 3 permission + access | `PERMISSIONS`, `hasPermission` |
| Landing | page redirect + layout guard | pola Program Kerja/Engineering |

### D.3 Integrasi

- **Sidebar:** item top-level accordion “Metode Kerja Standar”, Summary pertama,
  disusul enam disiplin.
- **Permission:** tiga konstanta baru; Admin tetap super-application.
- **User Directory:** PIC hanya Head Office; status suspended tetap ditampilkan.
- **Tidak ada integrasi Master Project** — MKS master reference, bukan per-project.

---

## E. Database Design

### E.1 Analisis PIC: relasi vs JSON

| Aspek | Tabel relasi | JSON array |
|---|---|---|
| FK ke `users` | Ya | Tidak |
| PIC valid / role | Dapat dijaga service + FK | Hanya service |
| Query/filter PIC | Indexed join | Perlu scan/parse |
| Duplikasi PIC | Dicegah unique | Harus didedupe manual |
| Delete user | Diblokir `NO ACTION` | Bisa menghasilkan ID yatim |
| Write | Perlu transaksi pendek | Satu baris |

**Keputusan P3-01: tabel relasi `metode_kerja_pic`.** Integritas User Directory lebih
penting daripada satu statement write. Ini juga konsisten dengan
`knowledge_pics` dan `program_kerja_pics`.

Karena sub-kategori dan item sama-sama dapat punya PIC, tabel relasi memakai dua
nullable FK dengan CHECK tepat satu target:

```text
metode_kerja_pic
  sub_kategori_id nullable -- target A
  item_id         nullable -- target B
  user_id         not null
  CHECK (target A XOR target B)
```

Alternatif dua tabel join terpisah lebih murni, tetapi menambah tabel dan duplikasi
query. Satu tabel dengan CHECK tepat-satu-target menjaga jumlah tabel tetap tiga dan
tetap memiliki FK nyata.

### E.2 Skema Drizzle (pseudo-code)

```ts
// src/lib/pg/schema.ts
export const metodeKerjaSubKategori = pgTable(
  "metode_kerja_sub_kategori",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disiplin: text("disiplin").notNull(),          // A..F
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    evidenceUrl: text("evidence_url"),
    note: text("note"),
    createdBy: uuid("created_by").notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by")
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("metode_kerja_sub_kategori_disiplin_sort_idx")
      .on(table.disiplin, table.sortOrder, table.id),
    uniqueIndex("metode_kerja_sub_kategori_disiplin_kode_unique")
      .on(table.disiplin, sql`lower(btrim(${table.kode}))`),
    index("metode_kerja_sub_kategori_created_by_idx").on(table.createdBy),
    index("metode_kerja_sub_kategori_updated_by_idx").on(table.updatedBy),
    check("metode_kerja_sub_kategori_disiplin_check",
      sql`${table.disiplin} in ('A','B','C','D','E','F')`),
    check("metode_kerja_sub_kategori_kode_check",
      sql`length(btrim(${table.kode})) between 1 and 30`),
    check("metode_kerja_sub_kategori_sort_check", sql`${table.sortOrder} >= 0`),
    check("metode_kerja_sub_kategori_evidence_check",
      sql`${table.evidenceUrl} is null or ${table.evidenceUrl} ~ '^https?://'`),
    check("metode_kerja_sub_kategori_note_check",
      sql`${table.note} is null or length(${table.note}) <= 2000`),
  ],
);

export const metodeKerjaItem = pgTable(
  "metode_kerja_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subKategoriId: uuid("sub_kategori_id").notNull()
      .references(() => metodeKerjaSubKategori.id, { onDelete: "restrict" }),
    kode: text("kode").notNull(),
    nama: text("nama").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    evidenceUrl: text("evidence_url"),
    note: text("note"),
    createdBy: uuid("created_by").notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by")
      .references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("metode_kerja_item_sub_kategori_sort_idx")
      .on(table.subKategoriId, table.sortOrder, table.id),
    uniqueIndex("metode_kerja_item_sub_kategori_kode_unique")
      .on(table.subKategoriId, sql`lower(btrim(${table.kode}))`),
    index("metode_kerja_item_created_by_idx").on(table.createdBy),
    index("metode_kerja_item_updated_by_idx").on(table.updatedBy),
    check("metode_kerja_item_kode_check",
      sql`length(btrim(${table.kode})) between 1 and 30`),
    check("metode_kerja_item_sort_check", sql`${table.sortOrder} >= 0`),
    check("metode_kerja_item_evidence_check",
      sql`${table.evidenceUrl} is null or ${table.evidenceUrl} ~ '^https?://'`),
    check("metode_kerja_item_note_check",
      sql`${table.note} is null or length(${table.note}) <= 2000`),
  ],
);

export const metodeKerjaPic = pgTable(
  "metode_kerja_pic",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subKategoriId: uuid("sub_kategori_id")
      .references(() => metodeKerjaSubKategori.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .references(() => metodeKerjaItem.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull()
      .references(() => users.id, { onDelete: "no action" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    check("metode_kerja_pic_target_check",
      sql`((${table.subKategoriId} is not null)::int
           + (${table.itemId} is not null)::int) = 1`),
    uniqueIndex("metode_kerja_pic_sub_kategori_user_unique")
      .on(table.subKategoriId, table.userId)
      .where(sql`${table.subKategoriId} is not null`),
    uniqueIndex("metode_kerja_pic_item_user_unique")
      .on(table.itemId, table.userId)
      .where(sql`${table.itemId} is not null`),
    index("metode_kerja_pic_sub_kategori_idx").on(table.subKategoriId),
    index("metode_kerja_pic_item_idx").on(table.itemId),
    index("metode_kerja_pic_user_idx").on(table.userId),
  ],
);
```

**Catatan penting:** `metode_kerja_item` tidak menyimpan `disiplin` sendiri. Disiplin
diturunkan dari sub-kategori induk agar tidak ada dua sumber kebenaran. DTO API tetap
mengembalikan `disiplin` hasil join. Kode item unik per sub-kategori, bukan global.

### E.3 Constraint, index, dan trigger

| Aturan | Implementasi |
|---|---|
| Disiplin valid | `CHECK disiplin IN ('A'..'F')` |
| Kode unik | Unique expression `(disiplin, lower(btrim(kode)))`; item per sub-kategori |
| Parent valid | FK `item.sub_kategori_id`; `ON DELETE RESTRICT` |
| Hapus sub-kategori | Service cek child lalu 409; FK RESTRICT sebagai backstop |
| PIC valid | FK `user_id`; role Head Office divalidasi service |
| PIC satu target | CHECK XOR sub-kategori/item |
| PIC tidak duplikat | Partial unique `(target, user_id)` |
| Item minimal 1 PIC | Deferred constraint trigger di migration |
| Hapus PIC terakhir item | Deferred trigger pada `AFTER DELETE metode_kerja_pic` |
| Audit trail | `created_by` NOT NULL NO ACTION; `updated_by` SET NULL; timestamps |
| Evidence URL | CHECK regex http(s); validasi `new URL()` di service |

Trigger SQL ringkas:

```sql
CREATE CONSTRAINT TRIGGER metode_kerja_item_require_pic_trigger
AFTER INSERT OR UPDATE ON metode_kerja_item
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION metode_kerja_item_require_pic();
```

Fungsi memeriksa `EXISTS (SELECT 1 FROM metode_kerja_pic WHERE item_id = NEW.id)`.
Trigger `AFTER DELETE` pada PIC memeriksa item masih ada dan tidak punya PIC tersisa.
Sub-kategori tidak memakai trigger minimum karena PIC opsional.

### E.4 Migration

**File:** `drizzle/0016_metode_kerja_standar.sql`  
(Brief menyebut `0016_mks.sql`; keduanya merujuk artefak yang sama. Nama final
mengikuti konvensi deskriptif repo.)

Isi:

1. `CREATE TABLE metode_kerja_sub_kategori`.
2. `CREATE TABLE metode_kerja_item`.
3. `CREATE TABLE metode_kerja_pic`.
4. Index, unique index, CHECK.
5. Fungsi + deferred trigger minimum PIC item.
6. Tidak ada seed: enam disiplin berasal dari constants; F boleh kosong.

Journal `drizzle/meta/_journal.json` mendapat entri `idx: 16`, tag
`0016_metode_kerja_standar`.

### E.5 Rollback

Karena modul baru dan belum ada data produksi:

```sql
DROP TRIGGER IF EXISTS metode_kerja_item_require_pic_trigger ON metode_kerja_item;
DROP TRIGGER IF EXISTS metode_kerja_pic_require_remaining_trigger ON metode_kerja_pic;
DROP FUNCTION IF EXISTS metode_kerja_item_require_pic();
DROP FUNCTION IF EXISTS metode_kerja_pic_require_remaining();
DROP TABLE IF EXISTS metode_kerja_pic;
DROP TABLE IF EXISTS metode_kerja_item;
DROP TABLE IF EXISTS metode_kerja_sub_kategori;
```

Untuk rollback setelah ada data: backup/export ketiga tabel lebih dulu; drop bersifat
destruktif dan tidak otomatis. Journal entry 16 dihapus hanya jika migration down
dijalankan dengan prosedur yang disetujui.

---

## F. API Contract

### F.1 Konvensi umum

- Base: `/api/metode-kerja-standar`.
- Auth: `requireUser()`; actor `{id, role, status}`.
- Response sukses: `{ data: ... }`; error: `{ error: { message, details? } }`.
- `Cache-Control: no-store`.
- UUID diverifikasi sebelum service.
- Path `[disiplin]` menerima slug (`a-struktur` … `f-lainnya`), bukan huruf telanjang.
- Tidak ada endpoint untuk mengubah disiplin.

### F.2 Daftar endpoint

| # | Method | Path | Permission | Sukses | Error |
|---|---|---|---|---|---|
| 1 | GET | `/disiplin-list` | VIEW | 200 | 401,403,500 |
| 2 | GET | `/[disiplin]` | VIEW | 200 | 400,401,403,500 |
| 3 | POST | `/[disiplin]/sub-kategori` | MANAGE | 201 | 400,401,403,404,409,500 |
| 4 | PUT | `/sub-kategori/[id]` | MANAGE | 200 | 400,401,403,404,409,500 |
| 5 | DELETE | `/sub-kategori/[id]` | DELETE | 200 | 400,401,403,404,409,500 |
| 6 | POST | `/sub-kategori/[id]/item` | MANAGE | 201 | 400,401,403,404,409,500 |
| 7 | PUT | `/item/[id]` | MANAGE | 200 | 400,401,403,404,409,500 |
| 8 | DELETE | `/item/[id]` | DELETE | 200 | 400,401,403,404,409,500 |
| 9 | GET | `/pic-options` | MANAGE | 200 | 401,403,500 |
| 10 | GET | `/summary` | VIEW | 200 | 401,403,500 |
| 11 | POST | `/reorder` | MANAGE | 200 | 400,401,403,404,409,500 |

Endpoint 11 adalah tambahan untuk reorder atomik; sepuluh endpoint lain sesuai brief.

### F.3 Request/response per endpoint

**1. GET `/disiplin-list`**

```json
{ "data": [
  { "code": "A", "slug": "a-struktur", "name": "Struktur",
    "sub_kategori_count": 2, "item_count": 5 }
] }
```

Hanya metadata; sidebar tetap memakai constants agar tidak fetch saat render.

**2. GET `/[disiplin]`**

Response:

```json
{ "data": {
  "disiplin": { "code": "A", "slug": "a-struktur", "name": "Struktur" },
  "sub_kategori": [{
    "id": "uuid", "kode": "A.1", "nama": "Pekerjaan Persiapan",
    "sort_order": 10, "evidence_url": null, "note": null,
    "pics": [{ "user_id": "uuid", "name": "Nama", "status": "active", "position": "Staff" }],
    "items": [{
      "id": "uuid", "kode": "A.1.1", "nama": "Survey Lokasi",
      "sort_order": 10, "evidence_url": "https://...", "note": null,
      "pics": [], "created_by": {}, "created_at": "...", "updated_by": null, "updated_at": "..."
    }],
    "created_by": {}, "created_at": "...", "updated_by": null, "updated_at": "..."
  }]
} }
```

**3. POST `/[disiplin]/sub-kategori`**

```json
{ "kode": "A.1", "nama": "Pekerjaan Persiapan",
  "pic_ids": [], "evidence_url": "https://...", "note": "opsional" }
```

`kode` dan `nama` wajib; `pic_ids` opsional; `evidence_url`/`note` opsional.
`sort_order` tidak dikirim; service memakai `max(sort_order)+10` pada disiplin itu.
Sukses 201 mengembalikan sub-kategori lengkap.

**4. PUT `/sub-kategori/[id]`**

Body sama dengan create. `disiplin` tidak diterima (strict schema). `pic_ids` jika
ada menggantikan seluruh assignment; jika tidak ada, PIC tidak berubah? **Keputusan:**
field `pic_ids` wajib dikirim saat edit (array boleh kosong) agar form selalu
menyatakan state penuh. `sort_order` tidak diubah lewat endpoint ini.

**5. DELETE `/sub-kategori/[id]`**

- 200 `{ data: { deleted: true, id } }`.
- 409 jika `EXISTS item` → “Sub-kategori masih memiliki item dan tidak dapat dihapus.”
- PIC assignment ikut cascade; item tidak.

**6. POST `/sub-kategori/[id]/item`**

```json
{ "kode": "A.1.1", "nama": "Survey Lokasi",
  "pic_ids": ["uuid"], "evidence_url": null, "note": null }
```

`pic_ids` minimal 1; service memvalidasi Head Office (termasuk suspended).
`sort_order` append +10. 201 mengembalikan item.

**7. PUT `/item/[id]`**

Body sama; `sub_kategori_id` tidak diterima. `pic_ids` wajib, minimal 1.

**8. DELETE `/item/[id]`**

200 `{ deleted: true, id }`; PIC cascade. Tidak ada child.

**9. GET `/pic-options`**

```json
{ "data": [{ "user_id": "uuid", "name": "Nama", "status": "suspended", "position": "Staff" }] }
```

Hanya Head Office, termasuk suspended; hanya manage role.

**10. GET `/summary`**

```json
{ "data": { "rows": [{
  "disiplin": { "code": "A", "slug": "a-struktur", "name": "Struktur" },
  "sub_kategori": { "id": "uuid", "kode": "A.1", "nama": "Pekerjaan Persiapan" },
  "item": { "id": "uuid", "kode": "A.1.1", "nama": "Survey Lokasi" },
  "pics": [{ "user_id": "uuid", "name": "Nama", "status": "active" }],
  "evidence_url": null,
  "status": "item",
  "updated_at": "..."
}] } }
```

Satu baris per item. Sub-kategori tanpa item menghasilkan satu baris
`status: "sub-kategori-kosong"` dengan `item: null`. Disiplin tanpa sub-kategori
menghasilkan satu baris `status: "disiplin-kosong"` dengan `sub_kategori: null`.
Dengan demikian enam disiplin selalu terwakili dan “Belum ada item” dapat ditampilkan.

`pics` pada baris item adalah **gabungan PIC sub-kategori dan PIC item** (dedupe by
`user_id`), sehingga filter PIC menemukan baris meskipun PIC hanya di-assign di level
sub-kategori. `evidence_url` mengikuti level baris: evidence item untuk baris item,
evidence sub-kategori untuk baris sub-kategori kosong, dan `null` untuk disiplin kosong.

**11. POST `/reorder`**

```json
{ "entity": "sub_kategori", "parent_id": "uuid-disiplin-atau-subkat",
  "ordered_ids": ["uuid1", "uuid2"] }
```

- `entity=sub_kategori`: `parent_id` adalah kode disiplin (`A`–`F`).
- `entity=item`: `parent_id` adalah UUID sub-kategori.
- Service memastikan semua ID milik parent, tidak ada duplikat, dan jumlahnya sama
  dengan child saat ini; lalu menulis `sort_order = 10, 20, ...` dalam satu transaksi.
- 409 jika daftar tidak lengkap/berisi child asing.

### F.4 DTO

```ts
type PicDto = { user_id: string; name: string; status: string; position: string };
type UserRef = { user_id: string; name: string };
type AuditDto = {
  created_by: UserRef; created_at: string;
  updated_by: UserRef | null; updated_at: string;
};
type ItemDto = AuditDto & {
  id: string; kode: string; nama: string; sort_order: number;
  evidence_url: string | null; note: string | null; pics: PicDto[];
};
type SubKategoriDto = AuditDto & {
  id: string; disiplin: string; kode: string; nama: string;
  sort_order: number; evidence_url: string | null; note: string | null;
  pics: PicDto[]; items: ItemDto[];
};
type SummaryRow = {
  disiplin: { code: string; slug: string; name: string };
  sub_kategori: { id: string; kode: string; nama: string } | null;
  item: { id: string; kode: string; nama: string } | null;
  pics: PicDto[];
  evidence_url: string | null;
  status: "item" | "sub-kategori-kosong" | "disiplin-kosong";
  updated_at: string | null;
};
```

### F.5 Validasi schema

| Field | Aturan |
|---|---|
| `kode` | trim, uppercase, 1–30, tidak kosong |
| `nama` | trim, 1–200 |
| `note` | trim, maks 2000, kosong → null |
| `evidence_url` | trim, maks 2048, kosong → null; `new URL()` protocol http/https |
| `pic_ids` | array UUID; sub-kategori boleh kosong; item min 1; dedupe service |
| `disiplin` / parent | tidak diterima di body; dari route/parent |
| `sort_order` | tidak diterima di create/update; hanya reorder |

### F.6 Error mapping

| Domain | HTTP |
|---|---|
| Tidak login | 401 |
| Role/status tidak berhak | 403 |
| Body/ID/path tidak valid | 400 |
| Entitas tidak ditemukan | 404 |
| Kode duplikat, child masih ada, reorder tidak lengkap | 409 |
| Error tak terduga | 500 |

SQLSTATE: `23505` → 409 duplikat; `23503`/`23001` → 409 referensi; `23514` → 400
constraint. Semua route memakai `_helpers.ts` yang meniru
`api/engineering-database/_helpers.ts`.

---

## G. UI/UX Design

### G.1 Route

| Route | Isi | Role |
|---|---|---|
| `/dashboard/metode-kerja-standar` | Server redirect ke `/summary` | Semua viewer |
| `/summary` | Filter bar + tabel flat + PDF | Semua viewer |
| `/[disiplin]` | Tabel 3-level + CRUD | Semua viewer; tombol manage hanya Admin/HO |
| `layout.tsx` | Guard auth + VIEW | Semua |

Slug: `a-struktur`, `b-arsitektur`, `c-mep`,
`d-landscape-hardscape-infrastructure`, `e-site-management`, `f-lainnya`.

### G.2 Summary

- Header halaman: badge Core Enterprise, judul “Summary Report Metode Kerja Standar”.
- Filter bar: dropdown Disiplin, dropdown PIC, input Search, tombol Reset.
- Filter client-side dengan `useMemo`; data dimuat sekali.
- Kolom PIC memakai gabungan PIC sub-kategori + item; filter PIC mencocokkan gabungan itu.
- Tabel flat 7 kolom: Disiplin, Sub-Kategori, Item, PIC, Evidence, Status, Diperbarui.
- Baris kosong: “Belum ada item” / “Belum ada sub-kategori”.
- Tombol PDF dengan menu View/Export; disabled saat loading/error/kosong.
- Tidak ada tombol tambah/edit/delete di Summary.

### G.3 Halaman disiplin

- Judul disiplin + deskripsi singkat.
- Tombol “Tambah Sub-Kategori” hanya manage.
- Tabel 3-level (lihat H).
- Setiap sub-kategori: Edit, Hapus, Tambah Item (manage); Hapus hanya Admin.
- Setiap item: Edit, Hapus (manage/delete).
- Tombol reorder naik/turun pada sub-kategori dan item, hanya manage.
- Error 409 dari delete ditampilkan inline pada baris/dialog.

### G.4 Form modal

`MetodeKerjaFormDialog`:

- Mode create/edit; target sub-kategori atau item.
- Field: Kode, Nama, PIC (PicMultiSelect), Evidence URL, Catatan.
- Disiplin/parent ditampilkan read-only.
- Validasi client: kode/nama wajib; item minimal 1 PIC; URL http/https.
- PIC suspended tetap dapat dipilih dan diberi label `(non-aktif)` pada opsi/chip.
- Modal behavior: body lock, focus trap, Escape, restore focus, dirty confirm
  (pola `KnowledgeFormDialog`).
- Submit: POST/PUT; sukses → tutup + refetch; error → pertahankan input.
- Tidak ada field `sort_order`.

### G.5 Delete dialog

- Konfirmasi eksplisit; menampilkan nama dan dampak.
- Sub-kategori: peringatan bahwa delete diblok jika masih ada item.
- Item: peringatan PIC ikut terhapus.
- Error 409 ditampilkan di dialog; dialog tidak menutup otomatis.

### G.6 State

| State | UI |
|---|---|
| Loading awal | skeleton baris/tabel |
| Refreshing | indikator “Memperbarui…” tanpa menghapus data |
| Error awal | alert + Coba Lagi |
| Error saat data ada | banner, data lama tetap tampil |
| Empty disiplin | “Belum ada sub-kategori” + CTA manage |
| Empty sub-kategori | baris “Belum ada item” |
| Read-only | tanpa CTA/tombol mutasi |

### G.7 Mobile & aksesibilitas

- Tabel `overflow-x-auto`, `min-w-[1040px]`; tidak mengubah tabel menjadi kartu.
- Dialog full-width di mobile, `max-h-[100dvh]`, footer sticky.
- `role="dialog"`, `aria-modal`, `aria-labelledby`.
- `caption` tabel, `scope="col"`, `scope="row"`, `aria-label` tombol ikon.
- Fokus awal ke field pertama; Tab terperangkap; Escape menutup dengan konfirmasi dirty.
- Tombol reorder memiliki label “Naikkan …”/“Turunkan …”, bukan hanya ikon.

---

## H. Table Design

### H.1 Struktur

```text
<table>
  <caption>Metode Kerja Standar — Disiplin A</caption>
  <thead>  <-- sticky, hanya baris kolom
    <tr>
      <th>No</th><th>Kode</th><th>Nama</th><th>PIC</th>
      <th>Evidence</th><th>Catatan</th><th>Item</th><th>Aksi</th>
    </tr>
  </thead>
  <tbody>
    <tr><th colSpan={8}>A. STRUKTUR</th></tr>          <-- header disiplin
    <tr> sub-kategori: indent level 1, bold, item count
    <tr> item: indent level 2
    <tr> item: indent level 2
    <tr> sub-kategori: indent level 1
    ...
  </tbody>
</table>
```

- Header disiplin: `colSpan` penuh, latar gelap, teks uppercase.
- Sub-kategori: `pl-4`, `font-semibold`; kode/nama terlihat sebagai level 1.
- Item: `pl-10`, teks normal; ikon/caret opsional.
- `scope="row"` pada sel nama; nomor urut mengikuti posisi tampilan.
- Sub-kategori tanpa item tetap tampil; sel “Item” berisi `0` dan baris keterangan
  “Belum ada item” dapat ditampilkan di bawahnya atau di kolom Nama.
- Disiplin kosong: satu baris `colSpan` “Belum ada sub-kategori”.

### H.2 Sticky dan lebar

- `thead` sticky `top-0 z-20` di dalam scroll container `<main>`; header aplikasi
  berada di luar container dan tetap di atas.
- `overflow-x-auto`; `min-w-[1040px]`, bukan `table-fixed` sampai lebar final stabil.
- Lebar kolom: No 48px, Kode 100px, Nama min 260px, PIC min 180px,
  Evidence min 160px, Catatan min 180px, Item 72px, Aksi 140px.
- Di layar kecil, horizontal scroll; tombol aksi tetap dapat dijangkau.

### H.3 Empty/loading

- Skeleton 5 baris saat initial load.
- Empty disiplin: `colSpan` dengan pesan + CTA.
- Empty sub-kategori: baris tetap ada, item count 0.
- Jangan menyembunyikan sub-kategori hanya karena tidak punya item.

---

## I. Data Flow

### I.1 Halaman disiplin

```text
Server page (validasi slug) -> Client DisiplinPage
  -> useEffect GET /[disiplin] (AbortController + requestId)
  -> state { detail, loading, error }
  -> MetodeKerjaTable
  -> create/edit/delete -> POST/PUT/DELETE -> refetch GET
```

- Tidak ada optimistic update; setelah mutasi sukses, refetch agar audit/ordering
  berasal dari server.
- Error mutasi ditampilkan di dialog; data lama tidak dihapus.
- Reorder mengirim seluruh urutan child, lalu refetch.

### I.2 Summary

```text
GET /summary -> rows (semua disiplin/sub-kategori/item)
  -> useMemo filter(discipline, pic, search)
  -> tabel flat + PDF
```

- Client-side filter sesuai D-MKS-02.
- Tidak ada request per filter.
- PDF memakai snapshot baris yang sedang tampil, sehingga PDF = layar.

### I.3 PDF

```text
button -> dynamic import metodeKerjaExportPdf
  -> loadWibexLogoDataUrl()
  -> buildMetodeKerjaPdf(rows, meta)
  -> view (object URL) / download (doc.save)
```

- Tidak ada fetch data tambahan.
- Timestamp lokal untuk nama file.

---

## J. Authentication & RBAC

### J.1 Permission baru

```ts
METODE_KERJA_VIEW
METODE_KERJA_MANAGE
METODE_KERJA_DELETE
```

Mapping non-Admin:

| Permission | Head Office | Management | Project |
|---|---|---|---|
| VIEW | ✅ | ✅ | ✅ |
| MANAGE | ✅ | ❌ | ❌ |
| DELETE | ❌ | ❌ | ❌ |

Admin selalu ✅ melalui super-application `hasPermission`.

### J.2 Matriks kemampuan

| Role | View | Create | Edit | Delete |
|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Head Office | ✅ | ✅ | ✅ | ❌ |
| Management | ✅ | ❌ | ❌ | ❌ |
| Project | ✅ | ❌ | ❌ | ❌ |

### J.3 Access helper

`src/lib/metode-kerja-standar/access.ts`:

- `canViewMetodeKerja(role)`
- `canManageMetodeKerja(role)`
- `canDeleteMetodeKerja(role)`
- `assertViewAccess(role)` / `assertManageAccess(role)` / `assertDeleteAccess(role)`
  melempar `MetodeKerjaForbiddenError`.
- Service juga memeriksa `actor.status === "active"` sebelum assertion role.

### J.4 Penegakan

- `layout.tsx` MKS: auth + VIEW, redirect `/login` atau `/dashboard`.
- API: `getActor` + service assertion.
- UI: tombol hanya dirender berdasarkan `canManage`/`canDelete`; UI bukan otoritas.
- PIC options: manage-only; role view tidak perlu endpoint ini.

### J.5 Known limitation

Tiga role (Head Office/Management/Project) tetap **BLOCKED untuk runtime** karena
kredensial belum tersedia. P3 tidak mengklaim runtime PASS; verifikasi role dilakukan
melalui unit matrix dan API 403, sedangkan browser 3 role menjadi known limitation
sampai kredensial diberikan.

---

## K. Concurrency & Data Integrity

### K.1 Tanpa version

Tidak ada `version`/`expected_version`. Update memakai `updated_at = now()` dan
mengganti seluruh field yang dikirim. Risiko lost update diterima untuk master
reference V1; tidak ada kebutuhan merge atau edit bersamaan kritis.

### K.2 Transaksi

- Create/update sub-kategori: `UPDATE/INSERT` + replace PIC dalam satu transaksi.
- Create/update item: item + PIC dalam satu transaksi (PIC minimal 1).
- Delete: single statement; FK/trigger menjadi backstop.
- Reorder: satu transaksi untuk seluruh `ordered_ids`.

Brief menyebut “single statement per operasi”; dengan PIC relasional, create/update
memerlukan transaksi pendek 2–3 statement. Ini **bukan** agregat kompleks seperti KM
V2 dan disengaja untuk menjaga FK/trigger.

### K.3 FK dan delete

| Operasi | Perilaku |
|---|---|
| Delete sub-kategori | 409 jika item ada; PIC cascade |
| Delete item | PIC cascade |
| Delete user yang menjadi PIC | Ditolak `NO ACTION`; unassign dulu |
| Delete user creator | Ditolak `NO ACTION` selama row ada |
| Update user `updated_by` | `SET NULL` jika user dihapus |

### K.4 Duplikat dan race

- Unique `(parent, lower(kode))`; service memetakan `23505` ke 409.
- Reorder memvalidasi daftar child di dalam transaksi; child berubah bersamaan → 409.
- Sort order tidak unique; tie-break `sort_order, created_at, id`.

---

## L. Regression Impact

| Area | Dampak | Mitigasi |
|---|---|---|
| Sidebar | Tambah top-level accordion + 7 item | Update `SidebarVisibility`/state; test baru |
| Permission registry | 3 konstanta + mapping | Test matrix; existing permission tidak berubah |
| Dashboard layout | Tidak berubah | Guard MKS di layout baru |
| KM V2 | Tidak disentuh | Tidak ada import/refactor |
| Program Kerja/MSL/Org | Tidak disentuh | Tidak ada file diubah |
| Test 60/60 | Harus tetap PASS | Jalankan suite setelah implementasi |
| Migration journal | Entri baru | Jangan mengubah entri lama |

Sidebar existing test hanya mengunci urutan Program Kerja/Knowledge; penambahan
properti/visibility MKS tidak boleh mengubah dua array tersebut.

---

## M. Testing Strategy

### M.1 Unit

- `constants.test.ts`: enam disiplin, slug unik, F ada.
- `schema.test.ts`: kode/nama, URL http/https, PIC sub-kategori opsional, item min 1,
  dedupe PIC.
- `access.test.ts`: matrix 4 role untuk view/manage/delete.
- `summary.test.ts`: flatten item, sub-kategori kosong, disiplin kosong, filter
  disiplin/PIC/search.
- `sort.test.ts`: append +10, reorder contiguous 10/20.
- `repository` dengan fake DB untuk default audit/PIC (pola test KM).

### M.2 API

- 401 tanpa sesi; 403 role/status; 400 body/ID/path; 404 parent/ID; 409 duplikat,
  child, reorder; 200/201 sukses.
- PIC non-Head Office ditolak; suspended Head Office diterima.
- Sub-kategori tanpa PIC diterima; item tanpa PIC ditolak.
- Delete sub-kategori berisi item → 409.

### M.3 Database

- Unique kode case-insensitive.
- FK restrict item → sub-kategori.
- CHECK disiplin, evidence URL, XOR PIC.
- Deferred trigger item minimum PIC.
- Delete user PIC → FK error.

### M.4 Browser

- Admin: CRUD penuh, delete, reorder, PDF.
- Head Office: create/edit, tanpa delete.
- Management/Project: read-only, tanpa CTA.
- Summary filter disiplin/PIC/search; empty F; PDF.
- Tabel 3-level, sticky header, horizontal scroll, modal focus/Escape/dirty.

### M.5 Regression

- `npm test` harus tetap 60/60 minimal (plus test baru).
- `npx tsc --noEmit`.
- `npx eslint` file baru/berubah.
- `npm run build`.
- 3 role runtime BLOCKED dicatat, bukan PASS.

---

## N. File Impact Inventory

### ADD

```text
src/lib/metode-kerja-standar/constants.ts
src/lib/metode-kerja-standar/schema.ts
src/lib/metode-kerja-standar/repository.ts
src/lib/metode-kerja-standar/service.ts
src/lib/metode-kerja-standar/access.ts
src/lib/metode-kerja-standar/summary.ts

src/app/api/metode-kerja-standar/_helpers.ts
src/app/api/metode-kerja-standar/disiplin-list/route.ts
src/app/api/metode-kerja-standar/[disiplin]/route.ts
src/app/api/metode-kerja-standar/[disiplin]/sub-kategori/route.ts
src/app/api/metode-kerja-standar/sub-kategori/[id]/route.ts
src/app/api/metode-kerja-standar/sub-kategori/[id]/item/route.ts
src/app/api/metode-kerja-standar/item/[id]/route.ts
src/app/api/metode-kerja-standar/pic-options/route.ts
src/app/api/metode-kerja-standar/summary/route.ts
src/app/api/metode-kerja-standar/reorder/route.ts

src/components/dashboard/metode-kerja-standar/MetodeKerjaTable.tsx
src/components/dashboard/metode-kerja-standar/MetodeKerjaFormDialog.tsx
src/components/dashboard/metode-kerja-standar/MetodeKerjaDeleteDialog.tsx
src/components/dashboard/metode-kerja-standar/MetodeKerjaDisiplinPage.tsx
src/components/dashboard/metode-kerja-standar/MetodeKerjaSummaryPage.tsx
src/components/dashboard/metode-kerja-standar/PicMultiSelect.tsx
src/components/dashboard/metode-kerja-standar/metodeKerjaExportPdf.ts

src/app/dashboard/metode-kerja-standar/layout.tsx
src/app/dashboard/metode-kerja-standar/page.tsx
src/app/dashboard/metode-kerja-standar/summary/page.tsx
src/app/dashboard/metode-kerja-standar/[disiplin]/page.tsx

drizzle/0016_metode_kerja_standar.sql
```

Test files menyertai tiap modul domain/komponen pure.

### MODIFY

```text
src/lib/auth/permissions.ts          +3 permission
src/lib/pg/schema.ts                 +3 tabel
src/components/dashboard/DashboardSidebar.tsx
drizzle/meta/_journal.json           idx 16
```

### TIDAK BERUBAH

API existing, schema existing, KM V2, Program Kerja, MSL, Organization Structure,
Master Project, Template & Form, dependency.

---

## O. Technical Risks & Open Decisions

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Tabel 3-level belum ada | Kolom tidak sejajar/sticky salah | Prototipe table di Sub-fase D; test visual |
| Sticky header vs header aplikasi | Header tertutup/z-index | Sticky `top-0` di container main; uji desktop/mobile |
| PIC satu tabel dua FK | Constraint kompleks | CHECK XOR + partial unique + test DB |
| Item minimum PIC | Insert item tanpa PIC lolos sementara | Deferred trigger + validasi service |
| Duplikasi PicMultiSelect | Bug PIC di dua tempat | Tech debt; server-side role policy |
| Tanpa version | Lost update | Diterima V1; catat |
| A4 terlalu sempit | Kolom terpotong | Fallback A3 berdasarkan total lebar kolom |
| Reorder bersamaan | Urutan tidak konsisten | Endpoint atomik + validasi seluruh child |
| Role runtime BLOCKED | 3 role belum diuji browser | Unit matrix + API; known limitation |

**Open decisions:** tidak ada yang memblokir P4. Dua detail implementasi didelegasikan:
ambang persis fallback A3 (dihitung dari total lebar kolom) dan apakah reorder
memakai tombol di setiap baris atau toolbar; keduanya tidak mengubah kontrak API.

---

## P. Implementation Plan

| Sub-fase | Isi | Gate |
|---|---|---|
| A | constants, schema Drizzle, migration 0016, journal | tsc; migration review; tidak dijalankan di P3 |
| B | repository, service, validation, access, summary builder | unit test domain |
| C | API routes + helpers + error mapping | API manual 401/403/400/404/409/200 |
| D | Table, FormDialog, PicMultiSelect, DeleteDialog, Summary, PDF, pages, sidebar | tsc/eslint/build; browser |
| E | full test, regression 60/60, dokumentasi | semua gate; 3 role BLOCKED dicatat |

Urutan wajib: A → B → C → D → E. Tidak ada perubahan pada modul existing selain
permissions, schema, sidebar, journal.

---

## Q. Acceptance Criteria

- AC-01–AC-25 di Section B terpenuhi.
- Enam disiplin tampil; F kosong tetap tampil.
- Root redirect ke `/summary` untuk semua role.
- Summary: filter Disiplin/PIC/Search client-side; PDF; baris kosong.
- Tabel: header disiplin full-width; indentasi sub-kategori/item; sticky header.
- CRUD sub-kategori/item; item wajib PIC; sub-kategori opsional.
- PIC suspended tampil `(non-aktif)`.
- Delete sub-kategori berisi item → 409.
- Reorder naik/turun; sort_order append +10.
- Audit trail dan evidence URL tersimpan.
- RBAC: Admin full, HO manage, Mgmt/Project view; delete Admin only.
- `npm test` existing 60/60 tetap PASS (ditambah test baru).
- `tsc`, `eslint`, `build` PASS.
- Tidak ada perubahan KM V2/Program Kerja/MSL/Org.
- Runtime 3 role BLOCKED dinyatakan sebagai known limitation, bukan PASS.

**Status akhir P3: READY FOR REVIEW.** P4 belum dimulai.
