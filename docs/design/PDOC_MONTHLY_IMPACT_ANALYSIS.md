# P2 — Impact Analysis: Tahun & Rekap Bulanan Project Documentation (PDOC)

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P2 — Impact Analysis (read-only)
**Tanggal:** 10 November 2026
**Baseline:** `main` @ `5636113`; PDOC V1 (Sub-Fase A–D) belum di-commit
**Status:** Analisis selesai — menunggu keputusan Owner
**Sifat:** Dokumen desain; **tidak ada source code, schema, migration, database, atau UI yang diubah**

---

## 0. Ruang Lingkup dan Metode

Dokumen ini menganalisis dampak requirement baru:

> Project Documentation harus memiliki konteks **Tahun** dan **Bulan**. Satu project
> dapat memiliki banyak baris dokumentasi untuk periode berbeda, misalnya Januari
> 2026 dan Februari 2026, dan tersedia halaman **Summary/Recap per bulan**.

Analisis dilakukan hanya dengan membaca implementasi PDOC V1 dan pola modul existing.
Tidak ada migration yang dijalankan dan tidak ada database yang diubah pada fase ini.

**Asumsi baseline:**

1. Migration `0018_project_documentations` sudah **APPLIED** menurut konfirmasi Owner.
2. PDOC V1 sudah memiliki lima slot URL minggu, audit per minggu, catatan, dan PDF.
3. Master Project tetap menjadi sumber baris; PDOC tidak membuat atau menghapus project.
4. Permission `DOCUMENTATION_VIEW` dan `DOCUMENTATION_MANAGE` tidak berubah.
5. Requirement baru ini **menggantikan asumsi P1/P3** bahwa satu project hanya punya
   satu set dokumentasi. P3 existing perlu dibuat delta-nya sebelum implementasi.

---

## A. Executive Summary

### A.1 Kesimpulan utama

Requirement ini mengubah cardinality PDOC dari:

```text
1 Master Project ── 1 project_documentations
```

menjadi:

```text
1 Master Project ── N project_documentations (satu baris per tahun + bulan)
```

Dampaknya bukan sekadar menambah dua kolom:

- schema dan migration berubah;
- target upsert berubah dari `project_id` menjadi `(project_id, year, month)`;
- semua query yang membaca satu baris per project harus memiliki periode;
- endpoint `PUT` dan `GET` berubah secara breaking;
- UI membutuhkan filter periode dan halaman Summary 12 bulan;
- test, dokumentasi audit, dan PDF harus ikut disesuaikan.

### A.2 Rekomendasi migration

**Gunakan migration baru `0019_project_documentation_period`, bukan mengubah `0018`.**

`0018` sudah APPLIED dan sudah tercatat di `drizzle/meta/_journal.json` serta snapshot.
Mengubah migration yang sudah dijalankan akan membuat riwayat migration, snapshot, dan
database yang sudah ada tidak konsisten. Perubahan harus forward-only melalui `0019`.

### A.3 Rekomendasi kontrak utama

| Area | Rekomendasi |
|---|---|
| Identitas baris | `(project_id, year, month)` unik |
| Migration | `0019`, bukan mengedit `0018` |
| GET daftar | `GET /api/project-documentation?year=YYYY&month=M` |
| PUT | `PUT /api/project-documentation/[projectId]/[year]/[month]` |
| Summary | `GET /api/project-documentation/summary?year=YYYY` |
| Body PUT | Tetap hanya lima URL + `catatan`; periode **tidak** boleh dari body |
| UI detail | Filter Tahun + Bulan di atas tabel; tabel tetap 8 kolom |
| UI summary | Tabel `Nama Proyek × Jan–Des`, indikator `n/5` minggu terisi |
| Permission | Tidak berubah |
| PDF | Tetap 7 kolom; judul/filter line mencantumkan periode |

### A.4 Rekomendasi fase

**Perlu P3 delta, lalu revisi P4.** Tidak perlu mengulang P2 penuh karena dokumen ini
sudah memetakan baseline. Namun desain P3 existing tidak lagi cukup: route, schema,
query, dan UI berubah. Setelah Owner menyetujui keputusan di §H, buat delta P3 yang
mengunci kontrak periode, lalu implementasikan revisi P4 A–C dan migration `0019`.

### A.5 Risiko terbesar

1. **Arti `year`:** apakah tahun dokumentasi harus sama dengan `master_projects.year`,
   atau boleh berbeda? Ini harus diputuskan sebelum backfill.
2. **Backfill data existing:** tidak ada periode pada baris lama; periode harus
   diturunkan dari `created_at` atau `master_projects.year`.
3. **Breaking API:** client PDOC V1 yang masih mengirim `PUT /[projectId]` akan gagal
   setelah route baru diterapkan.
4. **Left join:** filter periode yang diletakkan di `WHERE` dapat menghilangkan project
   yang belum punya dokumentasi; filter harus berada di kondisi `LEFT JOIN`.
5. **Deployment window:** migration yang menambahkan kolom `NOT NULL` dapat membuat
   API lama gagal menulis sampai kode baru aktif.

---

## B. Baseline PDOC V1

### B.1 Schema saat ini

Tabel `project_documentations` memiliki:

| Bagian | Kondisi saat ini |
|---|---|
| Primary key | `id uuid` |
| Relasi project | `project_id uuid NOT NULL`, FK ke `master_projects.id`, `ON DELETE RESTRICT` |
| Identitas | **unique index `project_documentations_project_id_unique` pada `project_id`** |
| Minggu | `week_1_url` … `week_5_url` |
| Audit minggu | `week_n_updated_by`, `week_n_updated_at` |
| Catatan | `catatan` |
| Audit baris | `created_by`, `updated_by`, `created_at`, `updated_at` |
| URL CHECK | `NULL` atau regex `^https?://` dan panjang ≤ 2.048 |
| Catatan CHECK | `NULL` atau panjang ≤ 2.000 |

Migration `0018_project_documentations.sql` membuat tabel dan unique index tersebut.
Tidak ada kolom tahun/bulan dan tidak ada composite unique.

### B.2 Repository dan service saat ini

- `listProjectDocumentations()` melakukan `master_projects LEFT JOIN project_documentations`
  hanya dengan `project_id`, lalu mengurutkan nama/lokasi/id.
- `findProjectDocumentationByProjectId(projectId)` dan
  `findProjectDocumentationViewByProjectId(projectId)` mengasumsikan satu baris.
- `updateDocumentation(actor, projectId, input)` hanya memvalidasi project, bukan periode.
- `upsertProjectDocumentation()` memakai `ON CONFLICT (project_id)`.
- `buildProjectDocumentationWrite()` membandingkan lima URL dan catatan; aturan audit per
  minggu tidak bergantung pada periode dan dapat dipertahankan.
- Saat URL dikosongkan, implementasi saat ini mengosongkan URL **dan** pasangan audit
  minggu tersebut (D-PDOC-02).

### B.3 API saat ini

| Method | Path | Periode |
|---|---|---|
| GET | `/api/project-documentation` | Tidak ada; selalu semua project |
| PUT | `/api/project-documentation/[projectId]` | Tidak ada; upsert berdasarkan project |

Body PUT saat ini berisi lima field URL dan `catatan`; field yang tidak dikirim tidak
berubah, `null`/string kosong menghapus nilai, dan body kosong ditolak. Tidak ada
`POST`/`DELETE`.

### B.4 UI saat ini

- Satu halaman `/dashboard/project-documentation`.
- Client fetch sekali ke `GET /api/project-documentation`.
- Search client-side berdasarkan nama project.
- Tabel 8 kolom: Nama Proyek, Minggu 1–5, Catatan, Aksi.
- Inline edit satu baris; state `PdocEditingState` hanya menyimpan `projectId`, draft,
  initial, dan error.
- PDF A4 landscape 7 kolom; filter line hanya berisi jumlah project dan search.
- Sidebar berupa satu item top-level, bukan accordion.
- `PdocRowDto` memiliki `project_id`, `project_name`, `project_location`,
  `project_year`, `weeks`, `catatan`, dan audit baris.

### B.5 Asumsi yang tidak lagi valid

| Asumsi V1 | Dampak requirement baru |
|---|---|
| Satu project = satu baris | Harus menjadi satu baris per project + periode |
| `project_id` unik | Harus diganti composite unique |
| GET tanpa parameter | Harus memiliki tahun + bulan |
| PUT berdasarkan project saja | Harus memiliki periode pada identitas resource |
| Search adalah satu-satunya filter | Harus ada filter tahun/bulan |
| Tidak ada halaman recap | Harus ada Summary 12 bulan |
| PDF hanya satu set dokumentasi | PDF harus menyebut periode yang sedang dilihat |

---

## C. Dampak Database

### C.1 Target schema

Tambahkan dua kolom periode ke `project_documentations`:

| Kolom | Tipe | Null | Aturan |
|---|---|---|---|
| `year` | `integer` | no | Tahun dokumentasi; `>= 2000`; **bukan** `master_projects.year` |
| `month` | `integer` | no | `1..12` |

Identitas baru:

```text
UNIQUE (project_id, year, month)
```

`project_id` tetap `NOT NULL` dan FK `ON DELETE RESTRICT`; yang dihapus hanya unique
index tunggal pada `project_id`.

**Catatan penamaan:** requirement menyebut `year`/`month`. Nama itu dipakai di schema
dan API, sementara `project_year` tetap berarti tahun Master Project. UI harus memberi
label **“Tahun Dokumentasi”**, bukan sekadar “Tahun”, agar tidak tertukar dengan tahun
project.

### C.2 Schema Drizzle yang dituju

```ts
export const projectDocumentations = pgTable(
  "project_documentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => masterProjects.id, { onDelete: "restrict" }),

    year: integer("year").notNull(),
    month: integer("month").notNull(),

    // week_1_url … week_5_url, audit minggu, catatan, dan audit baris tetap
    // seperti implementasi V1.
  },
  (table) => [
    uniqueIndex("project_documentations_project_period_unique").on(
      table.projectId,
      table.year,
      table.month,
    ),
    index("project_documentations_year_month_idx").on(table.year, table.month),
    check("project_documentations_month_check", sql`${table.month} BETWEEN 1 AND 12`),
    check("project_documentations_year_check", sql`${table.year} >= 2000`),
    // CHECK URL/catatan V1 tetap dipertahankan.
  ],
);
```

**Mengapa bukan `UNIQUE(project_id, year)`?** Requirement menyatakan satu baris per
bulan; satu project dapat memiliki dua belas baris dalam satu tahun.

**Mengapa bukan child table baru?** Lima minggu tetap slot tetap. Flat table dengan
satu baris per project-periode mempertahankan query, PDF, dan audit minggu yang sudah
ada. Child table baru relevan jika jumlah minggu menjadi dinamis atau butuh history
perubahan per minggu.

### C.3 Migration: `0019`, bukan mengubah `0018`

| Pilihan | Penilaian |
|---|---|
| Edit `0018` | **Ditolak.** Migration sudah APPLIED; mengubahnya membuat riwayat dan snapshot tidak dapat dipercaya, dan environment lain yang sudah menjalankannya tidak akan mendapat perubahan. |
| Migration baru `0019` | **Direkomendasikan.** Forward-only, dapat diuji pada database kosong maupun database yang sudah memiliki `0018`, dan menjaga audit migration. |
| Drop + create ulang tabel | **Ditolak.** Berisiko kehilangan dokumentasi/audit dan tidak perlu. |

Nama yang direkomendasikan:

```text
drizzle/0019_project_documentation_period.sql
drizzle/meta/0019_snapshot.json
drizzle/meta/_journal.json (entry 20)
```

### C.4 Backfill baris existing

Baris lama tidak memiliki periode. Migration harus aman untuk dua kondisi:

1. tabel kosong — backfill tidak mengubah apa pun;
2. tabel berisi baris — setiap baris harus mendapat periode yang dapat dijelaskan.

**Rekomendasi default:** turunkan periode dari `created_at` dalam zona `Asia/Jakarta`.

```sql
ALTER TABLE "project_documentations" ADD COLUMN "year" integer;
ALTER TABLE "project_documentations" ADD COLUMN "month" integer;

UPDATE "project_documentations"
SET
  "year" = EXTRACT(YEAR FROM ("created_at" AT TIME ZONE 'Asia/Jakarta'))::integer,
  "month" = EXTRACT(MONTH FROM ("created_at" AT TIME ZONE 'Asia/Jakarta'))::integer;

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

Catatan implementasi:

- Drizzle generate tidak menghasilkan `UPDATE` backfill; statement itu harus ditambahkan
  manual ke file migration setelah generate.
- Jangan memberi `DEFAULT` pada `year`/`month`. Default akan menyembunyikan periode yang
  salah; API wajib mengirim periode secara eksplisit.
- Jika Owner memutuskan periode existing harus mengikuti tahun project, ganti `UPDATE`
  dengan join ke `master_projects` dan gunakan `master_projects.year` untuk `year`,
  sedangkan `month` tetap dari `created_at`. Ini **keputusan bisnis**, bukan keputusan
  teknis yang boleh ditebak.
- Jalankan pada database salinan/scratch terlebih dahulu; verifikasi jumlah baris,
  pasangan unik, dan tidak ada `NULL` sebelum apply ke `neondb`.

### C.5 Constraint dan index

| Nama | Definisi | Alasan |
|---|---|---|
| `project_documentations_project_period_unique` | unique pada `(project_id, year, month)` | Target upsert dan mencegah duplikasi periode |
| `project_documentations_year_month_idx` | index pada `(year, month)` | Filter detail dan agregasi summary per tahun |
| `project_documentations_month_check` | `1..12` | Invariant bulan di database |
| `project_documentations_year_check` | `>= 2000` | Konsisten dengan tahun Master Project/Program Kerja |
| FK `project_id` | `ON DELETE RESTRICT` | Dokumentasi/audit tidak hilang diam-diam |

Unique composite juga menjadi index lookup untuk `project_id`; tidak perlu index
tambahan pada `project_id` setelah unique tunggal dihapus.

### C.6 Dampak volume dan performa

- Maksimal wajar: satu project × 12 bulan × jumlah tahun = 12 baris per tahun.
- Summary satu tahun membaca seluruh Master Project dan baris tahun tersebut; index
  `(year, month)` menjaga query tetap terarah.
- Detail satu periode memakai unique composite; tidak ada query per project.
- Jangan mengagregasi 12 bulan dengan 12 query terpisah. Satu query per halaman cukup;
  summary dapat menggunakan `LEFT JOIN` + agregasi/service normalization.

### C.7 Integritas dan penghapusan

- Menghapus Master Project tetap ditolak `RESTRICT` jika masih memiliki dokumentasi
  untuk periode mana pun.
- Tidak ada cascade dari project ke dokumentasi.
- Tidak ada `ON DELETE` untuk baris dokumentasi dari UI; untuk menghapus isi, kosongkan
  URL/catatan. Jika suatu saat dibutuhkan hapus periode, itu endpoint baru dan keputusan
  produk terpisah.

### C.8 Deployment dan kompatibilitas

Migration `0019` menambahkan kolom `NOT NULL`. Urutan yang aman:

1. backup/snapshot database;
2. hentikan penulisan PDOC sementara (maintenance window kecil);
3. apply `0019`;
4. deploy kode API/UI baru;
5. verifikasi GET/PUT periode dan summary;
6. buka kembali penulisan.

Jika zero-downtime wajib, pecah menjadi dua tahap:

- `0019a`: tambah kolom nullable + backfill;
- deploy kode yang selalu menulis `year`/`month`;
- `0019b`: set `NOT NULL`, drop unique lama, tambah unique/check baru.

Untuk aplikasi internal ini, satu migration `0019` dalam maintenance window lebih
sederhana dan lebih mudah diaudit. Keputusan akhir diserahkan ke Owner.

---

## D. Dampak API dan Service

### D.1 Matriks endpoint yang dituju

| Method | Path | Guard | Periode | Fungsi |
|---|---|---|---|---|
| GET | `/api/project-documentation?year=YYYY&month=M` | `DOCUMENTATION_VIEW` | Wajib | Daftar semua Master Project untuk satu periode |
| PUT | `/api/project-documentation/[projectId]/[year]/[month]` | `DOCUMENTATION_MANAGE` | Wajib | Upsert dokumentasi satu project-periode |
| GET | `/api/project-documentation/summary?year=YYYY` | `DOCUMENTATION_VIEW` | Tahun wajib | Rekap 12 bulan semua project |
| POST/DELETE | — | — | — | Tetap tidak ada |

Semua response tetap `Cache-Control: no-store`, amplop `{ data }` / `{ error }`, dan
aktor tetap dari sesi.

### D.2 GET daftar per periode

**Request**

```http
GET /api/project-documentation?year=2026&month=11
```

- `year` dan `month` wajib; hilang/invalid → **400**.
- `month` harus integer 1–12; `year` minimal 2000.
- UI selalu mengirim periode; tidak ada fallback “bulan berjalan” di server agar hasil
  deterministik dan tidak bergantung zona waktu server.

**Response 200**

```json
{
  "data": {
    "year": 2026,
    "month": 11,
    "available_years": [2025, 2026],
    "rows": [
      {
        "project_id": "uuid",
        "project_name": "Gedung A",
        "project_location": "Jakarta",
        "project_year": 2026,
        "year": 2026,
        "month": 11,
        "weeks": [
          {
            "week": 1,
            "url": "https://example.com/week-1",
            "updated_by": { "user_id": "uuid", "name": "Budi" },
            "updated_at": "2026-11-09T07:30:00.000Z"
          }
        ],
        "catatan": "Catatan periode November",
        "updated_by": null,
        "updated_at": null
      }
    ]
  }
}
```

Aturan query:

```text
master_projects mp
LEFT JOIN project_documentations pd
  ON pd.project_id = mp.id
 AND pd.year = $year
 AND pd.month = $month
```

**Kondisi periode harus berada di `ON`, bukan `WHERE`.** Jika diletakkan di `WHERE`,
project yang belum punya dokumentasi pada periode tersebut akan hilang, melanggar aturan
“semua Master Project selalu tampil”.

`available_years` diambil dari `SELECT DISTINCT year` (ditambah tahun berjalan) untuk
mengisi dropdown. Jika tidak ingin query tambahan, alternatifnya adalah endpoint
`/periods`; namun menambah field pada response lebih sedikit endpoint.

### D.3 PUT per project-periode

**Request**

```http
PUT /api/project-documentation/8f.../2026/11
Content-Type: application/json

{
  "week_1_url": "https://example.com/week-1",
  "week_2_url": null,
  "week_3_url": null,
  "week_4_url": null,
  "week_5_url": null,
  "catatan": "Catatan November"
}
```

**Mengapa path, bukan body/query?**

| Pilihan | Penilaian |
|---|---|
| `/[projectId]/[year]/[month]` | **Direkomendasikan.** Identitas resource eksplisit, idempoten, mudah divalidasi, dan periode tidak bisa berubah tanpa pindah resource. |
| `PUT /[projectId]` + body `{year, month}` | Kurang jelas; periode terlihat seperti field yang bisa diubah, padahal itu identitas. |
| Query `?year=&month=` pada PUT | Menggabungkan identitas ke query; lebih mudah salah dan tidak konsisten dengan route detail. |

Aturan:

- `projectId` wajib UUID; `year`/`month` wajib valid.
- Body **strict**; `project_id`, `year`, `month`, audit, dan field asing ditolak **400**.
- Field body tetap opsional seperti V1: field yang tidak dikirim tidak berubah,
  `null`/string kosong menghapus nilai, body kosong ditolak.
- Project tidak ada → **404**.
- Upsert target: `ON CONFLICT (project_id, year, month) DO UPDATE`.
- Response **200** `{ data: row }`; DTO memuat `year`/`month` agar client dapat
  mengganti baris yang tepat.
- Tidak ada `POST`/`DELETE`; baris baru dibuat oleh `PUT` pertama untuk periode itu.

### D.4 Upsert dan audit

Logika yang berubah:

```text
assertManageAccess(actor)
  → findProjectById(projectId)                     // 404 jika tidak ada
  → normalize lima URL + catatan                   // aturan V1 tetap
  → findDocumentation(projectId, year, month)      // bukan find by project saja
  → buildProjectDocumentationWrite(existing, ...)  // aturan audit minggu tetap
  → INSERT ... ON CONFLICT (project_id, year, month) DO UPDATE
  → findDocumentationView(projectId, year, month)
  → return DTO
```

Audit per minggu **tidak berubah**:

- URL berubah → URL + `week_n_updated_by` + `week_n_updated_at` baru;
- URL sama → metadata lama dipertahankan;
- URL dikosongkan → URL dan pasangan audit minggu menjadi `NULL` (perilaku V1 saat ini);
- baris berubah → `updated_by`/`updated_at` baris diperbarui.

Periode tidak masuk body dan tidak boleh berubah pada update. Untuk “memindahkan”
dokumentasi ke periode lain, client membuat/menulis periode tujuan; tidak ada operasi
move khusus pada MVP.

### D.5 Summary 12 bulan

**Request**

```http
GET /api/project-documentation/summary?year=2026
```

`year` wajib; `month` tidak relevan karena response selalu 12 bulan.

**Response 200**

```json
{
  "data": {
    "year": 2026,
    "available_years": [2025, 2026],
    "rows": [
      {
        "project_id": "uuid",
        "project_name": "Gedung A",
        "project_location": "Jakarta",
        "project_year": 2026,
        "months": [
          { "month": 1, "filled_weeks": 5, "has_documentation": true },
          { "month": 2, "filled_weeks": 3, "has_documentation": true },
          { "month": 3, "filled_weeks": 0, "has_documentation": false }
        ]
      }
    ]
  }
}
```

- `rows` berisi **semua Master Project**, bukan hanya yang punya dokumentasi.
- `months` selalu 12 elemen, urut 1–12.
- `filled_weeks` = jumlah `week_n_url` yang tidak `NULL`, nilai 0–5.
- `has_documentation` membedakan “tidak ada baris” dari “baris ada tetapi 0/5”.
- Summary tidak membutuhkan `catatan`/audit; jangan mengirim payload besar yang tidak
  dipakai UI.
- `project_year` tetap ditampilkan sebagai konteks di bawah nama project, bukan dipakai
  sebagai filter dokumentasi.

**Agregasi yang disarankan**

Satu query per tahun:

```text
master_projects mp
LEFT JOIN project_documentations pd
  ON pd.project_id = mp.id
 AND pd.year = $year
GROUP BY mp.id, ...
```

Hitung lima URL dengan ekspresi jumlah non-null, lalu normalisasi 12 bulan di service.
Jangan melakukan 12 query bulanan terpisah.

### D.6 Function/service yang berubah

| Lapisan | Perubahan |
|---|---|
| `repository.ts` | `listProjectDocumentations(year, month)`, `findProjectDocumentationView(projectId, year, month)`, `findProjectDocumentation(projectId, year, month)`, `upsertProjectDocumentation(...)`, `listDocumentationYears()`, `listDocumentationSummary(year)` |
| `service.ts` | `listDocumentations(actor, year, month)`, `updateDocumentation(actor, projectId, year, month, input)`, `listDocumentationSummary(actor, year)`; validasi periode |
| `schema.ts` | Parser periode (`year`/`month`) dan validasi query; body PUT tetap strict tanpa periode |
| `pdoc-draft.ts` | `PdocRowDto` + `year`/`month`; `PdocEditingState` menyimpan periode yang sedang diedit; helper filter periode/summary |
| `constants.ts` | Label bulan `Jan`–`Des` (jika tidak diletakkan di helper UI) |

### D.7 Error mapping

| Kondisi | Status |
|---|---|
| Tanpa sesi | 401 |
| Role tidak berhak/suspended | 403 |
| `projectId` bukan UUID | 400 |
| `year`/`month` hilang atau invalid | 400 |
| Project tidak ada | 404 |
| Body bukan JSON / field asing / URL invalid | 400 |
| Unique/FK conflict | 409 |
| Error tak dikenal | 500 + log route |

### D.8 Backward compatibility

Route lama `PUT /api/project-documentation/[projectId]` tidak dapat dipertahankan
tanpa periode karena akan ambigu. Pilihan:

1. **Direkomendasikan:** hapus route lama dan deploy client baru bersamaan; modul belum
   dirilis, jadi tidak ada consumer eksternal.
2. Jika ada client lama yang harus dilayani sementara, route lama mengembalikan **400**
   dengan pesan “Periode tahun dan bulan wajib diisi”; jangan menebak periode.

`GET` lama tanpa query juga harus menjadi 400, bukan diam-diam memakai bulan berjalan.

---

## E. Dampak UI/UX

### E.1 Halaman Dokumentasi (detail periode)

Route tetap `/dashboard/project-documentation`, dengan periode aktif di URL:

```text
/dashboard/project-documentation?year=2026&month=11
```

Wireframe:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Core Enterprise · Project Documentation                    [Export PDF]      │
│ Project Documentation                                                        │
│ Dokumentasi mingguan seluruh Master Project per periode.                     │
│                                                                              │
│ [Tahun Dokumentasi ▾ 2026] [Bulan ▾ November]  [Cari Nama Proyek...]         │
│ Periode: November 2026 · 18 project                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Nama Proyek        │ Minggu 1 │ ... │ Minggu 5 │ Catatan        │ Aksi       │
│ Gedung A           │ 🔗 ...   │ ... │ —        │ ...            │ Edit       │
│ Gedung B           │ —        │ ... │ —        │ —              │ Edit       │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Filter bar**

- Dua kontrol: `Tahun Dokumentasi` dan `Bulan`.
- Tahun berasal dari `available_years` (ditambah tahun berjalan); bulan `Januari`–
  `Desember`.
- Default: tahun/bulan berjalan di `Asia/Jakarta`.
- Mengubah filter memuat ulang data untuk periode tersebut dan memperbarui query URL
  agar tautan dapat dibagikan.
- Filter **disabled** saat ada draft kotor atau request berjalan. User harus
  menyimpan/membatalkan edit terlebih dahulu; ini mencegah draft Januari tersimpan ke
  Februari.
- Search tetap client-side dan hanya memfilter baris pada periode aktif.
- Jangan menampilkan baris project duplikat: satu project hanya punya satu baris untuk
  periode yang dipilih.

**Tabel**

- Tetap 8 kolom; tidak perlu kolom Tahun/Bulan karena periode sudah menjadi konteks
  halaman dan badge.
- Nama project tetap menampilkan `project_location · project_year` sebagai subteks.
  Tambahkan badge kecil `November 2026` di caption/header, bukan di setiap baris.
- `PdocTable` tetap memakai `project_id` sebagai key karena hanya satu periode tampil.
- Edit state harus menyimpan `projectId`, `year`, dan `month`; jangan hanya mengandalkan
  filter global saat request disimpan.
- URL simpan:

```text
PUT /api/project-documentation/{projectId}/{year}/{month}
```

- PDF memakai baris yang terlihat dan filter line:

```text
Periode: November 2026  |  18 project  |  Pencarian: "Gedung"
```

  Judul PDF sebaiknya juga menyebut periode. Jumlah kolom PDF tetap 7; tidak perlu
  menambah kolom tahun/bulan karena konteks sudah ada di header.

**State kosong/loading/error**

| State | Perilaku |
|---|---|
| Memuat periode | Skeleton; filter tetap menampilkan periode |
| Tidak ada Master Project | “Belum ada Master Project.” |
| Project ada, dokumentasi kosong | Semua project tetap tampil; minggu/catatan `—` |
| Gagal memuat | Error + Coba Lagi; filter tidak berubah |
| Gagal simpan | Error di baris; draft tetap terbuka; periode tidak berpindah |
| Periode tanpa data | Tabel tetap berisi semua project dengan nilai kosong |

### E.2 Halaman Summary/Recap 12 bulan

Route baru:

```text
/dashboard/project-documentation/summary?year=2026
```

Wireframe:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Project Documentation · Summary Report                                       │
│ Rekap Kelengkapan Dokumentasi per Bulan                                      │
│ [Tahun Dokumentasi ▾ 2026]      5/5 = lengkap · 3/5 = sebagian · 0/5 = kosong│
├──────────────────────────────────────────────────────────────────────────────┤
│ Nama Proyek          │ Jan │ Feb │ Mar │ Apr │ Mei │ Jun │ Jul │ Agu │ ...   │
│ Gedung A             │ 5/5 │ 3/5 │ 0/5 │ —   │ 5/5 │ ... │ ... │ ... │ ...   │
│ Gedung B             │ 0/5 │ 0/5 │ 2/5 │ ... │ ... │ ... │ ... │ ... │ ...   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Kolom**

1. Nama Proyek (sticky di kiri; subteks lokasi · tahun project).
2. Januari sampai Desember (12 kolom).
3. Tidak ada kolom aksi; halaman read-only untuk semua role View.

**Indikator kelengkapan**

- `5/5` = lima URL minggu terisi.
- `1/5`–`4/5` = sebagian.
- `0/5` = belum ada URL pada periode itu.
- Gunakan `has_documentation` untuk tooltip:
  - `0/5` + `has_documentation=true` → “Dokumentasi ada, belum ada link minggu.”
  - `0/5` + `has_documentation=false` → “Belum ada dokumentasi periode ini.”
- Warna harus disertai teks/angka, bukan warna saja: hijau untuk 5/5, amber untuk
  partial, abu-abu untuk 0/5.

**Filter dan navigasi**

- Hanya dropdown tahun (tidak ada bulan karena 12 kolom sudah tampil).
- Summary selalu menampilkan semua Master Project untuk tahun tersebut, termasuk yang
  tidak punya dokumentasi. Ini konsisten dengan aturan PDOC “semua project selalu
  tampil”.
- Tahun project hanya konteks; jangan memfilter project berdasarkan
  `master_projects.year` kecuali Owner memutuskan lain.
- Summary tidak perlu PDF pada scope ini; jika diminta, menjadi fitur terpisah.

**Responsif**

- Tabel 13 kolom dibungkus `overflow-x-auto`; kolom nama sticky.
- `min-w` sekitar 1.200–1.300 px; sel bulan cukup untuk `5/5`.
- Di mobile, scroll horizontal lebih baik daripada memecah 12 bulan menjadi kartu.
- Header bulan memakai singkatan `Jan`…`Des`; `title`/`aria-label` memuat nama lengkap.

### E.3 Sidebar dan navigasi

PDOC saat ini satu item top-level. Untuk menampung dua halaman, rekomendasi:

```text
Project Documentation
├── Dokumentasi        /dashboard/project-documentation
└── Summary Report     /dashboard/project-documentation/summary
```

- Ubah item tunggal menjadi accordion dua submenu, mengikuti pola CST.
- Accordion otomatis terbuka pada kedua route PDOC.
- `getInitialSidebarAccordionState` dan test sidebar perlu state
  `projectDocumentationOpen`.
- Layout root `/dashboard/project-documentation/layout.tsx` tetap menjadi guard
  `DOCUMENTATION_VIEW` untuk kedua halaman.
- Alternatif tanpa accordion: tambah item “Summary Report” langsung di Core Enterprise.
  Accordion lebih rapi karena kedua halaman satu domain.

### E.4 Aksesibilitas

- Label filter eksplisit: “Tahun Dokumentasi”, “Bulan”.
- Summary: `<th scope="col">` untuk bulan; `<th scope="row">` untuk nama project.
- Status kelengkapan tidak hanya warna; teks `n/5` selalu terlihat.
- `title`/`aria-label` menyebut bulan dan arti `n/5`.
- Filter disabled saat editing harus disertai teks alasan, bukan hanya `disabled`.

---

## F. File yang Terdampak

### F.1 Database dan schema

| File | Dampak |
|---|---|
| `src/lib/pg/schema.ts` | Tambah `year`, `month`; ganti unique index; tambah check/index |
| `drizzle/0019_project_documentation_period.sql` | **Baru** — migration forward-only + backfill |
| `drizzle/meta/0019_snapshot.json` | **Baru** — snapshot Drizzle |
| `drizzle/meta/_journal.json` | Entry migration baru |

### F.2 Domain library

| File | Dampak |
|---|---|
| `src/lib/project-documentation/repository.ts` | Semua fungsi baca/tulis memakai periode; upsert composite; query summary |
| `src/lib/project-documentation/service.ts` | Validasi periode; signature list/update baru; service summary |
| `src/lib/project-documentation/schema.ts` | Parser periode; body PUT tetap tanpa periode |
| `src/lib/project-documentation/pdoc-draft.ts` | DTO + `year`/`month`; edit state menyimpan periode; helper summary |
| `src/lib/project-documentation/constants.ts` | Label bulan (opsional) |

### F.3 API

| File | Dampak |
|---|---|
| `src/app/api/project-documentation/route.ts` | GET wajib query `year`/`month`; response periodik |
| `src/app/api/project-documentation/[projectId]/route.ts` | Lama; hapus atau 400 (tidak lagi menjadi kontrak utama) |
| `src/app/api/project-documentation/[projectId]/[year]/[month]/route.ts` | **Baru** — PUT upsert per periode |
| `src/app/api/project-documentation/summary/route.ts` | **Baru** — GET summary tahunan |
| `src/app/api/project-documentation/_helpers.ts` | Parser/validasi periode; error mapping |
| `src/app/api/project-documentation/_helpers.test.ts` | Test periode |

### F.4 UI

| File | Dampak |
|---|---|
| `src/app/dashboard/project-documentation/page.tsx` | Meneruskan periode awal / searchParams |
| `src/app/dashboard/project-documentation/summary/page.tsx` | **Baru** — halaman Summary |
| `src/components/dashboard/project-documentation/ProjectDocumentationPage.tsx` | Filter, fetch per periode, URL state, PDF filter line, edit period |
| `src/components/dashboard/project-documentation/PdocTable.tsx` | Caption periode; key tetap per project; tidak perlu kolom baru |
| `src/components/dashboard/project-documentation/PdocSummaryPage.tsx` | **Baru** — client summary |
| `src/components/dashboard/project-documentation/PdocSummaryTable.tsx` | **Baru** — tabel 12 bulan |
| `src/components/dashboard/project-documentation/pdocExportPdf.ts` | Judul/filter line mencantumkan periode |
| `src/components/dashboard/DashboardSidebar.tsx` | Accordion/submenu PDOC + Summary |
| `src/components/dashboard/projectDocumentationSidebar.test.ts` | Test route/visibilitas/accordion |

### F.5 Test dan dokumentasi

| File | Dampak |
|---|---|
| `src/lib/project-documentation/schema.test.ts` | Periode valid/invalid; body tanpa periode |
| `src/lib/project-documentation/repository.test.ts` | Query per periode, upsert composite, summary |
| `src/lib/project-documentation/service.test.ts` | Permission, periode, isolasi Jan/Feb |
| `src/lib/project-documentation/pdoc-draft.test.ts` | DTO/edit state periode; label summary |
| `src/components/dashboard/projectDocumentationSidebar.test.ts` | Dua route/accordion |
| `docs/design/PDOC_P3_TECHNICAL_DESIGN.md` | Delta desain; dokumen existing perlu ditandai superseded pada bagian periode |
| `docs/audit/05`, `06`, `07`, `docs/development/*` | Sinkronisasi setelah implementasi, bukan pada P2 ini |

### F.6 Yang tidak perlu diubah

- `src/lib/auth/permissions.ts` — permission tetap.
- Layout guard PDOC — root layout sudah mencakup summary.
- Tabel Master Project, MSL, CST, MKS, KM — tidak disentuh.
- PDF 7 kolom — struktur kolom tetap; hanya konteks periode ditambahkan.

---

## G. Test Plan dan Acceptance Criteria

### G.1 Database/migration

1. Apply `0018` + `0019` pada database kosong; schema, index, check, dan journal cocok.
2. Apply `0019` pada salinan database yang sudah punya `0018` dan baris existing;
   backfill mengisi semua baris, tidak ada `NULL`.
3. Insert dua baris project yang sama untuk bulan berbeda → **berhasil**.
4. Insert baris duplikat `(project_id, year, month)` → **unique violation**.
5. Insert `month=0`/`13` → **CHECK violation**.
6. Hapus Master Project yang punya dokumentasi → **RESTRICT/409**.
7. Pastikan tidak ada data lama yang hilang; bandingkan jumlah baris sebelum/sesudah.

### G.2 API/service

1. GET tanpa periode → 400.
2. GET Januari dan Februari mengembalikan baris yang berbeda untuk project yang sama.
3. Project tanpa dokumentasi tetap muncul di kedua periode.
4. PUT Januari tidak mengubah Februari.
5. PUT periode yang sama dua kali → idempoten; timestamp tidak berubah jika nilai sama.
6. PUT body berisi `year`/`month`/`project_id` → 400.
7. PUT project/ periode invalid → 400/404 sesuai kasus.
8. Summary tahun berisi 12 bulan; `filled_weeks` 0–5; semua Master Project muncul.
9. Empat role: View semua; Manage hanya Admin, Head Office, Project; Management 403
   untuk PUT.
10. `Cache-Control: no-store` pada semua response.

### G.3 UI/manual

1. Filter tahun/bulan memuat periode yang benar dan URL ikut berubah.
2. Search bekerja dalam periode aktif.
3. Edit Januari tidak bisa tersimpan ke Februari.
4. PDF menyebut periode dan hanya memuat baris yang terlihat.
5. Summary menampilkan 5/5, 3/5, 0/5 dengan benar; project tanpa dokumen tetap tampil.
6. Sidebar dua halaman aktif/accordion benar untuk empat role.
7. Desktop dan mobile: tabel detail dan summary dapat di-scroll horizontal.

### G.4 Acceptance criteria

- Satu project dapat memiliki dokumentasi Januari dan Februari pada tahun yang sama.
- Tidak ada duplikasi project-periode.
- Existing documentation tidak hilang setelah migration.
- Halaman detail tidak pernah mencampur data antarperiode.
- Summary dapat menjawab “berapa minggu yang terisi per bulan” untuk semua project.
- Tidak ada perubahan permission atau perilaku Master Project selain RESTRICT yang sudah
  ada.
- Static checks dan runtime empat role PASS sebelum status dinaikkan.

---

## H. Risiko dan Keputusan yang Dibutuhkan

### H.1 Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `year` dokumentasi berbeda dari `master_projects.year` | Data membingungkan; filter dan summary salah tafsir | Putuskan semantik; label UI “Tahun Dokumentasi”; jangan gabungkan dengan `project_year` |
| Backfill salah periode | Dokumentasi existing masuk bulan/tahun yang salah | Review Owner; pilih `created_at` atau tahun project; uji salinan DB |
| Route lama masih dipakai | PUT lama gagal setelah deploy | Hapus/400 route lama; deploy client bersamaan |
| Filter periode di `WHERE` | Project tanpa dokumen hilang | Letakkan kondisi periode di `ON` left join |
| Migration `NOT NULL` saat API lama hidup | Write PDOC gagal sementara | Maintenance window atau expand/contract dua tahap |
| Summary N+1 | Halaman lambat | Satu query tahunan + normalisasi 12 bulan di service |
| PDF tidak menyebut periode | PDF lama terlihat seperti data periode lain | Tambahkan periode di filter line/judul |
| Nama `year` ambigu | Developer salah memakai `master_projects.year` | Dokumentasikan `year` = periode; `project_year` = tahun project; review query |
| Edit state tidak menyimpan periode | Draft tersimpan ke periode yang salah | Simpan `year`/`month` di `PdocEditingState` |
| Summary 0/5 vs tidak ada baris | Salah tafsir kelengkapan | Gunakan `has_documentation` untuk tooltip; teks `0/5` |

### H.2 Keputusan Owner

1. **Semantik tahun:** apakah `year` dokumentasi bebas (bisa berbeda dari tahun
   project), atau wajib sama dengan `master_projects.year`?
   **Rekomendasi:** bebas, karena requirement menyebut rekap bulanan lintas periode;
   tampilkan `project_year` hanya sebagai konteks.
2. **Backfill:** turunkan periode existing dari `created_at` atau dari tahun project?
   **Rekomendasi:** `created_at` dalam `Asia/Jakarta`, kecuali data existing memang
   mewakili tahun project.
3. **Summary:** tampilkan semua Master Project atau hanya project yang punya
   dokumentasi pada tahun itu?
   **Rekomendasi:** semua Master Project, dengan `0/5` untuk yang belum ada.
4. **Tampilan 0/5:** angka `0/5` atau `—` untuk periode tanpa baris?
   **Rekomendasi:** `0/5` muted + tooltip; angka konsisten untuk completeness.
5. **Navigasi:** accordion PDOC dengan dua submenu, atau item Summary terpisah?
   **Rekomendasi:** accordion dua submenu.
6. **Zero-downtime:** apakah perlu migration dua tahap? **Rekomendasi:** satu `0019`
   dengan maintenance window kecil, kecuali ada requirement uptime khusus.

---

## I. Rekomendasi Langkah Selanjutnya

### I.1 Urutan yang disarankan

1. **Owner review dokumen ini** dan putuskan §H.2.
2. **P3 delta** (bukan P3 penuh): kunci kontrak GET/PUT/summary, nama kolom, backfill,
   dan wireframe final.
3. **P4 revisi**:
   - migration `0019` + schema;
   - repository/service/schema;
   - route GET/PUT/summary;
   - UI filter + summary + sidebar;
   - test dan dokumentasi.
4. **Verifikasi** pada database scratch: migration, isolasi periode, summary, RBAC,
   PDF, dan empat role.
5. **Owner visual test** sebelum commit/push/deploy.

### I.2 Apakah perlu mundur ke P3?

**Ya, tetapi hanya P3 delta.** Alasan:

- schema dan migration berubah;
- kontrak API berubah secara breaking;
- UI mendapat halaman baru dan filter baru;
- ada keputusan data existing yang tidak boleh ditebak.

Tidak perlu mengulang P2 penuh karena baseline sudah dipetakan di sini. Implementasi
boleh tetap berada di P4 sebagai revisi setelah delta P3 disetujui; jangan langsung
mengubah kode dari dokumen ini.

### I.3 Status artefak

- Dokumen ini: **selesai, menunggu review Owner**.
- Source code: **tidak berubah**.
- Migration: **tidak dijalankan**.
- Database: **tidak diubah**.
- PDOC V1: status tetap `IMPLEMENTED BUT NOT FULLY VERIFIED`; requirement bulanan
  belum menjadi bagian dari implementasi V1.
