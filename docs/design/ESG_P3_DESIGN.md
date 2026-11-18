# P3 — Technical Design: Penilaian ESG
**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 — Technical Design (dokumen saja)
**Tanggal:** 18 November 2026
**Baseline:** Audit P2 Penilaian ESG
**Migration:** `0029_project_esg_assessments` — rancangan, belum dibuat/dijalankan
**Status:** READY FOR REVIEW

## A. Ringkasan
Sub-menu **Penilaian ESG** ada di modul Database Green Building & ESG. Satu
baris assessment mewakili satu proyek pada satu tahun dengan status 12 bulan.
- **P3-E01:** Route `/dashboard/green-building-esg/penilaian-esg`; API
  `/api/green-building-esg/esg-assessments`.
- **P3-E02:** Tabel `project_esg_assessments`, 12 kolom status,
  `UNIQUE(project_id, year)`.
- **P3-E03:** `year` adalah snapshot `master_projects.year` saat create.
- **P3-E04:** Inline edit `<select>` native per sel: `Complete`, `Half`, `null`.
- **P3-E05:** Reuse `GREEN_BUILDING_ESG_VIEW` dan `GREEN_BUILDING_ESG_MANAGE`.
- **P3-E06:** P3 hanya dokumen; tanpa kode, migration, commit, atau push.

### A.1 Keputusan yang dikunci
| Topik | Keputusan |
|---|---|
| Bentuk data | 12 kolom status, bukan pivot |
| Tahun | Snapshot Master Project saat create |
| Edit sel | PATCH per bulan, `NULL` untuk kosong |

## B. Database Schema
### B.1 Relasi
```text
master_projects 1 ─── N project_esg_assessments (ON DELETE RESTRICT)
```
Nama/lokasi tidak disimpan; selalu join `master_projects`. `year` adalah
snapshot agar assessment tidak berubah saat Master Project diperbarui.

### B.2 DDL konseptual
> Hanya untuk review; bukan migration dan tidak dijalankan pada P3.
```sql
CREATE TABLE project_esg_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE RESTRICT,
  year integer NOT NULL,
  documentation_url text,
  month_1_status text,
  -- month_2_status s/d month_12_status: definisi identik
  month_12_status text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pea_project_year_unique UNIQUE (project_id, year),
  CONSTRAINT pea_year_check CHECK (year BETWEEN 2000 AND 2100),
  CONSTRAINT pea_month_1_status_check
    CHECK (month_1_status IS NULL OR month_1_status IN ('Complete','Half')),
  -- CHECK bulan 2–11 identik; bulan 12:
  CONSTRAINT pea_month_12_status_check
    CHECK (month_12_status IS NULL OR month_12_status IN ('Complete','Half')),
  CONSTRAINT pea_documentation_check CHECK (documentation_url IS NULL OR
    (length(btrim(documentation_url)) BETWEEN 1 AND 2048
     AND documentation_url ~ '^https?://[^[:space:]]+$'))
);
CREATE INDEX pea_year_idx ON project_esg_assessments (year);
```
`UNIQUE(project_id, year)` juga melayani lookup per proyek.

### B.3 Aturan integritas
- Satu proyek hanya satu assessment per tahun; duplikat `23505` → **409**.
- `project_id` wajib ada; hapus Master Project yang punya assessment ditolak
  `RESTRICT` → **409**.
- `year` diisi server (body client ditolak `.strict()`); kolom bulan hanya
  `NULL`, `Complete`, atau `Half`.
- `documentation_url` boleh `NULL`; jika diisi wajib http(s), maksimal 2048
  karakter, tanpa whitespace; string kosong dari form menjadi `NULL`.
- Audit: `created_by` NO ACTION, `updated_by` SET NULL, `updated_at` per PATCH.

### B.4 Migration `0029_project_esg_assessments`
1. Tambah `projectEsgAssessments` di `src/lib/pg/schema.ts` dengan pemetaan
   `month1Status` … `month12Status`, `documentationUrl`, `year`.
2. Buat `drizzle/0029_project_esg_assessments.sql` berisi tabel, FK, UNIQUE,
   CHECK, dan index `pea_year_idx`.
3. Tambah `drizzle/meta/0029_snapshot.json` + journal `idx: 29`; tanpa seed,
   tanpa mengubah tabel existing, tanpa extension baru.
4. Migration **belum dibuat/dijalankan**. Rollback sebelum ada data: drop table;
   setelah ada data, backup dulu karena drop destruktif.

## C. API Contract
### C.1 Konvensi
- Base `/api/green-building-esg`; auth `getActor()`, actor wajib aktif.
- Sukses `{ "data": ... }` (+ `meta` untuk list); error
  `{ "error": { "message", "details" } }`; semua response
  `Cache-Control: private, no-store`.
- Body Zod `.strict()`; `id`, `year`, field audit, `project_name` tidak diterima
  dari client; UUID diverifikasi sebelum service.
- Modul baru `src/lib/esg-assessment/{constants,schema,repository,service}.ts`;
  guard memakai `src/lib/green-building-esg/access.ts`.

### C.2 Endpoint
| Method | Path | Permission | Sukses | Error utama |
|---|---|---|---|---|
| GET | `/api/green-building-esg/esg-assessments` | VIEW | 200 | 400,401,403,500 |
| POST | `/api/green-building-esg/esg-assessments` | MANAGE | 201 | 400,401,403,404,409,500 |
| PUT | `/api/green-building-esg/esg-assessments/[id]` | MANAGE | 200 | 400,401,403,404,409,500 |
| DELETE | `/api/green-building-esg/esg-assessments/[id]` | MANAGE | 200 | 400,401,403,404,500 |
| PATCH | `/api/green-building-esg/esg-assessments/[id]/months/[month]` | MANAGE | 200 | 400,401,403,404,500 |
| GET | `/api/green-building-esg/project-options` | MANAGE | 200 | 400,401,403,500 |

`project-options` **dipakai ulang** dari Sertifikasi; tidak ada endpoint baru.

### C.3 DTO
```json
{"id":"uuid","project":{"project_id":"uuid","name":"Gedung A",
"location":"Jakarta","project_year":2026},"year":2026,
"documentation_url":"https://example.com/dokumen-esg-gedung-a",
"months":[{"month":1,"status":"Complete"},{"month":2,"status":"Half"},
{"month":3,"status":null}],"completed_months":1,"half_months":1,
"created_at":"2026-11-18T08:00:00.000Z","updated_at":"2026-11-18T08:00:00.000Z"}
```
`months` selalu tepat 12 item terurut 1–12; response tidak memakai key
`month_1_status`. `completed_months`/`half_months` dihitung service.

### C.4 List
```http
GET /api/green-building-esg/esg-assessments?year=2026&search=gedung
```
| Parameter | Aturan |
|---|---|
| `year` | integer opsional 2000–2100; filter kolom `year` |
| `search` (alias `q`) | string opsional, trim, maksimal 200; cari nama proyek |
Response: `{"data":[DTO C.3],"meta":{"total","available_years"}}`. Urutan `year
DESC`, `project_name ASC`, `id ASC`; filter digabung AND. Filter aktif tanpa
hasil bukan empty state "belum ada data".

### C.5 Create
```http
POST /api/green-building-esg/esg-assessments
Content-Type: application/json
```
```json
{"project_id":"uuid","documentation_url":"https://example.com/dokumen-esg"}
```
`project_id` wajib UUID dan ada (`404` bila tidak); `documentation_url`
nullable. Service memakai `master_projects.year` sebagai `year` dan mengisi 12
kolom status `NULL`. Duplikat `(project_id, year)` → **409**. Sukses `201` DTO.

### C.6 Update
`PUT /api/green-building-esg/esg-assessments/[id]` menerima payload Create
(`project_id`, `documentation_url`) — **bukan** status bulan.
- Ganti `project_id` → `year` snapshot ulang; bentrok `(project_id, year)` →
  **409**. Status 12 bulan dipertahankan; UI meminta konfirmasi.
- Sukses `200` DTO terbaru. `id`, `year`, audit, `project_name` tidak dapat
  diubah client.

### C.7 Patch satu bulan
```http
PATCH /api/green-building-esg/esg-assessments/{id}/months/{month}
Content-Type: application/json
```
```json
{"status":"Half"}
```
| Bagian | Aturan |
|---|---|
| `month` | segmen path integer 1–12; selain itu **400** |
| `status` | `"Complete"` \| `"Half"` \| `null`; nilai lain **400** |
| Body | hanya `status`; field lain ditolak `.strict()` |

Service memastikan baris ada (`404`), memetakan `month` ke kolom
`month_{n}_status`, lalu menulis kolom itu + `updated_by` + `updated_at`.
`null` mengosongkan sel; request idempoten (nilai sama tetap `200`). Sukses
mengembalikan **DTO lengkap** agar client merekonsiliasi `months` dan counter
tanpa refetch — misalnya DTO C.3 dengan `months[1].status = "Half"`.

### C.8 Delete
`DELETE /api/green-building-esg/esg-assessments/[id]` sukses `200`
`{ "data": { "deleted": true, "id": "uuid" } }`; `404` jika tidak ada.

### C.9 Error mapping
400 body/query/UUID/`month`/status/CHECK; 401 tidak login; 403 role atau akun
nonaktif; 404 assessment atau Master Project; 409 duplikat atau referensi
proyek; 500 error tak terduga. `23505`/`23503` → 409, `23514` → 400.

## D. UI Component Design
### D.1 Struktur komponen
Route `/dashboard/green-building-esg/penilaian-esg` memakai guard layout
namespace yang sudah ada (VIEW). Komponen baru di
`src/components/dashboard/green-building-esg/`: `EsgAssessmentPage.tsx`,
`EsgAssessmentTable.tsx`, `EsgAssessmentFormDialog.tsx`,
`EsgAssessmentDeleteDialog.tsx`, perluasan `types.ts`, dan
`esg-assessment.constants.ts`. **Dipakai ulang:** `GreenBuildingProjectCombobox`,
`GreenBuildingEsgDialogShell`.

### D.2 Wireframe tabel
```text
┌ Database Green Building & ESG · Penilaian ESG ────────────────────────────────────────┐
│ [Tahun: Semua ▼] [Cari nama proyek...      ] [Reset]        [+ Tambah Penilaian]       │
├────┬──────────────┬──────┬─────────────┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───────┤
│ No │ Nama Proyek  │Tahun │ Dokumentasi │ J │ F │ M │ A │ M │ J │ J │ A │ S │ O │ N │ D │ Aksi  │
├────┼──────────────┼──────┼─────────────┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───────┤
│ 1  │ Gedung A     │ 2026 │ Buka link ↗ │[C]│[H]│[ ]│[C]│[ ]│[ ]│[ ]│[ ]│[ ]│[ ]│[ ]│[ ]│[Edit] │
│    │ Jakarta      │      │             │   │   │   │   │   │   │   │   │   │   │   │   │[Hapus]│
└────┴──────────────┴──────┴─────────────┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───────┘
```
- Kolom: No, Nama Proyek (+ lokasi), Tahun, Dokumentasi, 12 bulan (header satu
  huruf dengan `title`/`aria-label` nama bulan penuh), Aksi.
- Tabel `overflow-x-auto`, `min-w-[1180px]`, `border-collapse`, header memakai
  `headerCell` yang sama dengan `CertificateTable`.
- Dokumentasi: "Buka link" `target="_blank"` `rel="noopener noreferrer"`;
  `null` menjadi `—`. Tambah/Edit/Hapus hanya MANAGE; read-only melihat Aksi
  `—` dan `<select disabled>`. Ringkasan header `n penilaian` memakai
  `aria-live="polite"`.

### D.3 Styling `<select>` per sel
Satu `<select>` native tanpa dropdown kustom, `h-8 w-full min-w-11`,
`appearance-none`, teks tengah, `text-[11px] font-bold`, `rounded border`,
`focus:ring-2 focus:ring-secondary/20`.

| Nilai | Opsi terpilih | Kelas | Tampilan |
|---|---|---|---|
| `null` | `<option value="">` label kosong | `border-slate-200 bg-white text-slate-700` | putih polos, tanpa teks |
| `Complete` | `Complete` | `border-emerald-300 bg-emerald-100 text-emerald-800` | hijau |
| `Half` | `Half` | `border-amber-300 bg-amber-100 text-amber-800` | kuning |

- Opsi dropdown tetap: `""` (label kosong), `Complete`, `Half`.
- `text-transparent` tidak dipakai (item dropdown ikut tak terbaca); kekosongan
  dicapai lewat label opsi kosong.
- Setiap sel `aria-label="Status {Bulan} {Nama Proyek}"`; `""` dikirim `null`.
  Read-only: warna tetap, `disabled`, `cursor-not-allowed`, `opacity-80`.

### D.4 State penyimpanan per sel
- `savingCells: Set<string>` key `` `${row.id}:${month}` ``; sel yang disimpan
  `disabled`, `aria-busy="true"`, spinner 12px, `opacity-70`.
- **Satu PATCH in-flight per baris**: sel lain pada baris itu ikut `disabled`
  agar `updated_at` tidak saling menimpa; baris lain tetap paralel.
- Optimistis: `months` langsung diubah; gagal → sel dikembalikan + `role="alert"`
  "Gagal menyimpan status {Bulan}. Coba lagi." dengan tombol ulangi.
- Sukses: ganti baris dengan DTO response (bukan refetch) + notice "Status
  {Bulan} diperbarui."; `requestIdRef` mengabaikan `updated_at` lebih lama.
- Create/Delete refetch list + `available_years`; PATCH tidak refetch. Empty
  state: "Belum ada penilaian ESG." + tombol tambah; dengan filter: "Tidak ada
  penilaian yang cocok" + "Reset Filter".

### D.5 Form Tambah/Edit
```text
┌ Tambah Penilaian ESG ──────────────────────────────────────┐
│ Nama Proyek *   [ Cari nama atau lokasi proyek...      ▼ ] │
│                 Gedung A — Jakarta (2026)                  │
│ Tahun           [ 2026 ]  (otomatis, tidak dapat diubah)   │
│ Dokumentasi     [ https://example.com/dokumen-esg       ]  │
│ [ Batal ]                          [ Simpan Penilaian ]    │
└────────────────────────────────────────────────────────────┘
```
- Proyek wajib dipilih dari combobox; tidak ada input teks bebas.
- Tahun read-only dari opsi proyek (create) atau DTO (edit), bukan field body.
  Ganti proyek saat edit menampilkan catatan "Tahun mengikuti proyek baru dan
  status 12 bulan dipertahankan"; konflik 409 tampil di atas footer.
- `Dokumentasi` `type="url"`, placeholder `https://...`; string kosong `null`.
  Dialog `GreenBuildingEsgDialogShell` (focus trap, Escape, `aria-modal`).

## E. Navigasi Sidebar
Tambahkan satu item pada `greenBuildingEsgMenu` di
`src/components/dashboard/DashboardSidebar.tsx`; item lama tidak diubah.
```text
Core Enterprise
├─ Engineering Databases
└─ Database Green Building & ESG
   ├─ Sertifikasi Green Building
   └─ Penilaian ESG
```
- `label: "Penilaian ESG"`, `href: "/dashboard/green-building-esg/penilaian-esg"`,
  ikon emoji `📊` dengan `aria-hidden`.
- Accordion sudah generik: `isGreenBuildingEsgPath()` mencocokkan root dan
  seluruh descendant, sehingga route baru otomatis membuka panel dan menandai
  item aktif lewat `isActivePath`. Tidak perlu state accordion baru.
- Visibilitas tetap `canViewGreenBuildingEsg(role)`; MANAGE hanya mengatur
  tombol mutasi. `/dashboard/green-building-esg` tetap redirect ke `/sertifikasi`.

## F. RBAC
| Aksi | Permission | Admin | Head Office | Management | Project |
|---|---|---:|---:|---:|---:|
| Lihat list | `GREEN_BUILDING_ESG_VIEW` | ✅ | ✅ | ✅ | ✅ |
| Create/Update/Delete/PATCH/project-options | `GREEN_BUILDING_ESG_MANAGE` | ✅ | ✅ | ❌ | ❌ |
Tanpa permission baru dan tanpa perubahan `permissions.ts`. Guard:
`assertViewAccess`/`assertManageAccess` + `actor.status === "active"`; UI hanya
menyembunyikan kontrol, otorisasi final di API/service.

## G. Acceptance Criteria
- Tabel sesuai B.2: 12 kolom nullable, `UNIQUE(project_id, year)`, FK
  `RESTRICT`, `documentation_url` hanya http(s).
- `year` selalu dari `master_projects.year`; ganti proyek me-reset `year` dan
  bentrok → 409.
- PATCH `[month]` menerima 1–12 dan `Complete`/`Half`/`null`, mengembalikan DTO
  lengkap, idempoten.
- Tabel 12 bulan: `<select>` putih saat kosong, hijau `Complete`, kuning `Half`;
  loading/error per sel tanpa refetch list.
- Sidebar menampilkan "Penilaian ESG" di accordion yang sama; route aktif
  membuka accordion.
- Admin/Head Office CRUD; Management/Project read-only; tidak bentrok dengan CMS
  lama `/dashboard/green-building`. P3 tanpa kode, migration, write, commit/push.

**Status akhir P3:** READY FOR REVIEW.
