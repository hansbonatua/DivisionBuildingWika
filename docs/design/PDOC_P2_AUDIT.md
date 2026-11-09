# P2 — Existing System Audit: Project Documentation (PDOC)

**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P2 — Existing System Audit (read-only)
**Tanggal:** 2026-11-09
**Baseline:** `main` @ `5636113` (CST v1 sudah ter-commit)
**Status:** Audit selesai — menunggu review Owner/ChatGPT
**P3:** Belum dimulai

---

## 0. Ruang Lingkup dan Metode

Dokumen ini memetakan pola existing yang dapat di-reuse untuk modul **Project
Documentation (PDOC)**. Audit dilakukan **hanya dengan membaca source code**.
Tidak ada source, schema, migration, database, API, UI, atau runtime yang
diubah/dijalankan. Satu-satunya artefak fase ini adalah dokumen ini.

**Temuan awal:** belum ada implementasi PDOC di repo. Pencarian
`project_documentation`, `projectDocumentation`, `documentation_week`, dan
`DOCUMENTATION_` menghasilkan **0 match**. PDOC sepenuhnya greenfield; yang
tersedia adalah pola dari Master Project, MSL, CST, MKS, dan KM.

Catatan baseline: CST sudah masuk ke commit `5636113`, sehingga nomor baris CST
di dokumen ini stabil terhadap HEAD. Working tree hanya berisi dokumen audit ini;
tidak ada source code yang diubah oleh fase P2.

### Ringkasan aturan P1 yang menjadi acuan audit

| Aspek | Aturan final P1 |
|---|---|
| Sumber baris | **Semua** Master Project; tidak bisa tambah/hapus project dari PDOC |
| Kolom | Nama Proyek, Minggu 1–5 (link URL), Catatan, Aksi |
| Mekanisme UI | **100% inline table editing**, tanpa modal |
| Audit trail | Setiap link minggu mencatat `updated_by` dan `updated_at` |
| Kondisi kosong | Link belum ada ditampilkan `—` |
| RBAC | Admin, Head Office, Project = manage; Management = read-only |
| Tambahan | Export PDF |

---

## A. Executive Summary

### A.1 Pola yang dapat di-reuse

| Kebutuhan PDOC | Pola existing | Sumber | Kecocokan |
|---|---|---|---|
| Mengambil seluruh Master Project + nama PIC | `listMasterProjects()` dengan `innerJoin(users)` | `src/lib/master-project/repository.ts:31-78` | **Tinggi** — query dan urutan sudah stabil |
| Baris tetap ada walau belum punya data | Master Project sebagai driving table, data lain di-left-join | `src/lib/msl/service.ts:184-210`; `src/lib/engineering-database/summary.ts:52-75` | **Tinggi** — PDOC harus menampilkan project tanpa dokumentasi |
| Inline editing satu baris pada satu waktu | State `editing` global + `initial` untuk dirty check | `MslEngineeringPage.tsx:68-69, 253-410`; `MslTable.tsx:4-16` | **Tinggi** — inti mekanisme yang diminta |
| Inline editing tanpa create/delete baris | MSL sudah memakai baris Master Project, bukan record baru | `MslTable.tsx:97-130` | **Sangat tinggi** — identik dengan PDOC |
| Audit kolom `updated_by`/`updated_at` | Konvensi tabel enterprise + alias join users | `src/lib/pg/schema.ts:596-682`; `calculation-sheet-template/repository.ts:69-99` | **Tinggi** — tinggal diperbanyak per minggu |
| Menampilkan “siapa dan kapan” | Blok `Dibuat`/`Diubah` dengan nama + tanggal | `KnowledgeTable.tsx:458-484` | **Sedang-tinggi** — perlu dipadatkan untuk 5 kolom |
| Link URL di dalam sel | `target="_blank"`, `rel="noopener noreferrer"`, truncate + title | `CstTable.tsx:54-68`; `MetodeKerjaTable.tsx:173-186` | **Tinggi** — bisa dipakai apa adanya |
| Validasi URL http(s) ≤ 2048, kosong → `NULL` | Zod + CHECK database | `src/lib/calculation-sheet-template/schema.ts:10-58`; `src/lib/pg/schema.ts:959-965` | **Tinggi** — persis kebutuhan link minggu |
| API actor sesi + error mapping + `no-store` | Plumbing CST/MKS | `src/app/api/calculation-sheet-template/_helpers.ts:1-145` | **Tinggi** — paling lengkap |
| RBAC feature-level + super-rule Admin | Permission registry | `src/lib/auth/permissions.ts:24-127` | **Tinggi** |
| Export PDF tabel | jsPDF + autotable A4 landscape | `cstSummaryExportPdf.ts:41-167` | **Tinggi** — paling dekat (flat table) |
| Guard halaman berlapis | Layout redirect + `canManage` dari server | `src/app/dashboard/calculation-sheet-template/layout.tsx:8-19`; `[kategori]/page.tsx:17-25` | **Tinggi** |
| Sidebar accordion / menu module | `calculationSheetMenu` + accordion | `DashboardSidebar.tsx:251-289, 837-868` | **Sedang** — PDOC satu halaman, bukan 7 kategori |

### A.2 Yang perlu dibuat baru

| Kebutuhan | Kondisi existing | Dampak |
|---|---|---|
| Tabel `project_documentations` dengan 5 link + audit per minggu | Belum ada | 1 migration baru |
| Draft 5 URL + catatan dalam satu baris | MSL hanya 3 komponen + remarks; CST hanya 1 URL | Tipe draft dan validasi baru |
| Audit per minggu (bukan per record) | CST hanya satu `updated_by`/`updated_at` per baris | 10 kolom audit tambahan + logika diff server |
| Upsert berdasarkan `project_id` | CST selalu POST create; MSL POST/PATCH per assessment | Route dan repository baru |
| Permission `DOCUMENTATION_VIEW`/`DOCUMENTATION_MANAGE` | Belum ada | 2 entry permission + access helper |
| PDF 5 kolom link | PDF CST 6 kolom; MKS 5 kolom | Exporter baru, pola reuse |
| Halaman dan sidebar PDOC | Belum ada | 1 page + 1 layout + menu |

### A.3 Kesimpulan

1. **Sumber baris dan inline editing tidak perlu dirancang dari nol.** MSL sudah
   menyelesaikan pola yang paling dekat: baris berasal dari Master Project,
   diedit satu per satu, tanpa create/delete project, dan error tampil per baris.
2. **Yang benar-benar baru hanya skema per-minggu, audit per-minggu, dan
   upsert.** Tidak ada kebutuhan modal, upload file, atau pemilihan project.
3. **Rekomendasi skema: satu tabel flat** dengan `project_id` unik dan lima
   pasangan kolom URL/updater/timestamp. Untuk lima minggu yang jumlahnya tetap,
   flat table memberi query satu baris per project, PDF langsung, dan upsert
   idempoten tanpa tabel header-detail.
4. **Rekomendasi API: `GET` daftar + `PUT` upsert per `project_id`.** Tidak perlu
   `POST` atau `DELETE` karena baris berasal dari Master Project. Menghapus link
   cukup mengosongkan URL.
5. **Estimasi reuse tinggi (±75%)**; pekerjaan baru terkonsentrasi di schema,
   draft 5 minggu, service audit diff, dan exporter PDF.

---

## B. Audit A — Master Project & Tabel Inline

### B.1 Cara existing mengambil daftar Master Project

**Sumber data kanonik.** Tabel `master_projects` didefinisikan di
`src/lib/pg/schema.ts:437-475`:

- `id`, `name`, `location`, `year`;
- `pic_user_id` wajib, FK ke `users` dengan `ON DELETE no action`;
- `created_by`, `created_at`, `updated_at`;
- unique index `(lower(btrim(name)), lower(btrim(location)))`;
- index nama/lokasi trigram untuk pencarian.

**Query daftar project.** `listMasterProjects()`
(`src/lib/master-project/repository.ts:47-78`) memakai projection tetap
`masterProjectColumns` (`:31-40`) dan:

```ts
.select(masterProjectColumns)
.from(masterProjects)
.innerJoin(users, eq(masterProjects.picUserId, users.id))
```

- `users` di-join untuk mendapatkan `picName` (`:31-40, 54-56`).
- Urutan: `name`, `location`, `id` (`:65-77`) — deterministik.
- Pencarian opsional `q` memakai `ILIKE` pada nama/lokasi (`:58-63`).

**Konsumsi oleh MSL.** MSL membuktikan pola “Master Project sebagai tulang
punggung baris”:

- `listMasterProjectsByYear(year)` mengambil `id/name/location/year` dari
  `master_projects` dan mengurutkan nama (`src/lib/msl/repository.ts:129-141`).
- `listAssessmentsByYear(year, month)` mengambil **semua** assessment periode
  dalam satu query, lalu di-join ke Master Project (`:145-161`).
- `getMslYearView()` menjalankan projects + assessments + note secara paralel
  dengan `Promise.all` (`src/lib/msl/service.ts:197-203`), lalu memetakan
  assessment ke project lewat `Map` (`:205-221`) — **bukan query per project**.
- Baris tanpa assessment tetap muncul dengan `assessment: null` (`:214-220`).

**Konsumsi oleh Engineering Database Summary.** Ringkasan dibangun dari **semua**
Master Project; project tanpa record tetap tampil dengan sel kosong
(`src/lib/engineering-database/summary.ts:52-75`). Ini pola yang sama untuk PDOC:
project tanpa dokumentasi tetap harus tampil.

**Implikasi untuk PDOC.** Jangan memakai endpoint pilihan project
(`engineering-database` project options) karena PDOC tidak memilih satu project;
PDOC menampilkan **seluruh** Master Project. Gunakan Master Project sebagai
driving table dan left-join dokumentasi:

```
master_projects (all rows)
  LEFT JOIN project_documentations ON project_id = master_projects.id
ORDER BY master_projects.name, master_projects.id
```

Hasilnya tepat satu baris per project, termasuk project yang belum punya
dokumentasi. Tidak ada N+1 dan tidak ada endpoint `project-options`.

**Catatan filter tahun.** P1 menyebut “semua project dari Master Project”, bukan
per tahun. `master_projects.year` tersedia (`schema.ts:443`), tetapi MSL memakai
filter tahun karena periodenya tahunan. PDOC **tidak boleh** menambahkan filter
tahun tanpa keputusan P1 baru; lihat OQ-05.

### B.2 State inline editing untuk lima kolom minggu

**Pola MSL yang menjadi acuan.** MSL memakai satu state edit global, bukan state
per baris:

```ts
// MslEngineeringPage.tsx:68-70
const [editing, setEditing] = useState<MslEditingState | null>(null);
const [createDrafts, setCreateDrafts] = useState<Record<string, MslDraft>>({});
const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
```

- `editing` menyimpan `{ projectId, assessmentId, draft, initial, error }`.
- Hanya **satu** baris tersimpan boleh diedit; baris lain disabled selama edit
  terbuka (`MslTable.tsx`, komentar `:4-16` dan `anotherRowEditing`).
- `initial` dipakai untuk deteksi dirty dan pembatalan.
- `busyProjectId` memblokir mutasi lain selama request.
- Server response menggantikan baris; tidak ada optimistic update
  (`MslEngineeringPage.tsx:253-410`).

**Pola CST untuk baris yang sudah ada.** CST memisahkan state edit dan create
(`CalculationSheetTemplatePage.tsx:66-67`), lalu:

| Handler | Baris | Perilaku |
|---|---|---|
| `startEdit` | `:191` | set `{ id, draft, initial, error }` |
| `saveEdit` | `:236` | validasi → `PUT` → ganti baris dari response |
| `startCreate` | `:200` | draft create |
| `saveCreate` | `:287` | `POST` → append |
| `deleteRow` | `:331` | konfirmasi → `DELETE` |

PDOC tidak memerlukan `creating` atau `deleteRow` karena baris project tidak
boleh ditambah/dihapus dari modul ini. Yang diadopsi adalah **satu `editing`
global** dan pola `initial`/`dirty`/`busy`.

**Rekomendasi state PDOC.** Lima minggu disimpan sebagai satu draft, bukan lima
state edit terpisah:

```ts
type PdocDraft = {
  weeks: [string, string, string, string, string]; // URL atau ""
  catatan: string;
};

type PdocEditingState = {
  projectId: string;
  draft: PdocDraft;
  initial: PdocDraft;
  error: string | null;
};

const [editing, setEditing] = useState<PdocEditingState | null>(null);
const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
```

Alasannya:

1. **Satu baris = satu unit edit.** User membuka Edit pada baris project, melihat
   lima input URL + catatan, lalu Simpan/Batal. Ini persis pola CST/MSL.
2. **Tidak ada 25 state.** Lima input tidak perlu state `editingWeek1`,
   `editingWeek2`, dan seterusnya; satu `draft.weeks` cukup.
3. **Dirty check murni.** Helper `draftEquals(initial, draft)` dapat diuji tanpa
   DOM, seperti `cst-draft.ts`/`msl-draft.ts`.
4. **Audit hanya untuk minggu yang berubah.** Saat Simpan, server membandingkan
   `draft.weeks[i]` dengan nilai tersimpan; hanya minggu yang berubah yang
   menerima `updated_by`/`updated_at` baru.

**Render tabel.** Kolom:

| # | Header | Mode baca | Mode edit |
|---|---|---|---|
| 1 | Nama Proyek | nama + lokasi/ tahun (opsional) | teks read-only |
| 2 | Minggu 1 | link atau `—`; metadata di bawahnya | `<input type="url">` |
| 3 | Minggu 2 | idem | idem |
| 4 | Minggu 3 | idem | idem |
| 5 | Minggu 4 | idem | idem |
| 6 | Minggu 5 | idem | idem |
| 7 | Catatan | clamp 2 baris + `title` | `<textarea rows={2}>` |
| 8 | Aksi | `Edit` (manage) | `Simpan` + `Batal` |

Saat satu baris masuk mode edit, baris lain tetap read-only dan tombolnya
disabled. `busyProjectId` memblokir seluruh mutasi lain. Read-only role tidak
menerima input, tombol Edit, atau Simpan/Batal.

**Kenapa bukan edit per sel?** P1 meminta “tabel inline editing” dan satu kolom
Aksi; menyimpan per sel akan menambah 5 titik simpan dan 5 status error dalam
satu baris. Simpan per baris lebih sederhana dan konsisten dengan CST/MSL. Jika
Owner ingin setiap sel langsung tersimpan, gunakan `PATCH` per minggu (lihat
§D.5), tetapi itu keputusan UX P3, bukan default audit ini.

### B.3 Audit trail: siapa dan kapan

**Pola data existing.** CST menyimpan satu `updated_by`/`updated_at` per baris
(`src/lib/pg/schema.ts:919-947`) dan repository melakukan alias join:

```ts
// calculation-sheet-template/repository.ts:69-99
const updatedUser = alias(users, "updated_user");
...
updatedById: calculationSheetTemplates.updatedBy,
updatedByName: updatedUser.name,
...
.leftJoin(updatedUser, eq(calculationSheetTemplates.updatedBy, updatedUser.id))
```

Service mengubahnya menjadi DTO:

```ts
// calculation-sheet-template/service.ts:196-199
updated_by: row.updatedById
  ? { user_id: row.updatedById, name: row.updatedByName ?? "—" }
  : null,
updated_at: row.updatedAt.toISOString(),
```

MSL menyimpan `created_by`/`updated_by` langsung di row assessment dan
men-set `updatedBy: actor.id` pada setiap update
(`src/lib/msl/service.ts:297-313`). Tabel MSL memakai konvensi `created_by`
NOT NULL + `ON DELETE no action`, `updated_by` NOT NULL + `no action`
(`src/lib/pg/schema.ts:596-682`).

**Pola tampilan.** Knowledge Management menampilkan blok dua baris:

```
Dibuat  {nama}
        {tanggal}
Diubah  {nama}
        {tanggal}
```

(`KnowledgeTable.tsx:458-484`). Ini terlalu tinggi jika diulang lima kali dalam
satu baris PDOC. Untuk PDOC, tampilkan metadata secara **kompak di bawah link
masing-masing**:

```
https://...
Diperbarui Budi · 09 Nov 2026 14:30
```

atau satu baris kecil dengan `title` berisi timestamp lengkap. Jika link kosong,
cukup `—`; metadata tidak perlu ditampilkan.

**Rekomendasi audit PDOC.** Setiap minggu memiliki pasangan sendiri:

- `week_n_updated_by` (FK `users.id`, nullable, `ON DELETE set null`);
- `week_n_updated_at` (`timestamptz`, nullable).

Aturan penulisan:

1. Hanya minggu yang **URL-nya berubah** yang metadata-nya diperbarui.
2. Menyimpan baris tanpa mengubah minggu lain tidak boleh menggeser timestamp
   minggu tersebut.
3. Mengosongkan link dihitung sebagai perubahan: URL menjadi `NULL` dan
   `updated_by`/`updated_at` minggu itu diperbarui. Dengan begitu jejak “siapa
   yang mengosongkan” tetap ada. Jika produk ingin metadata ikut dihapus,
   lihat OQ-03.
4. `catatan` memakai audit level baris (`updated_by`/`updated_at`) karena P1
   tidak meminta audit per catatan.
5. Actor selalu dari sesi server; `updated_by` tidak pernah diterima dari body.

**Query nama updater tanpa N+1.** Ada dua pilihan:

- **Alias join lima kali** (`week1User`, `week2User`, …) dalam query yang sama
  dengan Master Project. Satu query, tetapi projection menjadi lebar.
- **Bulk lookup**: ambil lima UUID updater dari hasil query, lalu satu
  `SELECT id, name FROM users WHERE id IN (...)` dan map di service. Dua query
  total, lebih mudah dibaca dan diuji, tetap tanpa N+1. Pola bulk user lookup
  sudah dipakai KM (`knowledge-management/repository.ts:108-176`).

Rekomendasi: **bulk lookup** untuk keterbacaan; alias join hanya jika profiling
menunjukkan kebutuhan.

---

## C. Audit C — Rekomendasi Skema Database (Flat vs Child)

### C.1 Opsi 1 — Flat satu tabel

```
project_documentations
├── id                      uuid PK
├── project_id              uuid NOT NULL UNIQUE → master_projects.id
├── week_1_url              text NULL
├── week_1_updated_by       uuid NULL → users.id
├── week_1_updated_at       timestamptz NULL
├── week_2_url              text NULL
├── week_2_updated_by       uuid NULL → users.id
├── week_2_updated_at       timestamptz NULL
├── week_3_url              text NULL
├── week_3_updated_by       uuid NULL → users.id
├── week_3_updated_at       timestamptz NULL
├── week_4_url              text NULL
├── week_4_updated_by       uuid NULL → users.id
├── week_4_updated_at       timestamptz NULL
├── week_5_url              text NULL
├── week_5_updated_by       uuid NULL → users.id
├── week_5_updated_at       timestamptz NULL
├── catatan                 text NULL
├── created_by              uuid NOT NULL → users.id
├── updated_by              uuid NULL → users.id
├── created_at              timestamptz NOT NULL
└── updated_at              timestamptz NOT NULL
```

Constraint yang disarankan:

| Nama | Definisi | Alasan |
|---|---|---|
| PK | `id` | konsisten seluruh tabel |
| unique | `project_id` | satu baris dokumentasi per project |
| FK | `project_id → master_projects.id ON DELETE RESTRICT` | dokumentasi/audit tidak hilang diam-diam; konsisten dengan KM, Engineering DB, MSL (`schema.ts:281-283, 492-494, 600-602`) |
| FK | `week_n_updated_by → users.id ON DELETE SET NULL` | user yang dihapus tidak memblokir baris |
| CHECK | `week_n_url IS NULL OR (week_n_url ~ '^https?://' AND length(week_n_url) <= 2048)` | sama dengan CST |
| CHECK | `catatan IS NULL OR length(catatan) <= 2000` | sama dengan CST/MKS |
| index | `project_id` unik | lookup/upsert dan join |

Catatan: `updated_at` minggu **tidak** perlu `NOT NULL`; belum pernah ada link
berarti belum ada timestamp. `created_by` dipakai saat baris pertama kali dibuat
(link pertama atau catatan pertama), `updated_by` menandai perubahan catatan
terakhir.

### C.2 Opsi 2 — Child table per minggu

```
project_documentations
├── id
├── project_id       → master_projects.id
├── week_number      integer 1..5
├── url              text NULL
├── updated_by       uuid NULL
├── updated_at       timestamptz NULL
└── UNIQUE(project_id, week_number)
```

`catatan` tidak punya tempat alami di tabel ini. Pilihan yang muncul:

1. simpan `catatan` di setiap baris minggu → duplikasi dan risiko konflik;
2. buat tabel header `project_documentations` + child
   `project_documentation_weeks` → dua tabel baru;
3. simpan catatan hanya di `week_number = 1` → menyalahi makna tabel.

Untuk memenuhi kolom Catatan per project, opsi child yang benar adalah
**header-detail dua tabel**, bukan satu tabel child seperti di atas.

### C.3 Perbandingan

| Kriteria | Flat 1 tabel | Child per minggu |
|---|---|---|
| Jumlah tabel | 1 | 1 + header (catatan) atau catatan duplikat |
| Baris per project | 1 | 5 (hanya minggu yang diisi, jika lazy) |
| Query daftar | 1 left join, 1 baris/project | 1 left join + grouping 5 baris/project |
| N+1 | Tidak ada | Tidak ada **jika** di-bulk dan di-group; mudah jatuh ke N+1 jika per project |
| Catatan per project | Natural | Perlu header/duplikasi |
| Upsert | 1 statement `ON CONFLICT (project_id)` | 1 upsert per minggu, atau transaksi 5 baris |
| Audit per minggu | 3 kolom × 5, eksplisit | Natural: `updated_by/at` per row |
| Kongruensi dua editor minggu berbeda | Satu baris; perlu diff agar tidak saling menimpa | Alami: baris minggu berbeda |
| Minggu bertambah/berubah | Migration + ubah UI | Tambah `week_number`, UI dinamis |
| Riwayat perubahan | Hanya last-touch | Hanya last-touch juga (bukan history table) |
| PDF | Langsung dari DTO flat | Perlu map 5 baris ke 5 kolom |
| Kerumitan kode | Rendah-sedang | Sedang-tinggi |

### C.4 Rekomendasi: **Flat satu tabel**

Untuk konteks P1, flat table adalah pilihan terbaik:

1. **Jumlah minggu tetap lima.** Tidak ada kebutuhan minggu dinamis, jadi
   normalisasi child tidak memberi keuntungan yang sebanding dengan biaya.
2. **Catatan adalah milik project, bukan minggu.** Flat menyimpan catatan di
   baris yang sama; child memaksa header-detail atau duplikasi.
3. **Satu baris per project membuat UI dan PDF langsung.** Hasil query sudah
   berbentuk baris tabel; tidak ada grouping 5 child row sebelum render.
4. **Upsert sederhana dan idempoten.** `PUT /api/project-documentation/[projectId]`
   dengan `ON CONFLICT (project_id) DO UPDATE`; tidak perlu transaksi multi-row.
5. **Audit per minggu tetap terpenuhi.** Lima pasang kolom
   `updated_by`/`updated_at` memang verbose, tetapi eksplisit dan mudah
   di-query.
6. **Tidak ada N+1.** Satu query Master Project + left join dokumentasi; nama
   updater di-resolve dengan satu bulk lookup.

**Kapan child lebih baik?** Jika P3 mengubah requirement menjadi minggu
dinamis, dokumentasi per jenis dokumen, atau riwayat lengkap per minggu
(bukan sekadar last-touch). Untuk kebutuhan sekarang, itu over-engineering.

### C.5 Yang sengaja tidak dibuat

- **Tabel master minggu** — lima minggu adalah konstanta aplikasi, bukan data
  yang dapat diedit user.
- **JSONB `weeks`** — sulit divalidasi dengan CHECK, tidak memberi tipe Drizzle
  yang kuat, dan mempersulit query/PDF. Flat columns lebih eksplisit.
- **Soft delete** — P1 tidak meminta; link dihapus dengan mengosongkan URL.
- **History/version table** — audit trail P1 hanya “siapa dan kapan terakhir”,
  bukan riwayat seluruh perubahan.
- **`sort_order`** — urutan mengikuti nama Master Project; tidak ada reorder.
- **Upload/blob** — P1 hanya link URL.

### C.6 Migration

Journal saat ini berisi **18 entry** (`idx 0–17`); entry terakhir adalah
`0017_calculation_sheet_templates` yang sudah ada di repo. Status apply-nya ke
database **tidak diverifikasi** oleh audit read-only ini. PDOC harus menjadi
migration berikutnya, yaitu **`0018_project_documentations`**, dan **tidak boleh**
memakai ulang nomor 0017.

- Generate lewat `npx drizzle-kit generate` setelah `schema.ts` diubah; jangan
  menulis `_journal.json` manual.
- Sifat aditif: `CREATE TABLE` + constraint/index.
- Rollback: `DROP TABLE project_documentations;`.
- Apply hanya setelah otorisasi Owner dan setelah status migration 0017 jelas.

---

## D. Audit D — RBAC & API

### D.1 Permission baru

Tambahkan dua entry di `src/lib/auth/permissions.ts`:

```ts
// dekat CALCULATION_SHEET_* (baris 50-51)
DOCUMENTATION_VIEW: "DOCUMENTATION_VIEW",
DOCUMENTATION_MANAGE: "DOCUMENTATION_MANAGE",
```

Mapping non-Admin mengikuti P1:

```ts
// dekat mapping CALCULATION_SHEET_* (baris 110-111)
DOCUMENTATION_VIEW: [HEAD_OFFICE_ROLE, PROJECT_ROLE, MANAGEMENT_ROLE],
DOCUMENTATION_MANAGE: [HEAD_OFFICE_ROLE, PROJECT_ROLE],
```

| Permission | Admin | Head Office | Project | Management |
|---|---|---|---|---|
| `DOCUMENTATION_VIEW` | ✅ (super-rule) | ✅ | ✅ | ✅ |
| `DOCUMENTATION_MANAGE` | ✅ (super-rule) | ✅ | ✅ | — |

Admin otomatis lolos lewat `hasPermission()` (`permissions.ts:132-138`), jadi
tidak perlu dimasukkan ke array. Management hanya membaca. Tidak ada permission
`DELETE` terpisah karena PDOC tidak menghapus baris project.

**Catatan penamaan:** `DOCUMENTATION_*` sesuai permintaan. Jika di masa depan ada
modul dokumentasi lain, namespace ini bisa ambigu; alternatifnya
`PROJECT_DOCUMENTATION_*`. Untuk P3, gunakan nama yang diminta agar konsisten
dengan requirement.

### D.2 Access helper dan guard

Buat `src/lib/documentation/access.ts` (atau
`src/lib/project-documentation/access.ts`) dengan pola
`master-project/access.ts:7-21` dan `calculation-sheet-template/service.ts:98-135`:

```ts
canViewDocumentation(role): boolean
canManageDocumentation(role): boolean
assertViewAccess(actor): void   // aktif + VIEW
assertManageAccess(actor): void // aktif + MANAGE
```

Guard berlapis:

| Lapisan | Perilaku |
|---|---|
| Sidebar | tampil jika `canViewDocumentation(role)` |
| Layout `app/dashboard/project-documentation/layout.tsx` | tanpa sesi → `/login`; tanpa VIEW → `/dashboard` (pola `calculation-sheet-template/layout.tsx:8-19`) |
| Server page | kirim `canManage` dari `hasPermission(user.role, DOCUMENTATION_MANAGE)`; jangan percaya role dari client |
| Client UI | input/tombol hanya jika `canManage`; read-only tetap melihat link |
| Service | `assertViewAccess` pada GET; `assertManageAccess` pada PUT |
| API | actor dari `requireUser()`; 401/403 dari `mapDomainError` |

### D.3 Apakah perlu POST/PUT khusus?

**Tidak perlu `POST`.** Baris PDOC bukan record baru buatan user; identitasnya
adalah `master_projects.id`. Membuat `POST /project-documentation` akan
memungkinkan baris dokumentasi untuk project yang tidak ada, duplikasi, dan
“tambah project” dari modul yang seharusnya read-only terhadap Master Project.

**Tidak perlu `DELETE`.** P1 tidak mengizinkan menghapus project dari PDOC, dan
menghapus satu minggu cukup mengosongkan URL. Jika suatu saat ingin menghapus
seluruh dokumentasi project, itu operasi terpisah dan bukan kebutuhan P1.

**Cukup `PUT` upsert berdasarkan `project_id`.**

```
GET  /api/project-documentation
PUT  /api/project-documentation/[projectId]
```

`PUT` bersifat idempoten: request yang sama menghasilkan state yang sama.
Repository memakai:

```ts
.insert(projectDocumentations)
.values({ projectId, ... })
.onConflictDoUpdate({
  target: projectDocumentations.projectId,
  set: { ...nilaiBaru, updatedAt: new Date() },
})
```

`project_id` berasal dari URL, bukan body, sehingga client tidak dapat
memindahkan dokumentasi ke project lain. Sebelum upsert, service memastikan
project ada; FK `RESTRICT`/`UNIQUE` menjadi backstop.

### D.4 Kontrak API yang disarankan

#### `GET /api/project-documentation`

- Auth: `DOCUMENTATION_VIEW` + akun aktif.
- Mengembalikan **semua** Master Project, termasuk yang belum punya dokumentasi.
- 200:

```json
{
  "data": {
    "rows": [
      {
        "project_id": "uuid",
        "project_name": "Nama Proyek",
        "project_location": "Lokasi",
        "project_year": 2026,
        "weeks": [
          {
            "week": 1,
            "url": "https://example.com/week-1",
            "updated_by": { "user_id": "uuid", "name": "Nama" },
            "updated_at": "2026-11-09T07:30:00.000Z"
          },
          { "week": 2, "url": null, "updated_by": null, "updated_at": null }
        ],
        "catatan": "Catatan opsional",
        "updated_by": { "user_id": "uuid", "name": "Nama" },
        "updated_at": "2026-11-09T07:30:00.000Z"
      }
    ]
  }
}
```

- Urutan: `project_name`, `project_location`, `project_id` (deterministik).
- `weeks` selalu lima elemen, termasuk yang kosong, agar UI tidak perlu menebak.
- `Cache-Control: no-store`.

#### `PUT /api/project-documentation/[projectId]`

- Auth: `DOCUMENTATION_MANAGE`.
- Body strict (semua field wajib; `null`/string kosong berarti kosong):

```json
{
  "week_1_url": "https://example.com/week-1",
  "week_2_url": null,
  "week_3_url": null,
  "week_4_url": null,
  "week_5_url": null,
  "catatan": "Opsional"
}
```

Aturan:

| Field | Aturan |
|---|---|
| `week_n_url` | `null`/kosong → `NULL`; jika diisi, absolute `http(s)` dan ≤ 2048 |
| `catatan` | `null`/kosong → `NULL`; maks 2000 |
| Field lain | Ditolak oleh `.strict()` (actor, timestamp, project_id tidak boleh dari body) |

- 200 `{ data: row }` (DTO lengkap seperti GET).
- 404 jika `projectId` bukan UUID valid atau project tidak ditemukan.
- 400 jika URL/catatan tidak valid atau body bukan JSON.
- 403 jika bukan manage role / akun suspended.
- 401 tanpa sesi.

**Audit diff di service.** Sebelum menulis, service mengambil baris lama dan
membandingkan lima URL:

- minggu berubah → set `week_n_updated_by = actor.id`,
  `week_n_updated_at = now()`;
- minggu tidak berubah → kolom URL dan metadata minggu itu tidak disentuh;
- baris baru → `created_by = actor.id`; metadata hanya diisi untuk minggu yang
  benar-benar berisi URL;
- `catatan` berubah → set `updated_by = actor.id`, `updated_at = now()`.

Dengan cara ini, menyimpan ulang baris tanpa perubahan tidak mengubah audit
minggu mana pun.

### D.5 Alternatif per-minggu (jika UX menghendaki)

Jika P3 memutuskan setiap sel disimpan sendiri-sendiri, gunakan:

```
PATCH /api/project-documentation/[projectId]
body: { "week": 1, "url": "https://..." }
```

Service hanya meng-update satu kolom minggu + metadata-nya. Ini mengurangi
risiko dua editor minggu berbeda saling menimpa. Namun untuk P1 yang menampilkan
satu baris dengan satu kolom Aksi, **simpan per baris lebih sederhana** dan tetap
memenuhi audit trail. Jangan menyediakan dua endpoint sekaligus.

### D.6 Error mapping

Reuse `_helpers.ts` CST (`src/app/api/calculation-sheet-template/_helpers.ts`):

| Kondisi | Status | Pesan |
|---|---|---|
| Tanpa sesi | 401 | `Unauthenticated` |
| Role tidak berhak / suspended | 403 | `Akses Project Documentation ditolak` |
| `projectId` bukan UUID / project tidak ada | 404 | `Master Project tidak ditemukan` |
| URL bukan http(s) / > 2048 / catatan > 2000 | 400 | pesan field |
| Body bukan JSON | 400 | `Body harus berupa JSON yang valid` |
| FK/unique violation | 409 | `Dokumentasi project tidak dapat disimpan` |
| Lainnya | 500 | pesan generik + log route |

Semua response `Cache-Control: no-store`; error body
`{ error: { message, details? } }`.

---

## E. Audit E — PDF Export

### E.1 Pola existing

**CST Summary** (`cstSummaryExportPdf.ts`):

- `jsPDF` + `jspdf-autotable`, A4 landscape (`:12-60`).
- Header judul, filter line, tanggal export, garis aksen (`:56-95`).
- Tabel `autoTable` dengan header tetap, `theme: "plain"`, border tipis,
  `overflow: "linebreak"`, lebar kolom eksplisit (`:97-139`).
- Footer setiap halaman: brand + `Halaman n / total` (`:139-164`).
- Nama file memakai timestamp lokal (`:154-167`).
- Dibangun dari baris yang sedang tampil, sehingga PDF tidak mungkin berbeda
  dengan tabel.

**MKS Summary** (`metodeKerjaExportPdf.ts`):

- A4 landscape default; A3 landscape jika baris > 120 (`:35, 190-195`).
- `buildSummaryPdfBody` mengubah tree menjadi `CellInput[][]`; perhitungan
  murni dan dapat diuji tanpa DOM (`:112-171`).
- `autoTable` dipanggil setelah header (`:242`).
- Lebar kolom proporsional terhadap lebar printable.

### E.2 Rekomendasi untuk PDOC

- **A4 landscape**, sesuai P1.
- Kolom PDF: No, Nama Proyek, Minggu 1–5, Catatan. Kolom Aksi tidak dicetak.
- Delapan kolom pada A4 landscape (printable ±273 mm) masih muat dengan font
  6.5–7 pt dan lebar: No 8 mm, Nama 42 mm, 5 × 34 mm (170 mm), Catatan 45 mm.
- URL panjang memakai `overflow: "linebreak"` dan font kecil; jangan
  `nowrap`. Jika URL sangat panjang, tampilkan URL penuh (sesuai isi tabel)
  atau label `Buka` dengan hyperlink. `autoTable` tidak membuat hyperlink
  otomatis; jika ingin clickable, gunakan `didDrawCell` + `doc.link`.
- Link kosong dicetak `—`.
- Sumber data adalah rows yang sudah dimuat dari GET; **tidak ada fetch saat
  export**, sehingga PDF selalu konsisten dengan tampilan.
- Audit “siapa dan kapan” sebaiknya **tidak** dimasukkan ke PDF default karena
  akan menggandakan tinggi baris; jika dibutuhkan, tambahkan satu baris kecil di
  bawah URL atau lampiran terpisah. Ini OQ-06.
- Footer: `WIKA - Project Documentation` + `Halaman n / total`; nama file
  `Project-Documentation-YYYYMMDD-HHmmss.pdf`.
- Jika jumlah project sangat besar (> 120 baris), pertimbangkan A3 landscape
  seperti MKS; P1 tetap A4, jadi jadikan fallback opsional, bukan default.

Export dipanggil dengan dynamic import (`await import("./projectDocumentationExportPdf")`)
seperti CST/MKS agar `jspdf` tidak masuk bundle awal.

---

## F. Rekomendasi Komponen Baru, Risiko & Open Questions

### F.1 File baru yang disarankan

| Path | Isi |
|---|---|
| `src/lib/documentation/constants.ts` | `PDOC_WEEKS = [1,2,3,4,5]`, label minggu, konstanta panjang |
| `src/lib/documentation/access.ts` | `canViewDocumentation`, `canManageDocumentation`, assert |
| `src/lib/documentation/schema.ts` | Zod create/update, validasi URL 2048 + http(s), catatan 2000 |
| `src/lib/documentation/repository.ts` | Query project + left join, upsert, bulk user lookup |
| `src/lib/documentation/service.ts` | DTO, audit diff per minggu, mapping error |
| `src/lib/documentation/*.test.ts` | Draft/validasi/audit diff murni |
| `src/app/api/documentation/_helpers.ts` | Actor, parse body, error mapping |
| `src/app/api/documentation/route.ts` | `GET` |
| `src/app/api/documentation/[projectId]/route.ts` | `PUT` upsert |
| `src/app/dashboard/documentation/layout.tsx` | Guard VIEW |
| `src/app/dashboard/documentation/page.tsx` | Server page + `canManage` |
| `src/components/dashboard/documentation/ProjectDocumentationPage.tsx` | Fetch, state edit, simpan, PDF |
| `src/components/dashboard/documentation/ProjectDocumentationTable.tsx` | Tabel 8 kolom, 5 input URL |
| `src/components/dashboard/documentation/projectDocumentationDraft.ts` | `PdocDraft`, `toDraft`, `draftEquals`, `validate` |
| `src/components/dashboard/documentation/projectDocumentationExportPdf.ts` | Builder PDF A4 landscape |
| `drizzle/0018_project_documentations.sql` | Migration (dibuat tool) |

Nama folder/route bisa disesuaikan dengan konvensi P3; yang penting satu
namespace dan tidak mencampur dengan CST.

### F.2 File existing yang perlu diubah (P3/P4, bukan P2)

| Path | Perubahan |
|---|---|
| `src/lib/auth/permissions.ts` | 2 permission + mapping role |
| `src/lib/pg/schema.ts` | Tabel `projectDocumentations` + tipe |
| `src/components/dashboard/DashboardSidebar.tsx` | Menu Project Documentation + visibility |
| `src/lib/master-project/service.ts` | Pesan 409 delete menyebut Project Documentation (jika FK `RESTRICT`) |
| `drizzle/meta/_journal.json` | Entry 0018 (oleh tool) |

Tidak perlu mengubah MSL, CST, MKS, KM, atau komponen tabel existing. Jangan
mengekstrak `EvidenceCell` dari CST hanya untuk reuse; komponen itu lokal dan
mengekstraknya menambah risiko regresi. Salin pola styling di komponen baru.

### F.3 Risiko

| # | Risiko | Prob. | Dampak | Mitigasi |
|---|---|---|---|---|
| R-01 | Lima pasang kolom audit membuat schema lebar | Tinggi | Maintenance | Terima untuk 5 minggu tetap; dokumentasikan kolom |
| R-02 | Whole-row PUT menimpa perubahan editor lain | Sedang | Kehilangan link | Simpan per baris singkat; pertimbangkan PATCH per minggu (OQ-09) |
| R-03 | Metadata minggu berubah padahal URL tidak berubah | Sedang | Audit menyesatkan | Diff server; hanya set metadata minggu yang berubah |
| R-04 | URL panjang merusak layout tabel/PDF | Sedang | Sulit dibaca | `truncate` + `title`, `overflow: linebreak`, font kecil |
| R-05 | Project dihapus saat punya dokumentasi | Rendah | 409 atau kehilangan audit | FK `RESTRICT`; perbarui pesan delete Master Project |
| R-06 | Query per project menyebabkan N+1 | Rendah | Lambat | Satu query project + left join, bulk user lookup |
| R-07 | PDF 8 kolom terlalu sempit | Sedang | URL terpotong | A4 landscape, lebar eksplisit, linebreak; A3 opsional |
| R-08 | Semua project (semua tahun) terlalu banyak | Sedang | Halaman panjang | Sesuai P1; jika perlu, filter tahun/pagination di P3 (OQ-05) |
| R-09 | Permission `DOCUMENTATION_*` terlalu generik | Rendah | Tabrakan namespace | Ikuti requirement; dokumentasikan |
| R-10 | Status apply migration 0017 belum diverifikasi, 0018 menumpuk | Sedang | Migration gagal | Konfirmasi 0017 sudah applied sebelum 0018; generate berurutan |
| R-11 | Dua editor menyimpan bersamaan | Sedang | Last-write-wins | Audit mencatat aktor terakhir; PATCH per minggu jika perlu |
| R-12 | Zona waktu timestamp membingungkan | Sedang | “Kapan” salah | Format `id-ID` dengan zona eksplisit (OQ-07) |

### F.4 Open Questions untuk P3

| ID | Pertanyaan | Rekomendasi awal |
|---|---|---|
| OQ-01 | “Minggu 1–5” berarti minggu kalender, minggu pelaksanaan, atau slot dokumen? | Anggap slot dokumen tetap; label tidak dihitung otomatis |
| OQ-02 | Apakah Catatan per project atau per minggu? | Per project (satu kolom di P1) |
| OQ-03 | Saat link dikosongkan, apakah metadata “siapa mengosongkan” dipertahankan? | Pertahankan `updated_by/at`; URL `NULL` |
| OQ-04 | Apakah Project role boleh mengelola **semua** project atau hanya project yang ditugaskan? | P1 menyebut full manage; konfirmasi ke Owner |
| OQ-05 | Apakah semua project semua tahun ditampilkan tanpa filter/pagination? | Ikuti P1; jika data besar, tambah filter tahun di P3 |
| OQ-06 | Apakah PDF mencetak nama/timestamp updater per minggu? | Tidak pada default; tabel PDF tetap ringkas |
| OQ-07 | Format tanggal: tanggal saja atau tanggal + jam? Zona waktu apa? | `id-ID`, tanggal + jam, `Asia/Jakarta` |
| OQ-08 | Apakah project yang punya dokumentasi boleh dihapus? | `RESTRICT`; tampilkan 409 yang menyebut dokumentasi |
| OQ-09 | Simpan per baris atau per sel? | Per baris (satu tombol Aksi) |
| OQ-10 | Apakah perlu riwayat perubahan lengkap, bukan hanya last-touch? | Tidak untuk P1; last-touch cukup |

### F.5 Kesimpulan handoff

Audit ini menemukan bahwa PDOC dapat dibangun dengan **reuse tinggi** dari
Master Project + MSL + CST, tanpa refactor modul existing. Keputusan yang paling
menentukan adalah skema: **flat table dengan lima pasang kolom URL/audit**,
`project_id` unik, dan API `GET` + `PUT` upsert. Child table baru relevan jika
minggu menjadi dinamis atau dibutuhkan riwayat per minggu.

**Status: READY FOR P3 TECHNICAL DESIGN**, dengan OQ-01 sampai OQ-10 perlu
dijawab/dikonfirmasi Owner sebelum implementasi.
