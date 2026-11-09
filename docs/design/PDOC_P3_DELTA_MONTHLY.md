# P3 Delta — Technical Design: PDOC Periode Bulanan & Summary Report

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 Delta — Technical Design
**Tanggal:** 9 November 2026
**Baseline:** `main` @ `5636113`; PDOC V1 (Sub-Fase A–D) belum di-commit
**Input:** `docs/design/PDOC_MONTHLY_IMPACT_ANALYSIS.md` (PASS) + keputusan Owner D-PDOC-07…10
**Status:** Desain selesai — **READY FOR OWNER REVIEW**; implementasi belum dimulai
**Sifat:** Dokumen desain. Tidak ada source code, schema, migration, database, API, UI, atau test yang diubah.

---

## A. Executive Summary

### A.1 Perubahan yang dikunci

PDOC V1 menyimpan **satu baris per Master Project**. Delta ini mengubah identitas
dokumentasi menjadi **project + tahun dokumentasi + bulan**:

```text
V1:   1 Master Project ── 1 project_documentations
Delta: 1 Master Project ── N project_documentations
                         (satu baris untuk setiap tahun + bulan)
```

Perubahan ini bukan sekadar menambah dua kolom. Identitas upsert, query daftar,
kontrak API, state edit, PDF, sidebar, dan halaman baru Summary ikut berubah.
Karena itu P4 tidak boleh melanjutkan implementasi V1 tanpa revisi.

### A.2 Keputusan Owner yang menjadi acuan final

| ID | Keputusan Owner | Konsekuensi desain |
|---|---|---|
| D-PDOC-07 | Tahun dokumentasi bebas; tidak terikat mutlak ke `master_projects.year` | Tidak ada validasi kesamaan tahun. `project_year` tetap tahun Master Project dan ditampilkan sebagai subteks. UI memakai label **Tahun Dokumentasi**. |
| D-PDOC-08 | Summary menampilkan **semua** Master Project; proyek tanpa data mendapat `0/5` | Summary memakai `master_projects` sebagai driving table dan `LEFT JOIN` dokumentasi per tahun. Bukan hanya project yang punya baris. |
| D-PDOC-09 | Sidebar memakai accordion PDOC dengan dua submenu: **Rekap Bulanan** dan **Summary Report** | `Project Documentation` menjadi parent accordion. Rekap tetap di route lama; Summary berada di sub-route baru. |
| D-PDOC-10 | Tiga endpoint periodik | `GET` daftar per periode, `PUT` per project-periode, dan `GET` summary per tahun. |

### A.3 Ringkasan desain

| Area | Keputusan delta |
|---|---|
| Database | Migration baru **`0019_project_documentation_period`**. Tambah `year`, `month`; hapus unique tunggal `project_id`; buat `UNIQUE(project_id, year, month)`; tambah CHECK dan index. |
| Backfill | Baris V1 yang sudah ada diisi dari `created_at` dalam zona `Asia/Jakarta`. Tidak memakai `master_projects.year` karena tahun dokumentasi bebas. |
| Rekap | `GET /api/project-documentation?year=YYYY&month=M` mengembalikan semua Master Project untuk periode itu, termasuk yang belum punya dokumentasi. |
| Simpan | `PUT /api/project-documentation/[projectId]/[year]/[month]`; periode berasal dari path, bukan body. |
| Summary | `GET /api/project-documentation/summary?year=YYYY` mengembalikan semua project × 12 bulan dengan `completed_weeks` 0–5. |
| UI Rekap | Filter **Tahun Dokumentasi** (input angka + saran tahun yang tersedia) dan **Bulan**; tabel 8 kolom tetap. |
| UI Summary | Matriks `Nama Proyek × Jan–Des`; setiap sel berisi `n/5`; hanya-baca. |
| Sidebar | Accordion `Project Documentation` → `Rekap Bulanan` dan `Summary Report`. |
| RBAC | Tidak ada permission baru. `DOCUMENTATION_VIEW` dan `DOCUMENTATION_MANAGE` tetap berlaku. |
| PDF | Tetap 7 kolom; judul/filter line dan nama file mencantumkan periode. |

### A.4 Yang berubah dari P3 V1

| Asumsi P3 V1 | Delta P3 |
|---|---|
| Satu baris per project | Satu baris per project-periode |
| `project_id UNIQUE` | `UNIQUE(project_id, year, month)` |
| GET tanpa parameter | GET wajib `year` + `month` |
| PUT `/[projectId]` | PUT `/[projectId]/[year]/[month]` |
| Satu halaman | Rekap + Summary |
| Sidebar satu item | Accordion dua submenu |
| PDF satu set dokumentasi | PDF untuk periode yang sedang dipilih |
| URL dikosongkan: URL + audit pair menjadi `NULL` | **Dipertahankan** dari implementasi V1; row-level `updated_by/updated_at` tetap mencatat aktor terakhir |
| `ON CONFLICT (project_id)` | `ON CONFLICT (project_id, year, month)` |

### A.5 Prinsip arsitektur

1. **Master Project tetap sumber baris.** PDOC tidak membuat, menghapus, atau
   mengganti nama project.
2. **Periode adalah bagian identitas.** Tidak ada field `year`/`month` di body
   PUT; periode selalu berasal dari path dan tidak dapat diubah pada baris yang
   sama.
3. **Satu tabel flat.** Lima minggu tetap slot tetap; tidak perlu child table.
4. **Filter periode harus berada di kondisi `LEFT JOIN`.** Menaruhnya di `WHERE`
   akan menghilangkan project yang belum punya dokumentasi.
5. **Summary adalah read-only projection.** Summary tidak menulis, tidak membuat
   baris, dan tidak memakai endpoint terpisah untuk master project.
6. **Reuse maksimum.** Pola permission, guard layout, draft, PDF, dan sidebar
   dipertahankan; refactor lintas modul tidak diperlukan.

### A.6 Dampak implementasi

- 1 migration forward-only + snapshot/journal.
- 1 route API baru, 1 route API berubah, 1 route API dihapus.
- 1 halaman Rekap yang dimodifikasi, 1 halaman Summary baru, 1 komponen tabel
  Summary baru.
- 1 repository/service yang berubah untuk periode dan agregasi.
- 1 sidebar accordion dan test navigasi yang diperbarui.
- Test unit untuk periode, summary, draft, PDF, API helper, dan sidebar.

---

## B. Requirement Traceability Matrix

| ID | Requirement / keputusan | Desain | Bagian | Verifikasi |
|---|---|---|---|---|
| R-PDOC-M01 | Dokumentasi memiliki Tahun dan Bulan | Kolom `year` dan `month`; keduanya bagian identitas baris | E | Schema review + migration test |
| R-PDOC-M02 | Satu project dapat punya banyak periode | Hapus unique `project_id`; pasang `UNIQUE(project_id, year, month)` | E | Insert dua bulan berbeda untuk project yang sama |
| R-PDOC-M03 | Tahun dokumentasi bebas | Tidak ada FK/CHECK ke `master_projects.year`; UI label “Tahun Dokumentasi” | A, E, G | Manual: project tahun 2025 dapat punya dokumen 2026 |
| R-PDOC-M04 | Bulan valid 1–12 | CHECK database + validasi API + konstanta UI | E, F | Test 0, 13, non-integer |
| R-PDOC-M05 | Rekap per periode | GET wajib `year` + `month`; semua project tetap tampil | F, G | GET periode tanpa dokumentasi mengembalikan lima slot kosong |
| R-PDOC-M06 | Simpan per project-periode | PUT path `[projectId]/[year]/[month]`; body tidak memuat periode | F | Route test + manual save |
| R-PDOC-M07 | Summary semua project | `master_projects LEFT JOIN project_documentations` per tahun | E, F | Project tanpa dokumen muncul `0/5` |
| R-PDOC-M08 | Summary 12 bulan | Response selalu berisi 12 elemen bulan per project | F, H | Test Jan–Des lengkap dan urut |
| R-PDOC-M09 | Indikator `n/5` | Hitung `week_1_url`…`week_5_url` yang non-null | E, F, H | Test 0, 1, 5, dan URL dikosongkan |
| R-PDOC-M10 | Accordion dua submenu | Parent PDOC + Rekap + Summary; state accordion route-driven | G, N | Sidebar test + manual |
| R-PDOC-M11 | Migration tidak mengedit `0018` | Migration baru `0019` | E | Journal/snapshot review |
| R-PDOC-M12 | Audit minggu tetap | `week_n_updated_by/at` per minggu; clear URL mengosongkan pasangan audit | E, K | Audit transition test |
| R-PDOC-M13 | RBAC tidak berubah | VIEW untuk baca, MANAGE untuk tulis; Summary hanya VIEW | J | Access test + manual 4 role |
| R-PDOC-M14 | Tidak ada N+1 | Satu query daftar/summary + satu query tahun tersedia | F, I | Query review + test |
| R-PDOC-M15 | PDF mengikuti periode | Filter line, judul, dan file name memuat periode | G, H | PDF body test + manual |

---

## C. Repository Baseline

### C.1 Baseline aktual

| Item | Nilai |
|---|---|
| Branch | `main` |
| HEAD | `5636113` — `feat: core enterprise calculation sheet template v-1` |
| Status PDOC V1 | Sub-Fase A–D selesai di working tree, belum di-commit |
| Migration journal | 19 entry (`idx` 0–18); terakhir `0018_project_documentations` |
| Migration berikutnya | **`0019_project_documentation_period`**, journal `idx` 19 |
| Migration `0018` | APPLIED menurut konfirmasi Owner; tidak diverifikasi ulang oleh desain ini |
| Tabel | `project_documentations`, satu baris per project |
| Unique saat ini | `project_documentations_project_id_unique` pada `project_id` |
| Test runner | `node --import tsx --test "src/**/*.test.ts"` |
| Stack | Next.js 16.3.8 · React 19.2.8 · TypeScript 5.9 · Drizzle ORM 0.45 · PostgreSQL/Neon |
| PDF | `jspdf` 4.2.1 + `jspdf-autotable` 5.0.9 |

### C.2 File PDOC yang menjadi baseline

| Lapisan | File | Baseline |
|---|---|---|
| Schema | `src/lib/pg/schema.ts` | `projectDocumentations` dengan unique `projectId` |
| Migration | `drizzle/0018_project_documentations.sql` | Tabel + lima URL + audit + unique project |
| Repository | `src/lib/project-documentation/repository.ts` | List satu baris/project; `ON CONFLICT (project_id)` |
| Service | `src/lib/project-documentation/service.ts` | List/update tanpa periode |
| Validasi | `src/lib/project-documentation/schema.ts` | Body strict, lima URL + catatan |
| API | `src/app/api/project-documentation/route.ts` | GET tanpa query |
| API | `src/app/api/project-documentation/[projectId]/route.ts` | PUT berdasarkan project |
| UI | `src/components/dashboard/project-documentation/ProjectDocumentationPage.tsx` | Fetch sekali + search |
| UI | `src/components/dashboard/project-documentation/PdocTable.tsx` | Tabel 8 kolom |
| PDF | `src/components/dashboard/project-documentation/pdocExportPdf.ts` | 7 kolom; filter line belum periode |
| Sidebar | `src/components/dashboard/DashboardSidebar.tsx` | Satu item top-level |
| Guard | `src/app/dashboard/project-documentation/layout.tsx` | `DOCUMENTATION_VIEW` |
| Server page | `src/app/dashboard/project-documentation/page.tsx` | Menghitung `canManage` |

### C.3 Perilaku V1 yang harus dipertahankan

- Master Project adalah driving table; project tanpa dokumentasi tetap tampil.
- Lima minggu adalah slot tetap, bukan tabel child.
- `catatan` adalah milik baris periode.
- Audit baris: `created_by`, `updated_by`, `created_at`, `updated_at`.
- Audit minggu: `week_n_updated_by` + `week_n_updated_at`.
- Menyimpan nilai yang sama tidak mengubah timestamp.
- URL dikosongkan → `week_n_url`, `week_n_updated_by`, dan
  `week_n_updated_at` menjadi `NULL`; `updated_by`/`updated_at` baris tetap
  mencatat aktor dan waktu perubahan.
- Tidak ada `POST` atau `DELETE` untuk dokumentasi.
- Project role dapat mengelola seluruh project; tidak ada ownership check.

### C.4 Catatan baseline

- `drizzle/meta/_journal.json` memiliki 19 entry. `0019` harus menjadi entry
  ke-20 dengan `idx` 19 dan snapshot `drizzle/meta/0019_snapshot.json`.
- Status migration `0017` masih tidak konsisten di beberapa dokumen, sementara
  `0018` sudah APPLIED. Desain ini tidak mengubah status tersebut.
- Working tree sudah memiliki perubahan PDOC V1 dari fase sebelumnya. P3 Delta
  ini **hanya menambah dokumen** dan tidak menyentuh file source tersebut.

---

## D. Existing vs Proposed Architecture

### D.1 Perbandingan lapisan

| Lapisan | V1 | Delta |
|---|---|---|
| Identitas baris | `project_id` | `(project_id, year, month)` |
| Sumber baris Rekap | Semua Master Project | Semua Master Project untuk periode terpilih |
| Sumber baris Summary | Tidak ada | Semua Master Project × 12 bulan |
| Join | `project_id` saja | `project_id + year + month` di kondisi `LEFT JOIN` |
| Upsert | `ON CONFLICT (project_id)` | `ON CONFLICT (project_id, year, month)` |
| GET | Tanpa query | Wajib `year` + `month` |
| PUT | `/[projectId]` | `/[projectId]/[year]/[month]` |
| Summary | Tidak ada | `GET /summary?year=YYYY` |
| Halaman | Satu | Rekap + Summary |
| Sidebar | Satu item | Accordion dua submenu |
| PDF | Semua dokumentasi | Dokumentasi periode terpilih |
| Permission | VIEW/MANAGE | Tetap sama |

### D.2 Route map

```text
/dashboard/project-documentation
  └─ Rekap Bulanan (route lama dipertahankan)

/dashboard/project-documentation/summary
  └─ Summary Report (baru, read-only)

/api/project-documentation
  └─ GET daftar per periode

/api/project-documentation/summary
  └─ GET matriks 12 bulan

/api/project-documentation/[projectId]/[year]/[month]
  └─ PUT satu project-periode
```

Route Rekap tetap memakai URL lama agar bookmark dan layout guard tidak berubah.
Summary berada di bawah layout yang sama sehingga otomatis mendapat guard VIEW.

### D.3 Bentuk query Rekap

```text
master_projects AS mp
LEFT JOIN project_documentations AS pd
  ON pd.project_id = mp.id
 AND pd.year = :year
 AND pd.month = :month
LEFT JOIN users ... (lima alias audit minggu + row updater)
ORDER BY mp.name, mp.location, mp.id
```

Kondisi periode **wajib** berada di `ON`. Jika dipindahkan ke `WHERE`, project
yang belum punya dokumentasi akan hilang dan melanggar D-PDOC-08.

### D.4 Bentuk query Summary

```text
master_projects AS mp
LEFT JOIN project_documentations AS pd
  ON pd.project_id = mp.id
 AND pd.year = :year
ORDER BY mp.name, mp.location, mp.id, pd.month
```

Query mengembalikan paling banyak 12 baris per project. Grouping 12 bulan dan
perhitungan `n/5` dilakukan di service/helper murni, bukan dengan query per
project.

### D.5 Pemisahan tanggung jawab

| Komponen | Tanggung jawab |
|---|---|
| Repository | Query periode, query summary, upsert composite, bulk user lookup |
| Service | Permission, validasi periode, DTO, audit diff, mapping error |
| Pure helper | Parse periode, format label, hitung `n/5`, bangun matriks 12 bulan |
| API route | Auth, parse path/query, schema body, response `no-store` |
| Rekap page | Filter periode, fetch, edit satu baris, simpan, PDF |
| Summary page | Pilih tahun, fetch, render matriks read-only |
| Sidebar | Visibility dan accordion; bukan otorisasi |

---

## E. Database Design

### E.1 Schema Drizzle target

```ts
import { check, index, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const projectDocumentations = pgTable(
  "project_documentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),

    year: integer("year").notNull(),
    month: integer("month").notNull(),

    // week_1_url … week_5_url dan pasangan auditnya tetap seperti V1.
    // catatan dan audit baris juga tetap.

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "no action" }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("project_documentations_project_period_unique").on(
      table.projectId,
      table.year,
      table.month,
    ),
    index("project_documentations_year_month_idx").on(table.year, table.month),
    check(
      "project_documentations_month_check",
      sql`${table.month} BETWEEN 1 AND 12`,
    ),
    check(
      "project_documentations_year_check",
      sql`${table.year} >= 2000`,
    ),
    // CHECK URL/catatan V1 tetap dipertahankan.
  ],
);
```

### E.2 Invariant

| Aturan | Implementasi |
|---|---|
| Satu baris per project-periode | `UNIQUE(project_id, year, month)` |
| `project_id` tidak berubah | Tidak ada di body PUT; path menentukan project |
| `year`/`month` tidak berubah pada baris | Path menentukan periode; pindah periode = baris baru |
| Bulan valid | CHECK `1..12` + validasi API |
| Tahun masuk akal | CHECK `>= 2000` + validasi API empat digit |
| URL valid | CHECK regex `^https?://`, maksimal 2048 |
| Catatan valid | CHECK maksimal 2000 |
| Audit minggu konsisten | `updated_by` dan `updated_at` diisi bersama saat URL berubah |
| Clear URL | URL dan pasangan audit minggu menjadi `NULL` |
| No-op save | Tidak menulis dan tidak mengubah timestamp |
| Project delete | `ON DELETE RESTRICT`; project dengan dokumentasi tidak dapat dihapus |

`year` bukan `master_projects.year`. Tidak ada FK, join, atau CHECK yang
memaksa keduanya sama. Perbedaan tahun adalah kombinasi yang sah.

### E.3 Migration `0019`

Nama file:

```text
drizzle/0019_project_documentation_period.sql
drizzle/meta/0019_snapshot.json
drizzle/meta/_journal.json   (entry idx 19)
```

Implementasi SQL (tanpa `BEGIN`/`COMMIT` di file, mengikuti format migration repo; runner/deployment harus mengeksekusi file secara atomik):

```sql
ALTER TABLE "project_documentations" ADD COLUMN "year" integer;
ALTER TABLE "project_documentations" ADD COLUMN "month" integer;

-- Backfill deterministik untuk baris V1 yang belum punya periode.
UPDATE "project_documentations"
SET
  "year" = EXTRACT(
    YEAR FROM ("created_at" AT TIME ZONE 'Asia/Jakarta')
  )::integer,
  "month" = EXTRACT(
    MONTH FROM ("created_at" AT TIME ZONE 'Asia/Jakarta')
  )::integer;

ALTER TABLE "project_documentations" ALTER COLUMN "year" SET NOT NULL;
ALTER TABLE "project_documentations" ALTER COLUMN "month" SET NOT NULL;

DROP INDEX IF EXISTS "project_documentations_project_id_unique";

CREATE UNIQUE INDEX "project_documentations_project_period_unique"
  ON "project_documentations" USING btree ("project_id", "year", "month");

CREATE INDEX "project_documentations_year_month_idx"
  ON "project_documentations" USING btree ("year", "month");

ALTER TABLE "project_documentations"
  ADD CONSTRAINT "project_documentations_month_check"
  CHECK ("month" BETWEEN 1 AND 12);

ALTER TABLE "project_documentations"
  ADD CONSTRAINT "project_documentations_year_check"
  CHECK ("year" >= 2000);
```

### E.4 Backfill

- Sumber periode: `created_at` baris V1, dikonversi ke `Asia/Jakarta`.
- Alasan: baris V1 adalah dokumentasi pertama project; `created_at` adalah
  satu-satunya waktu yang tersedia dan tidak melanggar D-PDOC-07.
- Tidak memakai `master_projects.year` karena tahun dokumentasi bebas.
- Karena V1 memiliki unique `project_id`, backfill tidak mungkin menghasilkan
  dua baris dengan `(project_id, year, month)` yang sama.
- `year`/`month` tidak diberi `DEFAULT`; periode harus eksplisit dari API.
- Sebelum apply, jalankan pada database salinan/scratch dan periksa:

```sql
SELECT count(*) AS total FROM project_documentations;
SELECT count(*) AS missing_period
FROM project_documentations
WHERE year IS NULL OR month IS NULL;
SELECT project_id, year, month, count(*)
FROM project_documentations
GROUP BY project_id, year, month
HAVING count(*) > 1;
```

### E.5 Deployment dan rollback

**Urutan deployment yang aman:**

1. Backup/snapshot database.
2. Jalankan `0019` pada maintenance window atau saat traffic tulis PDOC
   dihentikan.
3. Deploy kode baru yang selalu mengirim periode.
4. Smoke test GET/PUT/Summary.
5. Buka traffic.

**Mengapa perlu window:** setelah `year`/`month` menjadi `NOT NULL`, kode V1
yang melakukan insert tanpa periode akan gagal. Selama jeda migration → deploy,
request tulis lama dapat menghasilkan error. Jika downtime tidak dapat
diterima, migration harus dipecah menjadi expand/contract; itu perubahan
lingkup deployment, bukan kontrak data.

**Rollback:**

- Sebelum ada baris multi-periode: drop composite index, drop CHECK, drop
  kolom `year`/`month`, lalu buat kembali unique `project_id`.
- Setelah ada dua periode untuk project yang sama: rollback tidak aman tanpa
  konsolidasi data. Restore snapshot lebih tepat.
- Tidak ada rollback otomatis yang menghapus data.

### E.6 Index dan volume

| Index | Fungsi |
|---|---|
| `project_documentations_project_period_unique` | Target upsert + lookup project-periode |
| `project_documentations_year_month_idx` | Filter Rekap dan agregasi Summary per tahun |

Volume wajar adalah `jumlah project × 12 × jumlah tahun`. Summary tidak
melakukan query per project; satu query tahunan cukup. Jika jumlah project
sangat besar, optimasi berikutnya adalah pagination/virtualization di UI, bukan
mengubah model data.

---

## F. API Contract

### F.1 Ringkasan route

| Method | Path | Auth | Tujuan |
|---|---|---|---|
| GET | `/api/project-documentation?year=YYYY&month=M` | VIEW | Rekap semua project pada periode |
| PUT | `/api/project-documentation/[projectId]/[year]/[month]` | MANAGE | Upsert dokumentasi satu project-periode |
| GET | `/api/project-documentation/summary?year=YYYY` | VIEW | Matriks semua project × 12 bulan |

Semua response sukses `{ data: ... }`, error `{ error: { message, details? } }`,
dan `Cache-Control: no-store`.

### F.2 Validasi periode

| Parameter | Aturan |
|---|---|
| `year` | Empat digit; integer `>= 2000`; dinormalisasi ke number |
| `month` | Integer `1..12`; `01` dan `1` diterima, response memakai number |
| Parameter hilang | `400 Periode dokumentasi tidak valid` |
| Nilai non-integer | `400 Periode dokumentasi tidak valid` |
| `projectId` | UUID valid; selain itu `400 ID project tidak valid` |

Periode tidak boleh dikirim di body PUT. Body strict akan menolak `year` atau
`month` sebagai field tambahan.

### F.3 GET daftar per periode

```http
GET /api/project-documentation?year=2026&month=11
```

Response 200:

```json
{
  "data": {
    "period": { "year": 2026, "month": 11 },
    "available_years": [2026, 2025],
    "rows": [
      {
        "project_id": "uuid",
        "project_name": "Gedung A",
        "project_location": "Jakarta",
        "project_year": 2026,
        "year": 2026,
        "month": 11,
        "documented": true,
        "weeks": [
          {
            "week": 1,
            "url": "https://example.com/week-1",
            "updated_by": { "user_id": "uuid", "name": "Budi" },
            "updated_at": "2026-11-09T07:30:00.000Z"
          },
          {
            "week": 2,
            "url": null,
            "updated_by": null,
            "updated_at": null
          }
        ],
        "catatan": "Catatan periode",
        "updated_by": { "user_id": "uuid", "name": "Budi" },
        "updated_at": "2026-11-09T07:30:00.000Z"
      }
    ]
  }
}
```

Ketentuan:

- `weeks` selalu lima elemen, urut 1–5.
- Project tanpa dokumentasi: `documented: false`, lima `weeks` kosong,
  `catatan: null`, `updated_by: null`, `updated_at: null`; `year`/`month`
  tetap berisi periode yang diminta.
- `available_years` berasal dari `SELECT DISTINCT year` pada dokumentasi,
  ditambah tahun yang sedang dipilih dan tahun berjalan. Ini hanya saran untuk
  UI; user tetap boleh mengetik tahun lain.
- Urutan baris: `project_name`, `project_location`, `project_id`.
- Tidak ada N+1: satu query daftar dan satu query tahun tersedia.

### F.4 PUT per project-periode

```http
PUT /api/project-documentation/{projectId}/2026/11
Content-Type: application/json
```

Body:

```json
{
  "week_1_url": "https://example.com/week-1",
  "week_2_url": null,
  "week_3_url": null,
  "week_4_url": null,
  "week_5_url": null,
  "catatan": "Catatan periode"
}
```

Kontrak body mempertahankan V1:

- Lima URL dan `catatan`; field boleh dihilangkan, minimal satu field harus ada.
- Field yang dihilangkan tidak diubah; `null`/string kosong menghapus nilai.
- Body strict; `year`, `month`, `project_id`, aktor, dan timestamp ditolak.
- URL di-trim, wajib http(s), maksimal 2048; catatan maksimal 2000.

Perilaku service:

1. `assertManageAccess(actor)`.
2. Validasi project dan periode.
3. Cari baris `(projectId, year, month)`.
4. Normalisasi input.
5. Bandingkan lima URL dan catatan.
6. Jika tidak ada perubahan: tidak menulis, kembalikan baris existing.
7. Jika ada perubahan:
   - baris baru: `created_by`, `created_at`, `year`, `month`;
   - `updated_by`, `updated_at`;
   - upsert `ON CONFLICT (project_id, year, month) DO UPDATE`.
8. Baca ulang baris dan kembalikan DTO dengan `year`, `month`, `documented: true`.

Response 200 `{ data: row }` dengan bentuk DTO yang sama seperti GET.

### F.5 GET Summary

```http
GET /api/project-documentation/summary?year=2026
```

Response 200:

```json
{
  "data": {
    "year": 2026,
    "available_years": [2026, 2025],
    "months": [
      { "month": 1, "label": "Jan" },
      { "month": 2, "label": "Feb" }
    ],
    "rows": [
      {
        "project_id": "uuid",
        "project_name": "Gedung A",
        "project_location": "Jakarta",
        "project_year": 2026,
        "months": [
          {
            "month": 1,
            "completed_weeks": 3,
            "total_weeks": 5,
            "documented": true
          },
          {
            "month": 2,
            "completed_weeks": 0,
            "total_weeks": 5,
            "documented": false
          }
        ]
      }
    ]
  }
}
```

Ketentuan:

- `months` selalu 12 elemen, urut Januari–Desember.
- Setiap project memiliki 12 elemen bulan.
- `completed_weeks` = jumlah `week_n_url` yang non-null, 0–5.
- `documented` = ada baris dokumentasi untuk project + tahun + bulan;
  project tanpa baris tetap `0/5`.
- Semua Master Project ditampilkan, tanpa filter `project_year`.
- Summary read-only; tidak ada POST/PUT/DELETE.
- Satu query data + satu query `available_years`.

### F.6 Error mapping

| Kondisi | Status | Pesan |
|---|---|---|
| Tanpa sesi | 401 | `Unauthenticated` |
| Role tanpa VIEW | 403 | `Akses Project Documentation ditolak` |
| Role tanpa MANAGE pada PUT | 403 | `Akses Project Documentation ditolak` |
| Periode hilang/invalid | 400 | `Periode dokumentasi tidak valid` |
| `projectId` bukan UUID | 400 | `ID project tidak valid` |
| Project tidak ditemukan | 404 | `Master Project tidak ditemukan` |
| URL/catatan invalid | 400 | pesan field |
| Body bukan JSON / field ekstra | 400 | `Body harus berupa JSON yang valid` / pesan Zod |
| Unique/FK violation | 409 | `Dokumentasi project tidak dapat disimpan` |
| CHECK violation | 400 | `Data tidak memenuhi aturan database` |
| Lainnya | 500 | `Terjadi kesalahan server` + log label route |

### F.7 Route lama

`PUT /api/project-documentation/[projectId]` **dihapus**, bukan dibiarkan
sebagai alias tanpa periode. Alias akan memungkinkan penulisan ke periode yang
salah dan menyembunyikan client lama. Client V1 harus diganti bersamaan.

`GET /api/project-documentation` tanpa query juga tidak lagi valid. Tidak ada
default diam-diam ke bulan berjalan karena periode harus eksplisit dan dapat
diaudit.

---

## G. UI/UX Design

### G.1 Navigasi sidebar

`Project Documentation` menjadi parent accordion dengan dua child:

```text
Core Enterprise
└─ Project Documentation
   ├─ Rekap Bulanan   → /dashboard/project-documentation
   └─ Summary Report  → /dashboard/project-documentation/summary
```

Ketentuan:

- Parent dan child hanya tampil jika `DOCUMENTATION_VIEW`.
- Accordion terbuka otomatis jika path berada di bawah
  `/dashboard/project-documentation`.
- Parent memakai icon folder yang sudah ada.
- Child pertama memakai icon tabel/rekap; child kedua memakai icon chart.
- Menutup accordion tidak mengubah permission atau data.
- State baru `projectDocumentationOpen` ditambahkan ke
  `SidebarAccordionState`; test sidebar harus menguji root dan summary route.

### G.2 Halaman Rekap Bulanan

Route tetap `/dashboard/project-documentation`.

```text
┌──────────────────────────────────────────────────────────────┐
│ Core Enterprise · Project Documentation                      │
│ Rekap Bulanan Project Documentation                          │
│ Dokumentasi mingguan seluruh Master Project per periode.     │
│                                           [n project] [PDF]  │
├──────────────────────────────────────────────────────────────┤
│ Tahun Dokumentasi [2026 ▼/input]  Bulan [November ▼] [Terapkan]│
│ Cari Nama Proyek [.........................] [Reset]          │
├──────────────────────────────────────────────────────────────┤
│ Nama Proyek | Minggu 1..5 | Catatan | Aksi                    │
│ Gedung A    | ...        | ...     | Edit                     │
│ Gedung B    | —          | —       | Edit                     │
└──────────────────────────────────────────────────────────────┘
```

**Filter periode:**

- Tahun: input angka dengan `min=2000`, `max=9999`, `step=1`, dan `datalist`
  berisi `available_years`; bukan select tertutup, agar D-PDOC-07 benar-benar
  bebas.
- Bulan: select 12 bulan.
- Tombol `Terapkan` memvalidasi lalu memuat periode baru.
- Default tahun/bulan: periode berjalan `Asia/Jakarta`.
- Jika tahun yang diketik belum ada dokumentasinya, halaman tetap menampilkan
  semua project dengan sel kosong; user dapat mulai mengisi.
- Perubahan filter saat ada draft kotor harus meminta konfirmasi dan membuang
  draft jika disetujui.
- Filter disimpan di state komponen; sinkronisasi URL bukan scope delta.

**State halaman:**

```ts
type PdocPageState = {
  period: { year: number; month: number };
  rows: PdocRowDto[] | null;
  availableYears: number[];
  search: string;
  editing: PdocEditingState | null;
  busy: boolean;
};
```

`PdocEditingState` bertambah `period` (atau `year`/`month`) agar request PUT
tidak bergantung pada state filter yang mungkin berubah.

**Interaksi:**

| Aksi | Perilaku |
|---|---|
| Terapkan periode | Validasi, fetch GET, reset edit, pertahankan search |
| Edit | Hanya MANAGE; satu baris; konfirmasi draft kotor |
| Simpan | Validasi klien → PUT path periode → ganti row dari response |
| Batal | Konfirmasi jika dirty |
| Ganti periode saat edit | Konfirmasi; jika disetujui batalkan edit lalu fetch |
| PDF | Dynamic import; memakai rows periode aktif |
| Read-only | Tidak ada input, Edit, Simpan, atau Batal |

**Empty/loading/error:**

- Loading: skeleton + “Memuat Project Documentation...”.
- GET gagal: error banner + `Coba Lagi`.
- Tidak ada Master Project: `Belum ada Master Project.`
- Ada project tetapi belum ada dokumentasi: baris tetap tampil, lima minggu dan
  catatan `—`.
- Simpan sukses: banner hijau `role="status"`, auto-dismiss.
- Simpan gagal: error di baris, draft tetap terbuka.

### G.3 Halaman Summary Report

Route baru: `/dashboard/project-documentation/summary`.

```text
┌──────────────────────────────────────────────────────────────┐
│ Core Enterprise · Project Documentation                      │
│ Summary Report Project Documentation                         │
│ Matriks kelengkapan dokumentasi seluruh project per bulan.    │
│ Tahun Dokumentasi [2026] [Terapkan]        [n project]        │
├──────────────────────────────────────────────────────────────┤
│ Nama Proyek | Jan | Feb | Mar | ... | Des                     │
│ Gedung A    | 3/5 | 0/5 | 5/5 | ... | 2/5                     │
│ Gedung B    | 0/5 | 0/5 | 0/5 | ... | 0/5                     │
├──────────────────────────────────────────────────────────────┤
│ 0/5 belum ada · 1–4/5 sebagian · 5/5 lengkap                  │
└──────────────────────────────────────────────────────────────┘
```

Ketentuan:

- Tahun memakai input angka + datalist, sama seperti Rekap.
- Default tahun berjalan `Asia/Jakarta`.
- Semua Master Project tampil; tidak ada filter project dan tidak ada
  pagination pada delta ini.
- Setiap sel menampilkan `completed_weeks/5`.
- Warna:
  - `0/5`: abu-abu netral;
  - `1–4/5`: amber;
  - `5/5`: hijau.
- Jangan memakai `—` untuk bulan kosong; D-PDOC-08 meminta `0/5`.
- Nama project menampilkan lokasi dan `project_year` sebagai subteks agar
  project dengan tahun berbeda tetap dapat dibedakan.
- Summary read-only; tidak ada tombol edit, simpan, atau tambah baris.
- PDF Summary bukan scope delta. PDF yang ada tetap PDF Rekap periode.
- Loading: skeleton 12 kolom; error: banner + retry; tidak ada project:
  empty state; project tanpa dokumen tetap baris `0/5`.

### G.4 Aksesibilitas dan responsif

- Tabel Rekap dan Summary dibungkus `overflow-x-auto`.
- Summary memakai `min-w-[1280px]`; kolom nama sticky di kiri.
- Header kolom `scope="col"`; nama project `scope="row"`.
- Setiap sel Summary memiliki `aria-label` lengkap, misalnya
  `Januari 2026, Gedung A: 3 dari 5 minggu`.
- Fokus terlihat `focus:ring-2 focus:ring-secondary/20`.
- Badge status tidak mengandalkan warna saja; teks `n/5` selalu ada.
- Mobile mengandalkan horizontal scroll; tidak ada card layout terpisah.

---

## H. Table Design

### H.1 Tabel Rekap

Struktur kolom tidak berubah dari V1:

| # | Header | Isi |
|---|---|---|
| 1 | Nama Proyek | Nama + lokasi + `project_year` |
| 2 | Minggu 1 | Link/`—` + metadata |
| 3 | Minggu 2 | Link/`—` + metadata |
| 4 | Minggu 3 | Link/`—` + metadata |
| 5 | Minggu 4 | Link/`—` + metadata |
| 6 | Minggu 5 | Link/`—` + metadata |
| 7 | Catatan | Catatan periode |
| 8 | Aksi | Edit / Simpan + Batal |

“Dinamis” di sini berarti **baris dan nilai mengikuti filter periode**, bukan
jumlah kolom minggu berubah. Lima minggu tetap slot tetap.

`PDOC_COLUMN_COUNT = 8` tetap dipakai untuk empty/error row.

### H.2 Tabel Summary

| # | Header | Lebar | Isi |
|---|---|---|---|
| 1 | Nama Proyek | 240 px | Nama + lokasi + tahun project; sticky |
| 2–13 | Jan–Des | 72 px | `n/5`, badge status, tooltip periode |

- Urutan bulan selalu Januari–Desember.
- `n` dihitung dari URL non-null, bukan dari ada/tidaknya baris.
- Baris tanpa dokumentasi: 12 sel `0/5`.
- Baris dengan dokumentasi tetapi URL belum diisi: juga `0/5`, tetapi
  `documented: true` tersedia di API untuk kebutuhan audit/analitik.
- Tidak ada kolom total pada delta ini; total bukan requirement dan dapat
  ditambahkan tanpa mengubah data.

### H.3 Empty state

| Kondisi | Rekap | Summary |
|---|---|---|
| Tidak ada Master Project | `Belum ada Master Project.` | `Belum ada Master Project.` |
| Project ada, periode kosong | Baris project dengan `—` | Baris project dengan `0/5` |
| Search tidak cocok | `Tidak ada project yang cocok...` | Tidak ada search di Summary |
| GET gagal | Error + retry | Error + retry |

### H.4 Format periode

Helper murni menyediakan:

```ts
type PdocPeriod = { year: number; month: number };

formatPdocPeriodShort(period): string; // "Nov 2026"
formatPdocPeriodLong(period): string;  // "November 2026"
formatPdocPeriodPath(period): string;  // "2026/11"
```

Label UI selalu **Tahun Dokumentasi**, bukan “Tahun”, untuk membedakan dari
`project_year`. Format tanggal audit tetap `id-ID` dan `Asia/Jakarta`.

### H.5 PDF Rekap

- Tetap A4 landscape, 7 kolom: Nama Proyek, Minggu 1–5, Catatan.
- Judul: `PROJECT DOCUMENTATION — NOVEMBER 2026`.
- Filter line: `Periode: November 2026 | 12 project | Pencarian: "..."`.
- Nama file: `Project-Documentation-2026-11-<timestamp>.pdf`.
- Metadata updater tetap tidak dicetak.
- PDF dibangun dari rows periode aktif; tidak ada request tambahan.

---

## I. Data Flow

### I.1 Initial load Rekap

```text
Server layout → getCurrentUser → DOCUMENTATION_VIEW
Server page   → canManage
Client page   → current period Asia/Jakarta
              → GET /api/project-documentation?year=YYYY&month=M
              → { period, available_years, rows }
              → render filter + tabel
```

### I.2 Ganti periode

```text
User mengubah tahun/bulan → Terapkan
  → validasi tahun/bulan
  → jika draft kotor: konfirmasi
  → GET periode baru
  → set rows + availableYears
  → editing = null
  → search dipertahankan
```

Jika GET gagal, periode sebelumnya tidak boleh diganti secara diam-diam;
tampilkan error dan biarkan user retry.

### I.3 Simpan satu periode

```text
Klik Edit
  → editing = { projectId, period, draft, initial, error }
Ubah lima URL/catatan
Klik Simpan
  → validasi klien
  → PUT /api/project-documentation/{projectId}/{year}/{month}
  → 200 DTO
  → ganti row project yang sama pada periode aktif
  → editing = null + feedback
```

Tidak ada optimistic update. Response server adalah sumber kebenaran.

### I.4 Audit transition

```text
URL berubah → URL baru + week_n_updated_by = actor + week_n_updated_at = now
URL sama    → tidak sentuh URL maupun audit
URL clear   → URL + week_n_updated_by + week_n_updated_at = NULL
Catatan berubah → row updated_by/updated_at berubah
Tidak ada perubahan → tidak menulis
```

### I.5 Summary

```text
Pilih tahun → GET /api/project-documentation/summary?year=YYYY
  → semua Master Project
  → LEFT JOIN dokumentasi tahun tersebut
  → group per project → 12 bulan
  → completed_weeks = jumlah URL non-null
  → render matriks n/5
```

### I.6 Migration/backfill

```text
0018 existing
  → 0019 add year/month nullable
  → backfill created_at Asia/Jakarta
  → set NOT NULL
  → drop unique project_id
  → create composite unique + year/month index + CHECK
  → deploy kode baru
```

---

## J. Authentication & RBAC

### J.1 Permission tetap

Tidak ada permission baru:

```ts
DOCUMENTATION_VIEW: "DOCUMENTATION_VIEW",
DOCUMENTATION_MANAGE: "DOCUMENTATION_MANAGE",
```

Mapping tetap:

| Permission | Admin | Head Office | Project | Management |
|---|---|---|---|---|
| `DOCUMENTATION_VIEW` | ✅ super-rule | ✅ | ✅ | ✅ |
| `DOCUMENTATION_MANAGE` | ✅ super-rule | ✅ | ✅ | — |

### J.2 Matriks akses delta

| Aksi | Admin | Head Office | Project | Management |
|---|---|---|---|---|
| Buka Rekap | ✅ | ✅ | ✅ | ✅ |
| Filter tahun/bulan | ✅ | ✅ | ✅ | ✅ |
| Edit/simpan | ✅ | ✅ | ✅ | — |
| Buka Summary | ✅ | ✅ | ✅ | ✅ |
| Melihat semua project di Summary | ✅ | ✅ | ✅ | ✅ |
| Tambah/hapus project | — | — | — | — |

Tidak ada ownership check. Project role tetap dapat mengelola semua project
sesuai D-PDOC-06.

### J.3 Lapisan guard

| Lapisan | Perilaku |
|---|---|
| Sidebar | Parent + dua child hanya jika VIEW |
| Layout `/dashboard/project-documentation` | Tanpa sesi → `/login`; tanpa VIEW → `/dashboard` |
| Summary page | Mewarisi layout yang sama; read-only |
| Server page Rekap | Menghitung `canManage` |
| Client UI | Input/tombol hanya jika MANAGE |
| Service | `assertViewAccess` / `assertManageAccess` |
| API | Actor dari sesi; bukan body/path |

Summary tidak menambah endpoint tulis. Bahkan user MANAGE tidak dapat mengubah
data dari halaman Summary.

---

## K. Concurrency

**Tetap tanpa versioning.** Tidak ada kolom `version`, ETag, atau optimistic
lock. Strategi: **last-write-wins per baris periode**.

| Skenario | Perilaku |
|---|---|
| Dua user mengedit bulan berbeda | Aman; baris berbeda |
| Dua user mengedit project berbeda pada bulan sama | Aman; baris berbeda |
| Dua user mengedit project + bulan sama | Simpan terakhir menang untuk seluruh baris |
| Dua user mengubah minggu berbeda pada project + bulan sama | Berpotensi saling menimpa; risiko V1 tetap ada |
| Dua insert pertama bersamaan | `ON CONFLICT (project_id, year, month)` mencegah duplikasi |
| Simpan tanpa perubahan | Tidak menulis; timestamp tidak berubah |
| User dihapus | FK audit minggu/row menjadi `NULL`; timestamp tetap |

**Perbaikan dari delta:** konflik lintas bulan hilang karena baris terpisah.
Konflik lintas minggu dalam periode yang sama tetap menjadi risiko yang diterima
pada V1. Jika Owner menganggap tidak acceptable, opsi masa depan adalah PATCH
per minggu atau token `updated_at`; itu bukan default delta ini.

---

## L. Regression Impact

| Area | Dampak | Mitigasi |
|---|---|---|
| Database | Tambah kolom, ubah unique, backfill | Migration 0019 + scratch test |
| API GET | Breaking: query periode wajib | Ganti client bersamaan; test 400 |
| API PUT | Breaking: route lama dihapus | Hapus `[projectId]/route.ts`; test route |
| DTO | `PdocRowDto` bertambah `year`, `month`, `documented` | Perbarui draft/test |
| Rekap page | Fetch per periode + filter baru | Test manual + unit helper |
| PDF | Filter line dan file name berubah | Perbarui test PDF |
| Sidebar | Item menjadi accordion; export menu berubah | Perbarui test sidebar |
| Permission | Tidak berubah | Jalankan access test existing |
| Master Project delete | Tetap `RESTRICT`; tidak ada perubahan logika | Regression manual |
| Summary | Halaman baru read-only | Test semua role |
| MSL/MKS/CST/KM | Tidak disentuh | Tidak ada import/silang modul |
| Dokumentasi | P3/P2/audit perlu status baru setelah implementasi | Update di Sub-Fase E |

### L.1 Breaking changes yang harus disengaja

1. `GET /api/project-documentation` tanpa `year`/`month` → 400.
2. `PUT /api/project-documentation/[projectId]` → route tidak ada (404).
3. `projectDocumentationMenu` berubah dari satu objek menjadi array dua item.
4. `PdocRowDto` dan `PdocEditingState` bertambah periode.
5. PDF filter line dan nama file mencantumkan periode.

Tidak ada kompatibilitas ganda untuk route lama karena route lama tidak dapat
menentukan periode secara benar.

### L.2 Yang tidak boleh berubah

- Lima minggu tetap lima kolom.
- `catatan` tetap per baris periode.
- Audit minggu dan aturan no-op tetap.
- `DOCUMENTATION_VIEW`/`DOCUMENTATION_MANAGE` tetap.
- Project role tetap mengelola semua project.
- Tidak ada `POST`/`DELETE`.
- Master Project tetap sumber nama/lokasi/tahun project.
- Tidak ada perubahan pada MSL, MKS, CST, KM, atau modul lain.

---

## M. Testing Strategy

### M.1 Unit test murni

| File | Cakupan |
|---|---|
| `pdoc-period.test.ts` | Parse tahun/bulan, tolak 1999/0/13/non-integer, format label, path |
| `pdoc-summary.test.ts` | 12 bulan selalu lengkap, grouping, `n/5` 0–5, project tanpa dokumen |
| `pdoc-draft.test.ts` | DTO periodik, draft, payload, URL/catatan, row tanpa dokumentasi |
| `pdocExportPdf.test.ts` | 7 kolom, `0/5` bukan PDF, filter line periode, file name |
| `service.test.ts` | DTO, no-op, clear URL, audit transition, period |
| `repository.test.ts` | Query shape/composite conflict (sesuai pola existing) |
| `_helpers.test.ts` | 400/401/403/404/409, UUID, Zod details |
| `projectDocumentationSidebar.test.ts` | Dua child, visibility empat role, route files, accordion state |

### M.2 API/route test

- GET tanpa `year`/`month` → 400.
- GET `year=1999`, `month=0`, `month=13`, non-integer → 400.
- GET periode tanpa dokumentasi → semua project + lima slot kosong.
- PUT path invalid → 400; project tidak ada → 404.
- Body berisi `year`/`month` → 400.
- PUT tanpa perubahan → timestamp tidak berubah.
- PUT project + bulan berbeda → baris baru, bukan overwrite.
- Summary tanpa `year` → 400; `year` valid → 12 bulan.
- Route lama `/[projectId]` tidak lagi melayani PUT.

### M.3 Database/migration test

Jalankan pada database salinan/scratch, bukan production:

1. Backup, lalu apply `0018` + `0019`.
2. Tabel kosong: migration sukses.
3. Satu baris existing: `year`/`month` terisi dari `created_at` Jakarta.
4. Insert project yang sama untuk dua bulan: berhasil.
5. Insert periode duplikat: ditolak unique.
6. `month=0`/`13`, `year=1999`: ditolak CHECK.
7. `DROP INDEX project_id_unique` berhasil; composite index ada.
8. Summary query mengembalikan project tanpa dokumen dan hitungan 0–5.
9. `drizzle-kit check` PASS.

### M.4 Manual UI acceptance

| Skenario | Admin | Head Office | Project | Management |
|---|---|---|---|---|
| Rekap periode berjalan | ✅ | ✅ | ✅ | ✅ |
| Ganti tahun/bulan | ✅ | ✅ | ✅ | ✅ |
| Edit/simpan | ✅ | ✅ | ✅ | tidak ada tombol |
| Project tanpa dokumen tampil | ✅ | ✅ | ✅ | ✅ |
| PDF periode | ✅ | ✅ | ✅ | ✅ |
| Summary semua project | ✅ | ✅ | ✅ | ✅ |
| `0/5` untuk project kosong | ✅ | ✅ | ✅ | ✅ |
| Accordion dua submenu | ✅ | ✅ | ✅ | ✅ |
| Summary read-only | ✅ | ✅ | ✅ | ✅ |

### M.5 Quality gates

| Perintah | Target |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint <file berubah>` | exit 0 |
| `npm test` | seluruh suite PASS |
| `git diff --check` | exit 0 |
| `npx drizzle-kit check` | PASS |
| Manual GET/PUT/Summary | setelah migration disetujui |

Test runner tidak menyediakan jsdom; jangan menambah test komponen React
berbasis DOM. Pengujian UI dilakukan manual atau melalui helper murni.

---

## N. File Impact Inventory

### N.1 File baru

| Path | Isi |
|---|---|
| `drizzle/0019_project_documentation_period.sql` | Migration forward-only |
| `drizzle/meta/0019_snapshot.json` | Snapshot drizzle-kit |
| `src/lib/project-documentation/pdoc-period.ts` | Tipe/parse/format periode |
| `src/lib/project-documentation/pdoc-summary.ts` | Pure builder matriks 12 bulan |
| `src/lib/project-documentation/pdoc-period.test.ts` | Test periode |
| `src/lib/project-documentation/pdoc-summary.test.ts` | Test summary |
| `src/app/api/project-documentation/summary/route.ts` | GET Summary |
| `src/app/api/project-documentation/[projectId]/[year]/[month]/route.ts` | PUT per periode |
| `src/app/dashboard/project-documentation/summary/page.tsx` | Server page Summary |
| `src/components/dashboard/project-documentation/PdocSummaryPage.tsx` | Client Summary |
| `src/components/dashboard/project-documentation/PdocSummaryTable.tsx` | Matriks 12 bulan |
| `src/components/dashboard/project-documentation/pdocExportPdf.test.ts` | Test PDF periode |

PDF Summary bukan scope delta ini; tidak ada file `pdocSummaryExportPdf.ts`.

### N.2 File yang diubah

| Path | Perubahan |
|---|---|
| `src/lib/pg/schema.ts` | `year`, `month`, composite unique, index, CHECK |
| `src/lib/project-documentation/repository.ts` | Query per periode, summary, upsert composite |
| `src/lib/project-documentation/service.ts` | Period-aware DTO, list/update/summary |
| `src/lib/project-documentation/constants.ts` | `PDOC_MONTHS`, label dan path helper |
| `src/lib/project-documentation/pdoc-draft.ts` | `PdocRowDto` periodik, editing state, PDF |
| `src/lib/project-documentation/repository.test.ts` | Skenario composite/period |
| `src/lib/project-documentation/service.test.ts` | DTO periodik dan ringkasan akses |
| `src/lib/project-documentation/pdoc-draft.test.ts` | DTO periodik |
| `src/app/api/project-documentation/_helpers.test.ts` | Parser periode dan error |
| `src/components/dashboard/project-documentation/ProjectDocumentationPage.tsx` | Filter periode, fetch, save path, PDF |
| `src/components/dashboard/project-documentation/pdocExportPdf.ts` | Judul/filter/file name periode |
| `src/components/dashboard/DashboardSidebar.tsx` | Accordion dua submenu + state |
| `src/components/dashboard/projectDocumentationSidebar.test.ts` | Ekspektasi dua menu |
| `src/app/api/project-documentation/_helpers.ts` | Parser periode, error periode |
| `drizzle/meta/_journal.json` | Entry `0019` (oleh drizzle-kit) |

### N.3 File yang dihapus

| Path | Alasan |
|---|---|
| `src/app/api/project-documentation/[projectId]/route.ts` | Diganti route tiga segmen; route lama tidak dapat menentukan periode |

### N.4 File yang tidak berubah

- `src/lib/auth/permissions.ts`
- `src/app/dashboard/project-documentation/layout.tsx`
- `src/lib/project-documentation/schema.ts` — body V1 tidak berubah
- `src/components/dashboard/project-documentation/PdocTable.tsx` — struktur 8 kolom tidak berubah
- `src/lib/master-project/**`
- `src/lib/msl/**`, `src/components/dashboard/msl/**`
- `src/lib/metode-kerja-standar/**`
- `src/lib/calculation-sheet-template/**`
- `src/lib/knowledge-management/**`
- Seluruh migration `0000`–`0018`

### N.5 Dokumentasi yang diperbarui setelah implementasi

- `docs/design/PDOC_P3_TECHNICAL_DESIGN.md` — tandai bahwa asumsi satu baris
  per project digantikan delta ini.
- `docs/design/PDOC_MONTHLY_IMPACT_ANALYSIS.md` — status keputusan Owner.
- `docs/audit/05_API_DOCUMENTATION.md` — route/endpoint baru.
- `docs/audit/06_AUTHENTICATION_AND_AUTHORIZATION.md` — akses Summary.
- `docs/audit/07_MODULE_AND_FEATURE_INVENTORY.md` — halaman dan test baru.
- `docs/development/CURRENT_PROJECT_STATE.md`, `FEATURE_REGISTER.md`,
  `DEVELOPMENT_MASTER_LOG.md` — setelah verifikasi, bukan sebelum.

---

## O. Technical Risks

| # | Risiko | Prob. | Dampak | Mitigasi |
|---|---|---|---|---|
| R-01 | Backfill `created_at` tidak sesuai periode bisnis | Sedang | Data lama masuk bulan yang salah | Konfirmasi sebelum apply; backup + query verifikasi; koreksi manual terbatas |
| R-02 | Migration `NOT NULL` vs kode lama | Sedang | Write V1 gagal saat window | Maintenance window / stop traffic tulis |
| R-03 | Route lama masih dipakai client | Sedang | 404/400 setelah deploy | Deploy client bersamaan; hapus route lama; smoke test |
| R-04 | Filter periode di `WHERE` | Rendah | Project tanpa dokumen hilang | Code review + test project kosong |
| R-05 | Summary N+1 | Rendah | Halaman lambat | Satu query tahunan + grouping di memori |
| R-06 | Semua project × 12 bulan terlalu besar | Sedang | Render berat | Ukur jumlah project; pagination/virtualization jika perlu |
| R-07 | Tahun bebas membingungkan dengan `project_year` | Sedang | Salah input | Label “Tahun Dokumentasi”; subteks tahun project |
| R-08 | Dua user mengedit minggu berbeda pada periode sama | Sedang | Cross-week clobber | Terima V1; busy lock; opsi PATCH/versioning di masa depan |
| R-09 | Clear URL menghapus audit minggu | Rendah | Riwayat siapa mengosongkan tidak tersimpan di minggu | Perilaku V1 dipertahankan; row-level audit tetap ada |
| R-10 | Timezone di batas bulan | Rendah | Backfill masuk bulan berikutnya | `Asia/Jakarta` eksplisit + test tanggal 23:59/00:01 |
| R-11 | Summary `0/5` disalahartikan sebagai data lengkap nol | Rendah | Salah tafsir | Legend dan tooltip; `documented` tersedia |
| R-12 | Accordion sidebar memecah test existing | Rendah | Regresi navigasi | Test root + summary + empat role |
| R-13 | Status migration 0017/0018 tidak konsisten | Rendah | Deployment ragu | Verifikasi DB sebelum apply; update dokumen |

### O.1 Asumsi teknis

1. Backfill memakai `created_at` Jakarta; ini asumsi implementasi sampai Owner
   memutuskan lain.
2. Periode default UI adalah bulan berjalan Jakarta; user bebas mengganti.
3. Summary tidak memerlukan PDF pada delta ini.
4. Filter UI tidak disinkronkan ke URL pada delta ini.
5. Tidak ada versioning/optimistic concurrency.

### O.2 Non-goals

- Membuat/menghapus/rename Master Project dari PDOC.
- Upload file; tetap URL.
- Mengubah lima minggu menjadi jumlah dinamis.
- Riwayat lengkap setiap perubahan link.
- Search/pagination di Summary.
- PDF Summary.
- Mengubah permission atau ownership.
- Mengubah modul MSL/MKS/CST/KM.

---

## P. Implementation Plan

### Sub-fase A — Database & periode foundation

**Deliverable**

- `year`, `month`, composite unique, index, CHECK di `schema.ts`.
- Migration `0019` + snapshot/journal via drizzle-kit.
- Backfill SQL dan verifikasi scratch.
- `pdoc-period.ts` + test.

**Exit criteria**

- `drizzle-kit check` PASS.
- Migration sukses pada tabel kosong dan tabel berisi satu baris.
- Tidak ada `NULL` periode; tidak ada duplikat.
- Belum apply ke database utama tanpa otorisasi.

### Sub-fase B — Repository & service periodik

**Deliverable**

- Query Rekap per periode dengan filter di `LEFT JOIN`.
- Query Summary satu tahun.
- Upsert `ON CONFLICT (project_id, year, month)`.
- DTO `year`, `month`, `documented`.
- Pure builder `pdoc-summary.ts`.
- Test audit transition, no-op, period, summary.

**Exit criteria**

- Project tanpa dokumen tetap muncul.
- Dua bulan untuk project yang sama berhasil.
- `n/5` benar untuk 0, 1, 5, dan URL dihapus.
- `npm test` untuk domain PDOC PASS.

### Sub-fase C — API

**Deliverable**

- GET Rekap dengan validasi query.
- PUT tiga segmen.
- GET Summary.
- Parser periode + error mapping.
- Hapus route `[projectId]`.

**Exit criteria**

- GET/PUT/Summary invalid → 400.
- Route lama tidak lagi melayani PUT.
- Response `no-store`.
- Signed-out 401, role salah 403, project tidak ada 404.
- Smoke test manual pada database salinan.

### Sub-fase D — UI, sidebar, PDF

**Deliverable**

- Filter periode Rekap.
- State editing dengan periode.
- Halaman Summary + matriks 12 bulan.
- Accordion sidebar dua submenu.
- PDF periode.
- Loading/error/empty/feedback/dirty guard.

**Exit criteria**

- Empat role manual check.
- Rekap dan Summary dapat dibuka.
- Project tanpa dokumen tampil `—`/`0/5`.
- PDF periode dapat diunduh.
- Accordion terbuka pada route yang tepat.

### Sub-fase E — Verification & handoff

**Deliverable**

- `npx tsc --noEmit`.
- `npx eslint` file berubah.
- `npm test` seluruh suite.
- `git diff --check`.
- `npx drizzle-kit check`.
- Manual migration + GET/PUT/Summary pada scratch DB.
- Regression MSL/MKS/CST/KM/sidebar.
- Update dokumen development/audit.
- Handoff; tidak commit/push/deploy tanpa instruksi.

**Exit criteria**

- Seluruh acceptance criteria §Q terpenuhi.
- Risiko residual dicatat.
- Owner memberi **“Siap dikembangkan”** sebelum P4 Revisi.

---

## Q. Acceptance Criteria

### Q.1 Fungsional

- [ ] Satu project dapat memiliki dokumentasi untuk banyak tahun/bulan.
- [ ] Rekap menampilkan semua Master Project untuk periode terpilih.
- [ ] Project tanpa dokumentasi tetap tampil dengan lima sel kosong.
- [ ] Tahun dokumentasi dapat berbeda dari `master_projects.year`.
- [ ] Summary menampilkan semua Master Project × 12 bulan.
- [ ] Project tanpa data menampilkan `0/5`, bukan `—`.
- [ ] `n/5` dihitung dari URL minggu non-null.
- [ ] Simpan hanya mengubah baris project + periode yang dipilih.
- [ ] Menyimpan tanpa perubahan tidak mengubah timestamp.
- [ ] Mengosongkan URL mengosongkan URL + pasangan audit minggu.
- [ ] PDF Rekap memuat periode yang sedang dilihat.

### Q.2 API & data

- [ ] GET tanpa periode → 400.
- [ ] PUT body tidak boleh memuat periode.
- [ ] PUT route lama tidak ada.
- [ ] `UNIQUE(project_id, year, month)` aktif.
- [ ] `project_id` unique tunggal sudah dihapus.
- [ ] CHECK bulan 1–12 dan tahun `>= 2000` aktif.
- [ ] Backfill mengisi semua baris existing dari `created_at` Jakarta.
- [ ] Tidak ada N+1 pada Rekap atau Summary.
- [ ] Migration 0019 tidak mengubah 0018.

### Q.3 UI & navigasi

- [ ] Rekap memiliki input Tahun Dokumentasi dan select Bulan.
- [ ] Tahun baru yang belum punya data tetap dapat dipilih.
- [ ] Summary memiliki pemilih tahun.
- [ ] Sidebar menampilkan parent Project Documentation + dua child.
- [ ] Accordion terbuka otomatis pada route Rekap/Summary.
- [ ] Summary hanya-baca.
- [ ] Tabel responsif dengan horizontal scroll.
- [ ] Loading, error, empty, dan retry tersedia.
- [ ] Draft kotor tidak hilang tanpa konfirmasi saat ganti periode.

### Q.4 RBAC

- [ ] Admin, Head Office, Project dapat melihat dan mengelola.
- [ ] Management hanya melihat Rekap dan Summary.
- [ ] Tanpa sesi → 401/login.
- [ ] Role tanpa VIEW → 403/redirect.
- [ ] Summary tidak menyediakan tombol mutasi.
- [ ] Tidak ada ownership check baru.

### Q.5 Quality gates

- [ ] `npx tsc --noEmit` exit 0.
- [ ] `npx eslint` file berubah exit 0.
- [ ] `npm test` seluruh suite PASS.
- [ ] `git diff --check` exit 0.
- [ ] `npx drizzle-kit check` PASS.
- [ ] Migration/backfill diverifikasi pada scratch DB.
- [ ] Regression MSL/MKS/CST/KM PASS.

### Q.6 Handoff

- [ ] Dokumen A–Q lengkap dan direview Owner.
- [ ] Keputusan D-PDOC-07…10 tercatat.
- [ ] Asumsi backfill dikonfirmasi sebelum apply.
- [ ] Migration 0019 belum dijalankan tanpa otorisasi.
- [ ] Tidak ada commit/push/deploy tanpa instruksi.
- [ ] Owner memberi **“Siap dikembangkan”** sebelum P4 Revisi.

**Status: READY FOR OWNER REVIEW — implementasi belum dimulai.**
