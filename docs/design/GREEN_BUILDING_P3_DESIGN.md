# P3 — Technical Design: Sertifikasi Green Building
**Proyek:** WIBEX — Staff Engineering Digitalisasi Building
**Fase:** P3 — Technical Design (dokumen saja)
**Tanggal:** 18 November 2026
**Baseline:** Audit P2 Sertifikasi Green Building
**Migration:** `0028_project_green_certificates` — rancangan, belum dibuat/dijalankan
**Status:** READY FOR REVIEW
## A. Ringkasan
Modul **Sertifikasi Green Building** berada di bawah Core Enterprise **Database
Green Building & ESG**. Modul terpisah dari CMS lama `/dashboard/green-building`
dan `/api/green-buildings`.
- **P3-R01:** UI `/dashboard/green-building-esg`; API `/api/green-building-esg`.
- **P3-R02:** Tabel baru `project_green_certificates`; tanpa upload file.
- **P3-R03:** Dokumentasi hanya URL `http(s)`.
- **P3-R04:** `GREEN_BUILDING_ESG_VIEW` semua role; `GREEN_BUILDING_ESG_MANAGE`
  Admin dan Head Office.
- **P3-R05:** `GreenBuildingProjectCombobox.tsx` baru hasil clone pola KM;
  komponen KM lama tidak diubah.
- **P3-R06:** Level dinamis mengikuti `lembaga`; level lama di-reset saat lembaga
  berubah.
- **P3-R07:** P3 hanya dokumen; tidak ada kode, migration, database write,
  commit, atau push.

## B. Database Schema
### B.1 Relasi
```text
master_projects 1 ─── N project_green_certificates (ON DELETE RESTRICT)
```
Nama proyek tidak disimpan; selalu join `master_projects.name`. `certificate_year`
disimpan terpisah karena tahun sertifikat dapat berbeda dari tahun proyek.
### B.2 DDL konseptual
> Hanya untuk review; bukan migration dan tidak dijalankan pada P3.
```sql
CREATE TABLE project_green_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES master_projects(id) ON DELETE RESTRICT,
  project_value text NOT NULL,
  location text NOT NULL,
  certificate_year integer NOT NULL,
  lembaga text NOT NULL,
  level text NOT NULL,
  status text NOT NULL,
  documentation_url text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pgc_value_check CHECK (length(btrim(project_value)) BETWEEN 1 AND 100),
  CONSTRAINT pgc_location_check CHECK (length(btrim(location)) BETWEEN 1 AND 200),
  CONSTRAINT pgc_year_check CHECK (certificate_year BETWEEN 2000 AND 2100),
  CONSTRAINT pgc_lembaga_check CHECK (lembaga IN ('BGH','Greenship')),
  CONSTRAINT pgc_level_check CHECK (
    (lembaga = 'BGH' AND level IN ('Utama','Madya','Pratama')) OR
    (lembaga = 'Greenship' AND level IN
      ('Certified/Bronze','Silver','Gold','Platinum'))
  ),
  CONSTRAINT pgc_status_check CHECK
    (status IN ('Certified','Non-Certified','Under Construction')),
  CONSTRAINT pgc_documentation_check CHECK (
    documentation_url IS NULL OR (
      length(btrim(documentation_url)) BETWEEN 1 AND 2048
      AND documentation_url ~ '^https?://[^[:space:]]+$'
    )
  )
);
CREATE INDEX pgc_project_id_idx ON project_green_certificates (project_id);
CREATE INDEX pgc_certificate_year_idx ON project_green_certificates (certificate_year);
```
### B.3 Aturan integritas
- `project_id` wajib merujuk Master Project; hapus proyek yang masih memiliki
  sertifikat ditolak (`RESTRICT`, service memetakan menjadi 409).
- `project_value` teks; `location` snapshot lokasi sertifikat yang di-prefill dari
  `master_projects.location` dan dapat diedit.
- `lembaga` hanya BGH/Greenship; CHECK komposit memastikan `level` cocok.
- `status` hanya Certified, Non-Certified, Under Construction.
- `documentation_url` boleh NULL; jika diisi wajib http(s), maksimal 2048
  karakter, tanpa whitespace.
- Tidak ada unique `project_id`; satu proyek dapat memiliki beberapa sertifikat.
  Audit: `created_by` NO ACTION; `updated_by` SET NULL.
### B.4 Migration `0028_project_green_certificates`
1. Tambah `projectGreenCertificates` pada `src/lib/pg/schema.ts`.
2. Buat `drizzle/0028_project_green_certificates.sql` berisi tabel, FK, CHECK,
   dan dua index di atas; tambah snapshot `0028_snapshot.json` dan journal
   `idx: 28`, tag `0028_project_green_certificates`.
3. Tidak ada seed, tidak mengubah tabel existing, tidak menambah extension baru;
   `pg_trgm` sudah aktif dari migration `0004`.
4. Migration **belum dibuat/dijalankan pada P3**. Rollback sebelum ada data:
   drop table; setelah ada data, backup dulu karena drop bersifat destruktif.
### B.5 Index dan query
Search memakai `master_projects_name_trgm_idx`; filter tahun memakai
`pgc_certificate_year_idx`; join/FK memakai `pgc_project_id_idx`.
Query: `SELECT c.*, p.name AS project_name, p.year AS project_year FROM
project_green_certificates c JOIN master_projects p ON p.id = c.project_id WHERE
(c.certificate_year = $1 OR $1 IS NULL) AND (p.name ILIKE '%' || $2 || '%' OR $2
IS NULL) ORDER BY c.certificate_year DESC, p.name ASC, c.id ASC`. Pola `%`/`_`
di-escape; trigram efektif untuk pencarian minimal tiga karakter.

## C. API Contract
### C.1 Konvensi
- Base `/api/green-building-esg`; auth `getActor()`, actor wajib aktif.
- Sukses `{ "data": ... }`; error `{ "error": { "message", "details" } }`;
  response privat `Cache-Control: private, no-store`.
- Body divalidasi Zod `.strict()`; `id`, field audit, dan `project_name` tidak
  diterima dari client. `project_id` dan UUID diverifikasi sebelum service.
### C.2 Endpoint
| Method | Path | Permission | Sukses | Error utama |
|---|---|---|---|---|
| GET | `/api/green-building-esg/certificates` | VIEW | 200 | 400,401,403,500 |
| POST | `/api/green-building-esg/certificates` | MANAGE | 201 | 400,401,403,404,500 |
| PUT | `/api/green-building-esg/certificates/[id]` | MANAGE | 200 | 400,401,403,404,500 |
| DELETE | `/api/green-building-esg/certificates/[id]` | MANAGE | 200 | 401,403,404,500 |
| GET | `/api/green-building-esg/project-options` | MANAGE | 200 | 400,401,403,500 |

Tidak ada endpoint upload/download. `PUT` menerima payload lengkap.
### C.3 List
```http
GET /api/green-building-esg/certificates?year=2026&q=gedung
```
| Parameter | Aturan |
|---|---|
| `year` | integer opsional 2000–2100; filter `certificate_year` |
| `q` | string opsional, trim, maksimal 200; cari `master_projects.name` |

Urutan: `certificate_year DESC`, `project_name ASC`, `id ASC`.
```json
{"data":[{"id":"uuid","project":{"project_id":"uuid","name":"Gedung A",
"location":"Jakarta","project_year":2025},"project_value":"Rp 1.250.000.000",
"location":"Jakarta","certificate_year":2026,"lembaga":"BGH","level":"Utama",
"status":"Certified","documentation_url":"https://example.com/sertifikat-gedung-a",
"created_at":"2026-11-18T08:00:00.000Z","updated_at":"2026-11-18T08:00:00.000Z"}],
"meta":{"total":1,"available_years":[2026,2025]}}
```
`available_years` adalah tahun sertifikat yang ada, terbaru lebih dulu, untuk
dropdown filter. `year` dan `q` digabung AND. V1 tanpa pagination.
### C.4 Create
```http
POST /api/green-building-esg/certificates
Content-Type: application/json
```
```json
{"project_id":"uuid","project_value":"Rp 1.250.000.000","location":"Jakarta",
"certificate_year":2026,"lembaga":"BGH","level":"Utama","status":"Certified",
"documentation_url":"https://example.com/sertifikat-gedung-a"}
```
Validasi: `project_id` UUID dan ada; `project_value` 1–100; `location` 1–200;
`certificate_year` 2000–2100; `lembaga` enum; `level` cocok dengan lembaga
(Zod + DB CHECK); `status` enum; `documentation_url` nullable, string kosong
menjadi `null`, jika diisi wajib http(s) maksimal 2048. Sukses `201` dengan DTO
lengkap; `project_name` dari join, bukan body.
### C.5 Update
`PUT /api/green-building-esg/certificates/[id]` menerima body sama dengan Create;
semua field editable termasuk `project_id`. Service memverifikasi record/project;
`id`, audit, dan `project_name` tidak dapat diubah client. Sukses `200` DTO terbaru.
### C.6 Delete
`DELETE /api/green-building-esg/certificates/[id]` sukses `200`
`{ "data": { "deleted": true, "id": "uuid" } }`; `404` jika tidak ada; tanpa
soft delete atau cleanup file.
### C.7 Project options
`GET /api/green-building-esg/project-options?q=gedung` hanya MANAGE; maksimal 50
proyek, urut `year DESC`, `name ASC`, `id ASC`. `q` opsional maksimal 200 mencari
nama/lokasi Master Project; pola `%`/`_` di-escape. Read-only memakai list q/year.
### C.8 Error mapping
401 tidak login; 403 role/status; 400 body/query/UUID/CHECK; 404 sertifikat atau
Master Project; 409 referensi Master Project; 500 error tak terduga.
`23503`/`23001` → 409 referensi; `23514` → 400 constraint.

## D. UI Component Design
### D.1 Struktur komponen
Route: `layout.tsx` guard VIEW, `page.tsx` redirect `/sertifikasi`, dan halaman
`/dashboard/green-building-esg/sertifikasi/page.tsx`. Komponen baru:
`GreenBuildingEsgPage`, `GreenBuildingCertificateTable`,
`GreenBuildingCertificateDialog`, `GreenBuildingDeleteDialog`,
`GreenBuildingProjectCombobox`, serta `green-building-esg.types/constants`.
Komponen KM lama **tidak diubah**. Combobox mengikuti perilaku KM: debounce 250
ms, `AbortController`, request id, maksimal 50 opsi, ARIA, label
`nama — lokasi (tahun)`, endpoint `/api/green-building-esg/project-options`.
### D.2 Wireframe tabel
```text
┌ Database Green Building & ESG · Sertifikasi Green Building ─────────────────────────────┐
│ [Tahun: Semua ▼] [Cari nama proyek...          ] [Reset]      [+ Tambah Sertifikat]     │
├────┬──────────────────┬──────────────────┬──────┬────────────┬──────────┬───────────────┬──────────────┬────────┤
│ No │ Nama Proyek      │ Nilai Proyek     │Tahun │ Lembaga    │ Level    │ Status        │ Dokumentasi  │ Aksi   │
├────┼──────────────────┼──────────────────┼──────┼────────────┼──────────┼───────────────┼──────────────┼────────┤
│ 1  │ Gedung A         │ Rp 1.250.000.000 │ 2026 │ [BGH]      │ Utama    │ [Certified]   │ Buka link ↗  │ [Edit] │
│    │ Jakarta          │                  │      │            │          │               │              │ [Hapus]│
├────┼──────────────────┼──────────────────┼──────┼────────────┼──────────┼───────────────┼──────────────┼────────┤
│ 2  │ Gedung B         │ Rp 850.000.000   │ 2025 │ [Greenship]│ Gold     │ [Under Constr]│ —            │ [Edit] │
│    │ Bandung          │                  │      │            │          │               │              │ [Hapus]│
└────┴──────────────────┴──────────────────┴──────┴────────────┴──────────┴───────────────┴──────────────┴────────┘
```
- Kolom persis: No, Nama Proyek, Nilai, Tahun, Lembaga, Level, Status,
  Dokumentasi, Aksi.
- Nama proyek menampilkan nama dan lokasi proyek; lokasi sertifikat tidak
  dijadikan kolom terpisah.
- Dokumentasi adalah tautan “Buka link” dengan `target="_blank"` dan
  `rel="noopener noreferrer"`; NULL menjadi `—`.
- Badge: BGH/Greenship; Certified hijau, Non-Certified abu-abu, Under
  Construction amber.
- Tambah/Edit/Hapus hanya untuk MANAGE. Read-only melihat kolom Aksi dengan `—`.
- Tabel `overflow-x-auto`, target minimum 1.100px; mobile menggulir horizontal.
### D.3 Filter dan search
- **Tahun:** select dari `meta.available_years`, opsi pertama “Semua tahun”.
- **Search Nama Proyek:** input teks, debounce 300 ms, mengirim `q` ke list API.
- **Reset:** mengosongkan tahun/search lalu refetch.
- Filter tahun dan search digabung AND; tanpa filter lokasi/lembaga/status di V1.
- Filter aktif tanpa hasil: “Tidak ada sertifikat yang cocok” + reset; bukan empty
  state “belum ada data”.
- Loading awal skeleton baris; error awal alert + “Coba Lagi”; error saat data
  tampil mempertahankan data lama. Setelah mutasi sukses, refetch list dan
  `available_years`.
### D.4 Wireframe form
```text
┌ Tambah Sertifikat Green Building ─────────────────────────────────────┐
│ Nama Proyek *   [ Cari nama atau lokasi proyek...              ▼ ]   │
│                 Gedung A — Jakarta (2025)                            │
│ Lokasi *        [ Jakarta                                           ]│
│ Nilai Proyek *  [ Rp 1.250.000.000                                  ]│
│ Tahun *         [ 2026                                              ]│
│ Lembaga *       [ BGH ▼ ]                                            │
│ Level *         [ Utama ▼ ]  ← opsi berubah saat Lembaga berubah     │
│ Status *        [ Certified ▼ ]                                      │
│ Dokumentasi     [ https://example.com/sertifikat-gedung-a           ]│
│                 URL saja, bukan upload file                          │
│ [ Batal ]                                      [ Simpan Sertifikat ]  │
└───────────────────────────────────────────────────────────────────────┘
```
- Proyek wajib dipilih dari combobox; tidak ada input proyek teks bebas.
- Saat proyek dipilih pada mode tambah, `location` dan `certificate_year`
  di-prefill dari Master Project; keduanya tetap editable.
- `Nilai Proyek` adalah input teks; tanpa parsing mata uang di V1.
- `Lembaga` hanya BGH/Greenship.
- **Dynamic level:** opsi dihitung dari lembaga. Saat lembaga berubah, `level`
  di-reset kosong, opsi lama dibuang, dan simpan disabled sampai level baru
  dipilih. Saat edit, level tersimpan hanya ditampilkan jika valid untuk lembaga.
- `Dokumentasi` memakai `type="url"`, placeholder `https://...`, tanpa file input
  atau upload progress. String kosong dikirim `null`.
- Validasi inline per field; error server di atas footer. Dialog `role="dialog"`,
  `aria-modal`, focus trap, Escape, restore focus. Form satu kolom di mobile, dua
  kolom di desktop.
### D.5 Dynamic level
| Lembaga | Opsi level |
|---|---|
| BGH | Utama, Madya, Pratama |
| Greenship | Certified/Bronze, Silver, Gold, Platinum |
Aturan ini ada di satu konstanta domain yang dipakai form dan Zod. Database
memiliki CHECK komposit sebagai backstop. Jangan menyimpan level lama saat
lembaga berubah.

## E. Navigasi Sidebar
Accordion baru **“Database Green Building & ESG”** berada di grup **Core
Enterprise**, setelah **Engineering Databases**.
```text
Core Enterprise
├─ ...
├─ Engineering Databases
└─ Database Green Building & ESG
   └─ Sertifikasi Green Building
```
Route:
```text
/dashboard/green-building-esg                    → redirect /sertifikasi
/dashboard/green-building-esg/sertifikasi
```
- `showGreenBuildingEsg = canViewGreenBuildingEsg(role)`; jika false, accordion
  dan submenu tidak dirender, dan `showCoreEnterprise` tidak menghitungnya.
- `GREEN_BUILDING_ESG_MANAGE` tidak memengaruhi visibilitas menu; hanya tombol
  mutasi.
- `greenBuildingEsgOpen` hanya terbuka jika path aktif;
  `isGreenBuildingEsgPath()` mencocokkan root dan descendant.
- Panel memakai `id="green-building-esg-menu"` dengan `aria-controls` dan
  `aria-expanded`; label/href berasal dari satu konstanta domain.
- Menu lama **Green Building Certificate** di Landing Page Manager tetap
  terpisah dan tidak diubah.

## F. RBAC
| Permission | Admin | Head Office | Management | Project |
|---|---:|---:|---:|---:|
| `GREEN_BUILDING_ESG_VIEW` | ✅ super-app | ✅ | ✅ | ✅ |
| `GREEN_BUILDING_ESG_MANAGE` | ✅ super-app | ✅ | ❌ | ❌ |
- Tambah permission ke `src/lib/auth/permissions.ts`.
- `NON_ADMIN_PERMISSION_ROLES`: VIEW `[Head Office, Management, Project]`;
  MANAGE `[Head Office]`.
- Helper `src/lib/green-building-esg/access.ts`: `canViewGreenBuildingEsg`,
  `canManageGreenBuildingEsg`, `assertViewAccess`, `assertManageAccess`.
- Service memeriksa `actor.status === "active"`.
- Layout guard dan list memakai VIEW; create/update/delete/project-options memakai
  MANAGE. UI hanya menyembunyikan tombol; otorisasi tetap di API/service.
- Delete termasuk MANAGE; tidak ada permission delete terpisah pada V1.

## G. Acceptance Criteria
- Tabel/CHECK sesuai B.2; `project_id` FK RESTRICT; nama proyek dari join.
- Lembaga BGH/Greenship; level cocok; dokumentasi hanya URL http(s).
- List filter `year`/`q`; create/update/delete sesuai C; options maksimal 50
  dan hanya MANAGE.
- `GreenBuildingProjectCombobox.tsx` baru; komponen KM tidak berubah; lembaga
  berubah mereset level.
- Admin/Head Office CRUD; Management/Project read-only; route/API tidak bentrok
  dengan CMS lama; sidebar hanya untuk role berhak.
- P3 tidak membuat kode, migration, database write, commit, atau push.
**Status akhir P3:** READY FOR REVIEW.
