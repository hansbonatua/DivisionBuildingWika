# P3 — Technical Design: Modul Standard & Regulation
**Proyek:** WIBEX — Staff Engineering Digitalisasi Building  
**Fase:** P3 — Technical Design (dokumen saja)  
**Tanggal:** 16 November 2026  
**Baseline:** Source per Audit P2; working tree P8  
**Migration:** `0027_standard_regulation` — rancangan, belum dibuat/dijalankan  
**Status:** READY FOR REVIEW
## A. Ringkasan
Modul ini adalah master reference global **Disiplin → Sub-Kategori → Dokumen (file)**.
Lima disiplin adalah konstanta aplikasi; sub-kategori dan dokumen memakai dua tabel baru.
- **P3-R01:** Dua tabel baru; MKS tidak diubah. Tidak ada reuse tabel/PIC/evidence MKS.
- **P3-R02:** Private Blob, maksimal 20 MB, termasuk ZIP. Policy terpisah dari Template Form 50 MB.
- **P3-R03:** UI baru; komponen MKS tidak dipakai ulang agar tidak terjadi regresi.
- **P3-R04:** `REGULATION_VIEW` semua role; `REGULATION_MANAGE` Admin + Head Office.
- **P3-R05:** Lima submenu tanpa Summary di V1; root redirect ke Prosedur WIKA.
## B. Database Schema
```text
regulation_sub_kategori 1 ─── N regulation_document   (ON DELETE RESTRICT)
```
`disiplin` hanya ada di sub-kategori. Dokumen menurunkan disiplin melalui join,
sehingga tidak ada dua sumber kebenaran.
### B.1 DDL konseptual
> DDL berikut hanya untuk review, bukan file migration dan tidak dijalankan pada P3.
```sql
CREATE TABLE regulation_sub_kategori (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disiplin   text NOT NULL,
  kode       text NOT NULL,
  nama       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  note       text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regulation_sub_kategori_disiplin_check CHECK (disiplin IN
    ('prosedur_wika','sni','peraturan_pemerintah','standar_internasional','lainnya')),
  CONSTRAINT regulation_sub_kategori_kode_check CHECK (length(btrim(kode)) BETWEEN 1 AND 30),
  CONSTRAINT regulation_sub_kategori_nama_check CHECK (length(btrim(nama)) BETWEEN 1 AND 200),
  CONSTRAINT regulation_sub_kategori_sort_check CHECK (sort_order >= 0),
  CONSTRAINT regulation_sub_kategori_note_check CHECK (note IS NULL OR length(note) <= 2000)
);
CREATE UNIQUE INDEX regulation_sub_kategori_disiplin_kode_unique
  ON regulation_sub_kategori (disiplin, lower(btrim(kode)));
CREATE INDEX regulation_sub_kategori_disiplin_sort_idx
  ON regulation_sub_kategori (disiplin, sort_order, id);
CREATE TABLE regulation_document (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_kategori_id uuid NOT NULL REFERENCES regulation_sub_kategori(id) ON DELETE RESTRICT,
  kode            text NOT NULL,
  nama            text NOT NULL,
  sort_order      integer NOT NULL DEFAULT 0,
  file_pathname   text NOT NULL UNIQUE,
  file_name       text NOT NULL,
  file_mime_type  text NOT NULL,
  file_size_bytes bigint NOT NULL,
  note            text,
  created_by      uuid NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
  updated_by      uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regulation_document_kode_check CHECK (length(btrim(kode)) BETWEEN 1 AND 30),
  CONSTRAINT regulation_document_nama_check CHECK (length(btrim(nama)) BETWEEN 1 AND 200),
  CONSTRAINT regulation_document_sort_check CHECK (sort_order >= 0),
  CONSTRAINT regulation_document_path_check CHECK
    (length(btrim(file_pathname)) BETWEEN 1 AND 500 AND file_pathname LIKE 'regulation/%'),
  CONSTRAINT regulation_document_filename_check CHECK (length(btrim(file_name)) BETWEEN 1 AND 255),
  CONSTRAINT regulation_document_mime_check CHECK (length(btrim(file_mime_type)) BETWEEN 1 AND 200),
  CONSTRAINT regulation_document_size_check CHECK (file_size_bytes BETWEEN 1 AND 20971520),
  CONSTRAINT regulation_document_note_check CHECK (note IS NULL OR length(note) <= 2000)
);
CREATE UNIQUE INDEX regulation_document_sub_kategori_kode_unique
  ON regulation_document (sub_kategori_id, lower(btrim(kode)));
CREATE INDEX regulation_document_sub_kategori_sort_idx
  ON regulation_document (sub_kategori_id, sort_order, id);
```
### B.2 Aturan integritas
- Disiplin valid: CHECK lima nilai stabil.
- Kode sub-kategori unik per disiplin; kode dokumen unik per sub-kategori.
- `file_pathname` UNIQUE: satu blob hanya diklaim satu dokumen.
- Path wajib berada di namespace `regulation/`.
- Ukuran file: CHECK 1–20.971.520 byte.
- Hapus sub-kategori berisi dokumen: FK RESTRICT + service 409.
- Audit: `created_by` NO ACTION; `updated_by` SET NULL.
- MIME memakai allowlist service, bukan CHECK, karena legacy `.doc`/`.xls` dapat
  dilaporkan sebagai `application/octet-stream`.
### B.3 Migration `0027_standard_regulation`
File `drizzle/0027_standard_regulation.sql`: buat dua tabel, FK, CHECK, unique index, dan index sort. Tambah dua `pgTable` di `src/lib/pg/schema.ts`; tidak ada seed; tidak mengubah tabel MKS atau modul existing; tambah journal `idx: 27` dengan tag `0027_standard_regulation`. Migration **belum dijalankan** pada P3.
Rollback sebelum ada data: drop `regulation_document`, lalu `regulation_sub_kategori`. Setelah ada data, backup kedua tabel lebih dulu; drop bersifat destruktif dan memerlukan persetujuan terpisah.
### B.4 Delete dan cleanup
- **Sub-kategori:** service menghitung dokumen; jika ada → 409; FK RESTRICT sebagai backstop.
- **Dokumen:** baca pathname, hapus row, lalu `deleteBlob` best-effort.
- **Ganti file:** verifikasi blob baru, update row, hapus blob lama setelah commit.
- **Upload gagal sebelum row dibuat:** client memanggil cleanup orphan.
## C. Storage Policy
### C.1 Format dan MIME

| Ekstensi | MIME yang diterima | Catatan |
|---|---|---|
| `.pdf` | `application/pdf` | Wajib MIME PDF |
| `.doc` | `application/msword`, `application/octet-stream` | Legacy fallback |
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | OOXML |
| `.xls` | `application/vnd.ms-excel`, `application/octet-stream` | Legacy fallback |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | OOXML |
| `.zip` | `application/zip`, `application/x-zip-compressed` | Belum ada di Template Form |
`application/octet-stream` tidak diterima untuk ZIP, DOCX, XLSX, atau PDF.
Batas: `REGULATION_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024` (20 MB).
Accept attribute: `.pdf,.doc,.docx,.xls,.xlsx,.zip`.
### C.2 Namespace dan path
```text
regulation/{upload-uuid}/{sanitized-file-name}
```
Prefix `regulation/` tidak boleh dipakai modul lain. Nama storage disanitasi; nama
asli disimpan di `file_name`. Path = prefix + UUID + satu segmen file aman. Ekstensi
nama asli dan segmen storage harus sama. `file_pathname` tidak pernah dikembalikan ke
browser atau dipakai sebagai selector download.
### C.3 Alur upload dan validasi
1. Admin/Head Office memilih file; client memeriksa ekstensi dan ukuran ≤ 20 MB.
2. Client meminta token ke `POST /api/regulation/upload`.
3. Server memeriksa `REGULATION_MANAGE`, konfigurasi token, dan path namespace.
4. Token: `allowedContentTypes`, `maximumSizeInBytes: 20 MB`,
   `allowOverwrite: false`, `addRandomSuffix: false`, berlaku 10 menit.
5. Browser mengunggah langsung ke Private Blob; byte tidak melewati Next.js.
6. Client mengirim `{ file_name, blob_pathname }` ke endpoint create/update dokumen.
7. Server memanggil `headBlob` dan memverifikasi: objek ada, pathname sama, ukuran
   > 0 dan ≤ 20 MB, MIME sesuai ekstensi, path di `regulation/`, serta objek tidak
   dapat diakses publik melalui `isBlobPubliclyReachable`.
8. `file_mime_type` dan `file_size_bytes` diambil dari metadata Blob, bukan klaim client.
9. Setelah verifikasi, row dibuat/diubah; file lama dihapus setelah commit.
10. Jika langkah 6–9 gagal, client memanggil `POST /api/regulation/upload/cleanup`;
    cleanup menolak path yang masih direferensikan oleh row dokumen.
### C.4 Download
Route hanya menerima **record id**, bukan pathname/URL. Service memeriksa
`REGULATION_VIEW`, row, dan ketersediaan file. Stream memakai `openBlobDownload` dengan
akses private yang dipatok server. Header: `Content-Type`,
`Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`,
`Cache-Control: private, no-store`. Tidak ada signed/public URL ke browser.
## D. API Contract
### D.1 Konvensi
Base `/api/regulation`; auth `getActor()` dan actor harus aktif; sukses
`{ data: ... }`; error `{ error: { message, details? } }`; response data
`Cache-Control: no-store`; UUID diverifikasi sebelum service; path `[disiplin]`
memakai slug stabil. `sort_order`, audit, `disiplin`, `sub_kategori_id`, dan
`file_pathname` tidak diterima sebagai field bebas pada update metadata.
Slug: `prosedur-wika`, `sni`, `peraturan-pemerintah`, `standar-internasional`,
`lainnya`.
### D.2 Endpoint
| Method | Path | Permission | Sukses | Error utama |
|---|---|---|---|---|
| GET | `/api/regulation/[disiplin]` | VIEW | 200 | 400,401,403,500 |
| POST | `/api/regulation/[disiplin]/sub-kategori` | MANAGE | 201 | 400,401,403,404,409,500 |
| PUT | `/api/regulation/sub-kategori/[id]` | MANAGE | 200 | 400,401,403,404,409,500 |
| DELETE | `/api/regulation/sub-kategori/[id]` | MANAGE | 200 | 401,403,404,409,500 |
| POST | `/api/regulation/sub-kategori/[id]/document` | MANAGE | 201 | 400,401,403,404,409,503,500 |
| PUT | `/api/regulation/document/[id]` | MANAGE | 200 | 400,401,403,404,409,503,500 |
| DELETE | `/api/regulation/document/[id]` | MANAGE | 200 | 401,403,404,500 |
| POST | `/api/regulation/reorder` | MANAGE | 200 | 400,401,403,404,409,500 |
| POST | `/api/regulation/upload` | MANAGE | 200 | 400,401,403,503,500 |
| POST | `/api/regulation/upload/cleanup` | MANAGE | 200 | 400,401,403,409,500 |
| GET | `/api/regulation/document/[id]/file` | VIEW | 200 | 401,403,404,500 |
### D.3 Kontrak utama
**GET `/[disiplin]`** mengembalikan sub-kategori dan dokumen. DTO dokumen berisi
`id, kode, nama, file_name, file_mime_type, file_size_bytes, sort_order, note,
created_at, updated_at`; **tanpa** `file_pathname`.
```json
{ "data": {
  "disiplin": { "key": "prosedur_wika", "slug": "prosedur-wika", "name": "Prosedur WIKA" },
  "sub_kategori": [{
    "id": "uuid", "kode": "PW.01", "nama": "Perencanaan", "sort_order": 10,
    "note": null, "documents": [{ "id": "uuid", "kode": "PW.01.01",
      "nama": "Panduan", "file_name": "panduan.pdf",
      "file_mime_type": "application/pdf", "file_size_bytes": 2202009,
      "sort_order": 10, "note": null }]
  }]
} }
```
**POST `/[disiplin]/sub-kategori`** menerima `{ kode, nama, note? }`; `kode`
di-trim dan uppercase; `sort_order = max + 10` pada disiplin tersebut.
**PUT `/sub-kategori/[id]`** menerima field yang sama; `disiplin` tidak dapat pindah.
**DELETE `/sub-kategori/[id]`** mengembalikan `{ data: { deleted: true, id } }`;
jika masih berisi dokumen → 409 dengan jumlah dokumen.
**POST `/sub-kategori/[id]/document`** menerima
`{ kode, nama, note?, file_name, blob_pathname }`. File wajib; blob diverifikasi
sebelum insert; `sort_order = max + 10` di sub-kategori itu.
**PUT `/document/[id]`** menerima `{ kode, nama, note?, file_name?, blob_pathname? }`.
Tanpa pasangan file, hanya metadata berubah. Dengan file baru, server memverifikasi
blob, mengganti file, lalu menghapus blob lama setelah commit.
**DELETE `/document/[id]`** menghapus row lalu blob best-effort.
**POST `/upload`** memakai `handleUpload` dan `onBeforeGenerateToken`; body mengikuti
kontrak Vercel Blob client upload; server tidak menerima byte file.
**GET `/document/[id]/file`** mengembalikan stream attachment private.
**POST `/reorder`** menerima
`{ entity: "sub_kategori" | "document", parent_id, ordered_ids }`. Parent
sub-kategori adalah kunci disiplin; parent dokumen adalah UUID sub-kategori. Daftar
harus lengkap, tanpa duplikat, hanya child milik parent; service menulis
`sort_order = 10, 20, ...` dalam satu transaksi. Daftar tidak lengkap → 409.
### D.4 Error mapping
| Kondisi | HTTP |
|---|---|
| Tidak login / sesi tidak valid | 401 |
| Role atau status tidak berhak | 403 |
| Body, UUID, slug, atau path tidak valid | 400 |
| Sub-kategori/dokumen tidak ditemukan | 404 |
| Kode duplikat, sub-kategori berisi dokumen, reorder tidak lengkap | 409 |
| Blob tidak ditemukan, ukuran/MIME/path tidak cocok | 400 |
| Storage token belum dikonfigurasi | 503 |
| Error tak terduga | 500 |
`23505` → 409 duplikat; `23503`/`23001` → 409 referensi; `23514` → 400 constraint.
## E. UI Component Design
### E.1 Komponen baru
```text
RegulationDisiplinPage.tsx      container fetch, state, mutasi
RegulationTable.tsx             tabel berjenjang
RegulationSubKategoriDialog.tsx
RegulationDocumentDialog.tsx    metadata + file upload
RegulationDeleteDialog.tsx
RegulationFileField.tsx         pilih file, ukuran, progress, error
```
Komponen MKS **tidak diimpor**. Pola visual, modal, focus trap, dan error handling
boleh ditiru. Reuse hanya primitive UI umum dan helper storage/route.
### E.2 Wireframe tabel
```text
┌ Standard & Regulation · Prosedur WIKA ─────────────────────────────┐
│ Master reference standar dan regulasi perusahaan.  [+ Sub-Kategori]│
├───────────────┬──────────────────┬──────────────────┬───────┬──────┤
│ Sub-Kategori  │ Dokumen          │ File             │ Ukuran│ Aksi │
├───────────────┼──────────────────┼──────────────────┼───────┼──────┤
│ PW.01         │ PW.01.01         │ panduan.pdf [PDF]│ 2,1 MB│ [↓]  │
│ Perencanaan   │ Panduan          │ [Unduh]          │       │ [⋮]  │
│ 2 dokumen     │ PW.01.02         │ paket.zip [ZIP]  │ 8,4 MB│ [↓]  │
│ [Tambah Doc]  │ Paket Pendukung  │ [Unduh]          │       │ [⋮]  │
├───────────────┼──────────────────┼──────────────────┼───────┼──────┤
│ PW.02         │ Belum ada dokumen│ —                │ —     │ [⋮]  │
│ Pengawasan    │                  │                  │       │      │
└───────────────┴──────────────────┴──────────────────┴───────┴──────┘
```
Sub-kategori memakai `rowSpan`; kode/nama tebal dan jumlah dokumen terlihat. Dokumen
menjorok satu level dengan kode, nama, badge format, ukuran, dan tombol unduh. Aksi
sub-kategori: tambah dokumen, edit, hapus, naik/turun. Aksi dokumen: unduh, edit,
hapus, naik/turun. Tombol mutasi hanya dirender untuk `REGULATION_MANAGE`. Tabel
`overflow-x-auto`, target minimum 960px, bukan card layout.
### E.3 Wireframe form upload
```text
┌ Tambah Dokumen ──────────────────────────────────────────────┐
│ Sub-Kategori  PW.01 — Perencanaan                           │
│ Kode          [ PW.01.01                                  ]  │
│ Nama Dokumen  [ Panduan Perencanaan                       ]  │
│ File          [ Pilih file... ]                             │
│               PDF, DOC/DOCX, XLS/XLSX, ZIP · maks. 20 MB    │
│               panduan.pdf · 2,1 MB · [Hapus]                │
│ Catatan       [                                           ]  │
│               [ Batal ]              [ Upload & Simpan ]     │
└──────────────────────────────────────────────────────────────┘
```

| State | Perilaku |
|---|---|
| File belum dipilih | Tombol simpan disabled |
| Ekstensi/ukuran salah | Pesan inline; upload tidak dimulai |
| Upload berjalan | Progress + tombol disabled |
| Verifikasi server | “Memverifikasi file…” |
| Gagal upload/simpan | Pesan di dialog; file lama tidak berubah |
| Mode edit tanpa file baru | Metadata saja; file lama tetap |
Dialog edit menampilkan file saat ini dan aksi **Ganti File** terpisah. Jika file baru
dipilih tetapi penyimpanan gagal, client menjalankan cleanup orphan.
### E.4 Empty state
```text
Belum ada sub-kategori
Tambahkan sub-kategori pertama untuk mulai menyimpan dokumen.
[+ Tambah Sub-Kategori]          ← hanya manage

Belum ada dokumen
Sub-kategori ini belum memiliki file. Tambahkan dokumen pertama.
[+ Tambah Dokumen]               ← hanya manage
```
Read-only menampilkan “Belum ada data.” tanpa CTA. Initial load memakai skeleton
lima baris; error awal menampilkan alert + “Coba Lagi”; error saat data sudah tampil
mempertahankan data lama; setelah mutasi sukses lakukan refetch, bukan optimistic update.
### E.5 Aksesibilitas
`caption` tabel, `scope="col"`, `scope="row"`, label tombol ikon; dialog memakai
`role="dialog"`, `aria-modal`, focus trap, Escape, dan restore focus; validasi file
diumumkan lewat `aria-live="polite"`; tombol reorder berlabel “Naikkan …”/“Turunkan …”.
## F. Navigasi Sidebar
Accordion **“Standard & Regulation”** berada di grup **Core Enterprise**, tepat
setelah **Metode Kerja Standar** dan sebelum **Calculation Sheet Template**.
```text
Core Enterprise
├─ Metode Kerja Standar
├─ Standard & Regulation
│  ├─ Prosedur WIKA
│  ├─ SNI
│  ├─ Peraturan Pemerintah
│  ├─ Standar Internasional
│  └─ Lainnya
└─ Calculation Sheet Template
```
Route:
```text
/dashboard/standard-regulation                    → redirect /prosedur-wika
/dashboard/standard-regulation/prosedur-wika
/dashboard/standard-regulation/sni
/dashboard/standard-regulation/peraturan-pemerintah
/dashboard/standard-regulation/standar-internasional
/dashboard/standard-regulation/lainnya
```
`showRegulation = canViewRegulation(role)`; accordion dan lima submenu hanya dirender
jika true. `REGULATION_MANAGE` tidak memengaruhi visibilitas menu, hanya tombol
mutasi. `showCoreEnterprise` harus menyertakan `showRegulation`.
`standardRegulationOpen` masuk ke `SidebarAccordionState` dan hanya terbuka jika path
aktif. `isStandardRegulationPath()` mencocokkan root dan descendant. Panel memakai
`id="standard-regulation-menu"` dengan `aria-controls`/`aria-expanded`. Label dan href
berasal dari satu konstanta domain agar sidebar, route, dan database tidak drift.
## G. RBAC
```text
REGULATION_VIEW
REGULATION_MANAGE
```
| Permission | Head Office | Management | Project |
|---|---:|---:|---:|
| `REGULATION_VIEW` | ✅ | ✅ | ✅ |
| `REGULATION_MANAGE` | ✅ | ❌ | ❌ |
Admin otomatis ✅ melalui super-application `hasPermission()`. `REGULATION_DELETE`
**tidak dibuat** karena P1 menetapkan Admin dan Head Office sama-sama CRUD; delete
termasuk dalam `REGULATION_MANAGE`. Permission terpisah baru diperlukan jika kebijakan
delete berubah.
Helper `src/lib/regulation/access.ts`: `canViewRegulation`, `canManageRegulation`,
`assertViewAccess`, `assertManageAccess`; service memeriksa `actor.status === "active"`.

| Lapisan | Aturan |
|---|---|
| `layout.tsx` | Auth + `REGULATION_VIEW`; redirect jika gagal |
| API GET/download | VIEW |
| API create/update/delete/reorder/upload | MANAGE |
| UI | Tombol mutasi hanya untuk manage; UI bukan otorisasi |
| Cleanup | MANAGE + path harus unreferenced |
Management dan Project dapat melihat serta mengunduh, tetapi tidak dapat menambah,
mengubah, menghapus, atau mengubah urutan.
## H. Acceptance Criteria dan Gate
- Dua tabel baru dibuat; tidak ada perubahan tabel MKS.
- Migration `0027_standard_regulation` hanya rancangan pada P3, belum dijalankan.
- Lima submenu tampil; root redirect ke Prosedur WIKA.
- PDF, DOC/DOCX, XLS/XLSX, dan ZIP dapat diunggah; ZIP tidak didukung Template Form.
- File > 20 MB ditolak di client, token, dan verifikasi server.
- Semua file private; pathname tidak bocor di response; download memakai record id.
- Sub-kategori berisi dokumen tidak dapat dihapus (409).
- Reorder lengkap dan atomik; daftar tidak lengkap → 409.
- Admin dan Head Office CRUD; Management/Project read-only dan dapat mengunduh.
- `RegulationTable` dan dialog baru; tidak ada import komponen MKS.
- `tsc`, ESLint, test terkait, dan build dijalankan pada P4, bukan P3.
**Status akhir P3:** READY FOR REVIEW. Tidak ada kode implementasi, migration, database write, commit, atau push pada fase ini.
